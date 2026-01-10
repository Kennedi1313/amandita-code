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
        List<ProductVariationDTO> variations
) { }


