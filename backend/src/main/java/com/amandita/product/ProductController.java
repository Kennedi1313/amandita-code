package com.amandita.product;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleRequest;
import com.amandita.Sale.SaleResponse;
import com.amandita.jwt.JWTUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("api/v1/products")
public class ProductController {
    ProductService productService;
    ProductImageService productImageService;

    public ProductController(ProductService productService, ProductImageService productImageService, JWTUtil jwtUtil) {
        this.productService = productService;
        this.productImageService = productImageService;
    }

    @GetMapping
    public Page<ProductDTO> getProductsByStore(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        return productService.getAllProductsByStore(page, size, (Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("/no-store")
    public Page<ProductDTO> getProducts(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        return productService.getAllProducts(page, size);
    }

    @GetMapping("{productId}")
    public ProductDTO getProduct(
            @PathVariable("productId") Integer productId
    ) {
        return productService.getProductById(productId);
    }

    @GetMapping("/by-category")
    public Page<ProductDTO> getProductsByCategoryByStore(
            @RequestParam("category") String category,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        return productService.findProductsByCategoryByStore(category, page, size, (Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("/by-category/no-store")
    public Page<ProductDTO> getProductsByCategory(
            @RequestParam("category") String category,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        return productService.findProductsByCategory(category, page, size);
    }

    @GetMapping("/by-name")
    public Page<ProductDTO> getProductsByNameByStore(
            @RequestParam("query") String query,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        return productService.findProductsByNameByStore(query, page, size, (Long) httpRequest.getAttribute("storeId"));
    }

    @PostMapping
    public ResponseEntity<?> registerProduct(@RequestBody ProductRegistrationRequest request, HttpServletRequest httpRequest) {
        Integer productId = productService.addProduct(request, (Long) httpRequest.getAttribute("storeId"));
        return new ResponseEntity<>(productId, HttpStatus.CREATED);
    }

    @PostMapping(
            value = "{productId}/profile-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public void uploadProductProfileImage(
            @PathVariable("productId") Integer productId,
            @RequestParam("file") MultipartFile file) {
        productService.updateProductProfileImage(productId, file);
    }

    @PostMapping(value = "/with-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProductWithImages(
            @RequestPart("product") ProductRegistrationRequest productRequest,
            @RequestPart("files") List<MultipartFile> files,
            HttpServletRequest httpRequest) {

        Long storeId = (Long) httpRequest.getAttribute("storeId");

        Integer productId = productService.addProduct(productRequest, storeId);

        productService.updateProductImages(productId, files, new ArrayList<>());

        if ("variable".equalsIgnoreCase(productRequest.productType()) && productRequest.variations() != null) {
            productService.addProductVariations(productId, productRequest);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(productId);
    }

    @GetMapping(
            value = "{productId}/profile-image",
            produces = MediaType.IMAGE_JPEG_VALUE
    )
    public byte[] getProductProfileImage(
            @PathVariable("productId") Integer productId) {
        return productService.getProductProfileImage(productId);
    }

    @DeleteMapping("{productId}")
    public void deleteProductById(
            @PathVariable("productId") Integer productId) {
        productService.deleteProductById(productId);
    }

    @PutMapping(value = "{productId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public void updateProduct(
            @PathVariable("productId") Integer productId,
            @RequestPart("product") ProductUpdateRequest productUpdateRequest,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        productService.updateProduct(productId, productUpdateRequest);

        List<String> imagesToDelete = productUpdateRequest.imagesToDelete();
        if (files == null) {
            files = new ArrayList<>();
        }

        productService.updateProductImages(productId, files, imagesToDelete);
    }

    @GetMapping("{productId}/images")
    public ResponseEntity<List<ProductImageDTO>> getImagesByProductId(@PathVariable("productId") Integer productId) {
        return ResponseEntity.ok(productImageService.getImageUrlsByProductId(productId));
    }

    @PostMapping("/sell")
    public ResponseEntity<Sale> sellProducts(@RequestBody SaleRequest saleRequest, HttpServletRequest httpRequest) {
        try {
            Sale sale = productService.processSale(saleRequest, (Long) httpRequest.getAttribute("storeId"));
            return ResponseEntity.ok(sale);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/sales")
    public ResponseEntity<Page<SaleResponse>> getAllSales(HttpServletRequest httpRequest) {
        Page<SaleResponse> sales = productService.getAllSales((Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/email/{email}")
    public ResponseEntity<Page<Sale>> getSalesByCustomerEmail(@PathVariable("email") String email) {
        Page<Sale> sales = productService.getSalesByCustomerEmail(email);
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/{saleId}")
    public ResponseEntity<Sale> getSaleById(@PathVariable("saleId") String saleId) {
        Sale sale = productService.getSaleById(Long.valueOf(saleId));
        return ResponseEntity.ok(sale);
    }

    @PostMapping("/sales")
    public ResponseEntity<Sale> updateSales(@RequestBody String details) throws JsonProcessingException {
        System.out.println(details);
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(details);
        Sale sale = productService.updateSaleStatus(jsonNode.get("saleId").asLong(),
                jsonNode.get("status").asText());
        return ResponseEntity.ok(sale);
    }
}
