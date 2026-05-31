package com.amandita.store;

public record StoreCreationRequest(
        String storeName,
        String subdomain,
        String whatsapp
) {
}
