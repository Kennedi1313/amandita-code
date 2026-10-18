package com.amandita.store;

import java.math.BigDecimal;

public record AsaasSubaccountRequest(
        String name,
        String email,
        String cpfCnpj,
        String birthDate,
        String companyType,
        String phone,
        String mobilePhone,
        String address,
        String addressNumber,
        String complement,
        String province,
        String postalCode,
        BigDecimal incomeValue
) {}
