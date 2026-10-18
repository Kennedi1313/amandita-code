package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MercadoPagoSubscriptionServiceTest {
    private static final String WEBHOOK_SECRET = "subscriptions-test-secret";
    private final StoreDao storeDao = mock(StoreDao.class);
    private final StorePlanService storePlanService = mock(StorePlanService.class);
    private final MercadoPagoSubscriptionApiClient apiClient = mock(MercadoPagoSubscriptionApiClient.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MercadoPagoSubscriptionService service = new MercadoPagoSubscriptionService(
            storeDao, storePlanService, apiClient, objectMapper,
            "https://hooks.example.com/api/v1/payment/mercadopago/webhook",
            WEBHOOK_SECRET, "https://admin.example.com");

    @Test
    void createsHostedMonthlySubscriptionUsingMercadoPagoSubscriptionsApi() throws Exception {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/search?external_reference=7&status=pending&limit=100"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("{\"results\":[]}"));
        when(apiClient.request(eq("/preapproval"), eq("POST"), any(JsonNode.class), anyString()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"987654","status":"pending","init_point":"https://www.mercadopago.com/subscriptions/checkout?preapproval_id=987654"}
                        """));
        when(storePlanService.getPlan(7L)).thenReturn(new StorePlanResponse(
                StorePlan.FREE, 3, 10, "pending",
                "https://www.mercadopago.com/subscriptions/checkout?preapproval_id=987654",
                null, null, null, StorePlanService.COMPLETE_MONTHLY_PRICE));

        StorePlanResponse response = service.startSubscription(7L, "owner@example.com");

        ArgumentCaptor<JsonNode> payload = ArgumentCaptor.forClass(JsonNode.class);
        verify(apiClient).request(eq("/preapproval"), eq("POST"), payload.capture(), anyString());
        JsonNode request = payload.getValue();
        assertThat(request.path("reason").asText()).isEqualTo("KIZI - Plano Completo");
        assertThat(request.path("payer_email").asText()).isEqualTo("owner@example.com");
        assertThat(request.path("external_reference").asText()).isEqualTo("7");
        assertThat(request.path("notification_url").asText())
                .isEqualTo("https://hooks.example.com/api/v1/mercadopago/subscriptions/webhook");
        assertThat(request.path("back_url").asText())
                .isEqualTo("https://hooks.example.com/api/v1/mercadopago/subscriptions/return");
        assertThat(request.path("auto_recurring").path("frequency").asInt()).isEqualTo(1);
        assertThat(request.path("auto_recurring").path("frequency_type").asText()).isEqualTo("months");
        assertThat(request.path("auto_recurring").path("transaction_amount").decimalValue())
                .isEqualByComparingTo("49.90");
        assertThat(request.path("auto_recurring").path("currency_id").asText()).isEqualTo("BRL");
        assertThat(response.subscriptionStatus()).isEqualTo("pending");
        assertThat(store.getMpSubscriptionId()).isEqualTo("987654");
        verify(storeDao).insertStore(store);
    }

    @Test
    void acceptsMercadoPagoAlphanumericSubscriptionIds() throws Exception {
        String subscriptionId = "2c9380847e9b451c017ea1bd70ba0219";
        String checkoutUrl = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id="
                + subscriptionId;
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/search?external_reference=7&status=pending&limit=100"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("{\"results\":[]}"));
        when(apiClient.request(eq("/preapproval"), eq("POST"), any(JsonNode.class), anyString()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"2c9380847e9b451c017ea1bd70ba0219","status":"pending",
                         "init_point":"https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=2c9380847e9b451c017ea1bd70ba0219"}
                        """));
        when(storePlanService.getPlan(7L)).thenReturn(new StorePlanResponse(
                StorePlan.FREE, 3, 10, "pending", checkoutUrl,
                null, null, null, StorePlanService.COMPLETE_MONTHLY_PRICE));

        StorePlanResponse response = service.startSubscription(7L, "buyer@example.com");

        assertThat(response.subscriptionCheckoutUrl()).isEqualTo(checkoutUrl);
        assertThat(store.getMpSubscriptionId()).isEqualTo(subscriptionId);
        verify(storeDao).insertStore(store);
    }

    @Test
    void reusesLatestMatchingPendingSubscriptionAfterLocalResponseWasNotPersisted() throws Exception {
        String latestId = "2c9380847e9b451c017ea1bd70ba0219";
        String checkoutUrl = "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id="
                + latestId;
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/search?external_reference=7&status=pending&limit=100"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"results":[
                          {"id":"0f9380847e9b451c017ea1bd70ba0101","external_reference":"7","status":"pending",
                           "init_point":"https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=0f9380847e9b451c017ea1bd70ba0101",
                           "date_created":"2026-10-15T10:00:00-03:00",
                           "auto_recurring":{"frequency":1,"frequency_type":"months","transaction_amount":49.90,"currency_id":"BRL"}},
                          {"id":"2c9380847e9b451c017ea1bd70ba0219","external_reference":"7","status":"pending",
                           "init_point":"https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=2c9380847e9b451c017ea1bd70ba0219",
                           "date_created":"2026-10-15T10:10:00-03:00",
                           "auto_recurring":{"frequency":1,"frequency_type":"months","transaction_amount":49.90,"currency_id":"BRL"}}
                        ]}
                        """));
        when(storePlanService.getPlan(7L)).thenReturn(new StorePlanResponse(
                StorePlan.FREE, 3, 10, "pending", checkoutUrl,
                null, null, null, StorePlanService.COMPLETE_MONTHLY_PRICE));

        StorePlanResponse response = service.startSubscription(7L, "buyer@example.com");

        assertThat(response.subscriptionCheckoutUrl()).isEqualTo(checkoutUrl);
        assertThat(store.getMpSubscriptionId()).isEqualTo(latestId);
        verify(apiClient, never()).request(eq("/preapproval"), eq("POST"), any(JsonNode.class), anyString());
        verify(storeDao).insertStore(store);
    }

    @Test
    void signedAuthorizationWebhookDoesNotActivatePlanBeforePayment() throws Exception {
        String subscriptionId = "2c9380847e9b451c017ea1bd70ba0219";
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        store.setMpSubscriptionId(subscriptionId);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/" + subscriptionId), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"2c9380847e9b451c017ea1bd70ba0219","external_reference":"7","status":"authorized",
                         "auto_recurring":{"frequency":1,"frequency_type":"months",
                           "transaction_amount":49.90,"currency_id":"BRL"},
                         "next_payment_date":"2026-11-15T10:00:00.000-03:00"}
                        """));
        doAnswer(invocation -> {
            store.setPlan(StorePlan.COMPLETE);
            return null;
        }).when(storePlanService).activateComplete(store);

        String payload = """
                {"type":"subscription_preapproval","data":{"id":"2c9380847e9b451c017ea1bd70ba0219"}}
                """;
        service.processNotification(
                subscriptionId, "request-123", signature(subscriptionId, "request-123"),
                "subscription_preapproval", payload);

        assertThat(store.getPlan()).isEqualTo(StorePlan.FREE);
        assertThat(store.getMpSubscriptionStatus()).isEqualTo("authorized");
        assertThat(store.getMpSubscriptionId()).isEqualTo(subscriptionId);
        assertThat(store.getMpSubscriptionPeriodEnd())
                .isEqualTo(OffsetDateTime.parse("2026-11-15T10:00:00.000-03:00"));
        verify(storePlanService, never()).activateComplete(store);
        verify(storePlanService).deactivateUntilFirstPayment(store);
        verify(storeDao).insertStore(store);
    }

    @Test
    void rejectsWebhookWithInvalidSignatureBeforeCallingMercadoPago() {
        assertThatThrownBy(() -> service.processNotification(
                "987654", "request-123", "ts=123456,v1=bad",
                "subscription_preapproval",
                "{\"type\":\"subscription_preapproval\",\"data\":{\"id\":\"987654\"}}"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(apiClient);
    }

    @Test
    void processedRecurringPaymentMarksThePeriodAsPaid() throws Exception {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        store.setMpSubscriptionId("987654");
        when(storeDao.findByMpSubscriptionId("987654")).thenReturn(Optional.of(store));
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/authorized_payments/555"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"555","preapproval_id":"987654","status":"processed"}
                        """));
        when(apiClient.request(eq("/preapproval/987654"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"987654","external_reference":"7","status":"authorized",
                         "auto_recurring":{"frequency":1,"frequency_type":"months",
                           "transaction_amount":49.90,"currency_id":"BRL"},
                         "next_payment_date":"2026-12-15T10:00:00.000-03:00"}
                        """));
        doAnswer(invocation -> {
            store.setPlan(StorePlan.COMPLETE);
            return null;
        }).when(storePlanService).activateComplete(store);

        String payload = """
                {"type":"subscription_authorized_payment","data":{"id":"555"}}
                """;
        service.processNotification(
                "555", "request-555", signature("555", "request-555"),
                "subscription_authorized_payment", payload);

        assertThat(store.isMpSubscriptionEverPaid()).isTrue();
        assertThat(store.getPlan()).isEqualTo(StorePlan.COMPLETE);
        assertThat(store.getMpSubscriptionLastPaymentStatus()).isEqualTo("processed");
        assertThat(store.getMpSubscriptionPeriodEnd())
                .isEqualTo(OffsetDateTime.parse("2026-12-15T10:00:00.000-03:00"));
        verify(storePlanService).activateComplete(store);
    }

    @Test
    void syncRecoversProcessedPaymentWhenWebhookWasNotDelivered() throws Exception {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.FREE);
        store.setMpSubscriptionId("987654");
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(storeDao.findByMpSubscriptionId("987654")).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/987654"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"987654","external_reference":"7","status":"authorized",
                         "auto_recurring":{"frequency":1,"frequency_type":"months",
                           "transaction_amount":49.90,"currency_id":"BRL"},
                         "next_payment_date":"2026-12-15T10:00:00.000-03:00"}
                        """));
        when(apiClient.request(eq("/authorized_payments/search?preapproval_id=987654"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"results":[{"id":"555","status":"processed",
                          "date_created":"2026-10-15T10:00:00.000-03:00"}]}
                        """));
        when(apiClient.request(eq("/authorized_payments/555"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"555","preapproval_id":"987654","status":"processed"}
                        """));
        when(storePlanService.getPlan(7L)).thenReturn(new StorePlanResponse(
                StorePlan.COMPLETE, 3, null, "authorized", null,
                OffsetDateTime.parse("2026-12-15T10:00:00.000-03:00"),
                OffsetDateTime.parse("2026-12-15T10:00:00.000-03:00"),
                "processed", StorePlanService.COMPLETE_MONTHLY_PRICE));
        doAnswer(invocation -> {
            store.setPlan(StorePlan.COMPLETE);
            return null;
        }).when(storePlanService).activateComplete(store);

        StorePlanResponse response = service.syncSubscription(7L);

        assertThat(response.plan()).isEqualTo(StorePlan.COMPLETE);
        assertThat(store.isMpSubscriptionEverPaid()).isTrue();
        assertThat(store.getMpSubscriptionLastPaymentStatus()).isEqualTo("processed");
        verify(storePlanService).activateComplete(store);
    }

    @Test
    void externalCancellationKeepsPaidPlanUntilTheCurrentPeriodEnds() throws Exception {
        String subscriptionId = "987654";
        OffsetDateTime paidThrough = OffsetDateTime.parse("2026-11-15T10:00:00.000-03:00");
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.COMPLETE);
        store.setMpSubscriptionId(subscriptionId);
        store.setMpSubscriptionStatus("authorized");
        store.setMpSubscriptionEverPaid(true);
        store.setMpSubscriptionPeriodEnd(paidThrough);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/preapproval/" + subscriptionId), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"987654","external_reference":"7","status":"cancelled",
                         "auto_recurring":{"frequency":1,"frequency_type":"months",
                           "transaction_amount":49.90,"currency_id":"BRL"}}
                        """));

        String payload = """
                {"type":"subscription_preapproval","data":{"id":"987654"}}
                """;
        service.processNotification(
                subscriptionId, "request-cancelled", signature(subscriptionId, "request-cancelled"),
                "subscription_preapproval", payload);

        assertThat(store.getMpSubscriptionStatus()).isEqualTo("cancelled");
        assertThat(store.getPlan()).isEqualTo(StorePlan.COMPLETE);
        assertThat(store.getMpSubscriptionPeriodEnd()).isEqualTo(paidThrough);
        verify(storePlanService).downgradeExpiredSubscription(eq(store), any(OffsetDateTime.class));
    }

    @Test
    void failedFirstRecurringPaymentDowngradesImmediately() throws Exception {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.COMPLETE);
        store.setMpSubscriptionId("987654");
        store.setMpSubscriptionPeriodEnd(OffsetDateTime.now().plusDays(10));
        when(storeDao.findByMpSubscriptionId("987654")).thenReturn(Optional.of(store));
        when(apiClient.request(eq("/authorized_payments/777"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":"777","preapproval_id":"987654","status":"rejected"}
                        """));
        doAnswer(invocation -> {
            store.setPlan(StorePlan.FREE);
            return null;
        }).when(storePlanService).downgradeExpiredSubscription(eq(store), any(OffsetDateTime.class));

        String payload = """
                {"type":"subscription_authorized_payment","data":{"id":"777"}}
                """;
        service.processNotification(
                "777", "request-777", signature("777", "request-777"),
                "subscription_authorized_payment", payload);

        assertThat(store.isMpSubscriptionEverPaid()).isFalse();
        assertThat(store.getMpSubscriptionLastPaymentStatus()).isEqualTo("rejected");
        assertThat(store.getMpSubscriptionPeriodEnd()).isBefore(OffsetDateTime.now().plusSeconds(1));
        verify(storePlanService).downgradeExpiredSubscription(eq(store), any(OffsetDateTime.class));
    }

    private String signature(String dataId, String requestId) throws Exception {
        String timestamp = "123456";
        String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + timestamp + ";";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "ts=" + timestamp + ",v1="
                + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
    }
}
