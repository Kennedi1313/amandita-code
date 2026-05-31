package com.amandita.product;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Transactional
public interface ProductRepository extends JpaRepository<Product, Integer> {
    boolean existsProductsById(Integer id);
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.profileImageId = ?1 WHERE p.id = ?2")
    void updateProfileImageId(String profileImageId, Integer productId);
    @Query("select p from Product p JOIN p.store s WHERE s.id = ?1")
    Page<Product> findAllByStore(Long storeId, Pageable pageable);
    Optional<Product> findByIdAndStoreId(Integer id, Long storeId);
    Page<Product> findByStoreIdAndCategory(Long storeId, String category, Pageable pageable);
    boolean existsByStoreIdAndCategory(Long storeId, String category);
    Page<Product> findByCategory(String category, Pageable pageable);
    Page<Product> findByCategoryAndNameContaining(String category, String name, Pageable pageable);
    Page<Product> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Query("SELECT CASE WHEN COUNT(si) > 0 THEN true ELSE false END FROM SaleItem si WHERE si.product.id = :productId")
    boolean existsSaleItemByProductId(@Param("productId") Integer productId);

    @Query("SELECT CASE WHEN COUNT(si) > 0 THEN true ELSE false END FROM SaleItem si WHERE si.variation.id = :variationId")
    boolean existsSaleItemByVariationId(@Param("variationId") Integer variationId);

    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END FROM History h WHERE h.product.id = :productId")
    boolean existsHistoryByProductId(@Param("productId") Integer productId);

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "INSERT INTO product_images (image_id, product_id) VALUES (?1, ?2)", nativeQuery = true)
    void addProductImage(String imageId, Integer productId);

    @Query("SELECT pi.imageId FROM ProductImage pi WHERE pi.product.id = :productId")
    List<String> findImageIdsByProductId(@Param("productId") Integer productId);

    @Modifying
    @Query("DELETE FROM ProductImage pi WHERE pi.product.id = :productId AND pi.imageId = :imageId")
    void deleteProductImage(@Param("productId") Integer productId, @Param("imageId") String imageId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.category = :newCategory WHERE p.store.id = :storeId AND p.category = :oldCategory")
    void updateCategoryByStore(
            @Param("storeId") Long storeId,
            @Param("oldCategory") String oldCategory,
            @Param("newCategory") String newCategory
    );

}
