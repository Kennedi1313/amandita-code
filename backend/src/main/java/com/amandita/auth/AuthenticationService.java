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

    public AuthenticationService(PasswordEncoder passwordEncoder,
                                 CustomerDTOMapper customerDTOMapper,
                                 JWTUtil jwtUtil,
                                 CustomerRepository customerRepository,
                                 CustomerStoreRoleRepository customerStoreRoleRepository,
                                 RoleService roleService,
                                 StoreDao storeDao,
                                 GoogleTokenVerifier googleTokenVerifier) {
        this.passwordEncoder = passwordEncoder;
        this.customerDTOMapper = customerDTOMapper;
        this.jwtUtil = jwtUtil;
        this.customerRepository = customerRepository;
        this.customerStoreRoleRepository = customerStoreRoleRepository;
        this.roleService = roleService;
        this.storeDao = storeDao;
        this.googleTokenVerifier = googleTokenVerifier;
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
        CustomerStoreRole membership = customerStoreRoleRepository.findMembershipsByEmailAndRole(request.username(), "ROLE_ADMIN")
                .stream()
                .findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Admin user not found"));
        Customer user = membership.getCustomer();

        if (StringUtils.isBlank(user.getPassword())) {
            throw new BadCredentialsException("Entre com Google para acessar esta conta.");
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid password");
        }

        Store adminStore = membership.getStore();
        user.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(user.getId(), adminStore.getId()));
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), adminStore.getId());
        return new AuthenticationResponse(token, customerDTO);
    }

    public AuthenticationResponse adminLoginWithGoogle(GoogleLoginRequest request) {
        GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(request.credential());
        CustomerStoreRole membership = customerStoreRoleRepository.findMembershipsByEmailAndRole(tokenInfo.email(), "ROLE_ADMIN")
                .stream()
                .findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Admin user not found"));
        Customer user = membership.getCustomer();

        Store adminStore = membership.getStore();
        user.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(user.getId(), adminStore.getId()));
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), adminStore.getId());
        return new AuthenticationResponse(token, customerDTO);
    }

    public AuthenticationResponse loginWithGoogle(GoogleLoginRequest request, Long storeId) {
        GoogleTokenInfo tokenInfo = googleTokenVerifier.verify(request.credential());
        Customer user = customerStoreRoleRepository.findCustomerByEmailStoreAndRole(tokenInfo.email(), storeId, "ROLE_USER")
                .orElseGet(() -> createGoogleCustomer(tokenInfo, storeId));

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
