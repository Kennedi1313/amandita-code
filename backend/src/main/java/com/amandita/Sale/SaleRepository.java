package com.amandita.Sale;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

@Transactional
public interface SaleRepository extends JpaRepository<Sale, Long> {
    @Query("select s from Sale s join s.store st where s.status <> :status and st.id = :storeId")
    Page<Sale> findByExcludedStatus(String status, Long storeId, Pageable pageable);

    @Query("SELECT s FROM Sale s JOIN s.customer c WHERE c.email = ?1 and s.status <> 'PENDENTE'")
    Page<Sale> findAllByUserEmail(String email, Pageable pageable);
}
