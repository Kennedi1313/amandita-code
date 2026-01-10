package com.amandita.Sale;

import org.springframework.data.domain.Page;

import java.util.Optional;

public interface SaleDao {
    Page<Sale> selectAllSales(int page, int size, Long storeId);
    Sale insertSale(Sale sale);
    Optional<Sale> findById(Long id);
    Page<Sale> findByUserEmail(String email);
}
