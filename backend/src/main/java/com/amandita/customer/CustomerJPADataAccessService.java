package com.amandita.customer;

import com.amandita.store.StoreRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository("jpa")
public class CustomerJPADataAccessService implements CustomerDao {

    private final CustomerRepository customerRepository;
    private final CustomerStoreRoleRepository customerStoreRoleRepository;
    private final RoleRepository roleRepository;
    private final StoreRepository storeRepository;

    public CustomerJPADataAccessService(CustomerRepository customerRepository,
                                        CustomerStoreRoleRepository customerStoreRoleRepository,
                                        RoleRepository roleRepository,
                                        StoreRepository storeRepository) {
        this.customerRepository = customerRepository;
        this.customerStoreRoleRepository = customerStoreRoleRepository;
        this.roleRepository = roleRepository;
        this.storeRepository = storeRepository;
    }

    @Override
    public List<Customer> selectAllCustomersByStore(Long storeId) {
        return customerStoreRoleRepository.findCustomersByStoreAndRole(storeId, "ROLE_USER");
    }

    @Override
    @SuppressWarnings("unchecked")
    public Optional<Customer> selectCustomerById(Integer id) {
        return customerRepository.findById(id);
    }

    @Override
    public Optional<Customer> selectCustomerByIdAndStore(Integer customerId, Long storeId) {
        return customerRepository.findCustomerByIdAndStore(customerId, storeId);
    }

    @Override
    public Optional<Customer> selectUserByCpfByStore(String cpf, Long storeId) {
        return customerStoreRoleRepository.findCustomerByCpfStoreAndRole(cpf, storeId, "ROLE_USER");
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
        return customerStoreRoleRepository.existsByCustomerEmailIgnoreCaseAndStoreIdAndRoleName(email, storeId, "ROLE_USER");
    }

    @Override
    public boolean existsCustomerByEmailByStoreExcludingId(String email, Long storeId, Integer customerId) {
        return customerRepository.existsCustomerByEmailByStoreExcludingId(email, storeId, customerId);
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
        return customerStoreRoleRepository.findCustomerByEmailStoreAndRole(email, storeId, "ROLE_USER");
    }

    @Override
    public Optional<Customer> selectUserByEmail(String email) {
        return customerRepository.findCustomerByEmail(email);
    }

    @Override
    public Optional<Customer> selectAdminByEmail(String email) {
        return customerStoreRoleRepository.findMembershipsByEmailAndRole(email, "ROLE_ADMIN")
                .stream()
                .findFirst()
                .map(membership -> {
                    Customer customer = membership.getCustomer();
                    customer.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(
                            customer.getId(),
                            membership.getStore().getId()
                    ));
                    customer.setOwnedStore(membership.getStore());
                    return customer;
                })
                .or(() -> customerRepository.findLegacyAdminByEmail(email));
    }

    @Override
    public boolean existsAdminByEmail(String email) {
        return !customerStoreRoleRepository.findMembershipsByEmailAndRole(email, "ROLE_ADMIN").isEmpty()
                || customerRepository.existsLegacyAdminByEmail(email);
    }

    @Override
    public void addRoleToCustomerInStore(Customer customer, Long storeId, String roleName) {
        if (customerStoreRoleRepository.existsByCustomerIdAndStoreIdAndRoleName(customer.getId(), storeId, roleName)) {
            return;
        }

        Role role = roleRepository.findByName(roleName).orElseThrow();
        CustomerStoreRole membership = new CustomerStoreRole();
        membership.setCustomer(customer);
        membership.setStore(storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada")));
        membership.setRole(role);
        customerStoreRoleRepository.save(membership);
    }

    @Override
    public List<Role> selectRolesByCustomerAndStore(Integer customerId, Long storeId) {
        return customerStoreRoleRepository.findRolesByCustomerAndStore(customerId, storeId);
    }

    @Override
    public void updateCustomerProfileImageId(String profileImageId,
                                             Integer customerId) {
        customerRepository.updateProfileImageId(profileImageId, customerId);
    }

}
