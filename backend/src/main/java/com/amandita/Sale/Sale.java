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

    @Column(name = "stock_decremented", nullable = false)
    private boolean stockDecremented;

    private String status;

    private Boolean shipment;
    private String shippingMethod;
    private Integer shippingFee;
    private String shippingZip;
    @Column(name = "shipping_address_street")
    private String shippingAddressStreet;
    @Column(name = "shipping_address_number")
    private Long shippingAddressNumber;
    @Column(name = "shipping_address_district")
    private String shippingAddressDistrict;
    @Column(name = "shipping_address_city")
    private String shippingAddressCity;
    @Column(name = "shipping_address_state")
    private String shippingAddressState;
    @Column(name = "shipping_address_reference")
    private String shippingAddressReference;
    @Column(columnDefinition = "text")
    private String shippingQuote;
    @Column(name = "melhor_envio_shipment_id")
    private String melhorEnvioShipmentId;
    @Column(name = "melhor_envio_tracking_code")
    private String melhorEnvioTrackingCode;
    @Column(name = "melhor_envio_label_url", columnDefinition = "text")
    private String melhorEnvioLabelUrl;
    @Column(name = "melhor_envio_status")
    private String melhorEnvioStatus;
    @Column(name = "melhor_envio_invoice_key")
    private String melhorEnvioInvoiceKey;
    @Column(name = "external_tracking_code")
    private String externalTrackingCode;

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

    public String getMelhorEnvioInvoiceKey() { return melhorEnvioInvoiceKey; }
    public void setMelhorEnvioInvoiceKey(String value) { this.melhorEnvioInvoiceKey = value; }
    public String getExternalTrackingCode() { return externalTrackingCode; }
    public void setExternalTrackingCode(String value) { this.externalTrackingCode = value; }

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

    public boolean isStockDecremented() {
        return stockDecremented;
    }

    public void setStockDecremented(boolean stockDecremented) {
        this.stockDecremented = stockDecremented;
    }

    public Boolean getShipment() {
        return shipment;
    }

    public void setShipment(Boolean shipment) {
        this.shipment = shipment;
    }

    public String getShippingMethod() { return shippingMethod; }
    public void setShippingMethod(String shippingMethod) { this.shippingMethod = shippingMethod; }
    public Integer getShippingFee() { return shippingFee; }
    public void setShippingFee(Integer shippingFee) { this.shippingFee = shippingFee; }
    public String getShippingZip() { return shippingZip; }
    public void setShippingZip(String shippingZip) { this.shippingZip = shippingZip; }
    public String getShippingAddressStreet() { return shippingAddressStreet; }
    public void setShippingAddressStreet(String value) { this.shippingAddressStreet = value; }
    public Long getShippingAddressNumber() { return shippingAddressNumber; }
    public void setShippingAddressNumber(Long value) { this.shippingAddressNumber = value; }
    public String getShippingAddressDistrict() { return shippingAddressDistrict; }
    public void setShippingAddressDistrict(String value) { this.shippingAddressDistrict = value; }
    public String getShippingAddressCity() { return shippingAddressCity; }
    public void setShippingAddressCity(String value) { this.shippingAddressCity = value; }
    public String getShippingAddressState() { return shippingAddressState; }
    public void setShippingAddressState(String value) { this.shippingAddressState = value; }
    public String getShippingAddressReference() { return shippingAddressReference; }
    public void setShippingAddressReference(String value) { this.shippingAddressReference = value; }

    public void snapshotShippingAddress(com.amandita.customer.Address address) {
        if (address == null) return;
        setShippingZip(address.getZip());
        setShippingAddressStreet(address.getStreet());
        setShippingAddressNumber(address.getNumber());
        setShippingAddressDistrict(address.getDistrict());
        setShippingAddressCity(address.getCity());
        setShippingAddressState(address.getState());
        setShippingAddressReference(address.getReference());
    }
    public String getShippingQuote() { return shippingQuote; }
    public void setShippingQuote(String shippingQuote) { this.shippingQuote = shippingQuote; }
    public String getMelhorEnvioShipmentId() { return melhorEnvioShipmentId; }
    public void setMelhorEnvioShipmentId(String melhorEnvioShipmentId) { this.melhorEnvioShipmentId = melhorEnvioShipmentId; }
    public String getMelhorEnvioTrackingCode() { return melhorEnvioTrackingCode; }
    public void setMelhorEnvioTrackingCode(String melhorEnvioTrackingCode) { this.melhorEnvioTrackingCode = melhorEnvioTrackingCode; }
    public String getMelhorEnvioLabelUrl() { return melhorEnvioLabelUrl; }
    public void setMelhorEnvioLabelUrl(String melhorEnvioLabelUrl) { this.melhorEnvioLabelUrl = melhorEnvioLabelUrl; }
    public String getMelhorEnvioStatus() { return melhorEnvioStatus; }
    public void setMelhorEnvioStatus(String melhorEnvioStatus) { this.melhorEnvioStatus = melhorEnvioStatus; }

    public Store getStore() {
        return store;
    }

    public void setStore(Store store) {
        this.store = store;
    }
}
