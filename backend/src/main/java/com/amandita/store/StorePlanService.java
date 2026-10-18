package com.amandita.store;

import com.amandita.product.ProductDao;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.math.BigDecimal;

@Service
public class StorePlanService {
    public static final int FREE_PUBLISHED_PRODUCT_LIMIT = 10;
    public static final BigDecimal COMPLETE_MONTHLY_PRICE = new BigDecimal("49.90");

    private final StoreDao storeDao;
    private final ProductDao productDao;

    public StorePlanService(StoreDao storeDao, ProductDao productDao) {
        this.storeDao = storeDao;
        this.productDao = productDao;
    }

    @Transactional
    public StorePlanResponse getPlan(Long storeId) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        if (store.getPlan() == StorePlan.COMPLETE
                && !"authorized".equals(store.getMpSubscriptionStatus())
                && store.getMpSubscriptionPeriodEnd() != null
                && !store.getMpSubscriptionPeriodEnd().isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            Store lockedStore = storeDao.findByIdForUpdate(storeId)
                    .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
            downgradeExpiredSubscription(lockedStore, OffsetDateTime.now(ZoneOffset.UTC));
            store = storeDao.findById(storeId)
                    .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        }
        if (store.getPlan() == StorePlan.FREE
                && ("cancelled".equals(store.getMpSubscriptionStatus())
                || "canceled".equals(store.getMpSubscriptionStatus()))) {
            Store lockedStore = storeDao.findByIdForUpdate(storeId)
                    .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
            clearSubscriptionState(lockedStore);
            storeDao.insertStore(lockedStore);
            store = lockedStore;
        }
        return toResponse(store);
    }

    @Transactional
    public StorePlanResponse changePlan(Long storeId, StorePlan targetPlan) {
        if (targetPlan == null) {
            throw new IllegalArgumentException("Selecione um plano válido.");
        }
        if (targetPlan == StorePlan.COMPLETE) {
            throw new IllegalStateException("O plano Completo só é ativado após a autorização da assinatura no Mercado Pago.");
        }
        throw new IllegalStateException("Use o gerenciamento da assinatura para alterar o plano.");
    }

    @Transactional
    public void activateComplete(Store store) {
        store.setPlan(StorePlan.COMPLETE);
        storeDao.insertStore(store);
    }

    @Transactional
    public void deactivateUntilFirstPayment(Store store) {
        if (store.getPlan() != StorePlan.COMPLETE || store.isMpSubscriptionEverPaid()) {
            return;
        }
        productDao.unpublishAllProductsByStore(store.getId());
        store.setPlan(StorePlan.FREE);
        storeDao.insertStore(store);
    }

    @Transactional
    public void downgradeCancelledSubscriptionNow(Store store, OffsetDateTime now) {
        if (!"cancelled".equals(store.getMpSubscriptionStatus())
                && !"canceled".equals(store.getMpSubscriptionStatus())) {
            throw new IllegalStateException("Cancele primeiro a renovação do plano Completo.");
        }
        if (store.getPlan() != StorePlan.COMPLETE) {
            return;
        }
        // A manual downgrade is immediate. The remaining paid period is forfeited
        // and the cancelled subscription must not keep the store in a transitional state.
        productDao.unpublishAllProductsByStore(store.getId());
        store.setPlan(StorePlan.FREE);
        clearSubscriptionState(store);
        storeDao.insertStore(store);
    }

    @Transactional
    public void downgradeExpiredSubscription(Store store, OffsetDateTime now) {
        if (store.getPlan() != StorePlan.COMPLETE
                || store.getMpSubscriptionPeriodEnd() == null
                || store.getMpSubscriptionPeriodEnd().isAfter(now)
                || "authorized".equals(store.getMpSubscriptionStatus())) {
            return;
        }
        productDao.unpublishAllProductsByStore(store.getId());
        store.setPlan(StorePlan.FREE);
        storeDao.insertStore(store);
    }

    private void clearSubscriptionState(Store store) {
        store.setMpSubscriptionId(null);
        store.setMpSubscriptionStatus(null);
        store.setMpSubscriptionInitPoint(null);
        store.setMpSubscriptionNextPaymentAt(null);
        store.setMpSubscriptionPeriodEnd(null);
        store.setMpSubscriptionLastPaymentId(null);
        store.setMpSubscriptionLastPaymentStatus(null);
        store.setMpSubscriptionEverPaid(false);
    }

    private StorePlanResponse toResponse(Store store) {
        return new StorePlanResponse(
                store.getPlan(),
                productDao.countPublishedProductsByStore(store.getId()),
                store.getPlan() == StorePlan.FREE ? FREE_PUBLISHED_PRODUCT_LIMIT : null,
                store.getMpSubscriptionStatus(),
                store.getMpSubscriptionInitPoint(),
                store.getMpSubscriptionNextPaymentAt(),
                store.getMpSubscriptionPeriodEnd(),
                store.getMpSubscriptionLastPaymentStatus(),
                COMPLETE_MONTHLY_PRICE
        );
    }
}
