package com.amandita.Sale;

import com.amandita.product.ProductDao;
import com.amandita.product.ProductVariation;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class MercadoPagoPaymentStatusUpdater {
    private final SaleDao saleDao;
    private final ProductDao productDao;

    public MercadoPagoPaymentStatusUpdater(SaleDao saleDao, ProductDao productDao) {
        this.saleDao = saleDao;
        this.productDao = productDao;
    }

    @Transactional
    public String applyPayment(Long storeId, String dataId, JsonNode payment) {
        String externalReference = payment.path("external_reference").asText(null);
        if (StringUtils.isBlank(externalReference) || !externalReference.matches("\\d+")) {
            throw new IllegalArgumentException("Pagamento sem referência de pedido válida.");
        }
        Sale sale = saleDao.findByIdForUpdate(Long.parseLong(externalReference))
                .orElseThrow(() -> new IllegalArgumentException("Venda relacionada ao pagamento não encontrada."));
        if (sale.getStore() == null || !storeId.equals(sale.getStore().getId())
                || !"MERCADO_PAGO".equals(sale.getPaymentMethod())) {
            throw new IllegalArgumentException("Pagamento não pertence a uma venda Mercado Pago desta loja.");
        }
        if (!String.valueOf(sale.getId()).equals(externalReference)) {
            throw new IllegalArgumentException("Pagamento não corresponde à venda.");
        }

        int itemSubtotalCents = sale.getSaleItems().stream()
                .mapToInt(item -> item.getPrice() * item.getQuantity())
                .sum();
        BigDecimal storedTotal = BigDecimal.valueOf(sale.getTotalPrice());
        // Older pending Mercado Pago sales stored this field in reais. New sales use cents.
        BigDecimal expected = storedTotal.compareTo(BigDecimal.valueOf(itemSubtotalCents)) < 0
                ? storedTotal.setScale(2, RoundingMode.HALF_UP)
                : storedTotal.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal received = payment.path("transaction_amount").decimalValue().setScale(2, RoundingMode.HALF_UP);
        if (!"BRL".equals(payment.path("currency_id").asText()) || expected.compareTo(received) != 0) {
            throw new IllegalArgumentException("Valor ou moeda do pagamento não corresponde ao pedido.");
        }

        String status = payment.path("status").asText("");
        if ("approved".equals(status)) {
            if (!sale.isStockDecremented()) {
                decrementStock(sale);
                sale.setStockDecremented(true);
            }
            if ("PENDENTE".equals(sale.getStatus()) || "RECUSADO".equals(sale.getStatus())) {
                sale.setStatus("APROVADO");
            }
        } else if ("rejected".equals(status) && "PENDENTE".equals(sale.getStatus())) {
            sale.setStatus("RECUSADO");
        } else if ("cancelled".equals(status) || "refunded".equals(status) || "charged_back".equals(status)) {
            sale.setStatus("CANCELADO");
        }
        sale.setPaymentId(dataId);
        saleDao.insertSale(sale);
        return sale.getStatus();
    }

    private void decrementStock(Sale sale) {
        for (SaleItem item : sale.getSaleItems()) {
            if (item.getVariation() != null) {
                ProductVariation variation = item.getVariation();
                variation.setQuantity(Math.max(variation.getQuantity() - item.getQuantity(), 0));
            } else {
                item.getProduct().setQuantity(Math.max(item.getProduct().getQuantity() - item.getQuantity(), 0));
            }
            productDao.updateProduct(item.getProduct());
        }
    }
}
