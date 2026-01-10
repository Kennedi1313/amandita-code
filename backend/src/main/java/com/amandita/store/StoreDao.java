package com.amandita.store;

import java.util.Optional;

public interface StoreDao {
    Optional<Store> findByDomain(String domain);
    Store insertStore(Store store);
    Optional<Store> findById(Long id);
}
