package com.amandita.auth;

import com.amandita.customer.*;
import com.amandita.jwt.JWTUtil;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import org.apache.commons.lang3.StringUtils;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    private final PasswordEncoder passwordEncoder;
    private final CustomerDTOMapper customerDTOMapper;
    private final JWTUtil jwtUtil;
    private final CustomerRepository customerRepository;
    private final CustomerStoreRoleRepository customerStoreRoleRepository;
    private final RoleService roleService;
    private final StoreDao storeDao;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final CustomerService customerService;

    public AuthenticationService(PasswordEncoder passwordEncoder,
                                 CustomerDTOMapper customerDTOMapper,
                                 JWTUtil jwtUtil,
                                 CustomerRepository customerRepository,
                                 CustomerStoreRoleRepository customerStoreRoleRepository,
                                 RoleService roleService,
                                 StoreDao storeDao,
                                 GoogleTokenVerifier googleTokenVerifier,
                                 CustomerService customerService) {
        this.passwordEncoder = passwordEncoder;
        this.customerDTOMapper = customerDTOMapper;
        this.jwtUtil = jwtUtil;
        this.customerRepository = customerRepository;
        this.customerStoreRoleRepository = customerStoreRoleRepository;
        this.roleService = roleService;
        this.storeDao = storeDao;
        this.googleTokenVerifier = googleTokenVerifier;
        this.customerService = customerService;
    }

    public AuthenticationResponse login(AuthenticationRequest request, Long storeId) {
        Customer user = customerStoreRoleRepository.findCustomerByEmailStoreAndRole(request.username(), storeId, "ROLE_USER")
                .orElseThrow(() -> new UsernameNotFoundException("User not found for store "));
        if (StringUtils.isBlank(user.getPassword())) {
            throw new BadCredentialsException("Entre com Google para acessar esta conta.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid password");
        }
        user.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(user.getId(), storeId));
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), storeId);
        return new AuthenticationResponse(token, customerDTO);
    }

    public AuthenticationResponse adminLogin(AuthenticationRequest request) {
        CustomerStoreRole membership = findAdminMembership(request.username());
        Customer user = findAdminCustomer(request.username(), membership);

        if (StringUtils.isBlank(user.getPassword())) {
            throw new BadCredentialsException("Entre com Google para acessar esta conta.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid password");
        }

        return createAdminAuthentication(user, membership);
    }

    public AuthenticationResponse adminLoginWithGoogle(GoogleLoginRequest request) {
        GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(request.credential());
        CustomerStoreRole membership = findAdminMembership(tokenInfo.email());
        Customer user = findAdminCustomer(tokenInfo.email(), membership);
        if (StringUtils.isBlank(user.getProfileImageId()) && StringUtils.isNotBlank(tokenInfo.picture())) {
            customerService.importGoogleProfileImage(user.getId(), tokenInfo.picture());
        }
        return createAdminAuthentication(user, membership);
    }

    private CustomerStoreRole findAdminMembership(String email) {
        return customerStoreRoleRepository.findMembershipsByEmailAndRole(
                        StringUtils.trimToEmpty(email),
                        "ROLE_ADMIN")
                .stream()
                .findFirst()
                .orElse(null);
    }

    private Customer findAdminCustomer(String email, CustomerStoreRole membership) {
        if (membership != null) {
            return membership.getCustomer();
        }

        return customerRepository.findLegacyAdminByEmail(StringUtils.trimToEmpty(email))
                .orElseThrow(() -> new UsernameNotFoundException("Admin user not found"));
    }

    private AuthenticationResponse createAdminAuthentication(Customer user, CustomerStoreRole membership) {
        Store adminStore = membership != null
                ? membership.getStore()
                : user.getOwnedStore() != null
                        ? user.getOwnedStore()
                        : user.getStore();
        if (membership != null) {
            user.setEffectiveRoles(
                    customerStoreRoleRepository.findRolesByCustomerAndStore(user.getId(), adminStore.getId()));
        }
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(
                customerDTO.username(),
                customerDTO.roles(),
                adminStore == null ? null : adminStore.getId());
        return new AuthenticationResponse(token, customerDTO);
    }

    public AuthenticationResponse loginWithGoogle(GoogleLoginRequest request, Long storeId) {
        GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(request.credential());
        Customer user = customerStoreRoleRepository.findCustomerByEmailStoreAndRole(tokenInfo.email(), storeId, "ROLE_USER")
                .orElseGet(() -> createGoogleCustomer(tokenInfo, storeId));

        if (StringUtils.isBlank(user.getProfileImageId()) && StringUtils.isNotBlank(tokenInfo.picture())) {
            customerService.importGoogleProfileImage(user.getId(), tokenInfo.picture());
        }

        user.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(user.getId(), storeId));
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), storeId);
        return new AuthenticationResponse(token, customerDTO);
    }

    private Customer createGoogleCustomer(GoogleTokenInfo tokenInfo, Long storeId) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        Role userRole = roleService.findByName("ROLE_USER").orElseThrow();

        Customer customer = new Customer(
                StringUtils.defaultIfBlank(tokenInfo.name(), tokenInfo.email()),
                tokenInfo.email(),
                null,
                18,
                Gender.FEMALE,
                null,
                "");
        customer.setStore(store);
        Customer savedCustomer = customerRepository.save(customer);

        if (!customerStoreRoleRepository.existsByCustomerIdAndStoreIdAndRoleName(savedCustomer.getId(), storeId, "ROLE_USER")) {
            CustomerStoreRole membership = new CustomerStoreRole();
            membership.setCustomer(savedCustomer);
            membership.setStore(store);
            membership.setRole(userRole);
            customerStoreRoleRepository.save(membership);
        }
        return savedCustomer;
    }
}
