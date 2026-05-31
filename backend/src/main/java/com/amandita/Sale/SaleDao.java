package com.amandita.Sale;

import org.springframework.data.domain.Page;

import java.util.Optional;

public interface SaleDao {
    Page<Sale> selectAllSales(int page, int size, Long storeId);
    Sale insertSale(Sale sale);
    Optional<Sale> findById(Long id);
    Optional<Sale> findByIdAndStoreId(Long id, Long storeId);
    Optional<Sale> findByPreferenceId(String preferenceId);
    Optional<Sale> findByIdForUpdate(Long id);
    Optional<Sale> findByPreferenceIdForUpdate(String preferenceId);
    Page<Sale> findByUserEmail(String email, Long storeId);
}
