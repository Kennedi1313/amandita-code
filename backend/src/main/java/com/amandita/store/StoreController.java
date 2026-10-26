package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.sql.Timestamp;
import java.io.IOException;
import java.util.List;
import java.util.Comparator;

@RestController
@RequestMapping("api/v1/store")
public class StoreController {

    private final StoreDao storeDao;
    private final CategoryDao categoryDao;
    private final StoreImageService storeImageService;
    private final AsaasSubaccountService asaasSubaccountService;
    private final LocalDeliveryService localDeliveryService;
    private final MercadoPagoOAuthService mercadoPagoOAuthService;
    private final StorePlanService storePlanService;
    private final StoreDeletionService storeDeletionService;
    private final String mercadoPagoPublicKey;

    @Autowired
    public StoreController(StoreDao storeDao, CategoryDao categoryDao, StoreImageService storeImageService,
                           AsaasSubaccountService asaasSubaccountService, LocalDeliveryService localDeliveryService,
                           MercadoPagoOAuthService mercadoPagoOAuthService,
                           StorePlanService storePlanService,
                           StoreDeletionService storeDeletionService,
                           @Value("${mercadopago.public-key:}") String mercadoPagoPublicKey) {
        this.storeDao = storeDao;
        this.categoryDao = categoryDao;
        this.storeImageService = storeImageService;
        this.asaasSubaccountService = asaasSubaccountService;
        this.localDeliveryService = localDeliveryService;
        this.mercadoPagoOAuthService = mercadoPagoOAuthService;
        this.storePlanService = storePlanService;
        this.storeDeletionService = storeDeletionService;
        this.mercadoPagoPublicKey = mercadoPagoPublicKey;
    }

    public StoreController(StoreDao storeDao, CategoryDao categoryDao, StoreImageService storeImageService,
                           AsaasSubaccountService asaasSubaccountService, LocalDeliveryService localDeliveryService,
                           MercadoPagoOAuthService mercadoPagoOAuthService, StorePlanService storePlanService,
                           String mercadoPagoPublicKey) {
        this(storeDao, categoryDao, storeImageService, asaasSubaccountService, localDeliveryService,
                mercadoPagoOAuthService, storePlanService, null, mercadoPagoPublicKey);
    }

    @GetMapping("/mercadopago/connect")
    public ResponseEntity<?> mercadoPagoConnect(HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        if (storeId == null) throw new IllegalArgumentException("Loja não identificada.");
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        if (store.getPlan() != StorePlan.COMPLETE) {
            return ResponseEntity.status(409).body("Conectar o Mercado Pago está disponível no plano Completo.");
        }
        return ResponseEntity.ok(new MercadoPagoConnectResponse(mercadoPagoOAuthService.authorizationUrl(storeId)));
    }

    @GetMapping("/mercadopago/status")
    public ResponseEntity<MercadoPagoStatusResponse> mercadoPagoStatus(HttpServletRequest request) {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        return ResponseEntity.ok(new MercadoPagoStatusResponse(store.getMpAccessToken() != null && !store.getMpAccessToken().isBlank()));
    }

    public record MercadoPagoConnectResponse(String authorizationUrl) {}
    public record MercadoPagoStatusResponse(boolean connected) {}

    @GetMapping("/plan")
    public ResponseEntity<StorePlanResponse> getPlan(HttpServletRequest request) {
        return ResponseEntity.ok(storePlanService.getPlan((Long) request.getAttribute("storeId")));
    }

    @PutMapping("/plan")
    public ResponseEntity<StorePlanResponse> changePlan(
            @RequestBody StorePlanRequest planRequest,
            HttpServletRequest request) {
        return ResponseEntity.ok(storePlanService.changePlan(
                (Long) request.getAttribute("storeId"), planRequest.plan()));
    }

    @PostMapping("/asaas/subaccount")
    public ResponseEntity<AsaasSubaccountResponse> createAsaasSubaccount(
            @RequestBody AsaasSubaccountRequest request,
            HttpServletRequest httpRequest) throws IOException, InterruptedException {
        return ResponseEntity.status(410).build();
    }
    @GetMapping("/info")
    public ResponseEntity<StorePublicResponse> getStoreInfo(HttpServletRequest request) {
        Store store = storeDao.findById( (Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        return ResponseEntity.ok(StorePublicResponse.fromEntity(store, mercadoPagoPublicKey));
    }

    @GetMapping("/settings")
    public ResponseEntity<StorePublicResponse> getStoreSettings(HttpServletRequest request) {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        return ResponseEntity.ok(StorePublicResponse.fromEntityForAdmin(store, mercadoPagoPublicKey));
    }

    @GetMapping("/shipping/quote")
    public ResponseEntity<LocalDeliveryQuote> quoteLocalDelivery(@RequestParam String zip,
            @RequestParam(defaultValue = "0") Integer subtotal, HttpServletRequest request)
            throws IOException, InterruptedException {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (store.getPlan() != StorePlan.COMPLETE) {
            return ResponseEntity.status(409).build();
        }
        return ResponseEntity.ok(localDeliveryService.quote(store, zip, Math.max(subtotal, 0)));
    }

    @PutMapping("/info")
    public ResponseEntity<StorePublicResponse> updateStoreInfo(@RequestBody StoreUpdateRequest updateRequest,
                                                               HttpServletRequest request) {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));

        store.setName(updateRequest.name());
        String taxDocument = updateRequest.taxDocument() == null ? "" : updateRequest.taxDocument().replaceAll("\\D", "");
        if (!taxDocument.isBlank() && taxDocument.length() != 14) {
            throw new IllegalArgumentException("O CNPJ da loja deve conter 14 dígitos.");
        }
        store.setTaxDocument(taxDocument.isBlank() ? null : taxDocument);
        store.setLogoUrl(updateRequest.logoUrl());
        if (updateRequest.headerBackgroundColor() != null) {
            if (!updateRequest.headerBackgroundColor().matches("^#[0-9A-Fa-f]{6}$")) {
                throw new IllegalArgumentException("A cor da barra deve estar no formato hexadecimal #RRGGBB.");
            }
            store.setHeaderBackgroundColor(updateRequest.headerBackgroundColor().toUpperCase());
        }
        store.setBannerUrl(updateRequest.bannerUrl());
        if (updateRequest.bannerMobileUrl() != null) {
            store.setBannerMobileUrl(updateRequest.bannerMobileUrl());
        }
        store.setIconUrl(updateRequest.iconUrl());
        store.setInstagram(updateRequest.instagram());
        store.setWhatsapp(updateRequest.whatsapp());
        store.setPickupEnabled(updateRequest.pickupEnabled() != null && updateRequest.pickupEnabled());
        if (updateRequest.pickupAddress() != null) {
            store.setPickupAddress(updateRequest.pickupAddress());
        }
        if (store.getPlan() == StorePlan.COMPLETE) {
            store.setLocalDeliveryEnabled(updateRequest.localDeliveryEnabled() != null && updateRequest.localDeliveryEnabled());
            store.setLocalDeliveryFee(Math.max(updateRequest.localDeliveryFee() == null ? 0 : updateRequest.localDeliveryFee(), 0));
            store.setFreeShippingMinAmount(Math.max(updateRequest.freeShippingMinAmount() == null ? 0 : updateRequest.freeShippingMinAmount(), 0));
            store.setShippingOriginZip(updateRequest.shippingOriginZip());
            store.setLocalDeliveryEta(updateRequest.localDeliveryEta());
            List<DeliveryDistanceRange> ranges = updateRequest.deliveryDistanceRanges() == null
                    ? List.of() : updateRequest.deliveryDistanceRanges();
            for (DeliveryDistanceRange range : ranges) {
                if (range.maxDistanceKm() == null || range.maxDistanceKm().signum() <= 0
                        || range.fee() == null || range.fee() < 0) {
                    throw new IllegalArgumentException("Revise as faixas: distância e preço devem ser positivos ou zero.");
                }
            }
            ranges = ranges.stream().sorted(Comparator.comparing(DeliveryDistanceRange::maxDistanceKm)).toList();
            store.setDeliveryDistanceRanges(ranges);
        }
        store.setUpdatedAt(new Timestamp(System.currentTimeMillis()));

        return ResponseEntity.ok(StorePublicResponse.fromEntityForAdmin(
                storeDao.insertStore(store), mercadoPagoPublicKey));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteStore(HttpServletRequest request) {
        if (storeDeletionService == null) {
            throw new IllegalStateException("Serviço de exclusão não configurado.");
        }
        storeDeletionService.deleteStore((Long) request.getAttribute("storeId"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    public List<Category> getCategoriesByStore(HttpServletRequest request) {
        return categoryDao.getCategoriesByStore((Long) request.getAttribute("storeId"));
    }

    @PostMapping("/categories")
    public Category addCategory(@RequestBody CategoryRequest categoryRequest,
                                HttpServletRequest request) {
        return categoryDao.addCategory((Long) request.getAttribute("storeId"), categoryRequest);
    }

    @PutMapping("/categories/{categoryId}")
    public Category updateCategory(@PathVariable Long categoryId,
                                   @RequestBody CategoryRequest categoryRequest,
                                   HttpServletRequest request) {
        return categoryDao.updateCategory((Long) request.getAttribute("storeId"), categoryId, categoryRequest);
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

        return ResponseEntity.ok(StorePublicResponse.fromEntityForAdmin(
                storeImageService.uploadImage(storeId, type, file, imageUrl), mercadoPagoPublicKey));
    }

    @GetMapping(value = "/images/{type}", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] getStoreImage(@PathVariable String type, HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        return storeImageService.getImage(storeId, type);
    }
}
