package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.sql.Timestamp;
import java.util.List;

@RestController
@RequestMapping("api/v1/store")
public class StoreController {

    private final StoreDao storeDao;
    private final CategoryDao categoryDao;
    private final StoreImageService storeImageService;

    public StoreController(StoreDao storeDao, CategoryDao categoryDao, StoreImageService storeImageService) {
        this.storeDao = storeDao;
        this.categoryDao = categoryDao;
        this.storeImageService = storeImageService;
    }
    @GetMapping("/info")
    public ResponseEntity<StorePublicResponse> getStoreInfo(HttpServletRequest request) {
        Store store = storeDao.findById( (Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        return ResponseEntity.ok(StorePublicResponse.fromEntity(store));
    }

    @PutMapping("/info")
    public ResponseEntity<StorePublicResponse> updateStoreInfo(@RequestBody StoreUpdateRequest updateRequest,
                                                               HttpServletRequest request) {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));

        store.setName(updateRequest.name());
        store.setLogoUrl(updateRequest.logoUrl());
        store.setBannerUrl(updateRequest.bannerUrl());
        store.setIconUrl(updateRequest.iconUrl());
        store.setInstagram(updateRequest.instagram());
        store.setWhatsapp(updateRequest.whatsapp());
        store.setPickupEnabled(updateRequest.pickupEnabled() == null || updateRequest.pickupEnabled());
        store.setLocalDeliveryEnabled(updateRequest.localDeliveryEnabled() == null || updateRequest.localDeliveryEnabled());
        store.setLocalDeliveryFee(Math.max(updateRequest.localDeliveryFee() == null ? 0 : updateRequest.localDeliveryFee(), 0));
        store.setFreeShippingMinAmount(Math.max(updateRequest.freeShippingMinAmount() == null ? 0 : updateRequest.freeShippingMinAmount(), 0));
        store.setShippingOriginZip(updateRequest.shippingOriginZip());
        store.setLocalDeliveryEta(updateRequest.localDeliveryEta());
        store.setUpdatedAt(new Timestamp(System.currentTimeMillis()));

        return ResponseEntity.ok(StorePublicResponse.fromEntity(storeDao.insertStore(store)));
    }

    @GetMapping("/categories")
    public List<Category> getCategoriesByStore(HttpServletRequest request) {
        return categoryDao.getCategoriesByStore((Long) request.getAttribute("storeId"));
    }

    @PostMapping("/categories")
    public Category addCategory(@RequestBody CategoryRequest categoryRequest,
                                HttpServletRequest request) {
        return categoryDao.addCategory((Long) request.getAttribute("storeId"), categoryRequest.name());
    }

    @PutMapping("/categories/{categoryId}")
    public Category updateCategory(@PathVariable Long categoryId,
                                   @RequestBody CategoryRequest categoryRequest,
                                   HttpServletRequest request) {
        return categoryDao.updateCategory((Long) request.getAttribute("storeId"), categoryId, categoryRequest.name());
    }

    @DeleteMapping("/categories/{categoryId}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long categoryId,
                                               HttpServletRequest request) {
        categoryDao.deleteCategory((Long) request.getAttribute("storeId"), categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories/no-store")
    public List<Category> getCategories() {
        return categoryDao.getCategories();
    }

    @PostMapping(value = "/images/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StorePublicResponse> uploadStoreImage(@PathVariable String type,
                                                                @RequestParam("file") MultipartFile file,
                                                                HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        String imageUrl = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/api/v1/store/images/{type}")
                .queryParam("v", System.currentTimeMillis())
                .buildAndExpand(type)
                .toUriString();

        return ResponseEntity.ok(StorePublicResponse.fromEntity(storeImageService.uploadImage(storeId, type, file, imageUrl)));
    }

    @GetMapping(value = "/images/{type}", produces = MediaType.IMAGE_JPEG_VALUE)
    public byte[] getStoreImage(@PathVariable String type, HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        return storeImageService.getImage(storeId, type);
    }
}
