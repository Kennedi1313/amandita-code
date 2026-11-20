package com.amandita.product;

public record ProductReviewRequest(Long saleItemId, Integer rating, String title, String comment) {}
