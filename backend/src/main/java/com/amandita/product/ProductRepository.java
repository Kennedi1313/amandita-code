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
    @Query("select p from Product p JOIN p.store s WHERE s.id = ?1 AND p.active = true")
    Page<Product> findAllByStore(Long storeId, Pageable pageable);
    Page<Product> findByStoreIdAndActiveTrueAndPublishedTrue(Long storeId, Pageable pageable);
    Page<Product> findAllByActiveTrue(Pageable pageable);
    Optional<Product> findByIdAndStoreIdAndActiveTrue(Integer id, Long storeId);
    Optional<Product> findByIdAndStoreIdAndActiveTrueAndPublishedTrue(Integer id, Long storeId);
    Optional<Product> findByIdAndActiveTrue(Integer id);
    Optional<Product> findByIdAndStoreId(Integer id, Long storeId);
    Page<Product> findByStoreIdAndCategoryAndActiveTrue(Long storeId, String category, Pageable pageable);
    Page<Product> findByStoreIdAndCategoryAndActiveTrueAndPublishedTrue(Long storeId, String category, Pageable pageable);
    Page<Product> findByStoreIdAndCategoryInAndActiveTrue(Long storeId, List<String> categories, Pageable pageable);
    Page<Product> findByStoreIdAndCategoryInAndActiveTrueAndPublishedTrue(Long storeId, List<String> categories, Pageable pageable);
    @Query("""
            select distinct p from Product p
            where p.store.id = :storeId and p.category in :categories and p.active = true
              and (:publishedOnly = false or p.published = true)
              and (:promoOnly = false or coalesce(p.promo, 0) > 0 or exists
                   (select v.id from ProductVariation v where v.product = p and coalesce(v.promo, 0) > 0))
              and (:inStockOnly = false or coalesce(p.quantity, 0) > 0 or exists
                   (select v.id from ProductVariation v where v.product = p and coalesce(v.quantity, 0) > 0))
              and (:minPrice is null or p.price >= :minPrice or exists
                   (select v.id from ProductVariation v where v.product = p and v.price >= :minPrice))
              and (:maxPrice is null or p.price <= :maxPrice or exists
                   (select v.id from ProductVariation v where v.product = p and v.price <= :maxPrice))
            """)
    Page<Product> filterCategoryProducts(@Param("storeId") Long storeId,
                                         @Param("categories") List<String> categories,
                                         @Param("publishedOnly") boolean publishedOnly,
                                         @Param("promoOnly") boolean promoOnly,
                                         @Param("inStockOnly") boolean inStockOnly,
                                         @Param("minPrice") Integer minPrice,
                                         @Param("maxPrice") Integer maxPrice,
                                         Pageable pageable);
    boolean existsByStoreIdAndCategory(Long storeId, String category);
    Page<Product> findByCategoryAndActiveTrue(String category, Pageable pageable);
    Page<Product> findByCategoryAndNameContainingAndActiveTrue(String category, String name, Pageable pageable);
    Page<Product> findByStoreIdAndNameContainingIgnoreCaseAndActiveTrue(Long storeId, String name, Pageable pageable);
    Page<Product> findByStoreIdAndNameContainingIgnoreCaseAndActiveTrueAndPublishedTrue(Long storeId, String name, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCaseAndActiveTrue(String name, Pageable pageable);
    long countByStoreIdAndActiveTrueAndPublishedTrue(Long storeId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.published = false WHERE p.store.id = :storeId")
    void unpublishAllByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT CASE WHEN COUNT(si) > 0 THEN true ELSE false END FROM SaleItem si WHERE si.variation.id = :variationId")
    boolean existsSaleItemByVariationId(@Param("variationId") Integer variationId);

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
