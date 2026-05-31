package com.amandita.store;

import com.amandita.customer.CustomerDTO;

public record StoreAdminRegistrationResponse(
        String token,
        CustomerDTO admin
) {
}
