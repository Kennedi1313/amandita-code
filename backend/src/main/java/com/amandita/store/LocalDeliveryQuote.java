package com.amandita.store;

import java.math.BigDecimal;

public record LocalDeliveryQuote(boolean available, BigDecimal distanceKm, Integer fee, String message) {
}
