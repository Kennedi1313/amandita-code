package com.amandita.customer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository("jpa")
public class CustomerJPADataAccessService implements CustomerDao {

    private final CustomerRepository customerRepository;

    public CustomerJPADataAccessService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Override
    public List<Customer> selectAllCustomersByStore(Long storeId) {
        Page<Customer> page = customerRepository.findAllByStore(storeId, Pageable.ofSize(1000));
        return page.getContent();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Optional<Customer> selectCustomerById(Integer id) {
        return customerRepository.findById(id);
    }

    @Override
    public Optional<Customer> selectUserByCpfByStore(String cpf, Long storeId) {
        return customerRepository.findCustomerByCpfByStore(cpf, storeId);
    }

    @Override
    public Optional<Customer> selectUserByCpf(String cpf) {
        return customerRepository.findCustomerByCpf(cpf);
    }

    @Override
    @SuppressWarnings("unchecked")
    public Customer insertCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    @Override
    public boolean existsCustomerByEmailByStore(String email, Long storeId) {
        return customerRepository.existsCustomerByEmailByStore(email, storeId);
    }

    @Override
    public boolean existsCustomerByEmail(String email) {
        return customerRepository.existsCustomerByEmail(email);
    }

    @Override
    public boolean existsCustomerById(Integer id) {
        return customerRepository.existsCustomerById(id);
    }

    @Override
    public void deleteCustomerById(Integer customerId) {
        customerRepository.deleteById(customerId);
    }

    @Override
    @SuppressWarnings("unchecked")
    public void updateCustomer(Customer update) {
        customerRepository.save(update);
    }

    @Override
    public Optional<Customer> selectUserByEmailByStore(String email, Long storeId) {
        return customerRepository.findCustomerByEmailByStore(email, storeId);
    }

    @Override
    public Optional<Customer> selectUserByEmail(String email) {
        return customerRepository.findCustomerByEmail(email);
    }

    @Override
    public void updateCustomerProfileImageId(String profileImageId,
                                             Integer customerId) {
        customerRepository.updateProfileImageId(profileImageId, customerId);
    }

}
