package com.amandita.Sale;

import com.amandita.customer.Customer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/v1/payment")
public class CheckoutProController {
    CheckoutProService checkoutProService;
    AsaasCheckoutService asaasCheckoutService;
    private final String asaasWebhookToken;

    public CheckoutProController(CheckoutProService checkoutProService,
                                 AsaasCheckoutService asaasCheckoutService,
                                 @Value("${asaas.webhook-token:}") String asaasWebhookToken) {
        this.checkoutProService = checkoutProService;
        this.asaasCheckoutService = asaasCheckoutService;
        this.asaasWebhookToken = asaasWebhookToken;
    }

    @PostMapping("/credit-card")
    public ResponseEntity<?> createPaymentForCreditCard(@RequestBody PaymentRequestForCreditCard request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body("Mercado Pago foi desativado. Use o checkout Asaas.");
    }

    @PostMapping("/pix")
    public ResponseEntity<?> createPaymentForPix(@RequestBody PaymentRequestForPix request, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body("Mercado Pago foi desativado. Use o checkout Asaas.");
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(@RequestBody String payload,
                                          HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body("Mercado Pago foi desativado.");
    }

    @PostMapping("/asaas/checkout")
    public ResponseEntity<?> createAsaasCheckout(@RequestBody AsaasCheckoutRequest request,
                                                 HttpServletRequest httpRequest,
                                                 Authentication authentication) {
        try {
            return ResponseEntity.ok(asaasCheckoutService.createCheckout(
                    request,
                    (Long) httpRequest.getAttribute("storeId"),
                    authenticatedEmail(authentication)
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(502).body(e.getMessage());
        }
    }

    @PostMapping("/asaas/webhook")
    public ResponseEntity<String> asaasWebhook(@RequestBody String payload,
                                               @RequestHeader(value = "asaas-access-token", required = false) String webhookToken) {
        if (!validAsaasWebhookToken(webhookToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid webhook token");
        }
        try {
            asaasCheckoutService.processWebhook(payload);
            return ResponseEntity.ok("Accepted");
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    private String authenticatedEmail(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Customer customer) {
            return customer.getEmail();
        }
        throw new IllegalArgumentException("Cliente autenticado não identificado.");
    }

    private boolean validAsaasWebhookToken(String webhookToken) {
        if (StringUtils.isBlank(asaasWebhookToken) || StringUtils.isBlank(webhookToken)) {
            return false;
        }
        return MessageDigest.isEqual(
                asaasWebhookToken.getBytes(StandardCharsets.UTF_8),
                webhookToken.getBytes(StandardCharsets.UTF_8)
        );
    }

    @GetMapping("/status/{paymentId}")
    public ResponseEntity<String> getPaymentStatus(@PathVariable("paymentId") Long paymentId, HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.GONE).body("Mercado Pago foi desativado.");
    }
}
