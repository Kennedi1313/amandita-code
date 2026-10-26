package com.amandita.store;

public record CategoryRequest(
        String name,
        java.math.BigDecimal weightKg,
        Integer widthCm,
        Integer heightCm,
        Integer lengthCm
) {
}
