package com.amandita.Sale;

import com.amandita.customer.Customer;
import org.apache.commons.lang3.StringUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/v1/payment/mercadopago")
public class MercadoPagoPaymentController {
    private static final Logger LOGGER = LoggerFactory.getLogger(MercadoPagoPaymentController.class);

    private final MercadoPagoCheckoutService checkoutService;
    private final MercadoPagoWebhookService webhookService;
    private final SaleDao saleDao;

    public MercadoPagoPaymentController(MercadoPagoCheckoutService checkoutService,
                                       MercadoPagoWebhookService webhookService, SaleDao saleDao) {
        this.checkoutService = checkoutService;
        this.webhookService = webhookService;
        this.saleDao = saleDao;
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> createCheckout(@RequestBody MercadoPagoCheckoutRequest checkoutRequest,
                                            HttpServletRequest request, Authentication authentication) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            return ResponseEntity.ok(checkoutService.createCheckout(
                    checkoutRequest, storeId, authenticatedEmail(authentication)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            LOGGER.warn("Could not start Mercado Pago checkout for store {}: {}", storeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            LOGGER.error("Unexpected error starting Mercado Pago checkout for store {}", storeId, e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Não foi possível iniciar o Checkout Pro.");
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestParam(name = "store_id") Long storeId,
                                        @RequestParam(name = "data.id", required = false) String dataId,
                                        @RequestHeader(name = "x-request-id", required = false) String requestId,
                                        @RequestHeader(name = "x-signature", required = false) String signature,
                                        @RequestBody String payload) {
        try {
            webhookService.processPaymentNotification(storeId, dataId, requestId, signature, payload);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/reconcile-pending")
    public ResponseEntity<MercadoPagoWebhookService.ReconciliationResult> reconcilePendingSales(
            HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            return ResponseEntity.ok(webhookService.reconcilePendingSales(storeId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    @GetMapping("/sale/{saleId}")
    public ResponseEntity<?> saleStatus(@PathVariable Long saleId, HttpServletRequest request,
                                        Authentication authentication) {
        Long storeId = (Long) request.getAttribute("storeId");
        if (storeId == null) return ResponseEntity.badRequest().body("Loja não identificada.");
        String email = authenticatedEmail(authentication);
        return saleDao.findByIdAndStoreId(saleId, storeId)
                .filter(sale -> sale.getCustomer() != null && StringUtils.equalsIgnoreCase(email, sale.getCustomer().getEmail()))
                .<ResponseEntity<?>>map(sale -> ResponseEntity.ok(new MercadoPagoSaleStatus(sale.getId(), sale.getStatus())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private String authenticatedEmail(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Customer customer) return customer.getEmail();
        throw new IllegalArgumentException("Cliente autenticado não identificado.");
    }

    public record MercadoPagoSaleStatus(Long saleId, String status) {}

}
