package com.amandita.store;

import org.springframework.stereotype.Repository;

import java.util.Optional;

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
    public Store insertStore(Store store) {
        return this.storeRepository.save(store);
    }

    @Override
    public Optional<Store> findById(Long id) {
        return this.storeRepository.findById(id);
    }


}
