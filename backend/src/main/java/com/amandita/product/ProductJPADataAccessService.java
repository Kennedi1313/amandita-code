package com.amandita.product;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProductJPADataAccessService implements ProductDao {

    private final ProductRepository productRepository;

    public ProductJPADataAccessService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public Page<Product> selectAllProductsByStore(int page, int size, Long storeId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findAllByStore(storeId, pageable);
    }

    @Override
    public Page<Product> selectAllProducts(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findAll(pageable);
    }

    public Page<Product> findProductsByCategoryByStore(String category, int page, int size, Long storeId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findByCategoryByStore(category, pageable, storeId);
    }

    public Page<Product> findProductsByCategory(String category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findByCategory(category, pageable);
    }

    public Page<Product> findProductsByNameByStore(String query, int page, int size, Long storeId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findByNameContainingIgnoreCaseByStore(query, pageable, storeId);
    }

    public Page<Product> findProductsByName(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findByNameContainingIgnoreCase(query, pageable);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Optional<Product> selectProductById(Integer productId) {
        return productRepository.findById(productId);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Product insertProduct(Product product) {
        return productRepository.save(product);
    }

    @Override
    public boolean existsProductById(Integer productId) {
        return productRepository.existsProductsById(productId);
    }

    @Override
    public void deleteProductById(Integer productId) {
        productRepository.deleteById(productId);
    }

    @Override
    @SuppressWarnings("unchecked")
    public void updateProduct(Product product) {
        productRepository.save(product);
    }

    @Override
    public void updateProductImageId(String profileImageId, Integer productId) {
        productRepository.updateProfileImageId(profileImageId, productId);
    }

    public void addProductImage(String imageId, Integer productId) {
        productRepository.addProductImage(imageId, productId);
    }

    @Override
    public List<String> selectAllImageIdsByProductId(Integer productId) {
        return productRepository.findImageIdsByProductId(productId);
    }

    @Override
    public void deleteProductImage(Integer productId, String imageId) {
        productRepository.deleteProductImage(productId, imageId);
    }

}
