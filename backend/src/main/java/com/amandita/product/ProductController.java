package com.amandita.product;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleRequest;
import com.amandita.Sale.SaleResponse;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerDTOMapper;
import com.amandita.jwt.JWTUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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
            HttpServletRequest httpRequest,
            Authentication authentication) {
        Long storeId = (Long) httpRequest.getAttribute("storeId");
        return isAdmin(authentication)
                ? productService.getAllProductsByStore(page, size, storeId)
                : productService.getPublishedProductsByStore(page, size, storeId);
    }

    @GetMapping("/no-store")
    public Page<ProductDTO> getProducts(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        return productService.getAllProducts(page, size);
    }

    @GetMapping("{productId}")
    public ProductDTO getProduct(
            @PathVariable("productId") Integer productId,
            HttpServletRequest httpRequest,
            Authentication authentication
    ) {
        Long storeId = (Long) httpRequest.getAttribute("storeId");
        return isAdmin(authentication)
                ? productService.getProductByIdAndStore(productId, storeId)
                : productService.getPublishedProductByIdAndStore(productId, storeId);
    }

    @GetMapping("{productId}/no-store")
    public ProductDTO getProductNoStore(
            @PathVariable("productId") Integer productId
    ) {
        return productService.getProductById(productId);
    }

    @GetMapping("/by-category")
    public Page<ProductDTO> getProductsByCategoryByStore(
            @RequestParam("category") String category,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            HttpServletRequest httpRequest,
            Authentication authentication) {
        Long storeId = (Long) httpRequest.getAttribute("storeId");
        return isAdmin(authentication)
                ? productService.findProductsByCategoryByStore(category, page, size, storeId)
                : productService.findPublishedProductsByCategoryByStore(category, page, size, storeId);
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
            HttpServletRequest httpRequest,
            Authentication authentication) {
        Long storeId = (Long) httpRequest.getAttribute("storeId");
        return isAdmin(authentication)
                ? productService.findProductsByNameByStore(query, page, size, storeId)
                : productService.findPublishedProductsByNameByStore(query, page, size, storeId);
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
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        productService.updateProductProfileImage(productId, file, (Long) httpRequest.getAttribute("storeId"));
    }

    @PostMapping(value = "/with-images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createProductWithImages(
            @RequestPart("product") ProductRegistrationRequest productRequest,
            @RequestPart("files") List<MultipartFile> files,
            HttpServletRequest httpRequest) {

        productService.validateNewProductImageCount(files.size());
        Long storeId = (Long) httpRequest.getAttribute("storeId");

        Integer productId = productService.addProduct(productRequest, storeId);

        productService.updateProductImages(productId, files, new ArrayList<>(), storeId);

        if ("variable".equalsIgnoreCase(productRequest.productType()) && productRequest.variations() != null) {
            productService.addProductVariations(productId, productRequest, storeId);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(productId);
    }

    @GetMapping(
            value = "{productId}/profile-image",
            produces = MediaType.IMAGE_JPEG_VALUE
    )
    public byte[] getProductProfileImage(
            @PathVariable("productId") Integer productId,
            @RequestParam(value = "imageId", required = false) String imageId,
            HttpServletRequest httpRequest) {
        return productService.getProductProfileImage(productId, imageId, (Long) httpRequest.getAttribute("storeId"));
    }

    @DeleteMapping("{productId}")
    public void deleteProductById(
            @PathVariable("productId") Integer productId,
            HttpServletRequest httpRequest) {
        productService.deleteProductById(productId, (Long) httpRequest.getAttribute("storeId"));
    }

    @PutMapping("{productId}/publication")
    public ResponseEntity<?> setProductPublication(
            @PathVariable Integer productId,
            @RequestBody ProductPublicationRequest request,
            HttpServletRequest httpRequest) {
        try {
            return ResponseEntity.ok(productService.setProductPublished(
                    productId, request.published(), (Long) httpRequest.getAttribute("storeId")));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(exception.getMessage());
        }
    }

    @PutMapping(value = "{productId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public void updateProduct(
            @PathVariable("productId") Integer productId,
            @RequestPart("product") ProductUpdateRequest productUpdateRequest,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest httpRequest
    ) {
        Long storeId = (Long) httpRequest.getAttribute("storeId");
        List<String> imagesToDelete = productUpdateRequest.imagesToDelete() == null
                ? List.of()
                : productUpdateRequest.imagesToDelete();
        if (files == null) {
            files = new ArrayList<>();
        }

        productService.validateProductImageCount(productId, files, imagesToDelete, storeId);
        productService.updateProduct(productId, productUpdateRequest, storeId);
        productService.updateProductImages(productId, files, imagesToDelete, storeId);
    }

    @GetMapping("{productId}/images")
    public ResponseEntity<List<ProductImageDTO>> getImagesByProductId(@PathVariable("productId") Integer productId,
                                                                      HttpServletRequest httpRequest) {
        productService.requireProductByIdAndStore(productId, (Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(productImageService.getImageUrlsByProductId(productId));
    }

    @PostMapping("/sell")
    public ResponseEntity<Void> sellProducts(@RequestBody SaleRequest saleRequest) {
        return ResponseEntity.status(HttpStatus.GONE).build();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    @GetMapping("/sales")
    public ResponseEntity<Page<SaleResponse>> getAllSales(HttpServletRequest httpRequest) {
        Page<SaleResponse> sales = productService.getAllSales((Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/email/{email}")
    public ResponseEntity<Page<SaleResponse>> getSalesByCustomerEmail(@PathVariable("email") String email,
                                                                      HttpServletRequest httpRequest,
                                                                      Authentication authentication) {
        assertSelfOrAdmin(email, authentication);
        Page<SaleResponse> sales = productService.getSalesByCustomerEmail(email, (Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(sales);
    }

    @GetMapping("/sales/{saleId}")
    public ResponseEntity<Sale> getSaleById(@PathVariable("saleId") String saleId, HttpServletRequest httpRequest) {
        Sale sale = productService.getSaleById(Long.valueOf(saleId), (Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(sale);
    }

    @PostMapping("/sales")
    public ResponseEntity<SaleResponse> updateSales(@RequestBody SaleStatusUpdateRequest details,
                                                    HttpServletRequest httpRequest) {
        Sale sale = productService.updateSaleStatus(details.saleId(), details.status(), (Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok(
                SaleResponse.fromEntity(sale, new ProductDTOMapper(), new CustomerDTOMapper())
        );
    }

    private void assertSelfOrAdmin(String email, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Acesso negado.");
        }
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        if (isAdmin) {
            return;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Customer customer && email.equalsIgnoreCase(customer.getEmail())) {
            return;
        }
        throw new AccessDeniedException("Acesso negado.");
    }

    private record SaleStatusUpdateRequest(Long saleId, String status) {
    }
}
