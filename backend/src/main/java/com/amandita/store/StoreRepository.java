package com.amandita.store;

import jakarta.transaction.Transactional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;
import java.time.OffsetDateTime;

@Transactional
public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByDomain(String domain);
    boolean existsByDomain(String domain);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Store s WHERE s.id = :id")
    Optional<Store> findByIdForUpdate(@Param("id") Long id);

    Optional<Store> findByMpSubscriptionId(String subscriptionId);
    List<Store> findByMpSubscriptionIdIsNotNull();

    @Query("""
            SELECT s FROM Store s
            WHERE s.plan = :plan
              AND s.mpSubscriptionStatus <> 'authorized'
              AND s.mpSubscriptionPeriodEnd IS NOT NULL
              AND s.mpSubscriptionPeriodEnd <= :now
            """)
    List<Store> findExpiredSubscriptions(@Param("plan") StorePlan plan,
                                         @Param("now") OffsetDateTime now);
}
