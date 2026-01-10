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
    @Query("SELECT DISTINCT c FROM Customer c LEFT JOIN FETCH c.addresses WHERE c.email = :email")
    Optional<Customer> findCustomerByEmail(@Param("email") String email);
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
