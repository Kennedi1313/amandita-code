package com.amandita.Sale;

public class SaleItemRequest {

    private Integer productId;
    private Integer variationId;
    private Integer quantity;

    public SaleItemRequest() {
    }

    public SaleItemRequest(Integer productId, Integer quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }

    public SaleItemRequest(Integer productId, Integer variationId, Integer quantity) {
        this.productId = productId;
        this.variationId = variationId;
        this.quantity = quantity;
    }

    public Integer getProductId() {
        return productId;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public Integer getVariationId() {
        return variationId;
    }

    public void setVariationId(Integer variationId) {
        this.variationId = variationId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
