package com.amandita.store;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record StorePlanResponse(
        StorePlan plan,
        long publishedProducts,
        Integer publishedProductLimit,
        String subscriptionStatus,
        String subscriptionCheckoutUrl,
        OffsetDateTime nextPaymentAt,
        OffsetDateTime paidThrough,
        String lastPaymentStatus,
        BigDecimal monthlyPrice
) {
}
