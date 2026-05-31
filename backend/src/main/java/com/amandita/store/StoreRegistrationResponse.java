package com.amandita.store;

import com.amandita.customer.CustomerDTO;

public record StoreRegistrationResponse(
        String token,
        CustomerDTO admin,
        Long storeId,
        String storeName,
        String domain,
        String publicUrl,
        String adminUrl
) {
}
