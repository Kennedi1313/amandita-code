package com.amandita.Sale;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface SaleDao {
    Page<Sale> selectAllSales(int page, int size, Long storeId);
    List<Sale> findPendingMercadoPagoSales(Long storeId);
    List<Sale> findExpiredPendingMercadoPagoSales(LocalDateTime before);
    Sale insertSale(Sale sale);
    Optional<Sale> findById(Long id);
    Optional<Sale> findByIdAndStoreId(Long id, Long storeId);
    Optional<Sale> findByPreferenceId(String preferenceId);
    Optional<Sale> findByIdForUpdate(Long id);
    Optional<Sale> findByPreferenceIdForUpdate(String preferenceId);
    Page<Sale> findByUserEmail(String email, Long storeId);
}
