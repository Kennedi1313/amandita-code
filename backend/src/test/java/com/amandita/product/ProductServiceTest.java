package com.amandita.product;

import com.amandita.Sale.SaleDao;
import com.amandita.customer.CustomerDao;
import com.amandita.exception.RequestValidationException;
import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.amandita.store.StorePlan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProductServiceTest {
    private final ProductDao productDao = mock(ProductDao.class);
    private final StoreDao storeDao = mock(StoreDao.class);
    private final S3Service s3Service = mock(S3Service.class);
    private final S3Buckets s3Buckets = mock(S3Buckets.class);
    private final ProductService productService = new ProductService(
            productDao,
            mock(SaleDao.class),
            mock(CustomerDao.class),
            storeDao,
            new ProductDTOMapper(),
            s3Service,
            s3Buckets
    );

    @BeforeEach
    void setUp() {
        when(s3Buckets.getProduct()).thenReturn("products");
    }

    @Test
    void deletingProductMarksItInactiveWithoutRemovingItsRecord() {
        Product product = new Product();
        product.setId(12);
        when(productDao.selectProductByIdAndStore(12, 7L)).thenReturn(Optional.of(product));

        productService.deleteProductById(12, 7L);

        assertThat(product.isActive()).isFalse();
        verify(productDao).updateProduct(product);
        verify(productDao, never()).selectAllImageIdsByProductId(12);
    }

    @Test
    void createsFreePlanProductsPausedWhenTenAreAlreadyPublished() {
        Store store = new Store();
        store.setId(7L);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(productDao.countPublishedProductsByStore(7L)).thenReturn(10L);
        when(productDao.insertProduct(any(Product.class))).thenAnswer(invocation -> {
            Product inserted = invocation.getArgument(0);
            inserted.setId(24);
            return inserted;
        });

        Integer productId = productService.addProduct(
                new ProductRegistrationRequest(
                        "Produto novo", "Descrição", "0", "12,50", 5, "roupas", 0,
                        null, "simple", List.of()),
                7L);

        assertThat(productId).isEqualTo(24);
        var productCaptor = org.mockito.ArgumentCaptor.forClass(Product.class);
        verify(productDao).insertProduct(productCaptor.capture());
        assertThat(productCaptor.getValue().isPublished()).isFalse();
    }

    @Test
    void freePlanCannotPublishAnEleventhProduct() {
        Store store = new Store();
        store.setId(7L);
        Product product = new Product();
        product.setId(25);
        product.setPublished(false);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(productDao.selectProductByIdAndStore(25, 7L)).thenReturn(Optional.of(product));
        when(productDao.countPublishedProductsByStore(7L)).thenReturn(10L);

        assertThatThrownBy(() -> productService.setProductPublished(25, true, 7L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("até 10 produtos publicados");

        assertThat(product.isPublished()).isFalse();
        verify(productDao, never()).updateProduct(product);
    }

    @Test
    void completePlanCanPublishProductsWithoutTheFreePlanLimit() {
        Store store = new Store();
        store.setId(7L);
        store.setPlan(StorePlan.COMPLETE);
        Product product = new Product();
        product.setId(26);
        product.setName("Produto");
        product.setDescription("Descrição");
        product.setPrice(1000);
        product.setQuantity(1);
        product.setCategory("roupas");
        product.setPublished(false);
        when(storeDao.findByIdForUpdate(7L)).thenReturn(Optional.of(store));
        when(productDao.selectProductByIdAndStore(26, 7L)).thenReturn(Optional.of(product));

        productService.setProductPublished(26, true, 7L);

        assertThat(product.isPublished()).isTrue();
        verify(productDao).updateProduct(product);
        verify(productDao, never()).countPublishedProductsByStore(7L);
    }

    @Test
    void legacySingleImageUploadUsesCompressedMultiImageStoragePath() throws Exception {
        Product product = new Product();
        product.setId(22);
        when(productDao.selectProductByIdAndStore(22, 7L)).thenReturn(Optional.of(product));
        List<String> storedImageIds = new ArrayList<>();
        when(productDao.selectAllImageIdsByProductId(22)).thenReturn(storedImageIds);
        doAnswer(invocation -> {
            storedImageIds.add(invocation.getArgument(0));
            return null;
        }).when(productDao).addProductImage(any(), eq(22));
        byte[] source = createImage(1600, 1000);
        MockMultipartFile file = new MockMultipartFile("file", "product.png", "image/png", source);

        productService.updateProductProfileImage(22, file, 7L);

        var keyCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        var bodyCaptor = org.mockito.ArgumentCaptor.forClass(byte[].class);
        verify(s3Service).putObject(eq("products"), keyCaptor.capture(), bodyCaptor.capture());
        assertThat(keyCaptor.getValue()).startsWith("profile-images/22/");
        byte[] uploaded = bodyCaptor.getValue();
        BufferedImage compressed = ImageIO.read(new ByteArrayInputStream(uploaded));
        assertThat(compressed.getWidth()).isLessThanOrEqualTo(800);
        assertThat(compressed.getHeight()).isLessThanOrEqualTo(800);
        verify(productDao).addProductImage(any(), eq(22));
    }

    @Test
    void rejectsMoreThanFiveImagesBeforeUploadingOrDeletingAnything() {
        Product product = new Product();
        product.setId(23);
        when(productDao.selectProductByIdAndStore(23, 7L)).thenReturn(Optional.of(product));
        when(productDao.selectAllImageIdsByProductId(23)).thenReturn(List.of("existing"));

        assertThatThrownBy(() -> productService.updateProductImages(
                23,
                List.of(new MockMultipartFile("files", "1.png", "image/png", new byte[]{1}),
                        new MockMultipartFile("files", "2.png", "image/png", new byte[]{1}),
                        new MockMultipartFile("files", "3.png", "image/png", new byte[]{1}),
                        new MockMultipartFile("files", "4.png", "image/png", new byte[]{1}),
                        new MockMultipartFile("files", "5.png", "image/png", new byte[]{1})),
                List.of(),
                7L))
                .isInstanceOf(RequestValidationException.class)
                .hasMessageContaining("no máximo 5");

        verify(s3Service, never()).putObject(any(), any(), any());
        verify(s3Service, never()).deleteObject(any(), any());
    }

    private byte[] createImage(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
