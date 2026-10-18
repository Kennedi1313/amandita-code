package com.amandita.store;

import java.util.Optional;
import java.util.List;
import java.time.OffsetDateTime;

public interface StoreDao {
    Optional<Store> findByDomain(String domain);
    boolean existsByDomain(String domain);
    Store insertStore(Store store);
    Optional<Store> findById(Long id);
    Optional<Store> findByIdForUpdate(Long id);
    Optional<Store> findByMpSubscriptionId(String subscriptionId);
    List<Store> findByMpSubscriptionIdIsNotNull();
    List<Store> findExpiredSubscriptions(OffsetDateTime now);
}
