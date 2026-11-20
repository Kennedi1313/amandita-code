package com.amandita.product;

import com.amandita.customer.Customer;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/reviews")
public class ProductReviewController {
    private final ProductReviewService service;

    public ProductReviewController(ProductReviewService service) {
        this.service = service;
    }

    @GetMapping("/products/{productId}")
    public List<ProductReviewResponse> publicReviews(@PathVariable Integer productId, HttpServletRequest request) {
        return service.publicReviews((Long) request.getAttribute("storeId"), productId);
    }

    @PostMapping
    public ResponseEntity<ProductReviewResponse> create(@RequestBody ProductReviewRequest body,
                                                        HttpServletRequest request,
                                                        Authentication authentication) {
        Customer customer = (Customer) authentication.getPrincipal();
        return ResponseEntity.status(201).body(service.create(
                (Long) request.getAttribute("storeId"), customer, body));
    }

    @GetMapping("/mine")
    public List<Long> mine(HttpServletRequest request, Authentication authentication) {
        Customer customer = (Customer) authentication.getPrincipal();
        return service.reviewedSaleItemIds((Long) request.getAttribute("storeId"), customer.getId());
    }

    @GetMapping("/admin")
    public List<ProductReviewResponse> adminReviews(HttpServletRequest request) {
        return service.adminReviews((Long) request.getAttribute("storeId"));
    }

    @PatchMapping("/admin/{reviewId}")
    public ProductReviewResponse setStatus(@PathVariable Long reviewId, @RequestBody ReviewStatusRequest body,
                                          HttpServletRequest request) {
        return service.setStatus((Long) request.getAttribute("storeId"), reviewId, body.status());
    }

    public record ReviewStatusRequest(String status) {}
}
