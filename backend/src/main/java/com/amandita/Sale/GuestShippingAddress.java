package com.amandita.Sale;

public record GuestShippingAddress(
        String zip,
        String street,
        Long number,
        String district,
        String city,
        String state,
        String reference
) {}
