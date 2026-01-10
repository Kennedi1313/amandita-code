package com.amandita.customer;

import java.util.List;
import java.util.Optional;

public interface CustomerDao {
    List<Customer> selectAllCustomersByStore(Long storeId);
    Optional<Customer> selectCustomerById(Integer customerId);
    Optional<Customer> selectUserByCpfByStore(String cpf, Long storeId);
    Optional<Customer> selectUserByCpf(String cpf);
    Customer insertCustomer(Customer customer);
    boolean existsCustomerByEmailByStore(String email, Long storeId);
    boolean existsCustomerByEmail(String email);
    boolean existsCustomerById(Integer customerId);
    void deleteCustomerById(Integer customerId);
    void updateCustomer(Customer update);
    Optional<Customer> selectUserByEmailByStore(String email, Long storeId);
    Optional<Customer> selectUserByEmail(String email);
    void updateCustomerProfileImageId(String profileImageId, Integer customerId);
}
