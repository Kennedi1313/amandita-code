package com.amandita.Sale;

public record AsaasCheckoutResponse(
        Long saleId,
        String checkoutId,
        String checkoutUrl
) {
}
