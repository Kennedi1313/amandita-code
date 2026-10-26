package com.amandita.Sale;

import com.amandita.customer.Customer;
import com.amandita.product.Product;
import com.amandita.store.MercadoPagoOAuthService;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.amandita.store.StorePlan;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MercadoPagoCheckoutServiceTest {
    @Test
    void localStoreUsesHttpsReturnHostWithoutPortForMercadoPago() {
        MercadoPagoCheckoutService service = new MercadoPagoCheckoutService(
                mock(AsaasCheckoutService.class),
                mock(SaleDao.class),
                mock(StoreDao.class),
                mock(MercadoPagoOAuthService.class),
                new ObjectMapper(),
                "https://example.com/api/v1/payment/mercadopago/webhook",
                "webhook-secret",
                "",
                "");
        Store store = new Store();
        store.setDomain("localhost");

        assertThat(service.storefrontBaseUrl(store)).isEqualTo("https://localhost");
    }

    @Test
    void preferenceIncludesProductCategoryAndDescription() throws Exception {
        AsaasCheckoutService saleCheckout = mock(AsaasCheckoutService.class);
        SaleDao saleDao = mock(SaleDao.class);
        StoreDao storeDao = mock(StoreDao.class);
        MercadoPagoOAuthService mercadoPagoOAuthService = mock(MercadoPagoOAuthService.class);
        ObjectMapper objectMapper = new ObjectMapper();
        MercadoPagoCheckoutService service = new MercadoPagoCheckoutService(
                saleCheckout, saleDao, storeDao, mercadoPagoOAuthService, objectMapper,
                "https://example.com/api/v1/payment/mercadopago/webhook", "webhook-secret", "", "");

        Store store = new Store();
        store.setId(7L);
        store.setName("Loja Teste");
        store.setDomain("https://loja.example.com");
        store.setPlan(StorePlan.COMPLETE);
        store.setMpAccessToken("connected");
        when(storeDao.findById(7L)).thenReturn(Optional.of(store));

        Product product = new Product();
        product.setId(11);
        product.setName("Camisa verde");
        product.setCategory("Roupas");
        product.setDescription("Camisa de algodão");
        SaleItem saleItem = new SaleItem();
        saleItem.setProduct(product);
        saleItem.setQuantity(1);
        saleItem.setPrice(2900);

        Customer customer = new Customer();
        customer.setEmail("cliente@example.com");
        Sale sale = new Sale();
        sale.setId(42L);
        sale.setCustomer(customer);
        sale.setSaleItems(List.of(saleItem));
        sale.setTotalPrice(2900.0);
        when(saleCheckout.createPendingSaleForProvider(any(), eq(7L), eq("cliente@example.com"), eq("MERCADO_PAGO")))
                .thenReturn(sale);
        when(mercadoPagoOAuthService.requestMerchantApi(
                eq(7L), eq("/checkout/preferences"), eq("POST"), any(JsonNode.class), eq("mp-sale-42")))
                .thenReturn(objectMapper.readTree("""
                        {"id":"preference-42","init_point":"https://checkout.example.com"}
                        """));

        SaleRequest saleRequest = new SaleRequest();
        saleRequest.setSaleItemRequests(List.of(new SaleItemRequest(11, 1)));
        saleRequest.setCustomerEmail("cliente@example.com");

        service.createCheckout(new MercadoPagoCheckoutRequest(saleRequest), 7L, "cliente@example.com");

        ArgumentCaptor<JsonNode> preferenceCaptor = ArgumentCaptor.forClass(JsonNode.class);
        verify(mercadoPagoOAuthService).requestMerchantApi(
                eq(7L), eq("/checkout/preferences"), eq("POST"),
                preferenceCaptor.capture(), eq("mp-sale-42"));
        JsonNode item = preferenceCaptor.getValue().path("items").get(0);
        assertThat(item.path("category_id").asText()).isEqualTo("Roupas");
        assertThat(item.path("description").asText()).isEqualTo("Camisa de algodão");
        assertThat(preferenceCaptor.getValue().path("back_urls").path("success").asText())
                .startsWith("https://loja.example.com/success?");
    }
}
