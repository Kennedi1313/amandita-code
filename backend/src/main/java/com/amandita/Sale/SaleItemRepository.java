package com.amandita.Sale;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    @Query("select item from SaleItem item join fetch item.sale sale join fetch item.product left join fetch sale.customer where item.id = :itemId and sale.store.id = :storeId")
    Optional<SaleItem> findByIdAndStoreId(@Param("itemId") Long itemId, @Param("storeId") Long storeId);
}
