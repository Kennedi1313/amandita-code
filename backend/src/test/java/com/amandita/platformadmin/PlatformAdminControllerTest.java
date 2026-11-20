package com.amandita.platformadmin;

import com.amandita.Sale.SaleRepository;
import com.amandita.customer.CustomerRepository;
import com.amandita.store.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class PlatformAdminControllerTest {

    @Test
    void rejectsAccessWhenCodeIsNotConfigured() {
        PlatformAdminController controller = controller("");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.overview(30, "secret-code-that-is-long-enough"));

        assertEquals(503, exception.getStatusCode().value());
    }

    @Test
    void rejectsMissingAndIncorrectAccessCodes() {
        PlatformAdminController controller = controller("secret-code-that-is-long-enough-12345");

        ResponseStatusException missing = assertThrows(
                ResponseStatusException.class,
                () -> controller.overview(30, null));
        ResponseStatusException incorrect = assertThrows(
                ResponseStatusException.class,
                () -> controller.overview(30, "incorrect-code"));

        assertEquals(401, missing.getStatusCode().value());
        assertEquals(401, incorrect.getStatusCode().value());
    }

    private PlatformAdminController controller(String accessCode) {
        return new PlatformAdminController(
                mock(StoreRepository.class),
                mock(CustomerRepository.class),
                mock(SaleRepository.class),
                mock(PlatformAnalyticsService.class),
                accessCode);
    }
}
