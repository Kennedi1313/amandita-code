package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.transaction.Transactional;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class MercadoPagoSubscriptionService {
    private static final String SALES_WEBHOOK_SUFFIX = "/api/v1/payment/mercadopago/webhook";
    private static final String SUBSCRIPTIONS_WEBHOOK_PATH = "/api/v1/mercadopago/subscriptions/webhook";
    private static final String SUBSCRIPTIONS_RETURN_PATH = "/api/v1/mercadopago/subscriptions/return";
    private static final String PLAN_REASON = "KIZI - Plano Completo";
    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoSubscriptionService.class);

    private final StoreDao storeDao;
    private final StorePlanService storePlanService;
    private final MercadoPagoSubscriptionApiClient apiClient;
    private final ObjectMapper objectMapper;
    private final String webhookUrl;
    private final String subscriptionWebhookSecret;
    private final String adminUrl;

    public MercadoPagoSubscriptionService(
            StoreDao storeDao,
            StorePlanService storePlanService,
            MercadoPagoSubscriptionApiClient apiClient,
            ObjectMapper objectMapper,
            @Value("${mercadopago.webhook-url:}") String webhookUrl,
            @Value("${mercadopago.subscription-webhook-secret:}") String subscriptionWebhookSecret,
            @Value("${saas.admin-url:http://localhost:4173}") String adminUrl) {
        this.storeDao = storeDao;
        this.storePlanService = storePlanService;
        this.apiClient = apiClient;
        this.objectMapper = objectMapper;
        this.webhookUrl = StringUtils.removeEnd(webhookUrl.trim(), "/");
        this.subscriptionWebhookSecret = subscriptionWebhookSecret;
        this.adminUrl = StringUtils.removeEnd(adminUrl.trim(), "/");
    }

    @Transactional
    public StorePlanResponse startSubscription(Long storeId, String payerEmail) {
        if (storeId == null) throw new IllegalArgumentException("Loja não identificada.");
        if (StringUtils.isBlank(payerEmail)) throw new IllegalArgumentException("E-mail da conta Mercado Pago não identificado.");
        String notificationUrl = subscriptionWebhookUrl();
        if (StringUtils.isBlank(subscriptionWebhookSecret)) {
            throw new IllegalStateException("Configure MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET antes de iniciar a assinatura.");
        }

        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (store.getPlan() == StorePlan.COMPLETE
                && "authorized".equals(store.getMpSubscriptionStatus())) {
            throw new IllegalStateException("Esta loja já tem uma assinatura ativa.");
        }
        if (store.getMpSubscriptionPeriodEnd() != null && store.getMpSubscriptionPeriodEnd().isAfter(now)) {
            throw new IllegalStateException("A assinatura atual permanece ativa até o fim do período pago.");
        }
        if ("pending".equals(store.getMpSubscriptionStatus())
                && StringUtils.isNotBlank(store.getMpSubscriptionInitPoint())) {
            return storePlanService.getPlan(storeId);
        }

        JsonNode existingPending = findLatestPendingSubscription(storeId);
        if (existingPending != null) {
            String subscriptionId = existingPending.path("id").asText();
            store.setMpSubscriptionId(subscriptionId);
            store.setMpSubscriptionStatus("pending");
            store.setMpSubscriptionInitPoint(existingPending.path("init_point").asText());
            store.setMpSubscriptionNextPaymentAt(parseDate(existingPending.path("next_payment_date").asText(null)));
            store.setMpSubscriptionLastPaymentId(null);
            store.setMpSubscriptionLastPaymentStatus(null);
            store.setMpSubscriptionEverPaid(false);
            storeDao.insertStore(store);
            return storePlanService.getPlan(storeId);
        }

        ObjectNode request = objectMapper.createObjectNode();
        request.put("reason", PLAN_REASON);
        request.put("external_reference", String.valueOf(storeId));
        request.put("payer_email", payerEmail);
        request.put("back_url", subscriptionReturnUrl());
        request.put("notification_url", notificationUrl);
        request.put("status", "pending");
        ObjectNode recurring = request.putObject("auto_recurring");
        recurring.put("frequency", 1);
        recurring.put("frequency_type", "months");
        recurring.put("transaction_amount", StorePlanService.COMPLETE_MONTHLY_PRICE);
        recurring.put("currency_id", "BRL");

        String idempotencyKey = "kizi-plan-" + storeId + "-" + UUID.randomUUID();
        JsonNode response = apiClient.request("/preapproval", "POST", request, idempotencyKey);
        String subscriptionId = response.path("id").asText(null);
        String checkoutUrl = response.path("init_point").asText(null);
        if (StringUtils.isAnyBlank(subscriptionId, checkoutUrl)
                || !isValidMercadoPagoId(subscriptionId)) {
            throw new IllegalStateException("O Mercado Pago não retornou os dados da assinatura.");
        }

        store.setMpSubscriptionId(subscriptionId);
        store.setMpSubscriptionStatus(response.path("status").asText("pending"));
        store.setMpSubscriptionInitPoint(checkoutUrl);
        store.setMpSubscriptionNextPaymentAt(parseDate(response.path("next_payment_date").asText(null)));
        store.setMpSubscriptionLastPaymentId(null);
        store.setMpSubscriptionLastPaymentStatus(null);
        store.setMpSubscriptionEverPaid(false);
        storeDao.insertStore(store);
        return storePlanService.getPlan(storeId);
    }

    @Transactional
    public StorePlanResponse cancelSubscription(Long storeId) {
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        String subscriptionId = store.getMpSubscriptionId();
        if (StringUtils.isBlank(subscriptionId)) {
            throw new IllegalStateException("Esta loja não tem uma assinatura do Mercado Pago para cancelar.");
        }

        ObjectNode request = objectMapper.createObjectNode();
        request.put("status", "cancelled");
        apiClient.request("/preapproval/" + subscriptionId, "PUT", request, null);
        JsonNode remote = apiClient.request("/preapproval/" + subscriptionId, "GET", null, null);
        applyPreapproval(store, subscriptionId, remote);
        storeDao.insertStore(store);
        storePlanService.downgradeExpiredSubscription(store, OffsetDateTime.now(ZoneOffset.UTC));
        return storePlanService.getPlan(storeId);
    }

    @Transactional
    public StorePlanResponse switchToFreeNow(Long storeId) {
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        storePlanService.downgradeCancelledSubscriptionNow(store, OffsetDateTime.now(ZoneOffset.UTC));
        return storePlanService.getPlan(storeId);
    }

    @Transactional
    public StorePlanResponse syncSubscription(Long storeId) {
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        String subscriptionId = store.getMpSubscriptionId();
        if (StringUtils.isBlank(subscriptionId)) {
            return storePlanService.getPlan(storeId);
        }
        if (!reconcileLatestAuthorizedPayment(subscriptionId)) {
            JsonNode remote = apiClient.request("/preapproval/" + subscriptionId, "GET", null, null);
            updateFromPreapproval(subscriptionId, remote);
        }
        return storePlanService.getPlan(storeId);
    }

    @Transactional
    public void processNotification(String dataId, String requestId, String signature,
                                    String notificationType, String payload) {
        verifyNotification(dataId, requestId, signature, payload);
        String eventType = StringUtils.defaultIfBlank(notificationType, notificationTypeFromBody(payload));
        if ("subscription_preapproval".equals(eventType)) {
            JsonNode preapproval = apiClient.request("/preapproval/" + dataId, "GET", null, null);
            updateFromPreapproval(dataId, preapproval);
        } else if ("subscription_authorized_payment".equals(eventType)) {
            processAuthorizedPayment(dataId);
        }
    }

    @Transactional
    public void expirePaidPeriods() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (Store candidate : storeDao.findExpiredSubscriptions(now)) {
            storeDao.findByIdForUpdate(candidate.getId())
                    .ifPresent(store -> storePlanService.downgradeExpiredSubscription(store, now));
        }
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expirePaidPeriodsOnSchedule() {
        expirePaidPeriods();
    }

    @Scheduled(fixedDelay = 300000)
    public void reconcileSubscriptionsOnSchedule() {
        for (Store store : storeDao.findByMpSubscriptionIdIsNotNull()) {
            try {
                syncSubscription(store.getId());
            } catch (RuntimeException exception) {
                logger.error("Failed to reconcile Mercado Pago subscription for store {}",
                        store.getId(), exception);
            }
        }
    }

    private boolean reconcileLatestAuthorizedPayment(String subscriptionId) {
        JsonNode search = apiClient.request(
                "/authorized_payments/search?preapproval_id=" + subscriptionId, "GET", null, null);
        JsonNode results = search.path("results");
        if (!results.isArray()) {
            throw new IllegalStateException("O Mercado Pago retornou uma lista inválida de cobranças recorrentes.");
        }

        JsonNode latestFinalPayment = null;
        OffsetDateTime latestCreatedAt = null;
        for (JsonNode candidate : results) {
            String paymentId = candidate.path("id").asText(null);
            if (!isValidMercadoPagoId(paymentId)
                    || !isFinalPaymentStatus(candidate.path("status").asText())) {
                continue;
            }
            OffsetDateTime createdAt = parseDate(candidate.path("date_created").asText(null));
            if (latestFinalPayment == null || (createdAt != null
                    && (latestCreatedAt == null || createdAt.isAfter(latestCreatedAt)))) {
                latestFinalPayment = candidate;
                latestCreatedAt = createdAt;
            }
        }

        if (latestFinalPayment == null) {
            return false;
        }
        String paymentId = latestFinalPayment.path("id").asText();
        Store store = storeDao.findByMpSubscriptionId(subscriptionId).orElse(null);
        if (store == null || paymentId.equals(store.getMpSubscriptionLastPaymentId())) {
            return false;
        }
        processAuthorizedPayment(paymentId);
        return true;
    }

    private boolean isFinalPaymentStatus(String status) {
        return "approved".equals(status) || "processed".equals(status)
                || "rejected".equals(status) || "cancelled".equals(status)
                || "canceled".equals(status);
    }

    private void processAuthorizedPayment(String paymentId) {
        JsonNode payment = apiClient.request("/authorized_payments/" + paymentId, "GET", null, null);
        if (!paymentId.equals(payment.path("id").asText())) {
            throw new IllegalArgumentException("O pagamento recorrente consultado não corresponde à notificação.");
        }
        String subscriptionId = payment.path("preapproval_id").asText(null);
        if (!isValidMercadoPagoId(subscriptionId)) {
            throw new IllegalArgumentException("Notificação sem assinatura associada.");
        }
        Store store = storeDao.findByMpSubscriptionId(subscriptionId).orElse(null);
        if (store == null) return;

        String paymentStatus = payment.path("status").asText("");
        store.setMpSubscriptionLastPaymentId(paymentId);
        store.setMpSubscriptionLastPaymentStatus(paymentStatus);
        if ("approved".equals(paymentStatus) || "processed".equals(paymentStatus)) {
            store.setMpSubscriptionEverPaid(true);
        }
        storeDao.insertStore(store);
        if ("approved".equals(paymentStatus) || "processed".equals(paymentStatus)) {
            JsonNode preapproval = apiClient.request("/preapproval/" + subscriptionId, "GET", null, null);
            updateFromPreapproval(subscriptionId, preapproval);
        } else if (("rejected".equals(paymentStatus) || "cancelled".equals(paymentStatus))
                && !"cancelled".equals(store.getMpSubscriptionStatus())) {
            store.setMpSubscriptionStatus("past_due");
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            if (!store.isMpSubscriptionEverPaid()) {
                store.setMpSubscriptionPeriodEnd(now);
            }
            storeDao.insertStore(store);
            storePlanService.downgradeExpiredSubscription(store, now);
        }
    }

    @Transactional
    protected void updateFromPreapproval(String subscriptionId, JsonNode preapproval) {
        if (!subscriptionId.equals(preapproval.path("id").asText())) {
            throw new IllegalArgumentException("A assinatura consultada não corresponde à notificação.");
        }
        String externalReference = preapproval.path("external_reference").asText(null);
        if (externalReference == null || !externalReference.matches("\\d+")) {
            throw new IllegalArgumentException("Assinatura sem referência de loja válida.");
        }
        Long storeId = Long.valueOf(externalReference);
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja da assinatura não encontrada."));
        if (!subscriptionId.equals(store.getMpSubscriptionId())) return;

        applyPreapproval(store, subscriptionId, preapproval);
        storeDao.insertStore(store);
        storePlanService.downgradeExpiredSubscription(store, OffsetDateTime.now(ZoneOffset.UTC));
    }

    private void applyPreapproval(Store store, String subscriptionId, JsonNode preapproval) {
        if (!String.valueOf(store.getId()).equals(preapproval.path("external_reference").asText())) {
            throw new IllegalArgumentException("A assinatura não pertence à loja informada.");
        }
        validatePlanTerms(preapproval);
        String status = preapproval.path("status").asText("");
        if (StringUtils.isBlank(status)) {
            throw new IllegalArgumentException("O Mercado Pago não retornou o estado da assinatura.");
        }
        store.setMpSubscriptionId(subscriptionId);
        store.setMpSubscriptionStatus(status);
        OffsetDateTime nextPaymentAt = parseDate(preapproval.path("next_payment_date").asText(null));
        if (nextPaymentAt != null) {
            store.setMpSubscriptionNextPaymentAt(nextPaymentAt);
        }
        boolean lastPaymentFailed = "rejected".equals(store.getMpSubscriptionLastPaymentStatus())
                || "cancelled".equals(store.getMpSubscriptionLastPaymentStatus())
                || "canceled".equals(store.getMpSubscriptionLastPaymentStatus());
        if ("authorized".equals(status) && lastPaymentFailed) {
            store.setMpSubscriptionStatus("past_due");
            if (!store.isMpSubscriptionEverPaid()) {
                store.setMpSubscriptionPeriodEnd(OffsetDateTime.now(ZoneOffset.UTC));
            } else if (store.getMpSubscriptionPeriodEnd() == null) {
                store.setMpSubscriptionPeriodEnd(OffsetDateTime.now(ZoneOffset.UTC));
            }
        } else if ("authorized".equals(status)) {
            if (nextPaymentAt != null) {
                store.setMpSubscriptionPeriodEnd(nextPaymentAt);
            } else if (store.getMpSubscriptionPeriodEnd() == null) {
                store.setMpSubscriptionPeriodEnd(OffsetDateTime.now(ZoneOffset.UTC).plusMonths(1));
            }
            store.setMpSubscriptionStatus(status);
            if (store.isMpSubscriptionEverPaid()) {
                storePlanService.activateComplete(store);
            } else {
                storePlanService.deactivateUntilFirstPayment(store);
            }
        } else if (("cancelled".equals(status) || "canceled".equals(status) || "paused".equals(status))
                && !store.isMpSubscriptionEverPaid()) {
            store.setMpSubscriptionPeriodEnd(OffsetDateTime.now(ZoneOffset.UTC));
        }
    }

    private void validatePlanTerms(JsonNode preapproval) {
        JsonNode recurring = preapproval.path("auto_recurring");
        if (!recurring.path("transaction_amount").isNumber()
                || recurring.path("transaction_amount").decimalValue()
                        .compareTo(StorePlanService.COMPLETE_MONTHLY_PRICE) != 0
                || !"BRL".equals(recurring.path("currency_id").asText())
                || recurring.path("frequency").asInt(-1) != 1
                || !"months".equals(recurring.path("frequency_type").asText())) {
            throw new IllegalArgumentException("A assinatura não corresponde ao plano Completo da KIZI.");
        }
    }

    private JsonNode findLatestPendingSubscription(Long storeId) {
        String path = "/preapproval/search?external_reference=" + storeId + "&status=pending&limit=100";
        JsonNode search = apiClient.request(path, "GET", null, null);
        JsonNode results = search.path("results");
        if (!results.isArray()) {
            throw new IllegalStateException("O Mercado Pago retornou uma lista inválida de assinaturas.");
        }

        JsonNode latest = null;
        OffsetDateTime latestCreatedAt = null;
        for (JsonNode candidate : results) {
            if (!String.valueOf(storeId).equals(candidate.path("external_reference").asText())
                    || !"pending".equals(candidate.path("status").asText())
                    || !isValidMercadoPagoId(candidate.path("id").asText(null))
                    || StringUtils.isBlank(candidate.path("init_point").asText(null))) {
                continue;
            }
            try {
                validatePlanTerms(candidate);
            } catch (IllegalArgumentException exception) {
                continue;
            }
            OffsetDateTime createdAt = parseDate(candidate.path("date_created").asText(null));
            if (latest == null || (createdAt != null
                    && (latestCreatedAt == null || createdAt.isAfter(latestCreatedAt)))) {
                latest = candidate;
                latestCreatedAt = createdAt;
            }
        }
        return latest;
    }

    private String subscriptionWebhookUrl() {
        return publicWebhookBaseUrl() + SUBSCRIPTIONS_WEBHOOK_PATH;
    }

    private String subscriptionReturnUrl() {
        return publicWebhookBaseUrl() + SUBSCRIPTIONS_RETURN_PATH;
    }

    private String publicWebhookBaseUrl() {
        if (!webhookUrl.endsWith(SALES_WEBHOOK_SUFFIX)) {
            throw new IllegalStateException("MERCADOPAGO_WEBHOOK_URL deve apontar para o webhook público de pagamentos configurado.");
        }
        String baseUrl = webhookUrl.substring(0, webhookUrl.length() - SALES_WEBHOOK_SUFFIX.length());
        if (!baseUrl.startsWith("https://")) {
            throw new IllegalStateException("A URL pública do webhook de assinaturas Mercado Pago deve usar HTTPS.");
        }
        return baseUrl;
    }

    private void verifyNotification(String dataId, String requestId, String signature, String payload) {
        if (StringUtils.isBlank(subscriptionWebhookSecret)) {
            throw new IllegalStateException("MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET não configurado.");
        }
        if (!isValidMercadoPagoId(dataId)
                || StringUtils.isAnyBlank(requestId, signature, payload)) {
            throw new IllegalArgumentException("Notificação de assinatura Mercado Pago inválida.");
        }
        String timestamp = null;
        String receivedHash = null;
        for (String part : signature.split(",")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length == 2 && "ts".equals(pair[0])) timestamp = pair[1];
            if (pair.length == 2 && "v1".equals(pair[0])) receivedHash = pair[1];
        }
        if (StringUtils.isAnyBlank(timestamp, receivedHash)) {
            throw new IllegalArgumentException("Assinatura do webhook inválida.");
        }
        String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + timestamp + ";";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(subscriptionWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            byte[] actual = HexFormat.of().parseHex(receivedHash);
            if (!MessageDigest.isEqual(expected, actual)) {
                throw new IllegalArgumentException("Assinatura do webhook inválida.");
            }
            JsonNode notification = objectMapper.readTree(payload);
            String bodyId = notification.path("data").path("id").asText(dataId);
            if (!dataId.equals(bodyId)) {
                throw new IllegalArgumentException("ID divergente no webhook de assinatura.");
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Não foi possível validar a notificação de assinatura.", exception);
        }
    }

    private OffsetDateTime parseDate(String value) {
        if (StringUtils.isBlank(value)) return null;
        try {
            return OffsetDateTime.parse(value);
        } catch (java.time.format.DateTimeParseException exception) {
            throw new IllegalArgumentException("Data de cobrança inválida retornada pelo Mercado Pago.", exception);
        }
    }

    private boolean isValidMercadoPagoId(String id) {
        return StringUtils.isNotBlank(id) && id.length() <= 128 && id.matches("[A-Za-z0-9_-]+");
    }

    private String notificationTypeFromBody(String payload) {
        try {
            JsonNode notification = objectMapper.readTree(payload);
            return StringUtils.defaultIfBlank(
                    notification.path("type").asText(null),
                    notification.path("topic").asText(null));
        } catch (Exception exception) {
            throw new IllegalArgumentException("Corpo da notificação de assinatura inválido.", exception);
        }
    }
}
