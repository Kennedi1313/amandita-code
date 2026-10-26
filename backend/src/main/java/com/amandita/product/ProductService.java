package com.amandita.product;

import com.amandita.Sale.*;
import com.amandita.customer.CustomerDTOMapper;
import com.amandita.customer.CustomerDao;
import com.amandita.exception.ResourceNotFoundException;
import com.amandita.exception.RequestValidationException;
import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.amandita.store.StorePlan;
import com.amandita.store.StorePlanService;
import com.amandita.store.Category;
import com.amandita.store.CategoryRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import net.coobird.thumbnailator.Thumbnails;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {
    public static final int MAX_PRODUCT_IMAGES = 5;

    private final ProductDao productDao;
    private final SaleDao saleDao;
    private final CustomerDao customerDao;
    private final StoreDao storeDao;
    private final ProductDTOMapper productDTOMapper;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;
    private final CategoryRepository categoryRepository;
    public ProductService(ProductDao productDao, SaleDao saleDao, CustomerDao customerDao,
                           StoreDao storeDao, ProductDTOMapper productDTOMapper,
                           S3Service s3Service, S3Buckets s3Buckets) {
        this(productDao, saleDao, customerDao, storeDao, productDTOMapper,
                s3Service, s3Buckets, null);
    }

    @Autowired
    public ProductService(ProductDao productDao, SaleDao saleDao, CustomerDao customerDao, StoreDao storeDao, ProductDTOMapper productDTOMapper, S3Service s3Service, S3Buckets s3Buckets, CategoryRepository categoryRepository) {
        this.productDao = productDao;
        this.saleDao = saleDao;
        this.customerDao = customerDao;
        this.storeDao = storeDao;
        this.productDTOMapper = productDTOMapper;
        this.s3Service = s3Service;
        this.s3Buckets = s3Buckets;
        this.categoryRepository = categoryRepository;
    }

    public Page<ProductDTO> getAllProducts(int page, int size) {
        return productDao.selectAllProducts(page, size)
                .map(productDTOMapper);
    }

    @SuppressWarnings("unchecked")
    public Page<ProductDTO> getAllProductsByStore(int page, int size, Long storeId) {
        return productDao.selectAllProductsByStore(page, size, storeId)
                .map(productDTOMapper);
    }

    public Page<ProductDTO> getPublishedProductsByStore(int page, int size, Long storeId) {
        return productDao.selectPublishedProductsByStore(page, size, storeId)
                .map(productDTOMapper);
    }

    @SuppressWarnings("unchecked")
    public Page<ProductDTO> findProductsByCategoryByStore(String category, int page, int size, Long storeId) {
        return productDao.findProductsByCategoryByStore(category, page, size, storeId)
                .map(productDTOMapper);
    }

    public Page<ProductDTO> findPublishedProductsByCategoryByStore(String category, int page, int size, Long storeId) {
        return productDao.findPublishedProductsByCategoryByStore(category, page, size, storeId)
                .map(productDTOMapper);
    }

    @SuppressWarnings("unchecked")
    public Page<ProductDTO> findProductsByCategory(String category, int page, int size) {
        return productDao.findProductsByCategory(category, page, size)
                .map(productDTOMapper);
    }

    @SuppressWarnings("unchecked")
    public Page<ProductDTO> findProductsByNameByStore(String query, int page, int size, Long storeId) {
        return productDao.findProductsByNameByStore(query, page, size, storeId)
                .map(productDTOMapper);
    }

    public Page<ProductDTO> findPublishedProductsByNameByStore(String query, int page, int size, Long storeId) {
        return productDao.findPublishedProductsByNameByStore(query, page, size, storeId)
                .map(productDTOMapper);
    }

    @SuppressWarnings("unchecked")
    public ProductDTO getProductById(Integer productId) {
        return productDao.selectProductById(productId)
                .map(productDTOMapper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "product with id [%s] not found".formatted(productId)
                ));
    }

    public ProductDTO getProductByIdAndStore(Integer productId, Long storeId) {
        return productDTOMapper.apply(requireProductByIdAndStore(productId, storeId));
    }

    public ProductDTO getPublishedProductByIdAndStore(Integer productId, Long storeId) {
        Product product = productDao.selectPublishedProductByIdAndStore(productId, storeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "produto com id [%s] não encontrado nesta loja".formatted(productId)
                ));
        return productDTOMapper.apply(product);
    }

    public Product requireProductByIdAndStore(Integer productId, Long storeId) {
        return productDao.selectProductByIdAndStore(productId, storeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "produto com id [%s] não encontrado nesta loja".formatted(productId)
                ));
    }

    @Transactional
    public Integer addProduct(ProductRegistrationRequest productRegistrationRequest, Long storeId) {
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        Product product = new Product(
                productRegistrationRequest.name(),
                productRegistrationRequest.description(),
                0,
                parseBrazilianPrice(productRegistrationRequest.price()),
                productRegistrationRequest.quantity(),
                productRegistrationRequest.category(),
                productRegistrationRequest.profileImageId(),
                productRegistrationRequest.promo()
        );
        Category category = categoryRepository == null ? null : categoryRepository.findByStoreIdAndPath(storeId,
                "/products/" + productRegistrationRequest.category()).orElse(null);
        product.setWeightKg(productRegistrationRequest.weightKg() != null
                ? productRegistrationRequest.weightKg() : category == null ? null : category.getWeightKg());
        product.setWidthCm(productRegistrationRequest.widthCm() != null
                ? productRegistrationRequest.widthCm() : category == null ? null : category.getWidthCm());
        product.setHeightCm(productRegistrationRequest.heightCm() != null
                ? productRegistrationRequest.heightCm() : category == null ? null : category.getHeightCm());
        product.setLengthCm(productRegistrationRequest.lengthCm() != null
                ? productRegistrationRequest.lengthCm() : category == null ? null : category.getLengthCm());
        product.setStore(store);
        product.setPublished(store.getPlan() == StorePlan.COMPLETE
                || productDao.countPublishedProductsByStore(storeId) < StorePlanService.FREE_PUBLISHED_PRODUCT_LIMIT);
        Product addedProduct = productDao.insertProduct(product);
        return addedProduct.getId();
    }

    @Transactional
    public ProductDTO setProductPublished(Integer productId, boolean published, Long storeId) {
        Store store = storeDao.findByIdForUpdate(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        Product product = requireProductByIdAndStore(productId, storeId);
        if (published && !product.isPublished()) {
            if (store.getPlan() == StorePlan.FREE
                    && productDao.countPublishedProductsByStore(storeId) >= StorePlanService.FREE_PUBLISHED_PRODUCT_LIMIT) {
                throw new IllegalStateException(
                        "O plano Grátis permite até 10 produtos publicados. Pause outro produto para publicar este.");
            }
            product.setPublished(true);
        } else if (!published) {
            product.setPublished(false);
        }
        productDao.updateProduct(product);
        return productDTOMapper.apply(product);
    }

    @Transactional
    public void addProductVariations(Integer productId, ProductRegistrationRequest productRequest, Long storeId) {
        Product product = requireProductByIdAndStore(productId, storeId);

        if (productRequest.variations() != null) {
            List<ProductVariation> newVariations = new java.util.ArrayList<>();
            for (int index = 0; index < productRequest.variations().size(); index++) {
                    var comboDto = productRequest.variations().get(index);
                        ProductVariation pv = new ProductVariation();
                        pv.setProduct(product);
                        pv.setSku(generateSku(product.getName(), comboDto.options()));
                        pv.setPrice(parseBrazilianPrice(comboDto.price()));
                        pv.setQuantity(parseInteger(comboDto.quantity()));
                        pv.setPromo(comboDto.promo());
                        pv.setOptions(comboDto.options());
                        pv.setDisplayOrder(index);
                        newVariations.add(pv);
            }

            product.getVariations().addAll(newVariations);
        }

        productDao.updateProduct(product);
    }

    private Integer parseBrazilianPrice(String priceStr) {
        if (priceStr == null || priceStr.isBlank()) {
            return 0;
        }

        String cleaned = priceStr.replaceAll("[^0-9,]", "");
        if (cleaned.contains(",")) {
            String[] parts = cleaned.split(",");
            String inteiro = parts[0];
            String decimal = parts.length > 1 ? parts[1] : "0";
            if (decimal.length() == 1) decimal += "0";
            if (decimal.length() > 2) decimal = decimal.substring(0, 2);

            return Integer.parseInt(inteiro + decimal);
        }
        return Integer.parseInt(cleaned) * 100;
    }

    public static String generateSku(String productName, Map<String, String> options) {
        String base = productName
                .replaceAll("[^a-zA-Z0-9]", "")
                .toUpperCase();
        String optionsPart = options.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey().toUpperCase() + "-" + e.getValue().toUpperCase())
                .collect(Collectors.joining("-"));
        if (!optionsPart.isBlank()) {
            return base + "-" + optionsPart;
        }
        return base;
    }

    public void updateProduct(Integer productId, ProductUpdateRequest req, Long storeId) {
        Product product = requireProductByIdAndStore(productId, storeId);

        if (!product.getName().equals(req.name()))
            product.setName(req.name());

        if (!product.getDescription().equals(req.description()))
            product.setDescription(req.description());

        product.setOriginalPrice(0);

        Integer parsedPrice = parseBrazilianPrice(req.price());
        if (!product.getPrice().equals(parsedPrice))
            product.setPrice(parsedPrice);

        if (!product.getQuantity().equals(req.quantity()))
            product.setQuantity(req.quantity());

        if (!product.getCategory().equals(req.category()))
            product.setCategory(req.category());

        if (req.promo() != null && !req.promo().equals(product.getPromo()))
            product.setPromo(req.promo());

        product.setWeightKg(req.weightKg());
        product.setWidthCm(req.widthCm());
        product.setHeightCm(req.heightCm());
        product.setLengthCm(req.lengthCm());

        if (req.variations() != null) {
            syncProductVariations(product, req.variations());
        }

        productDao.updateProduct(product);
    }

    private void syncProductVariations(Product product, List<ProductVariationDTO> variationRequests) {
        Map<Integer, ProductVariation> existingById = product.getVariations().stream()
                .filter(variation -> variation.getId() != null)
                .collect(Collectors.toMap(ProductVariation::getId, variation -> variation));
        Set<Integer> incomingIds = variationRequests.stream()
                .map(ProductVariationDTO::id)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (int index = 0; index < variationRequests.size(); index++) {
            ProductVariationDTO comboDto = variationRequests.get(index);
            ProductVariation variation = comboDto.id() != null ? existingById.get(comboDto.id()) : null;
            if (variation == null) {
                variation = new ProductVariation();
                variation.setProduct(product);
                product.getVariations().add(variation);
            }

            variation.setDisplayOrder(index);
            applyVariationData(product, variation, comboDto);
        }

        Iterator<ProductVariation> iterator = product.getVariations().iterator();
        while (iterator.hasNext()) {
            ProductVariation existingVariation = iterator.next();
            Integer variationId = existingVariation.getId();
            if (variationId == null || incomingIds.contains(variationId)) {
                continue;
            }

            if (productDao.existsSaleItemByVariationId(variationId)) {
                existingVariation.setQuantity(0);
            } else {
                iterator.remove();
            }
        }
    }

    private void applyVariationData(Product product, ProductVariation variation, ProductVariationDTO comboDto) {
        variation.setProduct(product);
        variation.setOptions(comboDto.options());
        variation.setSku(StringUtils.isNotBlank(comboDto.sku()) ? comboDto.sku() : generateSku(product.getName(), comboDto.options()));
        variation.setPrice(parseBrazilianPrice(comboDto.price()));
        variation.setQuantity(parseInteger(comboDto.quantity()));
        variation.setPromo(comboDto.promo());
    }

    private Integer parseInteger(String value) {
        if (StringUtils.isBlank(value)) {
            return 0;
        }
        return Integer.parseInt(value.replaceAll("[^0-9]", ""));
    }

    public void updateProductProfileImage(Integer productId,
                                          MultipartFile file,
                                          Long storeId) {
        updateProductImages(productId, List.of(file), List.of(), storeId);
    }

    public void updateProductImages(Integer productId, List<MultipartFile> files, @NotNull List<String> imagesToDelete, Long storeId) {
        requireProductByIdAndStore(productId, storeId);
        List<String> existingImageIds = productDao.selectAllImageIdsByProductId(productId);
        validateProductImageCount(existingImageIds, files, imagesToDelete);

        for (String imageId : imagesToDelete) {
            s3Service.deleteObject(
                    s3Buckets.getProduct(),
                    "profile-images/%s/%s.jpg".formatted(productId, imageId)
            );
            productDao.deleteProductImage(productId, imageId);
        }

        // 2. Adiciona novas imagens
        for (MultipartFile file : files) {
            String imageId = UUID.randomUUID().toString();

            try {
                // Reduz a imagem antes de salvar (ex: largura máx. 800px, qualidade 80%)
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

                Thumbnails.of(file.getInputStream())
                        .size(800, 800) // redimensiona mantendo proporção
                        .outputFormat("jpg")
                        .outputQuality(0.8) // compressão (1.0 = qualidade total)
                        .toOutputStream(outputStream);

                byte[] compressedImage = outputStream.toByteArray();

                s3Service.putObject(
                        s3Buckets.getProduct(),
                        "profile-images/%s/%s.jpg".formatted(productId, imageId),
                        compressedImage
                );

            } catch (IOException e) {
                throw new RuntimeException("Falha ao fazer upload da imagem", e);
            }

            // Registra a imagem associada ao produto
            productDao.addProductImage(imageId, productId);
        }

        List<String> imageIds = productDao.selectAllImageIdsByProductId(productId);
        if(!imageIds.isEmpty()) {
            // Adiciona a ultima imagem como profile image do produto
            productDao.updateProductImageId(imageIds.get(imageIds.size() - 1), productId);
        } else {
            productDao.updateProductImageId(null, productId);
        }
    }

    public void validateNewProductImageCount(int imageCount) {
        if (imageCount > MAX_PRODUCT_IMAGES) {
            throw new RequestValidationException(
                    "Cada produto pode ter no máximo %d imagens.".formatted(MAX_PRODUCT_IMAGES));
        }
    }

    public void validateProductImageCount(Integer productId, List<MultipartFile> files,
                                          List<String> imagesToDelete, Long storeId) {
        requireProductByIdAndStore(productId, storeId);
        validateProductImageCount(
                productDao.selectAllImageIdsByProductId(productId),
                files,
                imagesToDelete
        );
    }

    private void validateProductImageCount(List<String> existingImageIds, List<MultipartFile> files,
                                           List<String> imagesToDelete) {
        Set<String> imagesBeingDeleted = new HashSet<>(imagesToDelete);
        long remainingImages = existingImageIds.stream()
                .filter(imageId -> !imagesBeingDeleted.contains(imageId))
                .count();
        if (remainingImages + files.size() > MAX_PRODUCT_IMAGES) {
            throw new RequestValidationException(
                    "Cada produto pode ter no máximo %d imagens.".formatted(MAX_PRODUCT_IMAGES));
        }
    }

    public byte[] getProductProfileImage(Integer productId, String imageId, Long storeId) {
        Product product = productDao.selectProductForImageByIdAndStore(productId, storeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "produto com id [%s] não encontrado nesta loja".formatted(productId)
                ));
        ProductDTO productDTO = productDTOMapper.apply(product);
        String selectedImageId = StringUtils.isNotBlank(imageId) ? imageId : productDTO.profileImageId();

        if (StringUtils.isBlank(selectedImageId)) {
            throw new ResourceNotFoundException(
                    "product with id [%s] profile image not found".formatted(productId));
        }

        return s3Service.getObject(
                s3Buckets.getProduct(),
                "profile-images/%s/%s.jpg".formatted(productId, selectedImageId)
        );
    }

    public void deleteProductById(Integer productId, Long storeId) {
        Product product = requireProductByIdAndStore(productId, storeId);
        product.setActive(false);
        productDao.updateProduct(product);
    }

    @Transactional
    public Sale processSale(SaleRequest saleRequest, Long storeId) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        Sale sale = new Sale();
        List<SaleItem> saleItems = new ArrayList<>();
        double totalPrice = 0.0;

        for (SaleItemRequest request : saleRequest.getSaleItemRequests()) {
            Product product = productDao.selectProductByIdAndStore(request.getProductId(), storeId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with id: " + request.getProductId()));
            if (!product.isPublished()) {
                throw new IllegalArgumentException("Este produto não está publicado para venda.");
            }

            ProductVariation variation = null;
            Integer unitPrice = product.getPrice();
            if (request.getVariationId() != null) {
                variation = product.getVariations().stream()
                        .filter(item -> request.getVariationId().equals(item.getId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Variation not found with id: " + request.getVariationId()));

                if (variation.getQuantity() < request.getQuantity()) {
                    throw new IllegalArgumentException("Insufficient stock for variation: " + product.getName());
                }
                variation.setQuantity(variation.getQuantity() - request.getQuantity());
                unitPrice = variation.getPrice();
            } else if (product.getQuantity() < request.getQuantity()) {
                    throw new IllegalArgumentException("Insufficient stock for product: " + product.getName());
            } else {
                product.setQuantity(product.getQuantity() - request.getQuantity());
            }

            productDao.updateProduct(product);

            // Create SaleItem and add to the list
            SaleItem saleItem = new SaleItem();
            saleItem.setSale(sale);
            saleItem.setProduct(product);
            saleItem.setVariation(variation);
            saleItem.setQuantity(request.getQuantity());
            saleItem.setPrice(unitPrice);

            saleItems.add(saleItem);
            totalPrice += unitPrice * request.getQuantity();
        }

        // Set sale details and save
        sale.setTotalPrice(totalPrice);
        sale.setSaleItems(saleItems);
        sale.setStatus("ENTREGUE");
        sale.setStockDecremented(true);
        sale.setCustomer(
                customerDao.selectUserByEmail(saleRequest.getCustomerEmail()).orElse(null)
        );
        sale.setPaymentMethod(saleRequest.getPaymentMethod());
        sale.setShippingMethod(saleRequest.getShippingMethod());
        sale.setShippingFee(saleRequest.getShippingFee() == null ? 0 : saleRequest.getShippingFee().intValue());
        sale.setShippingZip(saleRequest.getShippingZip());
        if (sale.getCustomer() != null && sale.getCustomer().getAddresses() != null) {
            sale.getCustomer().getAddresses().stream().findFirst().ifPresent(sale::snapshotShippingAddress);
        }
        sale.setShippingQuote(saleRequest.getShippingQuote());
        sale.setStore(store);
        saleDao.insertSale(sale);

        return sale;
    }

    public Page<SaleResponse> getSalesByCustomerEmail(String email, Long storeId) {
        return saleDao.findByUserEmail(email, storeId)
                .map((item) -> SaleResponse.fromEntity(item, new ProductDTOMapper(), new CustomerDTOMapper()));
    }

    public Sale getSaleById(Long saleId, Long storeId) {

        return saleDao.findByIdAndStoreId(saleId, storeId).orElseThrow(() -> new ResourceNotFoundException(
                "pedido com id [%s] não encontrado nesta loja".formatted(saleId)
        ));
    }

    public Page<SaleResponse> getAllSales(Long storeId) {
        return saleDao
                .selectAllSales(0, 100, storeId)
                .map((item)-> SaleResponse.fromEntity(item, new ProductDTOMapper(), new CustomerDTOMapper()));
    }

    public Sale updateSaleStatus(Long saleId, String status, Long storeId) {
        return updateSaleStatus(saleId, status, null, storeId);
    }

    public Sale updateSaleStatus(Long saleId, String status, String trackingCode, Long storeId) {
        Set<String> allowedStatuses = Set.of(
                "PENDENTE",
                "APROVADO",
                "PREPARANDO",
                "ENVIADO",
                "ENTREGUE",
                "CANCELADO",
                "RECUSADO"
        );
        String normalizedStatus = StringUtils.upperCase(StringUtils.trimToEmpty(status));

        if (!allowedStatuses.contains(normalizedStatus)) {
            throw new RequestValidationException("Status de pedido invalido.");
        }

        Sale sale = saleDao.findByIdAndStoreId(saleId, storeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "pedido com id [%s] não encontrado nesta loja".formatted(saleId)
                ));

        sale.setStatus(normalizedStatus);
        if (StringUtils.isNotBlank(trackingCode)) {
            sale.setExternalTrackingCode(StringUtils.trim(trackingCode));
        }
        return saleDao.insertSale(sale);
    }

}
