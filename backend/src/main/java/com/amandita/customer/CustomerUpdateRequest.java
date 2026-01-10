package com.amandita.customer;

public record CustomerUpdateRequest(
        String name,
        Integer age,
        Role role,
        String cpf,
        String phone,
        String zip,
        String street,
        Long number,
        String district,
        String city,
        String reference
) {
}
