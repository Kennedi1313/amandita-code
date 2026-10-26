package com.amandita.store;

public record PickupAddress(
        String zip,
        String street,
        String number,
        String district,
        String city,
        String state,
        String reference
) {}
