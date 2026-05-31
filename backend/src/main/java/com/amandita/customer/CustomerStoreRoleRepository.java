package com.amandita.customer;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerStoreRoleRepository extends JpaRepository<CustomerStoreRole, Long> {

    boolean existsByCustomerIdAndStoreIdAndRoleName(Integer customerId, Long storeId, String roleName);

    boolean existsByCustomerEmailIgnoreCaseAndStoreIdAndRoleName(String email, Long storeId, String roleName);

    @Query("""
            SELECT DISTINCT csr.customer
            FROM CustomerStoreRole csr
            LEFT JOIN FETCH csr.customer.addresses
            WHERE lower(csr.customer.email) = lower(:email)
              AND csr.store.id = :storeId
              AND csr.role.name = :roleName
            """)
    Optional<Customer> findCustomerByEmailStoreAndRole(@Param("email") String email,
                                                       @Param("storeId") Long storeId,
                                                       @Param("roleName") String roleName);

    @Query("""
            SELECT DISTINCT csr.customer
            FROM CustomerStoreRole csr
            LEFT JOIN FETCH csr.customer.addresses
            WHERE csr.customer.cpf = :cpf
              AND csr.store.id = :storeId
              AND csr.role.name = :roleName
            """)
    Optional<Customer> findCustomerByCpfStoreAndRole(@Param("cpf") String cpf,
                                                     @Param("storeId") Long storeId,
                                                     @Param("roleName") String roleName);

    @Query("""
            SELECT DISTINCT csr.customer
            FROM CustomerStoreRole csr
            LEFT JOIN FETCH csr.customer.addresses
            WHERE csr.store.id = :storeId
              AND csr.role.name = :roleName
            """)
    List<Customer> findCustomersByStoreAndRole(@Param("storeId") Long storeId,
                                               @Param("roleName") String roleName);

    @Query("""
            SELECT csr
            FROM CustomerStoreRole csr
            JOIN FETCH csr.customer c
            LEFT JOIN FETCH c.addresses
            JOIN FETCH csr.store
            JOIN FETCH csr.role
            WHERE lower(c.email) = lower(:email)
              AND csr.role.name = :roleName
            ORDER BY csr.id ASC
            """)
    List<CustomerStoreRole> findMembershipsByEmailAndRole(@Param("email") String email,
                                                          @Param("roleName") String roleName);

    @Query("""
            SELECT csr.role
            FROM CustomerStoreRole csr
            WHERE csr.customer.id = :customerId
              AND csr.store.id = :storeId
            """)
    List<Role> findRolesByCustomerAndStore(@Param("customerId") Integer customerId,
                                           @Param("storeId") Long storeId);
}
