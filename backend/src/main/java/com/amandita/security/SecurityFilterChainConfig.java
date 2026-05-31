package com.amandita.security;

import com.amandita.jwt.JWTAuthenticationFilter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityFilterChainConfig {

    private final AuthenticationProvider authenticationProvider;
    private final JWTAuthenticationFilter jwtAuthenticationFilter;
    private final AuthenticationEntryPoint authenticationEntryPoint;

    public SecurityFilterChainConfig(AuthenticationProvider authenticationProvider,
                                     JWTAuthenticationFilter jwtAuthenticationFilter,
                                     @Qualifier("delegatedAuthEntryPoint") AuthenticationEntryPoint authenticationEntryPoint) {
        this.authenticationProvider = authenticationProvider;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf().disable()
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/v1/auth/login").permitAll()
                .requestMatchers("/api/v1/auth/google").permitAll()
                .requestMatchers("/api/v1/auth/admin/login").permitAll()
                .requestMatchers("/api/v1/auth/admin/google").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tenants/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tenants/admin").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tenants/admin/google").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/tenants/store").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/customers").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/payment/credit-card").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/payment/pix").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/payment/webhook").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/payment/asaas/checkout").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/payment/asaas/webhook").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/melhorenvio/callback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/melhorenvio/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/ping").permitAll()
                .requestMatchers(HttpMethod.GET, "/actuator/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/store/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/store/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/store/categories/no-store").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/store/images/{type}").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/v1/store/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/store/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/store/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products/sales/email/{email}").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/sales/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products/sales").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/products/sales").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/no-store").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products/by-category").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/by-category/no-store").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products/by-name").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/{productId}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/{productId}/no-store").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/products/{productId}/profile-image").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/products/{productId}/images").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/products/sell").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/products/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/payment/status/{paymentId}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/customers/{customerId}/profile-image").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/customers/email/{email}").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/customers/cpf/{cpf}").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/customers/{customerId}").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/customers").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/customers/{customerId}").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/customers/{customerId}/profile-image").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/customers/**").hasRole("ADMIN")
                .anyRequest().authenticated()
                .and()
                .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                .and()
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling()
                .authenticationEntryPoint(authenticationEntryPoint);
        return http.build();
    }

}
