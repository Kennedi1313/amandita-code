package com.amandita.store;

import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import jakarta.transaction.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StoreDeletionService {

    private final JdbcTemplate jdbcTemplate;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;

    public StoreDeletionService(JdbcTemplate jdbcTemplate, S3Service s3Service, S3Buckets s3Buckets) {
        this.jdbcTemplate = jdbcTemplate;
        this.s3Service = s3Service;
        this.s3Buckets = s3Buckets;
    }

    @Transactional
    public void deleteStore(Long storeId) {
        List<Integer> productIds = jdbcTemplate.queryForList(
                "SELECT id FROM product WHERE store_id = ?", Integer.class, storeId);
        List<String> productImages = productIds.isEmpty() ? List.of() : jdbcTemplate.queryForList(
                "SELECT pi.image_id FROM product_images pi JOIN product p ON p.id = pi.product_id WHERE p.store_id = ?",
                String.class, storeId);
        List<Integer> customerIds = jdbcTemplate.queryForList(
                "SELECT id FROM customer WHERE store_id = ? OR owned_store_id = ?",
                Integer.class, storeId, storeId);
        productImages.forEach(imageId -> productIds.forEach(productId ->
                deleteS3Object(s3Buckets.getProduct(), "profile-images/%s/%s.jpg".formatted(productId, imageId))));
        customerIds.forEach(this::deleteCustomerImages);
        for (String type : List.of("logo", "banner", "banner-mobile", "icon")) {
            deleteS3Object(s3Buckets.getProduct(), "store-images/%s/%s.png".formatted(storeId, type));
        }

        jdbcTemplate.update("DELETE FROM sale_item WHERE sale_id IN (SELECT id FROM sale WHERE store_id = ?)", storeId);
        jdbcTemplate.update("DELETE FROM history WHERE product_id IN (SELECT id FROM product WHERE store_id = ?) OR customer_id IN (SELECT id FROM customer WHERE store_id = ? OR owned_store_id = ?)", storeId, storeId, storeId);
        jdbcTemplate.update("DELETE FROM product_variation WHERE product_id IN (SELECT id FROM product WHERE store_id = ?)", storeId);
        jdbcTemplate.update("DELETE FROM product_images WHERE product_id IN (SELECT id FROM product WHERE store_id = ?)", storeId);
        jdbcTemplate.update("DELETE FROM sale WHERE store_id = ?", storeId);
        jdbcTemplate.update("DELETE FROM product WHERE store_id = ?", storeId);
        jdbcTemplate.update("DELETE FROM category WHERE store_id = ?", storeId);
        jdbcTemplate.update("DELETE FROM customer_store_roles WHERE store_id = ?", storeId);
        jdbcTemplate.update("DELETE FROM address WHERE customer_id IN (SELECT id FROM customer WHERE store_id = ? OR owned_store_id = ?)", storeId, storeId);
        jdbcTemplate.update("DELETE FROM customer_roles WHERE customer_id IN (SELECT id FROM customer WHERE store_id = ? OR owned_store_id = ?)", storeId, storeId);
        jdbcTemplate.update("DELETE FROM customer WHERE store_id = ? OR owned_store_id = ?", storeId, storeId);
        if (jdbcTemplate.update("DELETE FROM store WHERE id = ?", storeId) == 0) {
            throw new IllegalArgumentException("Loja não encontrada.");
        }
    }

    private void deleteCustomerImages(Integer customerId) {
        jdbcTemplate.queryForList(
                "SELECT profile_image_id FROM customer WHERE id = ? AND profile_image_id IS NOT NULL",
                String.class, customerId).forEach(imageId -> deleteS3Object(
                s3Buckets.getCustomer(), "profile-images/%s/%s.jpg".formatted(customerId, imageId)));
    }

    private void deleteS3Object(String bucket, String key) {
        try {
            s3Service.deleteObject(bucket, key);
        } catch (RuntimeException ignored) {
            // A limpeza da base não deve falhar porque um objeto já não existe no S3.
        }
    }
}
