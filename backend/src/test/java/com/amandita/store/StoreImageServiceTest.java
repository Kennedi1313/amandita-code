package com.amandita.store;

import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StoreImageServiceTest {
    private final StoreDao storeDao = mock(StoreDao.class);
    private final S3Service s3Service = mock(S3Service.class);
    private final S3Buckets s3Buckets = mock(S3Buckets.class);
    private final StoreImageService service = new StoreImageService(storeDao, s3Service, s3Buckets);

    @Test
    void replacingBannerOverwritesTheSameS3ObjectInsteadOfAccumulatingFiles() throws Exception {
        Store store = new Store();
        store.setId(9L);
        when(storeDao.findById(9L)).thenReturn(Optional.of(store));
        when(storeDao.insertStore(store)).thenReturn(store);
        when(s3Buckets.getProduct()).thenReturn("products");
        MockMultipartFile banner = new MockMultipartFile(
                "file",
                "banner.png",
                "image/png",
                createImage(2000, 1000)
        );

        service.uploadImage(9L, "banner", banner, "https://api.example/store/images/banner?v=1");
        service.uploadImage(9L, "banner", banner, "https://api.example/store/images/banner?v=2");

        var keys = org.mockito.ArgumentCaptor.forClass(String.class);
        var bodies = org.mockito.ArgumentCaptor.forClass(byte[].class);
        verify(s3Service, times(2)).putObject(eq("products"), keys.capture(), bodies.capture());
        assertThat(keys.getAllValues()).containsOnly("store-images/9/banner.png");
        assertThat(ImageIO.read(new ByteArrayInputStream(bodies.getValue())).getWidth()).isEqualTo(1600);
        assertThat(store.getBannerUrl()).isEqualTo("https://api.example/store/images/banner?v=2");
        verify(s3Service, never()).deleteObject(any(), any());
    }

    private byte[] createImage(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
