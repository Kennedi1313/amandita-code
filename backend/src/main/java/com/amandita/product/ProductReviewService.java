package com.amandita.product;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleItem;
import com.amandita.Sale.SaleItemRepository;
import com.amandita.customer.Customer;
import com.amandita.store.StoreDao;
import jakarta.transaction.Transactional;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class ProductReviewService {
    private final ProductReviewRepository reviews;
    private final SaleItemRepository saleItems;
    private final StoreDao stores;

    public ProductReviewService(ProductReviewRepository reviews, SaleItemRepository saleItems, StoreDao stores) {
        this.reviews = reviews;
        this.saleItems = saleItems;
        this.stores = stores;
    }

    @Transactional
    public ProductReviewResponse create(Long storeId, Customer customer, ProductReviewRequest request) {
        if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
            throw new IllegalArgumentException("A avaliação deve ter uma nota de 1 a 5.");
        }
        SaleItem item = saleItems.findByIdAndStoreId(request.saleItemId(), storeId)
                .orElseThrow(() -> new IllegalArgumentException("Item de compra não encontrado."));
        Sale sale = item.getSale();
        if (sale.getStore() == null || !storeId.equals(sale.getStore().getId())
                || sale.getCustomer() == null || !customer.getId().equals(sale.getCustomer().getId())) {
            throw new AccessDeniedException("Este item não pertence às suas compras nesta loja.");
        }
        if (!"ENTREGUE".equalsIgnoreCase(sale.getStatus())) {
            throw new IllegalStateException("Você poderá avaliar o produto quando o pedido for marcado como entregue.");
        }
        if (reviews.existsBySaleItemId(item.getId())) {
            throw new IllegalStateException("Este item já foi avaliado.");
        }
        ProductReview review = new ProductReview();
        review.setStore(stores.findById(storeId).orElseThrow());
        review.setProduct(item.getProduct());
        review.setSaleItem(item);
        review.setSale(sale);
        review.setCustomer(customer);
        review.setReviewerName(customer.getName() == null ? "Cliente verificado" : customer.getName());
        review.setRating(request.rating());
        review.setTitle(clean(request.title(), 120));
        review.setComment(clean(request.comment(), 3000));
        return ProductReviewResponse.from(reviews.save(review));
    }

    @Transactional
    public List<ProductReviewResponse> publicReviews(Long storeId, Integer productId) {
        return reviews.findByStoreIdAndProductIdAndStatusOrderByCreatedAtDesc(storeId, productId, "PUBLISHED")
                .stream().map(ProductReviewResponse::from).toList();
    }

    @Transactional
    public List<ProductReviewResponse> adminReviews(Long storeId) {
        return reviews.findByStoreIdOrderByCreatedAtDesc(storeId).stream().map(ProductReviewResponse::from).toList();
    }

    @Transactional
    public ProductReviewResponse setStatus(Long storeId, Long reviewId, String status) {
        if (!"PUBLISHED".equals(status) && !"HIDDEN".equals(status)) {
            throw new IllegalArgumentException("Status de avaliação inválido.");
        }
        ProductReview review = reviews.findById(reviewId)
                .filter(candidate -> candidate.getStore().getId().equals(storeId))
                .orElseThrow(() -> new IllegalArgumentException("Avaliação não encontrada."));
        review.setStatus(status);
        return ProductReviewResponse.from(review);
    }

    @Transactional
    public List<Long> reviewedSaleItemIds(Long storeId, Integer customerId) {
        return reviews.findByStoreIdAndCustomerId(storeId, customerId).stream()
                .map(review -> review.getSaleItem().getId()).toList();
    }

    private String clean(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.substring(0, Math.min(trimmed.length(), maxLength));
    }
}
