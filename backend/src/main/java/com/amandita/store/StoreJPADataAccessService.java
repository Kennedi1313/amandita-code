package com.amandita.store;

import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.time.OffsetDateTime;

@Repository
public class StoreJPADataAccessService implements StoreDao {
    public StoreRepository storeRepository;

    public StoreJPADataAccessService(StoreRepository storeRepository) {
        this.storeRepository = storeRepository;
    }

    @Override
    public Optional<Store> findByDomain(String domain) {
        return this.storeRepository.findByDomain(domain);
    }

    @Override
    public boolean existsByDomain(String domain) {
        return this.storeRepository.existsByDomain(domain);
    }

    @Override
    public Store insertStore(Store store) {
        return this.storeRepository.save(store);
    }

    @Override
    public Optional<Store> findById(Long id) {
        return this.storeRepository.findById(id);
    }

    @Override
    public Optional<Store> findByIdForUpdate(Long id) {
        return this.storeRepository.findByIdForUpdate(id);
    }

    @Override
    public Optional<Store> findByMpSubscriptionId(String subscriptionId) {
        return this.storeRepository.findByMpSubscriptionId(subscriptionId);
    }

    @Override
    public List<Store> findByMpSubscriptionIdIsNotNull() {
        return this.storeRepository.findByMpSubscriptionIdIsNotNull();
    }

    @Override
    public List<Store> findExpiredSubscriptions(OffsetDateTime now) {
        return this.storeRepository.findExpiredSubscriptions(StorePlan.COMPLETE, now);
    }

}
