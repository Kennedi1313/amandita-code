package com.amandita.store;

import com.amandita.Sale.SaleItemRequest;
import com.amandita.product.Product;
import com.amandita.product.ProductDao;
import com.amandita.product.ProductVariation;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;

public final class MelhorEnvioQuoteFingerprint {
    private MelhorEnvioQuoteFingerprint() {}

    public static String create(List<SaleItemRequest> items, Long storeId, ProductDao productDao) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Adicione produtos antes de calcular o frete.");
        }

        String canonical = items.stream()
                .peek(item -> {
                    if (item == null || item.getProductId() == null || item.getQuantity() == null
                            || item.getQuantity() <= 0) {
                        throw new IllegalArgumentException("Revise os produtos e quantidades do carrinho.");
                    }
                })
                .sorted(Comparator.comparing(SaleItemRequest::getProductId)
                        .thenComparing(item -> item.getVariationId() == null ? 0 : item.getVariationId())
                        .thenComparing(SaleItemRequest::getQuantity))
                .map(item -> fingerprintLine(item, storeId, productDao))
                .reduce((first, second) -> first + "\n" + second)
                .orElseThrow();

        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Não foi possível validar os produtos do frete.", exception);
        }
    }

    private static String fingerprintLine(SaleItemRequest item, Long storeId, ProductDao productDao) {
        Product product = productDao.selectProductByIdAndStore(item.getProductId(), storeId)
                .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado para calcular o frete."));
        if (!product.isPublished()) {
            throw new IllegalArgumentException("Um produto do carrinho não está publicado para venda.");
        }

        int price = product.getPrice();
        Integer promo = product.getPromo();
        int stock = product.getQuantity();
        if (item.getVariationId() != null) {
            ProductVariation variation = product.getVariations().stream()
                    .filter(candidate -> item.getVariationId().equals(candidate.getId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Opção do produto não encontrada."));
            price = variation.getPrice();
            promo = variation.getPromo();
            stock = variation.getQuantity();
        }
        if (stock < item.getQuantity()) {
            throw new IllegalArgumentException("Estoque insuficiente para " + product.getName() + ".");
        }
        if (product.getWeightKg() == null || product.getWeightKg().signum() <= 0
                || product.getWidthCm() == null || product.getWidthCm() <= 0
                || product.getHeightCm() == null || product.getHeightCm() <= 0
                || product.getLengthCm() == null || product.getLengthCm() <= 0) {
            throw new IllegalArgumentException("Complete peso e dimensões de " + product.getName()
                    + " para calcular o frete.");
        }
        int finalPrice = applyPromo(price, promo);
        return String.join(":",
                item.getProductId().toString(),
                item.getVariationId() == null ? "0" : item.getVariationId().toString(),
                item.getQuantity().toString(),
                Integer.toString(finalPrice),
                product.getWeightKg().stripTrailingZeros().toPlainString(),
                product.getWidthCm().toString(),
                product.getHeightCm().toString(),
                product.getLengthCm().toString());
    }

    private static int applyPromo(int price, Integer promo) {
        if (promo == null || promo <= 0) return price;
        return BigDecimal.valueOf(price)
                .multiply(BigDecimal.valueOf(100L - promo))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .intValue();
    }
}
