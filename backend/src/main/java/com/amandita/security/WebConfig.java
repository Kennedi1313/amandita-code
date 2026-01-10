package com.amandita.security;

import com.amandita.interceptor.StoreInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final StoreInterceptor storeInterceptor;

    public WebConfig(StoreInterceptor storeInterceptor) {
        this.storeInterceptor = storeInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(storeInterceptor)
                .addPathPatterns("/api/**"); // Interceptar só as rotas da API
    }
}
