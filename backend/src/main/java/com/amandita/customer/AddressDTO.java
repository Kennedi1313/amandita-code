package com.amandita.customer;

public record AddressDTO (
    String zip,
    String street,
    Long number,
    String district,
    String city,
    String reference
){
    public AddressDTO(Address address) {
        this(
                address.getZip(),
                address.getStreet(),
                address.getNumber(),
                address.getDistrict(),
                address.getCity(),
                address.getReference()
        );
    }
}
