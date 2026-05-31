package com.amandita.store;

public record StoreRegistrationRequest(
        String ownerName,
        String email,
        String password,
        String storeName,
        String subdomain,
        String whatsapp,
        String googleCredential
) {
}
