package com.amandita.product;

import java.time.LocalDateTime;

public record ProductReviewResponse(Long id, Long saleItemId, Integer productId, String productName,
                                    String reviewerName, Integer rating, String title,
                                    String comment, String status, LocalDateTime createdAt) {
    public static ProductReviewResponse from(ProductReview review) {
        return new ProductReviewResponse(review.getId(), review.getSaleItem().getId(),
                review.getProduct().getId(), review.getProduct().getName(), review.getReviewerName(),
                review.getRating(), review.getTitle(), review.getComment(), review.getStatus(), review.getCreatedAt());
    }
}
