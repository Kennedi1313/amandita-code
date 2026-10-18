package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.net.URI;

@RestController
@RequestMapping("/api/v1/mercadopago/subscriptions")
public class MercadoPagoSubscriptionWebhookController {
    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoSubscriptionWebhookController.class);
    private final MercadoPagoSubscriptionService subscriptionService;
    private final String adminUrl;

    public MercadoPagoSubscriptionWebhookController(
            MercadoPagoSubscriptionService subscriptionService,
            @Value("${saas.admin-url:http://localhost:4173}") String adminUrl) {
        this.subscriptionService = subscriptionService;
        this.adminUrl = StringUtils.removeEnd(adminUrl.trim(), "/");
    }

    @GetMapping("/return")
    public ResponseEntity<Void> returnToAdmin() {
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(adminUrl + "/dashboard/plan?subscription=return"));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestParam(name = "data.id", required = false) String dataId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String topic,
            @RequestHeader(name = "x-request-id", required = false) String requestId,
            @RequestHeader(name = "x-signature", required = false) String signature,
            @RequestBody String payload,
            HttpServletRequest request) {
        String eventType = StringUtils.defaultIfBlank(type, topic);
        if (StringUtils.isBlank(eventType)) {
            eventType = request.getParameter("action");
        }
        logger.info("Received Mercado Pago subscription webhook: type={}, dataId={}", eventType, dataId);
        try {
            subscriptionService.processNotification(dataId, requestId, signature, eventType, payload);
            logger.info("Processed Mercado Pago subscription webhook: type={}, dataId={}", eventType, dataId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException exception) {
            logger.warn("Rejected Mercado Pago subscription webhook: type={}, dataId={}, reason={}",
                    eventType, dataId, exception.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception exception) {
            logger.error("Failed to process Mercado Pago subscription webhook", exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
