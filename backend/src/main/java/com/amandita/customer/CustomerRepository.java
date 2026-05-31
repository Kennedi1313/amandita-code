package com.amandita.customer;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Transactional
public interface CustomerRepository
        extends JpaRepository<Customer, Integer> {

    @Query("SELECT (count(c) > 0) FROM Customer c JOIN c.store s WHERE c.email = :email AND s.id = :storeId")
    boolean existsCustomerByEmailByStore(String email, Long storeId);
    @Query("select (count(c) > 0) from Customer c where c.email = ?1")
    boolean existsCustomerByEmail(String email);
    @Query("select (count(c) > 0) from Customer c where c.id = ?1")
    boolean existsCustomerById(Integer id);
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.addresses JOIN c.store s WHERE c.email = :email AND s.id = :storeId")
    Optional<Customer> findCustomerByEmailByStore(@Param("email") String email, Long storeId);
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.addresses JOIN c.store s WHERE c.id = :customerId AND s.id = :storeId")
    Optional<Customer> findCustomerByIdAndStore(@Param("customerId") Integer customerId, @Param("storeId") Long storeId);
    @Query("""
            SELECT (count(c) > 0)
            FROM Customer c
            JOIN c.store s
            WHERE lower(c.email) = lower(:email)
              AND s.id = :storeId
              AND c.id <> :customerId
            """)
    boolean existsCustomerByEmailByStoreExcludingId(@Param("email") String email,
                                                    @Param("storeId") Long storeId,
                                                    @Param("customerId") Integer customerId);
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.addresses WHERE c.email = :email")
    Optional<Customer> findCustomerByEmail(@Param("email") String email);
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.addresses LEFT JOIN FETCH c.ownedStore JOIN c.roles r WHERE lower(c.email) = lower(:email) AND r.name = 'ROLE_ADMIN'")
    Optional<Customer> findLegacyAdminByEmail(@Param("email") String email);
    @Query("""
            SELECT DISTINCT c
            FROM Customer c
            LEFT JOIN FETCH c.ownedStore
            JOIN CustomerStoreRole csr ON csr.customer = c
            WHERE lower(c.email) = lower(:email)
              AND csr.role.name = 'ROLE_ADMIN'
            """)
    List<Customer> findStoreAdminsByEmail(@Param("email") String email);
    @Query("SELECT (count(c) > 0) FROM Customer c JOIN c.roles r WHERE lower(c.email) = lower(:email) AND r.name = 'ROLE_ADMIN'")
    boolean existsLegacyAdminByEmail(@Param("email") String email);
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.roles WHERE lower(c.email) = lower(:email)")
    List<Customer> findAllByEmailIgnoreCaseWithRoles(@Param("email") String email);
    @Query("SELECT c FROM Customer c JOIN c.store s WHERE c.cpf = :cpf AND s.id = :storeId")
    Optional<Customer> findCustomerByCpfByStore(String cpf, Long storeId);
    @Query("select c from Customer c where c.cpf = ?1")
    Optional<Customer> findCustomerByCpf(String cpf);

    @Query("select c from Customer c JOIN c.store s WHERE s.id = ?1")
    Page<Customer> findAllByStore(Long storeId, Pageable pageable);
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Customer c SET c.profileImageId = ?1 WHERE c.id = ?2")
    int updateProfileImageId(String profileImageId, Integer customerId);
}
