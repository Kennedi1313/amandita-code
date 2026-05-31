package com.amandita.store;

import com.amandita.auth.GoogleTokenInfo;
import com.amandita.auth.GoogleTokenVerifier;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerDTO;
import com.amandita.customer.CustomerDTOMapper;
import com.amandita.customer.CustomerRepository;
import com.amandita.customer.CustomerStoreRole;
import com.amandita.customer.CustomerStoreRoleRepository;
import com.amandita.customer.Gender;
import com.amandita.customer.Role;
import com.amandita.customer.RoleRepository;
import com.amandita.exception.DuplicateResourceException;
import com.amandita.exception.RequestValidationException;
import com.amandita.jwt.JWTUtil;
import jakarta.transaction.Transactional;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class StoreRegistrationService {

    private final StoreRepository storeRepository;
    private final CategoryRepository categoryRepository;
    private final CustomerRepository customerRepository;
    private final CustomerStoreRoleRepository customerStoreRoleRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomerDTOMapper customerDTOMapper;
    private final JWTUtil jwtUtil;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final String baseDomain;
    private final String adminUrl;

    public StoreRegistrationService(StoreRepository storeRepository,
                                    CategoryRepository categoryRepository,
                                    CustomerRepository customerRepository,
                                    CustomerStoreRoleRepository customerStoreRoleRepository,
                                    RoleRepository roleRepository,
                                    PasswordEncoder passwordEncoder,
                                    CustomerDTOMapper customerDTOMapper,
                                    JWTUtil jwtUtil,
                                    GoogleTokenVerifier googleTokenVerifier,
                                    @Value("${saas.base-domain:mostradigital.com.br}") String baseDomain,
                                    @Value("${saas.admin-url:https://admin.mostradigital.com.br}") String adminUrl) {
        this.storeRepository = storeRepository;
        this.categoryRepository = categoryRepository;
        this.customerRepository = customerRepository;
        this.customerStoreRoleRepository = customerStoreRoleRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.customerDTOMapper = customerDTOMapper;
        this.jwtUtil = jwtUtil;
        this.googleTokenVerifier = googleTokenVerifier;
        this.baseDomain = baseDomain;
        this.adminUrl = adminUrl;
    }

    @Transactional
    public StoreRegistrationResponse register(StoreRegistrationRequest request) {
        validateRequest(request);

        Customer savedAdmin;
        if (StringUtils.isNotBlank(request.googleCredential())) {
            GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(request.googleCredential());
            String email = tokenInfo.email().trim().toLowerCase(Locale.ROOT);
            savedAdmin = createGoogleAdmin(
                    StringUtils.defaultIfBlank(request.ownerName(), StringUtils.defaultIfBlank(tokenInfo.name(), email)),
                    email
            );
        } else {
            String email = request.email().trim().toLowerCase(Locale.ROOT);
            savedAdmin = createAdmin(request.ownerName(), email, request.password());
        }

        Store savedStore = createStore(request.storeName(), request.subdomain(), request.whatsapp());
        savedAdmin.setPhone(request.whatsapp());
        savedAdmin.setStore(savedStore);
        savedAdmin.setOwnedStore(savedStore);
        savedAdmin = customerRepository.save(savedAdmin);
        addRoleToStore(savedAdmin, savedStore, "ROLE_ADMIN");

        return buildStoreResponse(savedStore, savedAdmin);
    }

    @Transactional
    public StoreAdminRegistrationResponse registerAdmin(StoreAdminRegistrationRequest request) {
        validateAdminRequest(request);

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        Customer savedAdmin = createAdmin(request.ownerName(), email, request.password());
        ensureLegacyAdminRole(savedAdmin);
        CustomerDTO adminDTO = customerDTOMapper.apply(savedAdmin);
        String token = jwtUtil.issueToken(adminDTO.username(), adminDTO.roles(), null);

        return new StoreAdminRegistrationResponse(token, adminDTO);
    }

    @Transactional
    public StoreAdminRegistrationResponse registerAdminWithGoogle(String credential) {
        GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(credential);
        String email = tokenInfo.email().trim().toLowerCase(Locale.ROOT);
        Customer savedAdmin = createGoogleAdmin(
                StringUtils.defaultIfBlank(tokenInfo.name(), email),
                email
        );
        ensureLegacyAdminRole(savedAdmin);
        CustomerDTO adminDTO = customerDTOMapper.apply(savedAdmin);
        String token = jwtUtil.issueToken(adminDTO.username(), adminDTO.roles(), null);

        return new StoreAdminRegistrationResponse(token, adminDTO);
    }

    @Transactional
    public StoreRegistrationResponse createStore(StoreCreationRequest request, String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new RequestValidationException("Crie seu acesso antes de criar a loja.");
        }

        String email = jwtUtil.getSubject(authorizationHeader.substring(7));
        Customer admin = customerRepository.findLegacyAdminByEmail(email)
                .orElseThrow(() -> new RequestValidationException("Acesso de administrador não encontrado."));

        if (!customerStoreRoleRepository.findMembershipsByEmailAndRole(email, "ROLE_ADMIN").isEmpty()) {
            throw new DuplicateResourceException("Esse administrador já possui uma loja.");
        }

        Store savedStore = createStore(request.storeName(), request.subdomain(), request.whatsapp());
        admin.setPhone(request.whatsapp());
        admin.setStore(savedStore);
        admin.setOwnedStore(savedStore);
        Customer savedAdmin = customerRepository.save(admin);
        addRoleToStore(savedAdmin, savedStore, "ROLE_ADMIN");

        return buildStoreResponse(savedStore, savedAdmin);
    }

    private void ensureLegacyAdminRole(Customer admin) {
        Role adminRole = getRole("ROLE_ADMIN");
        admin.getRoles().add(adminRole);
        customerRepository.save(admin);
    }

    private Customer createAdmin(String ownerName, String email, String password) {
        ensureEmailCanCreateStore(email);

        Customer admin = new Customer(
                ownerName.trim(),
                email,
                passwordEncoder.encode(password),
                18,
                Gender.FEMALE,
                null,
                ""
        );
        admin.setName(StringUtils.defaultIfBlank(admin.getName(), ownerName.trim()));
        return customerRepository.save(admin);
    }

    private Customer createGoogleAdmin(String ownerName, String email) {
        ensureEmailCanCreateStore(email);

        Customer admin = new Customer(
                ownerName.trim(),
                email,
                null,
                18,
                Gender.FEMALE,
                null,
                ""
        );
        admin.setName(StringUtils.defaultIfBlank(admin.getName(), ownerName.trim()));
        return customerRepository.save(admin);
    }

    private void ensureEmailCanCreateStore(String email) {
        if (!customerRepository.findStoreAdminsByEmail(email).isEmpty()) {
            throw new DuplicateResourceException("Esse email já possui uma loja.");
        }
    }

    private Store createStore(String storeName, String subdomainValue, String whatsapp) {
        validateStoreRequest(storeName, subdomainValue);

        String subdomain = normalizeSubdomain(subdomainValue);
        String domain = "%s.%s".formatted(subdomain, baseDomain).toLowerCase(Locale.ROOT);

        if (storeRepository.existsByDomain(domain)) {
            throw new DuplicateResourceException("Esse endereço de loja já está em uso.");
        }

        Timestamp now = new Timestamp(System.currentTimeMillis());
        Store store = new Store();
        store.setName(storeName.trim());
        store.setDomain(domain);
        store.setLogoUrl("logos/local");
        store.setBannerUrl("banners/local");
        store.setIconUrl("logos/local");
        store.setMercadoPagoPublicKey("");
        store.setMercadoPagoSecretKey("");
        store.setMelhorEnvioAccessToken("");
        store.setMelhorEnvioRefreshToken("");
        store.setInstagram("");
        store.setWhatsapp(StringUtils.defaultString(whatsapp));
        store.setPickupEnabled(true);
        store.setLocalDeliveryEnabled(true);
        store.setLocalDeliveryFee(0);
        store.setFreeShippingMinAmount(0);
        store.setLocalDeliveryEta("A combinar");
        store.setCreatedAt(now);
        store.setUpdatedAt(now);
        Store savedStore = storeRepository.save(store);

        seedDefaultCategories(savedStore);
        return savedStore;
    }

    private StoreRegistrationResponse buildStoreResponse(Store savedStore, Customer savedAdmin) {
        savedAdmin.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(savedAdmin.getId(), savedStore.getId()));
        CustomerDTO adminDTO = customerDTOMapper.apply(savedAdmin);
        String token = jwtUtil.issueToken(adminDTO.username(), adminDTO.roles(), savedStore.getId());

        return new StoreRegistrationResponse(
                token,
                adminDTO,
                savedStore.getId(),
                savedStore.getName(),
                savedStore.getDomain(),
                "https://" + savedStore.getDomain(),
                adminUrl
        );
    }

    private void addRoleToStore(Customer customer, Store store, String roleName) {
        if (customerStoreRoleRepository.existsByCustomerIdAndStoreIdAndRoleName(customer.getId(), store.getId(), roleName)) {
            return;
        }

        CustomerStoreRole membership = new CustomerStoreRole();
        membership.setCustomer(customer);
        membership.setStore(store);
        membership.setRole(getRole(roleName));
        customerStoreRoleRepository.save(membership);
    }

    private void validateRequest(StoreRegistrationRequest request) {
        if (request == null ||
                StringUtils.isBlank(request.storeName()) ||
                StringUtils.isBlank(request.subdomain())) {
            throw new RequestValidationException("Preencha os dados obrigatórios para criar a loja.");
        }

        if (StringUtils.isNotBlank(request.googleCredential())) {
            return;
        }

        if (StringUtils.isBlank(request.googleCredential()) &&
                (StringUtils.isBlank(request.ownerName()) ||
                        StringUtils.isBlank(request.email()) ||
                        StringUtils.isBlank(request.password()))) {
            throw new RequestValidationException("Preencha email e senha ou entre com Google para criar a loja.");
        }

        if (request.password().length() < 6) {
            throw new RequestValidationException("A senha precisa ter pelo menos 6 caracteres.");
        }
    }

    private void validateAdminRequest(StoreAdminRegistrationRequest request) {
        if (request == null ||
                StringUtils.isBlank(request.ownerName()) ||
                StringUtils.isBlank(request.email()) ||
                StringUtils.isBlank(request.password())) {
            throw new RequestValidationException("Preencha nome, email e senha para criar seu acesso.");
        }

        if (request.password().length() < 6) {
            throw new RequestValidationException("A senha precisa ter pelo menos 6 caracteres.");
        }
    }

    private void validateStoreRequest(String storeName, String subdomain) {
        if (StringUtils.isBlank(storeName) || StringUtils.isBlank(subdomain)) {
            throw new RequestValidationException("Informe nome e endereço da loja.");
        }
    }

    private String normalizeSubdomain(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        if (normalized.length() < 3) {
            throw new RequestValidationException("O endereço da loja precisa ter pelo menos 3 caracteres.");
        }

        if (List.of("api", "admin", "www", "painel", "portal", "app").contains(normalized)) {
            throw new RequestValidationException("Esse endereço é reservado. Escolha outro nome para a loja.");
        }

        return normalized;
    }

    private Role getRole(String name) {
        return roleRepository.findByName(name)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(name);
                    return roleRepository.save(role);
                });
    }

    private void seedDefaultCategories(Store store) {
        addCategory(store, "Novidades");
        addCategory(store, "Mais vendidos");
        addCategory(store, "Promocoes");
    }

    private void addCategory(Store store, String name) {
        Category category = new Category();
        category.setName(name);
        category.setPath("/products/" + normalizeCategoryPath(name));
        category.setStore(store);
        categoryRepository.save(category);
    }

    private String normalizeCategoryPath(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }
}
