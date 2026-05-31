package com.amandita.customer;

import java.util.List;
import java.util.Optional;

public interface CustomerDao {
    List<Customer> selectAllCustomersByStore(Long storeId);
    Optional<Customer> selectCustomerById(Integer customerId);
    Optional<Customer> selectCustomerByIdAndStore(Integer customerId, Long storeId);
    Optional<Customer> selectUserByCpfByStore(String cpf, Long storeId);
    Optional<Customer> selectUserByCpf(String cpf);
    Customer insertCustomer(Customer customer);
    boolean existsCustomerByEmailByStore(String email, Long storeId);
    boolean existsCustomerByEmailByStoreExcludingId(String email, Long storeId, Integer customerId);
    boolean existsCustomerByEmail(String email);
    boolean existsCustomerById(Integer customerId);
    void deleteCustomerById(Integer customerId);
    void updateCustomer(Customer update);
    Optional<Customer> selectUserByEmailByStore(String email, Long storeId);
    Optional<Customer> selectUserByEmail(String email);
    Optional<Customer> selectAdminByEmail(String email);
    boolean existsAdminByEmail(String email);
    void addRoleToCustomerInStore(Customer customer, Long storeId, String roleName);
    List<Role> selectRolesByCustomerAndStore(Integer customerId, Long storeId);
    void updateCustomerProfileImageId(String profileImageId, Integer customerId);
}
