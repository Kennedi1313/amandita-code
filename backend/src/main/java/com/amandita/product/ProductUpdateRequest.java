package com.amandita.product;

import java.util.List;


public record ProductUpdateRequest(
        String name,
        String description,
        String originalPrice,
        String price,
        Integer quantity,
        String category,
        Integer promo,
        List<String> imagesToDelete,
        List<ProductVariationDTO> variations
) { }
