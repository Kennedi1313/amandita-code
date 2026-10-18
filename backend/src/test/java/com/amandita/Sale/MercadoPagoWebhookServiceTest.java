package com.amandita.Sale;

import com.amandita.product.Product;
import com.amandita.product.ProductDao;
import com.amandita.store.MercadoPagoOAuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MercadoPagoWebhookServiceTest {
    private static final String WEBHOOK_SECRET = "test-webhook-secret";
    private final SaleDao saleDao = mock(SaleDao.class);
    private final ProductDao productDao = mock(ProductDao.class);
    private final MercadoPagoOAuthService mercadoPagoOAuthService = mock(MercadoPagoOAuthService.class);
    private MercadoPagoPaymentStatusUpdater paymentStatusUpdater;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MercadoPagoWebhookService service;
    private Sale sale;
    private Product product;

    @BeforeEach
    void setUp() throws Exception {
        service = new MercadoPagoWebhookService(
                saleDao, mercadoPagoOAuthService,
                paymentStatusUpdater = new MercadoPagoPaymentStatusUpdater(saleDao, productDao),
                objectMapper, WEBHOOK_SECRET);

        var store = new com.amandita.store.Store();
        store.setId(7L);
        product = new Product();
        product.setId(11);
        product.setQuantity(10);

        SaleItem item = new SaleItem();
        item.setProduct(product);
        item.setQuantity(2);
        item.setPrice(2900);

        sale = new Sale();
        sale.setId(42L);
        sale.setStore(store);
        sale.setStatus("PENDENTE");
        sale.setPaymentMethod("MERCADO_PAGO");
        sale.setPreferenceId("preference-42");
        sale.setTotalPrice(5800.0);
        sale.setSaleItems(List.of(item));

        when(saleDao.findByIdForUpdate(42L)).thenReturn(Optional.of(sale));
        sale.setPaymentMethod("MERCADO_PAGO");
        when(mercadoPagoOAuthService.requestMerchantApi(
                eq(7L), eq("/v1/payments/12345"), eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"id":12345,"external_reference":"42","status":"approved",
                         "currency_id":"BRL","transaction_amount":58.00}
                        """));
        when(saleDao.insertSale(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void approvedWebhookDeductsStockOnceAndReplayDoesNotRegressFulfillmentStatus() throws Exception {
        service.processPaymentNotification(7L, "12345", "request-1", signature("12345", "request-1"), payload());

        assertThat(product.getQuantity()).isEqualTo(8);
        assertThat(sale.isStockDecremented()).isTrue();
        assertThat(sale.getStatus()).isEqualTo("APROVADO");

        sale.setStatus("PREPARANDO");
        service.processPaymentNotification(7L, "12345", "request-2", signature("12345", "request-2"), payload());

        assertThat(product.getQuantity()).isEqualTo(8);
        assertThat(sale.getStatus()).isEqualTo("PREPARANDO");
        verify(productDao, times(1)).updateProduct(product);
    }

    @Test
    void reconciliationFindsPaymentBySaleReferenceAndUpdatesPendingSale() throws Exception {
        when(saleDao.findPendingMercadoPagoSales(7L)).thenReturn(List.of(sale));
        when(mercadoPagoOAuthService.requestMerchantApi(
                eq(7L),
                eq("/v1/payments/search?external_reference=42&sort=date_created&criteria=desc"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"results":[{"id":12345}]}
                        """));

        MercadoPagoWebhookService.ReconciliationResult result = service.reconcilePendingSales(7L);

        assertThat(result.pendingSales()).isEqualTo(1);
        assertThat(result.reconciled()).isEqualTo(1);
        assertThat(result.failed()).isZero();
        assertThat(sale.getStatus()).isEqualTo("APROVADO");
        assertThat(sale.getPaymentId()).isEqualTo("12345");
        assertThat(product.getQuantity()).isEqualTo(8);
        verify(productDao, times(1)).updateProduct(product);
    }

    @Test
    void reconciliationFindsApprovedPaymentByPreferenceWhenExternalReferenceSearchIsEmpty() throws Exception {
        when(saleDao.findPendingMercadoPagoSales(7L)).thenReturn(List.of(sale));
        when(mercadoPagoOAuthService.requestMerchantApi(
                eq(7L),
                eq("/v1/payments/search?external_reference=42&sort=date_created&criteria=desc"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"results":[]}
                        """));
        when(mercadoPagoOAuthService.requestMerchantApi(
                eq(7L), eq("/merchant_orders/search?preference_id=preference-42"),
                eq("GET"), isNull(), isNull()))
                .thenReturn(objectMapper.readTree("""
                        {"elements":[{"preference_id":"preference-42",
                          "payments":[{"id":12345,"status":"approved"}]}]}
                        """));

        MercadoPagoWebhookService.ReconciliationResult result = service.reconcilePendingSales(7L);

        assertThat(result.reconciled()).isEqualTo(1);
        assertThat(result.notFound()).isZero();
        assertThat(result.failed()).isZero();
        assertThat(sale.getStatus()).isEqualTo("APROVADO");
        assertThat(sale.getPaymentId()).isEqualTo("12345");
        assertThat(product.getQuantity()).isEqualTo(8);
    }

    private String payload() {
        return "{\"type\":\"payment\",\"data\":{\"id\":\"12345\"}}";
    }

    private String signature(String dataId, String requestId) throws Exception {
        String timestamp = "1700000000000";
        String manifest = "id:" + dataId.toLowerCase() + ";request-id:" + requestId + ";ts:" + timestamp + ";";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String digest = HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        return "ts=" + timestamp + ",v1=" + digest;
    }
}
