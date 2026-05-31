package com.amandita.store;

public record StoreAdminRegistrationRequest(
        String ownerName,
        String email,
        String password
) {
}
