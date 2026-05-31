package com.amandita.product;

import com.amandita.Sale.*;
import com.amandita.customer.CustomerDTOMapper;
import com.amandita.customer.CustomerDao;
import com.amandita.exception.ResourceConflictException;
import com.amandita.exception.ResourceNotFoundException;
import com.amandita.exception.RequestValidationException;
import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import jakarta.transaction.Transactional;
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
    private final ProductDao productDao;
    private final SaleDao saleDao;
    private final CustomerDao customerDao;
    private final StoreDao storeDao;
    private final ProductDTOMapper productDTOMapper;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;
    public ProductService(ProductDao productDao, SaleDao saleDao, CustomerDao customerDao, StoreDao storeDao, ProductDTOMapper productDTOMapper, S3Service s3Service, S3Buckets s3Buckets) {
        this.productDao = productDao;
        this.saleDao = saleDao;
        this.customerDao = customerDao;
        this.storeDao = storeDao;
        this.productDTOMapper = productDTOMapper;
        this.s3Service = s3Service;
        this.s3Buckets = s3Buckets;
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

    @SuppressWarnings("unchecked")
    public Page<ProductDTO> findProductsByCategoryByStore(String category, int page, int size, Long storeId) {
        return productDao.findProductsByCategoryByStore(category, page, size, storeId)
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

    public Product requireProductByIdAndStore(Integer productId, Long storeId) {
        return productDao.selectProductByIdAndStore(productId, storeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "produto com id [%s] não encontrado nesta loja".formatted(productId)
                ));
    }

    public Integer addProduct(ProductRegistrationRequest productRegistrationRequest, Long storeId) {
        Store store = storeDao.findById(storeId)
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
        product.setStore(store);
        Product addedProduct = productDao.insertProduct(product);
        return addedProduct.getId();
    }

    @Transactional
    public void addProductVariations(Integer productId, ProductRegistrationRequest productRequest, Long storeId) {
        Product product = requireProductByIdAndStore(productId, storeId);

        if (productRequest.variations() != null) {
            List<ProductVariation> newVariations = productRequest.variations().stream()
                    .map(comboDto -> {
                        ProductVariation pv = new ProductVariation();
                        pv.setProduct(product);
                        pv.setSku(generateSku(product.getName(), comboDto.options()));
                        pv.setPrice(parseBrazilianPrice(comboDto.price()));
                        pv.setQuantity(parseInteger(comboDto.quantity()));
                        pv.setPromo(comboDto.promo());
                        pv.setOptions(comboDto.options());
                        return pv;
                    }).toList();

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

        for (ProductVariationDTO comboDto : variationRequests) {
            ProductVariation variation = comboDto.id() != null ? existingById.get(comboDto.id()) : null;
            if (variation == null) {
                variation = new ProductVariation();
                variation.setProduct(product);
                product.getVariations().add(variation);
            }

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
        requireProductByIdAndStore(productId, storeId);
        String profileImageId = UUID.randomUUID().toString();
        try {
            s3Service.putObject(
                    s3Buckets.getProduct(),
                    "profile-images/%s/%s.jpg".formatted(productId, profileImageId),
                    file.getBytes()
            );
        } catch (IOException e) {
            throw new RuntimeException("failed to upload profile image", e);
        }
        productDao.updateProductImageId(profileImageId, productId);
    }

    public void updateProductImages(Integer productId, List<MultipartFile> files, @NotNull List<String> imagesToDelete, Long storeId) {
        requireProductByIdAndStore(productId, storeId);
        // 1. Remove imagens antigas se solicitado
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

    public byte[] getProductProfileImage(Integer productId, String imageId, Long storeId) {
        ProductDTO productDTO = productDTOMapper.apply(requireProductByIdAndStore(productId, storeId));
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

        if (productDao.existsSaleItemByProductId(productId) || productDao.existsHistoryByProductId(productId)) {
            throw new ResourceConflictException(
                    "Não é possível deletar este produto porque ele já está vinculado à venda ou histórico."
            );
        }

        // Recupera todas as imagens associadas ao produto antes do banco remover os vinculos.
        Set<String> imageIds = new LinkedHashSet<>(productDao.selectAllImageIdsByProductId(productId));
        if (StringUtils.isNotBlank(product.getProfileImageId())) {
            imageIds.add(product.getProfileImageId());
        }

        // Remove o produto do banco primeiro. Se houver alguma restricao, as imagens continuam preservadas.
        productDao.deleteProductById(productId);

        // Deleta todas as imagens do S3 depois que o banco confirma a remocao.
        for (String imageId : imageIds) {
            s3Service.deleteObject(
                    s3Buckets.getProduct(),
                    "profile-images/%s/%s.jpg".formatted(productId, imageId)
            );
        }
    }

    @Transactional
    public Sale processSale(SaleRequest saleRequest, Long storeId) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        Sale sale = new Sale();
        List<SaleItem> saleItems = new ArrayList<>();
        double totalPrice = 0.0;

        for (SaleItemRequest request : saleRequest.getSaleItemRequests()) {
            Product product = productDao.selectProductById(request.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with id: " + request.getProductId()));

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
        sale.setCustomer(
                customerDao.selectUserByEmail(saleRequest.getCustomerEmail()).orElse(null)
        );
        sale.setPaymentMethod(saleRequest.getPaymentMethod());
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
        Set<String> allowedStatuses = Set.of(
                "PENDENTE",
                "APROVADO",
                "PREPARANDO",
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
        return saleDao.insertSale(sale);
    }

}
