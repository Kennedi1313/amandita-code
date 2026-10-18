package com.amandita.store;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
public class MercadoPagoOAuthController {
    private final MercadoPagoOAuthService mercadoPagoOAuthService;

    public MercadoPagoOAuthController(MercadoPagoOAuthService mercadoPagoOAuthService) {
        this.mercadoPagoOAuthService = mercadoPagoOAuthService;
    }

    @GetMapping("/api/v1/mercadopago/callback")
    public void callback(@RequestParam(required = false) String code,
                         @RequestParam(required = false) String state,
                         @RequestParam(required = false, name = "error") String oauthError,
                         HttpServletResponse response) throws IOException {
        try {
            response.sendRedirect(mercadoPagoOAuthService.handleCallback(code, state, oauthError));
        } catch (IllegalArgumentException | IllegalStateException e) {
            response.sendRedirect(mercadoPagoOAuthService.failureRedirect());
        }
    }
}
