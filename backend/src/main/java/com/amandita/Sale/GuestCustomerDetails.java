package com.amandita.Sale;

public record GuestCustomerDetails(String name, String email, String phone, String cpf) {
    public static boolean isValidCpf(String cpf) {
        if (cpf == null || !cpf.matches("\\d{11}") || cpf.matches("(\\d)\\1{10}")) return false;
        for (int length = 9; length <= 10; length++) {
            int sum = 0;
            for (int index = 0; index < length; index++) {
                sum += Character.digit(cpf.charAt(index), 10) * (length + 1 - index);
            }
            int remainder = (sum * 10) % 11;
            int digit = remainder == 10 ? 0 : remainder;
            if (digit != Character.digit(cpf.charAt(length), 10)) return false;
        }
        return true;
    }
}
