package com.amandita.customer;

public record CustomerRegistrationRequest(
        String name,
        String email,
        String password,
        Integer age,
        Gender gender,
        String phone,
        String cpf,
        String role,
        String zip,
        String street,
        Long number,
        String district,
        String city,
        String reference
) {
}
