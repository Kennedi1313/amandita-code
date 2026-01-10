package com.amandita.product;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Transactional
public interface ProductImageRepository extends JpaRepository<ProductImage, String> {
    @Query("SELECT pi.imageId FROM ProductImage pi WHERE pi.product.id = :productId")
    List<String> findImageIdsByProductId(@Param("productId") Integer productId);
}
