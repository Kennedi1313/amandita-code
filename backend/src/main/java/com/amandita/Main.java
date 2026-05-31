package com.amandita;

import com.amandita.customer.Customer;
import com.amandita.customer.CustomerRepository;
import com.amandita.customer.CustomerStoreRole;
import com.amandita.customer.CustomerStoreRoleRepository;
import com.amandita.customer.Role;
import com.amandita.customer.RoleRepository;
import com.amandita.store.Category;
import com.amandita.store.CategoryRepository;
import com.amandita.store.Store;
import com.amandita.store.StoreRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.sql.Timestamp;

@SpringBootApplication
@EnableJpaRepositories
public class Main {

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(Main.class);
        application.setAdditionalProfiles("ssl");
        application.run(args);
    }

    @Bean
    CommandLineRunner runner(StoreRepository storeRepository,
                             CategoryRepository categoryRepository,
                             RoleRepository roleRepository,
                             CustomerRepository customerRepository,
                             CustomerStoreRoleRepository customerStoreRoleRepository) {
        return args -> {
            String defaultLogo = "logos/local";
            String defaultBanner = "banners/local";
            String defaultIcon = "logos/local";

            Store store = storeRepository.findByDomain("localhost")
                    .orElseGet(() -> {
                        Store localStore = new Store();
                        localStore.setName("Amandita Local");
                        localStore.setDomain("localhost");
                        localStore.setLogoUrl(defaultLogo);
                        localStore.setBannerUrl(defaultBanner);
                        localStore.setIconUrl(defaultIcon);
                        localStore.setMercadoPagoPublicKey("");
                        localStore.setMercadoPagoSecretKey("");
                        localStore.setMelhorEnvioAccessToken("");
                        localStore.setMelhorEnvioRefreshToken("");
                        localStore.setInstagram("");
                        localStore.setWhatsapp("");
                        Timestamp now = new Timestamp(System.currentTimeMillis());
                        localStore.setCreatedAt(now);
                        localStore.setUpdatedAt(now);
                        return storeRepository.save(localStore);
                    });

            seedLocalCategories(categoryRepository, store);

            Role roleUser = roleRepository.findByName("ROLE_USER")
                    .orElseGet(() -> {
                        Role role = new Role();
                        role.setName("ROLE_USER");
                        return roleRepository.save(role);
                    });
            Role roleAdmin = roleRepository.findByName("ROLE_ADMIN")
                    .orElseGet(() -> {
                        Role role = new Role();
                        role.setName("ROLE_ADMIN");
                        return roleRepository.save(role);
                    });

            migrateLegacyMemberships(customerRepository, customerStoreRoleRepository, roleUser, roleAdmin);
        };
    }

    private void migrateLegacyMemberships(CustomerRepository customerRepository,
                                          CustomerStoreRoleRepository customerStoreRoleRepository,
                                          Role roleUser,
                                          Role roleAdmin) {
        customerRepository.findAll().forEach(customer -> {
            if (customer.getStore() != null) {
                addMembershipIfMissing(customerStoreRoleRepository, customer, customer.getStore(), roleUser);
                boolean hasLegacyAdminRole = customer.getRoles().stream()
                        .anyMatch(role -> "ROLE_ADMIN".equals(role.getName()));
                if (hasLegacyAdminRole) {
                    addMembershipIfMissing(customerStoreRoleRepository, customer, customer.getStore(), roleAdmin);
                }
            }

            if (customer.getOwnedStore() != null) {
                addMembershipIfMissing(customerStoreRoleRepository, customer, customer.getOwnedStore(), roleAdmin);
            }
        });
    }

    private void addMembershipIfMissing(CustomerStoreRoleRepository repository, Customer customer, Store store, Role role) {
        if (repository.existsByCustomerIdAndStoreIdAndRoleName(customer.getId(), store.getId(), role.getName())) {
            return;
        }

        CustomerStoreRole membership = new CustomerStoreRole();
        membership.setCustomer(customer);
        membership.setStore(store);
        membership.setRole(role);
        repository.save(membership);
    }

    private void seedLocalCategories(CategoryRepository categoryRepository, Store store) {
        if (!categoryRepository.findAllByStoreId(store.getId()).isEmpty()) {
            return;
        }

        addCategoryIfMissing(categoryRepository, store, "Aneis", "/products/aneis");
        addCategoryIfMissing(categoryRepository, store, "Brincos", "/products/brincos");
        addCategoryIfMissing(categoryRepository, store, "Colares", "/products/colares");
        addCategoryIfMissing(categoryRepository, store, "Pulseiras", "/products/pulseiras");
        addCategoryIfMissing(categoryRepository, store, "Tornozeleiras", "/products/tornozeleiras");
    }

    private void addCategoryIfMissing(CategoryRepository categoryRepository, Store store, String name, String path) {
        if (categoryRepository.existsByStoreIdAndPath(store.getId(), path)) {
            return;
        }

        Category category = new Category();
        category.setName(name);
        category.setPath(path);
        category.setStore(store);
        categoryRepository.save(category);
    }
}
