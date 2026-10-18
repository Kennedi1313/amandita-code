package com.amandita.product;

import java.util.List;

public record ProductRegistrationRequest(
        String name,
        String description,
        String originalPrice,
        String price,
        Integer quantity,
        String category,
        Integer promo,
        String profileImageId,
        String productType,
        List<ProductVariationDTO> variations,
        java.math.BigDecimal weightKg,
        Integer widthCm,
        Integer heightCm,
        Integer lengthCm
) {
    public ProductRegistrationRequest(
            String name,
            String description,
            String originalPrice,
            String price,
            Integer quantity,
            String category,
            Integer promo,
            String profileImageId,
            String productType,
            List<ProductVariationDTO> variations
    ) {
        this(name, description, originalPrice, price, quantity, category, promo,
                profileImageId, productType, variations, null, null, null, null);
    }
}


