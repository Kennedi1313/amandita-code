package com.amandita.interceptor;

import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class StoreInterceptor implements HandlerInterceptor {

    private final StoreDao storeDao;

    public StoreInterceptor(StoreDao storeDao) {
        this.storeDao = storeDao;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, @Nullable HttpServletResponse response, @Nullable Object handler) {
        String host = request.getHeader("Host");

        if (host != null && host.startsWith("api.")) {
            host = host.substring(4);
        }

        storeDao.findByDomain(host).ifPresent(store -> request.setAttribute("storeId", store.getId()));
        return true;
    }
}
