package com.amandita.customer;

import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository("list")
public class CustomerListDataAccessService {

    // db
    private static final List<Customer> customers;

    static {
        customers = new ArrayList<>();

        Customer alex = new Customer(
                1,
                "Alex",
                "alex@gmail.com",
                "password",
                21,
                Gender.MALE);
        customers.add(alex);

        Customer jamila = new Customer(
                2,
                "Jamila",
                "jamila@gmail.com",
                "password",
                19,
                Gender.MALE);
        customers.add(jamila);
    }

    public List<Customer> selectAllCustomers() {
        return customers;
    }

    public Optional<Customer> selectCustomerById(Integer id) {
        return customers.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst();
    }

    public Optional<Customer> selectUserByCpf(String cpf) {
        return Optional.empty();
    }

    public void insertCustomer(Customer customer) {
        customers.add(customer);
    }

    public boolean existsCustomerWithEmail(String email) {
        return customers.stream()
                .anyMatch(c -> c.getEmail().equals(email));
    }

    public boolean existsCustomerById(Integer id) {
        return customers.stream()
                .anyMatch(c -> c.getId().equals(id));
    }

    public void deleteCustomerById(Integer customerId) {
        customers.stream()
                .filter(c -> c.getId().equals(customerId))
                .findFirst()
                .ifPresent(customers::remove);
    }

    public void updateCustomer(Customer customer) {
        customers.add(customer);
    }

    public Optional<Customer> selectUserByEmail(String email) {
        return customers.stream()
                .filter(c -> c.getUsername().equals(email))
                .findFirst();
    }

    public void updateCustomerProfileImageId(String profileImageId, Integer customerId) {
        // TODO: Implement this 😅
    }

}
