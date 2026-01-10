package com.amandita.product;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ProductImageJPADataAccessService implements ProductImageDao {
    private final ProductImageRepository productImageRepository;

    public ProductImageJPADataAccessService(ProductImageRepository productImageRepository) {
        this.productImageRepository = productImageRepository;
    }

    public List<String> getImageIdsByProductId(Integer productId) {
        return productImageRepository.findImageIdsByProductId(productId);
    }
}
