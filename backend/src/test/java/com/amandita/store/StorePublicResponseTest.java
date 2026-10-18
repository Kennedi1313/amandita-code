package com.amandita.store;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StorePublicResponseTest {
    @Test
    void freePlanDoesNotExposePaidStorefrontFeatures() {
        Store store = new Store();
        store.setId(10L);
        store.setPlan(StorePlan.FREE);
        store.setMpAccessToken("connected-token");
        store.setAsaasWalletId("connected-wallet");
        store.setMercadoPagoPublicKey("store-public-key");
        store.setLocalDeliveryEnabled(true);
        store.setDeliveryDistanceRanges(List.of(new DeliveryDistanceRange(BigDecimal.valueOf(5), 1000)));

        StorePublicResponse response = StorePublicResponse.fromEntity(store, "platform-public-key");

        assertThat(response.plan()).isEqualTo(StorePlan.FREE);
        assertThat(response.mercadoPagoConfigured()).isFalse();
        assertThat(response.asaasConfigured()).isFalse();
        assertThat(response.mercadoPagoPublicKey()).isNull();
        assertThat(response.localDeliveryEnabled()).isFalse();
        assertThat(response.deliveryDistanceRanges()).isEmpty();
    }

    @Test
    void publicStoreResponseIncludesTheConfiguredHeaderBackgroundColor() {
        Store store = new Store();
        store.setId(12L);
        store.setHeaderBackgroundColor("#214F39");

        StorePublicResponse response = StorePublicResponse.fromEntity(store, null);

        assertThat(response.headerBackgroundColor()).isEqualTo("#214F39");
    }

    @Test
    void adminSettingsKeepPaidFeatureConfigurationForWhenPlanChanges() {
        Store store = new Store();
        store.setId(11L);
        store.setPlan(StorePlan.FREE);
        store.setMpAccessToken("connected-token");
        store.setLocalDeliveryEnabled(true);

        StorePublicResponse response = StorePublicResponse.fromEntityForAdmin(store, "platform-public-key");

        assertThat(response.mercadoPagoConfigured()).isTrue();
        assertThat(response.mercadoPagoPublicKey()).isEqualTo("platform-public-key");
        assertThat(response.localDeliveryEnabled()).isTrue();
    }
}
