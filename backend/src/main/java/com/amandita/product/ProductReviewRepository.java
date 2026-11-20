package com.amandita.product;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    List<ProductReview> findByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<ProductReview> findByStoreIdAndProductIdAndStatusOrderByCreatedAtDesc(Long storeId, Integer productId, String status);
    boolean existsBySaleItemId(Long saleItemId);
    boolean existsBySaleItemIdAndCustomerId(Long saleItemId, Integer customerId);
    List<ProductReview> findByStoreIdAndCustomerId(Long storeId, Integer customerId);
}
