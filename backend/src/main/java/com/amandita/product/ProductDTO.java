package com.amandita.product;

import java.util.List;

public record ProductDTO(
    Integer id,
    String name,
    String description,
    Integer originalPrice,
    String price,
    Integer quantity,
    String category,
    String profileImageId,
    Integer promo,
    List<String> imagesIds,
    List<ProductVariationDTO> variations
) { }
