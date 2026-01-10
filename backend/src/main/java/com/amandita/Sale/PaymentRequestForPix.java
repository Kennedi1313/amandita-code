package com.amandita.Sale;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public class PaymentRequestForPix {
    @JsonProperty("transaction_amount")
    private BigDecimal transactionAmount;
    @JsonProperty("payment_method_id")
    private String paymentMethodId;

    private PaymentRequestForCreditCard.PayerDTO payer;

    private SaleRequest saleRequest;

    public static class PayerDTO {
        private String email;

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }
    }

    public BigDecimal getTransactionAmount() {
        return transactionAmount;
    }

    public void setTransactionAmount(BigDecimal transactionAmount) {
        this.transactionAmount = transactionAmount;
    }

    public String getPaymentMethodId() {
        return paymentMethodId;
    }

    public void setPaymentMethodId(String paymentMethodId) {
        this.paymentMethodId = paymentMethodId;
    }

    public PaymentRequestForCreditCard.PayerDTO getPayer() {
        return payer;
    }

    public void setPayer(PaymentRequestForCreditCard.PayerDTO payer) {
        this.payer = payer;
    }

    public SaleRequest getSaleRequest() {
        return saleRequest;
    }

    public void setSaleRequest(SaleRequest saleRequest) {
        this.saleRequest = saleRequest;
    }
}
