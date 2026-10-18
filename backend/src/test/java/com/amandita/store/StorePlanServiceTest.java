package com.amandita.store;

import com.amandita.product.ProductDao;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StorePlanServiceTest {
    private final StoreDao storeDao = mock(StoreDao.class);
    private final ProductDao productDao = mock(ProductDao.class);
    private final StorePlanService service = new StorePlanService(storeDao, productDao);

    @Test
    void manualPlanChangesCannotActivateOrDowngradeAPlanWithoutSubscriptionFlow() {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.COMPLETE);

        assertThatThrownBy(() -> service.changePlan(7L, StorePlan.FREE))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.changePlan(7L, StorePlan.COMPLETE))
                .isInstanceOf(IllegalStateException.class);
        assertThat(store.getPlan()).isEqualTo(StorePlan.COMPLETE);
        verifyNoInteractions(storeDao, productDao);
    }

    @Test
    void activatingSubscriptionDoesNotRepublishProductsThatWerePausedManually() {
        Store store = new Store();
        store.setId(8L);
        store.setPlan(StorePlan.FREE);
        when(storeDao.insertStore(store)).thenReturn(store);
        when(storeDao.findById(8L)).thenReturn(Optional.of(store));
        when(productDao.countPublishedProductsByStore(8L)).thenReturn(3L);

        service.activateComplete(store);
        StorePlanResponse response = service.getPlan(8L);

        assertThat(store.getPlan()).isEqualTo(StorePlan.COMPLETE);
        assertThat(response.plan()).isEqualTo(StorePlan.COMPLETE);
        assertThat(response.publishedProducts()).isEqualTo(3);
        assertThat(response.publishedProductLimit()).isNull();
        verify(storeDao).insertStore(store);
        verify(productDao, never()).unpublishAllProductsByStore(anyLong());
    }
}
