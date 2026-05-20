package com.amandita.auth;

import com.amandita.customer.*;
import com.amandita.jwt.JWTUtil;
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

    public AuthenticationService(PasswordEncoder passwordEncoder,
                                 CustomerDTOMapper customerDTOMapper,
                                 JWTUtil jwtUtil,
                                 CustomerRepository customerRepository) {
        this.passwordEncoder = passwordEncoder;
        this.customerDTOMapper = customerDTOMapper;
        this.jwtUtil = jwtUtil;
        this.customerRepository = customerRepository;
    }

    public AuthenticationResponse login(AuthenticationRequest request, Long storeId) {
        Customer user = customerRepository.findCustomerByEmailByStore(request.username(), storeId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found for store "));
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid password");
        }
        CustomerDTO customerDTO = customerDTOMapper.apply(user);
        String token = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), storeId);
        return new AuthenticationResponse(token, customerDTO);
    }
}
