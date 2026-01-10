package com.amandita.store;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

@Transactional
public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByDomain(String domain);
}
