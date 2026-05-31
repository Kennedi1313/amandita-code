package com.amandita.Sale;

public record AsaasCheckoutRequest(
        SaleRequest saleRequest,
        String returnBaseUrl
) {
}
