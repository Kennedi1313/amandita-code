package com.amandita.Sale;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import jakarta.persistence.LockModeType;

@Transactional
public interface SaleRepository extends JpaRepository<Sale, Long> {
    Page<Sale> findAllByStoreId(Long storeId, Pageable pageable);

    @Query("SELECT s FROM Sale s JOIN s.customer c WHERE c.email = ?1")
    Page<Sale> findAllByUserEmail(String email, Pageable pageable);

    @Query("SELECT s FROM Sale s JOIN s.customer c WHERE c.email = ?1 AND s.store.id = ?2")
    Page<Sale> findAllByUserEmailAndStoreId(String email, Long storeId, Pageable pageable);

    Optional<Sale> findByIdAndStoreId(Long id, Long storeId);

    Optional<Sale> findByPreferenceId(String preferenceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sale s WHERE s.id = ?1")
    Optional<Sale> findByIdForUpdate(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Sale s WHERE s.preferenceId = ?1")
    Optional<Sale> findByPreferenceIdForUpdate(String preferenceId);
}
