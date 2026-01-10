package com.amandita.product;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Transactional
public interface ProductRepository extends JpaRepository<Product, Integer> {
    boolean existsProductsById(Integer id);
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.profileImageId = ?1 WHERE p.id = ?2")
    void updateProfileImageId(String profileImageId, Integer productId);
    @Query("select p from Product p JOIN p.store s WHERE s.id = ?1")
    Page<Product> findAllByStore(Long storeId, Pageable pageable);
    @Query("select p from Product p JOIN p.store s where p.category = :category AND s.id = :storeId")
    Page<Product> findByCategoryByStore(String category, Pageable pageable, Long storeId);
    @Query("select p from Product p where p.category = ?1")
    Page<Product> findByCategory(String category, Pageable pageable);
    @Query("select p from Product p where p.category = ?1 and p.name like concat('%', ?2, '%')")
    Page<Product> findByCategoryAndNameContaining(String category, String name, Pageable pageable);
    @Query("select p from Product p JOIN p.store s where unaccent(upper(p.name)) like unaccent(upper(concat('%', :name, '%'))) AND s.id = :storeId")
    Page<Product> findByNameContainingIgnoreCaseByStore(String name, Pageable pageable, Long storeId);
    @Query("select p from Product p where unaccent(upper(p.name)) like unaccent(upper(concat('%', ?1, '%')))")
    Page<Product> findByNameContainingIgnoreCase(String name, Pageable pageable);
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query(value = "INSERT INTO product_images (image_id, product_id) VALUES (?1, ?2)", nativeQuery = true)
    void addProductImage(String imageId, Integer productId);

    @Query("SELECT pi.imageId FROM ProductImage pi WHERE pi.product.id = :productId")
    List<String> findImageIdsByProductId(@Param("productId") Integer productId);

    @Modifying
    @Query("DELETE FROM ProductImage pi WHERE pi.product.id = :productId AND pi.imageId = :imageId")
    void deleteProductImage(@Param("productId") Integer productId, @Param("imageId") String imageId);

}
