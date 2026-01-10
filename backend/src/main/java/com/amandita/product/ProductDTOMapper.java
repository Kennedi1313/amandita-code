package com.amandita.product;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.function.Function;

@Service
public class ProductDTOMapper implements Function<Product, ProductDTO> {

    @Override
    public ProductDTO apply(Product product) {
        List<String> imagesIds = product.getImages()
                .stream()
                .map(ProductImage::getImageId)
                .toList();

        List<ProductVariationDTO> variationDTOs = product.getVariations() != null
                ? product.getVariations().stream()
                .map(this::toProductVariationDTO)
                .toList()
                : List.of();

        return new ProductDTO(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getOriginalPrice(),
                formatPrice(product.getPrice()),
                product.getQuantity(),
                product.getCategory(),
                product.getprofileImageId(),
                product.getPromo(),
                imagesIds,
                variationDTOs
        );
    }

    public ProductVariationDTO toProductVariationDTO(ProductVariation variation) {
        return new ProductVariationDTO(
                variation.getOptions(),
                variation.getSku(),
                formatPrice(variation.getPrice()),
                variation.getQuantity().toString(),
                variation.getPromo()
        );
    }

    private String formatPrice(Integer priceInCents) {
        if (priceInCents == null || priceInCents == 0) return "0,00";

        int reais = priceInCents / 100;
        int centavos = priceInCents % 100;

        return String.format("%d,%02d", reais, centavos);
    }


}