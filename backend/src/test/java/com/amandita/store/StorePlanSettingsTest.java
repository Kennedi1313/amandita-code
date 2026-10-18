package com.amandita.store;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class StorePlanSettingsTest {
    private final StoreDao storeDao = mock(StoreDao.class);
    private final MercadoPagoOAuthService mercadoPagoOAuthService = mock(MercadoPagoOAuthService.class);
    private final StoreController controller = new StoreController(
            storeDao,
            mock(CategoryDao.class),
            mock(StoreImageService.class),
            mock(AsaasSubaccountService.class),
            mock(LocalDeliveryService.class),
            mercadoPagoOAuthService,
            mock(StorePlanService.class),
            "public-key"
    );

    @Test
    void freePlanCannotStartMercadoPagoConnection() {
        Store store = new Store();
        store.setId(4L);
        when(storeDao.findById(4L)).thenReturn(Optional.of(store));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("storeId", 4L);

        var response = controller.mercadoPagoConnect(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        verifyNoInteractions(mercadoPagoOAuthService);
    }

    @Test
    void freePlanCannotChangeSavedLocalDeliverySettingsThroughStoreUpdate() {
        Store store = new Store();
        store.setId(5L);
        store.setLocalDeliveryEnabled(true);
        store.setLocalDeliveryFee(1200);
        store.setFreeShippingMinAmount(5000);
        store.setShippingOriginZip("29000000");
        store.setLocalDeliveryEta("1 a 2 dias");
        store.setDeliveryDistanceRanges(List.of(
                new DeliveryDistanceRange(BigDecimal.valueOf(10), 1200)));
        when(storeDao.findById(5L)).thenReturn(Optional.of(store));
        when(storeDao.insertStore(store)).thenReturn(store);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("storeId", 5L);
        StoreUpdateRequest update = new StoreUpdateRequest(
                "Loja atualizada", null, null, null, null, null, null, null,
                true, null, false, 0, 0, "", "", List.of(new DeliveryDistanceRange(null, -1)));

        controller.updateStoreInfo(update, request);

        assertThat(store.getLocalDeliveryEnabled()).isTrue();
        assertThat(store.getLocalDeliveryFee()).isEqualTo(1200);
        assertThat(store.getFreeShippingMinAmount()).isEqualTo(5000);
        assertThat(store.getShippingOriginZip()).isEqualTo("29000000");
        assertThat(store.getLocalDeliveryEta()).isEqualTo("1 a 2 dias");
        assertThat(store.getDeliveryDistanceRanges())
                .containsExactly(new DeliveryDistanceRange(BigDecimal.valueOf(10), 1200));
    }
}
