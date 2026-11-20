package com.amandita.Sale;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;
import java.time.LocalDateTime;
import jakarta.persistence.LockModeType;

@Transactional
public interface SaleRepository extends JpaRepository<Sale, Long> {
    Page<Sale> findAllByStoreId(Long storeId, Pageable pageable);
    long countByStore_Id(Long storeId);

    @Query(value = """
            SELECT COALESCE(SUM(GREATEST(
                COALESCE(items.items_total_cents, 0),
                ROUND(CASE
                    WHEN s.total_price > 0
                     AND (COALESCE(items.items_total_cents, 0) = 0
                       OR s.total_price < items.items_total_cents)
                    THEN s.total_price::numeric * 100
                    ELSE s.total_price::numeric
                END)
            )), 0) / 100.0
            FROM sale s
            LEFT JOIN (
                SELECT sale_id, SUM(price * quantity) AS items_total_cents
                FROM sale_item
                GROUP BY sale_id
            ) items ON items.sale_id = s.id
            WHERE s.store_id = :storeId
              AND s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')
            """, nativeQuery = true)
    Double sumTotalPriceByStoreId(@org.springframework.data.repository.query.Param("storeId") Long storeId);

    long countBySaleDateAfter(java.time.LocalDateTime fromDate);

    long countByStore_IdAndSaleDateAfter(Long storeId, java.time.LocalDateTime fromDate);

    long countByStatus(String status);

    long countByStore_IdAndStatus(Long storeId, String status);

    List<Sale> findTop10ByStore_IdOrderBySaleDateDesc(Long storeId);

    @Query("SELECT COUNT(DISTINCT s.store.id) FROM Sale s WHERE s.saleDate >= :fromDate AND s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')")
    long countStoresWithConfirmedSaleSince(
            @org.springframework.data.repository.query.Param("fromDate") java.time.LocalDateTime fromDate);

    @Query(value = """
            SELECT COALESCE(SUM(GREATEST(
                COALESCE(items.items_total_cents, 0),
                ROUND(CASE
                    WHEN s.total_price > 0
                     AND (COALESCE(items.items_total_cents, 0) = 0
                       OR s.total_price < items.items_total_cents)
                    THEN s.total_price::numeric * 100
                    ELSE s.total_price::numeric
                END)
            )), 0) / 100.0
            FROM sale s
            LEFT JOIN (
                SELECT sale_id, SUM(price * quantity) AS items_total_cents
                FROM sale_item
                GROUP BY sale_id
            ) items ON items.sale_id = s.id
            WHERE s.sale_date >= :fromDate
              AND s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')
            """, nativeQuery = true)
    Double sumConfirmedSalesSince(
            @org.springframework.data.repository.query.Param("fromDate") java.time.LocalDateTime fromDate);

    @Query(value = """
            SELECT COALESCE(SUM(GREATEST(
                COALESCE(items.items_total_cents, 0),
                ROUND(CASE
                    WHEN s.total_price > 0
                     AND (COALESCE(items.items_total_cents, 0) = 0
                       OR s.total_price < items.items_total_cents)
                    THEN s.total_price::numeric * 100
                    ELSE s.total_price::numeric
                END)
            )), 0) / 100.0
            FROM sale s
            LEFT JOIN (
                SELECT sale_id, SUM(price * quantity) AS items_total_cents
                FROM sale_item
                GROUP BY sale_id
            ) items ON items.sale_id = s.id
            WHERE s.sale_date >= :fromDate
              AND s.store_id = :storeId
              AND s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')
            """, nativeQuery = true)
    Double sumConfirmedSalesSinceForStore(
            @org.springframework.data.repository.query.Param("fromDate") java.time.LocalDateTime fromDate,
            @org.springframework.data.repository.query.Param("storeId") Long storeId);

    @Query(value = """
            SELECT CAST(sale_date AS DATE) AS sale_day,
                   COUNT(*) AS order_count,
                   COUNT(*) FILTER (WHERE s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')) AS confirmed_count,
                   COALESCE(SUM(GREATEST(
                       COALESCE(items.items_total_cents, 0),
                       ROUND(CASE
                           WHEN s.total_price > 0
                            AND (COALESCE(items.items_total_cents, 0) = 0
                              OR s.total_price < items.items_total_cents)
                           THEN s.total_price::numeric * 100
                           ELSE s.total_price::numeric
                       END)
                   )) FILTER (WHERE s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')), 0) / 100.0 AS confirmed_total
            FROM sale s
            LEFT JOIN (
                SELECT sale_id, SUM(price * quantity) AS items_total_cents
                FROM sale_item
                GROUP BY sale_id
            ) items ON items.sale_id = s.id
            WHERE s.sale_date >= :fromDate
            GROUP BY CAST(s.sale_date AS DATE)
            ORDER BY sale_day
            """, nativeQuery = true)
    List<Object[]> findPlatformDailySales(
            @org.springframework.data.repository.query.Param("fromDate") java.time.LocalDateTime fromDate);

    @Query(value = """
            SELECT CAST(s.sale_date AS DATE) AS sale_day,
                   COUNT(*) AS order_count,
                   COUNT(*) FILTER (WHERE s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')) AS confirmed_count,
                   COALESCE(SUM(GREATEST(
                       COALESCE(items.items_total_cents, 0),
                       ROUND(CASE
                           WHEN s.total_price > 0
                            AND (COALESCE(items.items_total_cents, 0) = 0
                              OR s.total_price < items.items_total_cents)
                           THEN s.total_price::numeric * 100
                           ELSE s.total_price::numeric
                       END)
                   )) FILTER (WHERE s.status IN ('APROVADO', 'PREPARANDO', 'ENVIADO', 'ENTREGUE')), 0) / 100.0 AS confirmed_total
            FROM sale s
            LEFT JOIN (
                SELECT sale_id, SUM(price * quantity) AS items_total_cents
                FROM sale_item
                GROUP BY sale_id
            ) items ON items.sale_id = s.id
            WHERE s.sale_date >= :fromDate
              AND s.store_id = :storeId
            GROUP BY CAST(s.sale_date AS DATE)
            ORDER BY sale_day
            """, nativeQuery = true)
    List<Object[]> findPlatformDailyStoreSales(
            @org.springframework.data.repository.query.Param("fromDate") java.time.LocalDateTime fromDate,
            @org.springframework.data.repository.query.Param("storeId") Long storeId);

    List<Sale> findByStore_IdAndPaymentMethodAndStatus(Long storeId, String paymentMethod, String status);

    List<Sale> findByPaymentMethodAndStatusAndSaleDateBefore(
            String paymentMethod, String status, LocalDateTime before);

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
