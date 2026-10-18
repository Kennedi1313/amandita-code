package com.amandita.Sale;

import java.math.BigDecimal;
import java.util.List;

public class SaleRequest {
    private List<SaleItemRequest> saleItemRequests;
    private String customerEmail;
    private String paymentMethod;
    private BigDecimal shippingFee;
    private String shippingMethod;
    private String shippingZip;
    private String shippingQuote;

    public List<SaleItemRequest> getSaleItemRequests() {
        return saleItemRequests;
    }

    public void setSaleItemRequests(List<SaleItemRequest> saleItemRequests) {
        this.saleItemRequests = saleItemRequests;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public BigDecimal getShippingFee() {
        return shippingFee;
    }

    public void setShippingFee(BigDecimal shippingFee) {
        this.shippingFee = shippingFee;
    }

    public String getShippingMethod() {
        return shippingMethod;
    }

    public void setShippingMethod(String shippingMethod) {
        this.shippingMethod = shippingMethod;
    }

    public String getShippingZip() { return shippingZip; }

    public void setShippingZip(String shippingZip) { this.shippingZip = shippingZip; }
    public String getShippingQuote() { return shippingQuote; }
    public void setShippingQuote(String shippingQuote) { this.shippingQuote = shippingQuote; }
}
