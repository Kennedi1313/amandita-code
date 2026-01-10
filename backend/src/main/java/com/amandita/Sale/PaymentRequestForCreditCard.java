package com.amandita.Sale;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public class PaymentRequestForCreditCard {
    @JsonProperty("transaction_amount")
    private BigDecimal transactionAmount;
    private String token;
    private String description;
    private Integer installments;
    @JsonProperty("payment_method_id")
    private String paymentMethodId;
    @JsonProperty("external_reference")
    private String externalReference;
    @JsonProperty("issuer_id")
    private String issuerId;

    private PayerDTO payer;

    private SaleRequest saleRequest;

    public static class PayerDTO {
        private String email;
        private String firstName;
        private IdentificationDTO identification;

        public static class IdentificationDTO {
            private String type;
            private String number;

            public String getType() {
                return type;
            }

            public void setType(String type) {
                this.type = type;
            }

            public String getNumber() {
                return number;
            }

            public void setNumber(String number) {
                this.number = number;
            }
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public IdentificationDTO getIdentification() {
            return identification;
        }

        public void setIdentification(IdentificationDTO identification) {
            this.identification = identification;
        }
    }

    public BigDecimal getTransactionAmount() {
        return transactionAmount;
    }

    public void setTransactionAmount(BigDecimal transactionAmount) {
        this.transactionAmount = transactionAmount;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getInstallments() {
        return installments;
    }

    public void setInstallments(Integer installments) {
        this.installments = installments;
    }

    public String getPaymentMethodId() {
        return paymentMethodId;
    }

    public void setPaymentMethodId(String paymentMethodId) {
        this.paymentMethodId = paymentMethodId;
    }

    public String getExternalReference() {
        return externalReference;
    }

    public void setExternalReference(String externalReference) {
        this.externalReference = externalReference;
    }

    public PayerDTO getPayer() {
        return payer;
    }

    public void setPayer(PayerDTO payer) {
        this.payer = payer;
    }

    public String getIssuerId() {
        return issuerId;
    }

    public void setIssuerId(String issuerId) {
        this.issuerId = issuerId;
    }

    public SaleRequest getSaleRequest() {
        return saleRequest;
    }

    public void setSaleRequest(SaleRequest saleRequest) {
        this.saleRequest = saleRequest;
    }
}
