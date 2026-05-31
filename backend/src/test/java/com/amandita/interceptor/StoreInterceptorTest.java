package com.amandita.interceptor;

import com.amandita.jwt.JWTUtil;
import com.amandita.store.StoreDao;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class StoreInterceptorTest {

    private StoreInterceptor underTest;
    private JWTUtil jwtUtil;

    @BeforeEach
    void setUp() {
        StoreDao storeDao = mock(StoreDao.class);
        jwtUtil = new JWTUtil("local-dev-jwt-secret-change-before-production-2026-05-29");
        underTest = new StoreInterceptor(storeDao, jwtUtil);
    }

    @Test
    void blocksStoreScopedRequestsWhenTokenHasNoStoreId() {
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/v1/store/info");
        request.addHeader("Authorization", "Bearer " + jwtUtil.issueToken("admin@example.com", List.of("ROLE_ADMIN"), null));
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = underTest.preHandle(request, response, new Object());

        assertThat(allowed).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void allowsTenantStoreCreationWhenTokenHasNoStoreId() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/tenants/store");
        request.addHeader("Authorization", "Bearer " + jwtUtil.issueToken("admin@example.com", List.of("ROLE_ADMIN"), null));
        MockHttpServletResponse response = new MockHttpServletResponse();

        boolean allowed = underTest.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
    }

    @Test
    void normalizesWwwStoreDomainHeader() {
        com.amandita.store.Store store = new com.amandita.store.Store();
        store.setId(12L);
        StoreDao storeDao = mock(StoreDao.class);
        org.mockito.Mockito.when(storeDao.findByDomain("loja.com.br")).thenReturn(Optional.of(store));
        StoreInterceptor interceptor = new StoreInterceptor(storeDao, jwtUtil);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/store/info");
        request.addHeader("X-Store-Domain", "www.loja.com.br");

        boolean allowed = interceptor.preHandle(request, new MockHttpServletResponse(), new Object());

        assertThat(allowed).isTrue();
        assertThat(request.getAttribute("storeId")).isEqualTo(12L);
    }
}
