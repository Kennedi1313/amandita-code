package com.amandita.Sale;

import com.amandita.customer.Customer;
import com.amandita.store.Store;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sale")
public class Sale {
    @Id
    @SequenceGenerator(
            name = "sale_id_seq",
            sequenceName = "sale_id_seq",
            allocationSize = 1
    )
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "sale_id_seq"
    )
    private Long id;

    @Column(name = "total_price", nullable = false)
    private Double totalPrice;

    @JsonManagedReference
    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SaleItem> saleItems;

    @Column(
            nullable = false
    )
    private LocalDateTime saleDate;


    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "preference_id")
    private String preferenceId;

    @Column(name = "payment_id")
    private String paymentId;

    private String status;

    private Boolean shipment;

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    public Sale() {
        this.saleDate = LocalDateTime.now();
        this.status = "PENDENTE";
    }

    public Sale(List<SaleItem> items) {
        this.saleItems = items;
        this.saleDate = LocalDateTime.now();
        this.status = "PENDENTE";
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<SaleItem> getSaleItems() {
        return saleItems;
    }

    public void setSaleItems(List<SaleItem> saleItems) {
        this.saleItems = saleItems;
    }

    public LocalDateTime getSaleDate() {
        return saleDate;
    }

    public void setSaleDate(LocalDateTime saleDate) {
        this.saleDate = saleDate;
    }

    public Double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(Double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPreferenceId() {
        return preferenceId;
    }

    public void setPreferenceId(String preferenceId) {
        this.preferenceId = preferenceId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public Boolean getShipment() {
        return shipment;
    }

    public void setShipment(Boolean shipment) {
        this.shipment = shipment;
    }

    public Store getStore() {
        return store;
    }

    public void setStore(Store store) {
        this.store = store;
    }
}
