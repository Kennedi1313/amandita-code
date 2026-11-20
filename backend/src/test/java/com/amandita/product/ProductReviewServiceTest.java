package com.amandita.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleItem;
import com.amandita.Sale.SaleItemRepository;
import com.amandita.customer.Customer;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProductReviewServiceTest {
    @Mock private ProductReviewRepository reviews;
    @Mock private SaleItemRepository saleItems;
    @Mock private StoreDao stores;

    private ProductReviewService service;
    private Customer customer;
    private Store store;
    private Sale sale;
    private SaleItem saleItem;

    @BeforeEach
    void setUp() {
        service = new ProductReviewService(reviews, saleItems, stores);
        customer = new Customer();
        customer.setId(7);
        customer.setName("Cliente Teste");
        store = new Store();
        store.setId(12L);
        sale = new Sale();
        sale.setId(31L);
        sale.setStore(store);
        sale.setCustomer(customer);
        sale.setStatus("ENTREGUE");
        Product product = new Product();
        product.setId(55);
        product.setName("Produto Teste");
        saleItem = new SaleItem();
        saleItem.setId(91L);
        saleItem.setSale(sale);
        saleItem.setProduct(product);
        when(saleItems.findByIdAndStoreId(91L, 12L)).thenReturn(Optional.of(saleItem));
    }

    @Test
    void refusesReviewBeforeOrderIsDelivered() {
        sale.setStatus("ENVIADO");

        assertThrows(IllegalStateException.class,
                () -> service.create(12L, customer, new ProductReviewRequest(91L, 5, null, "Ótimo")));

        verify(reviews, never()).save(any());
    }

    @Test
    void createsVerifiedReviewForDeliveredPurchase() {
        when(stores.findById(12L)).thenReturn(Optional.of(store));
        when(reviews.existsBySaleItemId(91L)).thenReturn(false);
        when(reviews.save(any(ProductReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductReviewResponse response = service.create(
                12L, customer, new ProductReviewRequest(91L, 5, "Gostei", "Chegou certinho."));

        assertEquals(91L, response.saleItemId());
        assertEquals(55, response.productId());
        assertEquals("Cliente Teste", response.reviewerName());
        assertEquals("PUBLISHED", response.status());
    }
}
