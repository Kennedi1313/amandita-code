package com.amandita.customer;

import java.util.List;
import java.util.Set;

public record CustomerDTO(
        Integer id,
        String name,
        String email,
        Gender gender,
        Integer age,
        List<String> roles,
        String username,
        String profileImageId,
        String phone,
        Set<AddressDTO> addresses,
        String cpf) {

}
