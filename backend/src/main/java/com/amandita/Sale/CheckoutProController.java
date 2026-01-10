package com.amandita.Sale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
public class CheckoutProController {
    CheckoutProService checkoutProService;

    public CheckoutProController(CheckoutProService checkoutProService) {
        this.checkoutProService = checkoutProService;
    }

    @PostMapping("/credit-card")
    public ResponseEntity<?> createPaymentForCreditCard(@RequestBody PaymentRequestForCreditCard request, HttpServletRequest httpRequest) {
        try {
            return checkoutProService.createPaymentForCreditCard(request, (Long) httpRequest.getAttribute("storeId"));
        } catch (IllegalArgumentException | MPException | MPApiException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @PostMapping("/pix")
    public ResponseEntity<?> createPaymentForPix(@RequestBody PaymentRequestForPix request, HttpServletRequest httpRequest) {
        try {
            return checkoutProService.createPaymentForPix(request, (Long) httpRequest.getAttribute("storeId"));
        } catch (IllegalArgumentException | MPException | MPApiException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> webhook(@RequestBody String payload,
                                          HttpServletRequest httpRequest) {
        try {
            System.out.println("HTTP received: " + httpRequest.getHeader("Host"));
            System.out.println("Webhook by store: " + httpRequest.getAttribute("storeId"));
            checkoutProService.processPayment(payload, (Long) httpRequest.getAttribute("storeId"));
            return ResponseEntity.ok("Accepted");
        } catch (IllegalArgumentException | JsonProcessingException | MPException | MPApiException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @GetMapping("/status/{paymentId}")
    public ResponseEntity<String> getPaymentStatus(@PathVariable("paymentId") Long paymentId, HttpServletRequest httpRequest) {
        try {
            System.out.println("HTTP received: " + httpRequest.getHeader("Host"));
            System.out.println("Status by paymentId: " + paymentId);
            return checkoutProService.getPaymentStatus(paymentId, (Long) httpRequest.getAttribute("storeId"));
        } catch (MPException | MPApiException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }
}
