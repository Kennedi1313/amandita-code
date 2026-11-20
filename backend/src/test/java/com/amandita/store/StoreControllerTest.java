package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class StoreControllerTest {

    @Test
    void returnsNotFoundWhenStoreDomainCannotBeResolved() {
        StoreDao storeDao = mock(StoreDao.class);
        StoreController controller = new StoreController(
                storeDao,
                mock(CategoryDao.class),
                mock(StoreImageService.class),
                mock(AsaasSubaccountService.class),
                mock(LocalDeliveryService.class),
                mock(MercadoPagoOAuthService.class),
                mock(StorePlanService.class),
                mock(StoreDeletionService.class),
                "");

        HttpServletRequest request = mock(HttpServletRequest.class);
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getStoreInfo(request));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verifyNoInteractions(storeDao);
    }
}
