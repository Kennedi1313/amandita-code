package com.amandita.store;

import com.amandita.exception.ResourceNotFoundException;
import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class StoreImageService {

    private final StoreDao storeDao;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;

    public StoreImageService(StoreDao storeDao, S3Service s3Service, S3Buckets s3Buckets) {
        this.storeDao = storeDao;
        this.s3Service = s3Service;
        this.s3Buckets = s3Buckets;
    }

    public Store uploadImage(Long storeId, String type, MultipartFile file, String imageUrl) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new ResourceNotFoundException("Loja não identificada"));

        putImage(storeId, normalizeType(type), file);
        switch (normalizeType(type)) {
            case "logo" -> store.setLogoUrl(imageUrl);
            case "banner" -> store.setBannerUrl(imageUrl);
            case "icon" -> store.setIconUrl(imageUrl);
            default -> throw new IllegalArgumentException("Tipo de imagem invalido");
        }

        return storeDao.insertStore(store);
    }

    public byte[] getImage(Long storeId, String type) {
        return s3Service.getObject(
                s3Buckets.getProduct(),
                imageKey(storeId, normalizeType(type))
        );
    }

    private void putImage(Long storeId, String type, MultipartFile file) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            int maxSize = "banner".equals(type) ? 1600 : 600;

            Thumbnails.of(file.getInputStream())
                    .size(maxSize, maxSize)
                    .outputFormat("jpg")
                    .outputQuality(0.85)
                    .toOutputStream(outputStream);

            s3Service.putObject(
                    s3Buckets.getProduct(),
                    imageKey(storeId, type),
                    outputStream.toByteArray()
            );
        } catch (IOException e) {
            throw new RuntimeException("Falha ao fazer upload da imagem da loja", e);
        }
    }

    private String imageKey(Long storeId, String type) {
        return "store-images/%s/%s.jpg".formatted(storeId, type);
    }

    private String normalizeType(String type) {
        if (type == null) {
            throw new IllegalArgumentException("Tipo de imagem invalido");
        }

        String normalized = type.trim().toLowerCase();
        if (!normalized.equals("logo") && !normalized.equals("banner") && !normalized.equals("icon")) {
            throw new IllegalArgumentException("Tipo de imagem invalido");
        }
        return normalized;
    }
}
