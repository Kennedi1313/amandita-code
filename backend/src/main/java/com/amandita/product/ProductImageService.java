package com.amandita.product;

import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductImageService {

    private final ProductImageDao productImageDao;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;

    public ProductImageService(ProductImageDao productImageDao, S3Service s3Service, S3Buckets s3Buckets) {
        this.productImageDao = productImageDao;
        this.s3Service = s3Service;
        this.s3Buckets = s3Buckets;
    }

    public List<ProductImageDTO> getImageUrlsByProductId(Integer productId) {
        List<String> imageIds = productImageDao.getImageIdsByProductId(productId);

        return imageIds.stream()
                .map(id -> new ProductImageDTO(
                        id,
                        s3Service.getObjectUrl(
                                s3Buckets.getProduct(),
                                "profile-images/%s/%s.jpg".formatted(productId, id)
                        )
                ))
                .toList();
    }
}

