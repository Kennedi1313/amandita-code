package com.amandita.Sale;

import com.amandita.store.MercadoPagoOAuthService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.time.LocalDateTime;

@Service
public class MercadoPagoWebhookService {
    private final SaleDao saleDao;
    private final MercadoPagoOAuthService mercadoPagoOAuthService;
    private final MercadoPagoPaymentStatusUpdater paymentStatusUpdater;
    private final ObjectMapper objectMapper;
    private final String webhookSecret;

    public MercadoPagoWebhookService(SaleDao saleDao,
                                     MercadoPagoOAuthService mercadoPagoOAuthService,
                                     MercadoPagoPaymentStatusUpdater paymentStatusUpdater,
                                     ObjectMapper objectMapper,
                                     @Value("${mercadopago.webhook-secret:}") String webhookSecret) {
        this.saleDao = saleDao;
        this.mercadoPagoOAuthService = mercadoPagoOAuthService;
        this.paymentStatusUpdater = paymentStatusUpdater;
        this.objectMapper = objectMapper;
        this.webhookSecret = webhookSecret;
    }

    public ReconciliationResult reconcilePendingSales(Long storeId) {
        if (storeId == null) throw new IllegalArgumentException("Loja não identificada.");

        List<Sale> pendingSales = saleDao.findPendingMercadoPagoSales(storeId);
        int reconciled = 0;
        int stillPending = 0;
        int notFound = 0;
        List<Long> failedSaleIds = new ArrayList<>();

        for (Sale pendingSale : pendingSales) {
            Long saleId = pendingSale.getId();
            try {
                String dataId = findPaymentId(storeId, pendingSale);
                if (dataId == null) {
                    notFound++;
                    continue;
                }

                JsonNode payment = mercadoPagoOAuthService.requestMerchantApi(
                        storeId, "/v1/payments/" + dataId, "GET", null, null);
                if (!dataId.equals(payment.path("id").asText())) {
                    throw new IllegalArgumentException("O pagamento consultado não corresponde à busca.");
                }

                String updatedStatus = paymentStatusUpdater.applyPayment(storeId, dataId, payment);
                if (updatedStatus == null) {
                    continue;
                }
                if (!"PENDENTE".equals(updatedStatus)) {
                    reconciled++;
                } else {
                    stillPending++;
                }
            } catch (Exception exception) {
                failedSaleIds.add(saleId);
                org.slf4j.LoggerFactory.getLogger(MercadoPagoWebhookService.class)
                        .warn("Mercado Pago reconciliation failed for sale {}", saleId, exception);
            }
        }

        return new ReconciliationResult(
                pendingSales.size(), reconciled, stillPending, notFound, failedSaleIds.size(), failedSaleIds);
    }

    @Scheduled(fixedDelay = 900000)
    @Transactional
    public void cancelExpiredPendingSales() {
        LocalDateTime expirationLimit = LocalDateTime.now().minusHours(24);
        List<Sale> expiredSales = saleDao.findExpiredPendingMercadoPagoSales(expirationLimit);
        for (Sale sale : expiredSales) {
            sale.setStatus("CANCELADO");
            saleDao.insertSale(sale);
        }
    }

    private String findPaymentId(Long storeId, Sale sale) {
        JsonNode searchResult = mercadoPagoOAuthService.requestMerchantApi(
                storeId,
                "/v1/payments/search?external_reference=" + sale.getId() + "&sort=date_created&criteria=desc",
                "GET",
                null,
                null);
        String paymentId = selectPaymentId(searchResult.path("results"));
        if (paymentId != null) return paymentId;

        if (StringUtils.isBlank(sale.getPreferenceId())) return null;
        JsonNode merchantOrderSearch = mercadoPagoOAuthService.requestMerchantApi(
                storeId,
                "/merchant_orders/search?preference_id=" + sale.getPreferenceId(),
                "GET",
                null,
                null);
        JsonNode merchantOrders = merchantOrderSearch.path("elements");
        if (!merchantOrders.isArray()) merchantOrders = merchantOrderSearch.path("results");
        for (JsonNode merchantOrder : merchantOrders) {
            if (!sale.getPreferenceId().equals(merchantOrder.path("preference_id").asText())) continue;
            paymentId = selectPaymentId(merchantOrder.path("payments"));
            if (paymentId != null) return paymentId;
        }
        return null;
    }

    private String selectPaymentId(JsonNode payments) {
        if (!payments.isArray()) return null;
        JsonNode selected = null;
        for (JsonNode payment : payments) {
            if (selected == null) selected = payment;
            if ("approved".equals(payment.path("status").asText())) {
                selected = payment;
                break;
            }
        }
        String paymentId = selected == null ? null : selected.path("id").asText(null);
        return paymentId != null && paymentId.matches("\\d+") ? paymentId : null;
    }

    public record ReconciliationResult(
            int pendingSales,
            int reconciled,
            int stillPending,
            int notFound,
            int failed,
            List<Long> failedSaleIds
    ) {}

    public void processPaymentNotification(Long storeId, String dataId, String requestId,
                                           String signature, String payload) {
        if (StringUtils.isBlank(webhookSecret)) {
            throw new IllegalStateException("MERCADOPAGO_WEBHOOK_SECRET não configurado.");
        }
        if (storeId == null) {
            throw new IllegalArgumentException("Notificação Mercado Pago inválida.");
        }

        JsonNode notification;
        try {
            notification = objectMapper.readTree(payload);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Corpo da notificação inválido.");
        }

        String bodyId = notification.path("data").path("id").asText(null);
        if (StringUtils.isBlank(dataId)) {
            dataId = bodyId;
        } else if (!dataId.equals(bodyId)) {
            throw new IllegalArgumentException("ID do pagamento divergente na notificação.");
        }
        if (StringUtils.isBlank(dataId) || !dataId.matches("\\d+")) {
            throw new IllegalArgumentException("Notificação Mercado Pago inválida.");
        }

        verifySignature(dataId, requestId, signature);

        JsonNode payment = mercadoPagoOAuthService.requestMerchantApi(
                storeId, "/v1/payments/" + dataId, "GET", null, null);
        if (!dataId.equals(payment.path("id").asText())) {
            throw new IllegalArgumentException("O pagamento consultado não corresponde à notificação.");
        }
        paymentStatusUpdater.applyPayment(storeId, dataId, payment);
    }

    private void verifySignature(String dataId, String requestId, String signature) {
        if (StringUtils.isAnyBlank(requestId, signature)) throw new IllegalArgumentException("Assinatura do webhook ausente.");
        String timestamp = null;
        String receivedHash = null;
        for (String part : signature.split(",")) {
            String[] pair = part.trim().split("=", 2);
            if (pair.length == 2 && "ts".equals(pair[0])) timestamp = pair[1];
            if (pair.length == 2 && "v1".equals(pair[0])) receivedHash = pair[1];
        }
        if (StringUtils.isAnyBlank(timestamp, receivedHash)) throw new IllegalArgumentException("Assinatura do webhook inválida.");
        String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + timestamp + ";";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = HexFormat.of().parseHex(HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8))));
            byte[] actual = HexFormat.of().parseHex(receivedHash);
            if (!MessageDigest.isEqual(expected, actual)) throw new IllegalArgumentException("Assinatura do webhook inválida.");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Assinatura do webhook inválida.");
        }
    }

}
