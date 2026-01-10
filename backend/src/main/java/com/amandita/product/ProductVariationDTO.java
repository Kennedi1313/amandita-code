package com.amandita.product;

import java.util.Map;

public record ProductVariationDTO (
        Map<String, String> options,
        String sku,
        String price,
        String quantity,
        Integer promo
) { }
