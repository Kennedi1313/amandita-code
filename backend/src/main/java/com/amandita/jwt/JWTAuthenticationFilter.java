package com.amandita.jwt;

import com.amandita.customer.*;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JWTAuthenticationFilter extends OncePerRequestFilter {

    private final JWTUtil jwtUtil;
    private final CustomerRepository customerRepository;
    private final CustomerStoreRoleRepository customerStoreRoleRepository;

    public JWTAuthenticationFilter(JWTUtil jwtUtil,
                                   CustomerRepository customerRepository,
                                   CustomerStoreRoleRepository customerStoreRoleRepository) {
        this.jwtUtil = jwtUtil;
        this.customerRepository = customerRepository;
        this.customerStoreRoleRepository = customerStoreRoleRepository;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7);
        String subject = jwtUtil.getSubject(jwt);

        if (subject != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {
            Long storeId = jwtUtil.getStoreId(jwt);
            Optional<Customer> userDetailsResult = Optional.empty();

            if (storeId != null) {
                userDetailsResult = customerStoreRoleRepository.findCustomerByEmailStoreAndRole(subject, storeId, "ROLE_USER")
                        .or(() -> customerStoreRoleRepository.findCustomerByEmailStoreAndRole(subject, storeId, "ROLE_ADMIN"));
            }

            if (userDetailsResult.isEmpty() && storeId == null) {
                userDetailsResult = customerStoreRoleRepository.findMembershipsByEmailAndRole(subject, "ROLE_ADMIN")
                        .stream()
                        .findFirst()
                        .map(CustomerStoreRole::getCustomer)
                        .or(() -> customerRepository.findLegacyAdminByEmail(subject));
            }

            if (userDetailsResult.isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }

            Customer userDetails = userDetailsResult.get();
            if (storeId != null) {
                userDetails.setEffectiveRoles(customerStoreRoleRepository.findRolesByCustomerAndStore(userDetails.getId(), storeId));
            }
            if (jwtUtil.isTokenValid(jwt, userDetails.getUsername())) {
                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                        );
                authenticationToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );
                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }
        }
        filterChain.doFilter(request, response);

    }
}
