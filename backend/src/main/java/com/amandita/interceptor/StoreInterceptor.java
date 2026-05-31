package com.amandita.interceptor;

import com.amandita.jwt.JWTUtil;
import com.amandita.store.StoreDao;
import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.net.URI;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

@Component
public class StoreInterceptor implements HandlerInterceptor {

    private final StoreDao storeDao;
    private final JWTUtil jwtUtil;

    public StoreInterceptor(StoreDao storeDao, JWTUtil jwtUtil) {
        this.storeDao = storeDao;
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @Nullable HttpServletResponse response, @Nullable Object handler) {
        if (hasAuthorizationWithoutStore(request) && isStoreScopedRequest(request)) {
            if (response != null) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            }
            return false;
        }
        resolveStoreId(request).ifPresent(storeId -> request.setAttribute("storeId", storeId));
        return true;
    }

    private boolean hasAuthorizationWithoutStore(HttpServletRequest request) {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return false;
        }
        try {
            return jwtUtil.getStoreId(authorizationHeader.substring(7)) == null;
        } catch (Exception exception) {
            return false;
        }
    }

    private boolean isStoreScopedRequest(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equals(method) && "/api/v1/tenants/store".equals(path)) {
            return false;
        }
        if (path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/tenants/")) {
            return false;
        }
        if (!path.startsWith("/api/v1/")) {
            return false;
        }
        return path.startsWith("/api/v1/store")
                || path.startsWith("/api/v1/products")
                || path.startsWith("/api/v1/customers")
                || path.startsWith("/api/v1/payment/asaas/checkout")
                || path.startsWith("/api/v1/melhorenvio");
    }

    private Optional<Long> resolveStoreId(HttpServletRequest request) {
        Optional<Long> authenticatedStoreId = getStoreIdFromAuthorization(request.getHeader("Authorization"));
        if (authenticatedStoreId.isPresent()) {
            return authenticatedStoreId;
        }

        Set<String> candidates = new LinkedHashSet<>();

        addCandidate(candidates, request.getHeader("X-Store-Domain"));
        addCandidate(candidates, request.getParameter("storeDomain"));
        addCandidate(candidates, extractHost(request.getHeader("Origin")));
        addCandidate(candidates, extractHost(request.getHeader("Referer")));
        addCandidate(candidates, request.getHeader("Host"));

        for (String candidate : candidates) {
            Optional<Long> storeId = storeDao.findByDomain(candidate).map(store -> store.getId());
            if (storeId.isPresent()) {
                return storeId;
            }
        }
        return Optional.empty();
    }

    private void addCandidate(Set<String> candidates, String value) {
        normalizeHost(value).ifPresent(host -> {
            candidates.add(host);
        });
    }

    private String extractHost(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return URI.create(value).getHost();
        } catch (IllegalArgumentException exception) {
            return value;
        }
    }

    private Optional<String> normalizeHost(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }

        String host = value.trim().toLowerCase();
        if (host.startsWith("http://") || host.startsWith("https://")) {
            host = extractHost(host);
            if (host == null) {
                return Optional.empty();
            }
        }

        int colonIndex = host.indexOf(':');
        if (colonIndex > 0) {
            host = host.substring(0, colonIndex);
        }
        if (host.startsWith("www.")) {
            host = host.substring(4);
        }

        return host.isBlank() ? Optional.empty() : Optional.of(host);
    }

    private Optional<Long> getStoreIdFromAuthorization(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }

        try {
            return Optional.ofNullable(jwtUtil.getStoreId(authorizationHeader.substring(7)));
        } catch (Exception exception) {
            return Optional.empty();
        }
    }
}
