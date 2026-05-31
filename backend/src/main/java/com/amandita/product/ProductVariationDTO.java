package com.amandita.product;

import java.util.Map;

public record ProductVariationDTO (
        Integer id,
        Map<String, String> options,
        String sku,
        String price,
        String quantity,
        Integer promo
) { }
