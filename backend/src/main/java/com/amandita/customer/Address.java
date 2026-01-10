package com.amandita.customer;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(
        name = "address"
)
public class Address {
    @Id
    @SequenceGenerator(
            name = "address_id_seq",
            sequenceName = "address_id_seq",
            allocationSize = 1
    )
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "address_id_seq"
    )
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    @JsonBackReference
    private Customer customer;

    @Column(nullable = false)
    private String zip;

    @Column(nullable = false)
    private String street;

    @Column(nullable = false)
    private Long number;

    @Column(nullable = false)
    private String district;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String reference;

    private Address() {}

    public Address(String zip, String street, Long number, String district, String city, String reference) {
        this.zip = zip;
        this.street = street;
        this.number = number;
        this.district = district;
        this.city = city;
        this.reference = reference;
    }

    public Address(Integer id, Customer customer, String zip, String street, Long number, String district, String city, String reference) {
        this.id = id;
        this.customer = customer;
        this.zip = zip;
        this.street = street;
        this.number = number;
        this.district = district;
        this.city = city;
        this.reference = reference;
    }

    public Integer getId() {
        return id;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getZip() {
        return zip;
    }

    public void setZip(String zip) {
        this.zip = zip;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }

    public Long getNumber() {
        return number;
    }

    public void setNumber(Long number) {
        this.number = number;
    }

    public String getDistrict() {
        return district;
    }

    public void setDistrict(String district) {
        this.district = district;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }
}
