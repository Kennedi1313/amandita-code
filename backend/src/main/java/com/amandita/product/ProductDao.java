package com.amandita.product;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;

public interface ProductDao {
    Page<Product> selectAllProductsByStore(int page, int size, Long storeId);
    Page<Product> selectAllProducts(int page, int size);
    Page<Product> findProductsByCategoryByStore(String category, int page, int size, Long storeId);
    Page<Product> findProductsByCategory(String category, int page, int size);
    Page<Product> findProductsByNameByStore(String query, int page, int size, Long storeId);
    Page<Product> findProductsByName(String query, int page, int size);
    Optional<Product> selectProductById(Integer productId);
    Product insertProduct(Product product);
    boolean existsProductById(Integer productId);
    void deleteProductById(Integer productId);
    void updateProduct(Product update);
    void updateProductImageId(String profileImageId, Integer productId);
    void addProductImage(String imageId, Integer productId);

    List<String> selectAllImageIdsByProductId(Integer productId);

    void deleteProductImage(Integer productId, String imageId);

}
