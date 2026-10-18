package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/store/plan/subscription")
public class StoreSubscriptionController {
    private static final Logger LOGGER = Logger.getLogger(StoreSubscriptionController.class.getName());

    private final MercadoPagoSubscriptionService subscriptionService;

    public StoreSubscriptionController(MercadoPagoSubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping
    public ResponseEntity<?> start(HttpServletRequest request, @RequestBody StartSubscriptionRequest body) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            if (body == null || body.payerEmail() == null
                    || !body.payerEmail().trim().matches("(?i)^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$")) {
                throw new IllegalArgumentException("Informe um e-mail válido para a cobrança.");
            }
            return ResponseEntity.ok(subscriptionService.startSubscription(storeId, body.payerEmail().trim()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            LOGGER.log(Level.WARNING, "Não foi possível iniciar a assinatura: {0}", exception.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", exception.getMessage()));
        } catch (MercadoPagoSubscriptionApiClient.MercadoPagoSubscriptionApiException exception) {
            String detail = exception.getErrorSummary();
            LOGGER.log(Level.WARNING, "Mercado Pago recusou a criação da assinatura com HTTP {0}: {1}",
                    new Object[]{exception.getStatusCode(), detail});
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(java.util.Map.of("message", "O Mercado Pago recusou a criação da assinatura (HTTP "
                            + exception.getStatusCode() + "). " + detail));
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> sync(HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            return ResponseEntity.ok(subscriptionService.syncSubscription(storeId));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            LOGGER.log(Level.WARNING, "Não foi possível sincronizar a assinatura: {0}", exception.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", exception.getMessage()));
        } catch (MercadoPagoSubscriptionApiClient.MercadoPagoSubscriptionApiException exception) {
            String detail = exception.getErrorSummary();
            LOGGER.log(Level.WARNING, "Mercado Pago recusou a sincronização da assinatura com HTTP {0}: {1}",
                    new Object[]{exception.getStatusCode(), detail});
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(java.util.Map.of("message", "Não foi possível sincronizar a assinatura com o Mercado Pago (HTTP "
                            + exception.getStatusCode() + "). " + detail));
        }
    }

    @PostMapping("/free")
    public ResponseEntity<?> switchToFree(HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            return ResponseEntity.ok(subscriptionService.switchToFreeNow(storeId));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            LOGGER.log(Level.WARNING, "Não foi possível voltar ao plano Grátis: {0}", exception.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", exception.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> cancel(HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        try {
            return ResponseEntity.ok(subscriptionService.cancelSubscription(storeId));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        } catch (IllegalStateException exception) {
            LOGGER.log(Level.WARNING, "Não foi possível cancelar a assinatura: {0}", exception.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("message", exception.getMessage()));
        } catch (MercadoPagoSubscriptionApiClient.MercadoPagoSubscriptionApiException exception) {
            String detail = exception.getErrorSummary();
            LOGGER.log(Level.WARNING, "Mercado Pago recusou o cancelamento da assinatura com HTTP {0}: {1}",
                    new Object[]{exception.getStatusCode(), detail});
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(java.util.Map.of("message", "O Mercado Pago recusou o cancelamento da assinatura (HTTP "
                            + exception.getStatusCode() + "). " + detail));
        }
    }

    public record StartSubscriptionRequest(String payerEmail) {}
}
