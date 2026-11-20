package com.amandita.Sale;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class GuestCustomerDetailsTest {
    @Test
    void validatesCpfCheckDigits() {
        assertThat(GuestCustomerDetails.isValidCpf("52998224725")).isTrue();
        assertThat(GuestCustomerDetails.isValidCpf("52998224724")).isFalse();
        assertThat(GuestCustomerDetails.isValidCpf("11111111111")).isFalse();
    }
}
