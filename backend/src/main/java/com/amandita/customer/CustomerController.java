package com.amandita.customer;

import com.amandita.jwt.JWTUtil;
import com.amandita.auth.AuthenticationResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;
    private final JWTUtil jwtUtil;
    private final CustomerDTOMapper customerDTOMapper;

    public CustomerController(CustomerService customerService,
                              JWTUtil jwtUtil, CustomerDTOMapper customerDTOMapper) {
        this.customerService = customerService;
        this.jwtUtil = jwtUtil;
        this.customerDTOMapper = customerDTOMapper;
    }

    @GetMapping
    public List<CustomerDTO> getCustomersByStore(HttpServletRequest httpRequest) {
        return customerService.getAllCustomersByStore((Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("{customerId}")
    public CustomerDTO getCustomer(@PathVariable("customerId") Integer customerId,
                                   HttpServletRequest httpRequest,
                                   Authentication authentication) {
        assertCustomerIdOrAdmin(customerId, authentication);
        return isAdmin(authentication)
                ? customerService.getCustomerByIdAndStore(customerId, (Long) httpRequest.getAttribute("storeId"))
                : customerService.getCustomer(customerId);
    }

    @GetMapping("email/{email}")
    public CustomerDTO getCustomerByEmailByStore(@PathVariable("email") String email,
                                                 HttpServletRequest httpRequest,
                                                 Authentication authentication) {
        assertEmailOrAdmin(email, authentication);
        return customerService.getCustomerByEmailByStore(email, (Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("cpf/{cpf}")
    public CustomerDTO searchCustomerByCpfByStore(@PathVariable("cpf") String cpf, HttpServletRequest httpRequest) {
        return customerService.findCustomerByCpfByStore(cpf, (Long) httpRequest.getAttribute("storeId"));
    }

    @PostMapping
    public ResponseEntity<?> registerCustomerByStore(
            @RequestBody CustomerRegistrationRequest request, HttpServletRequest httpRequest) {
        Customer newCustomer = customerService.addCustomer(request, (Long) httpRequest.getAttribute("storeId"));

        // Creating JWT token
        CustomerDTO customerDTO = customerDTOMapper.apply(newCustomer);
        String jwtToken = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), (Long) httpRequest.getAttribute("storeId"));
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.AUTHORIZATION, jwtToken);
        CustomerDTO responseCustomerDTO = customerDTOMapper.apply(newCustomer);
        return new ResponseEntity<>(
                new AuthenticationResponse(jwtToken, responseCustomerDTO),
                headers,
                HttpStatus.OK
        );
    }

    @DeleteMapping("{customerId}")
    public void deleteCustomer(
            @PathVariable("customerId") Integer customerId,
            HttpServletRequest httpRequest,
            Authentication authentication) {
        if (!isAdmin(authentication)) {
            throw new AccessDeniedException("Acesso negado.");
        }
        customerService.deleteCustomerByIdAndStore(customerId, (Long) httpRequest.getAttribute("storeId"));
    }

    @PutMapping("{customerId}")
    public void updateCustomer(
            @PathVariable("customerId") Integer customerId,
            @RequestBody CustomerUpdateRequest updateRequest,
            HttpServletRequest httpRequest,
            Authentication authentication) {
        assertCustomerIdOrAdmin(customerId, authentication);
        if (isAdmin(authentication)) {
            customerService.getCustomerByIdAndStore(customerId, (Long) httpRequest.getAttribute("storeId"));
        }
        customerService.updateCustomer(customerId, updateRequest);
    }

    @PostMapping(
            value = "{customerId}/profile-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public void uploadCustomerProfileImage(
            @PathVariable("customerId") Integer customerId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest,
            Authentication authentication) {
        assertCustomerIdOrAdmin(customerId, authentication);
        if (isAdmin(authentication)) {
            customerService.getCustomerByIdAndStore(customerId, (Long) httpRequest.getAttribute("storeId"));
        }
        customerService.uploadCustomerProfileImage(customerId, file);
    }

    @GetMapping(
            value = "{customerId}/profile-image",
            produces = MediaType.IMAGE_JPEG_VALUE
    )
    public byte[] getCustomerProfileImage(
            @PathVariable("customerId") Integer customerId) {
        return customerService.getCustomerProfileImage(customerId);
    }

    private void assertEmailOrAdmin(String email, Authentication authentication) {
        if (isAdmin(authentication)) {
            return;
        }
        Customer customer = authenticatedCustomer(authentication);
        if (customer != null && email.equalsIgnoreCase(customer.getEmail())) {
            return;
        }
        throw new AccessDeniedException("Acesso negado.");
    }

    private void assertCustomerIdOrAdmin(Integer customerId, Authentication authentication) {
        if (isAdmin(authentication)) {
            return;
        }
        Customer customer = authenticatedCustomer(authentication);
        if (customer != null && customerId.equals(customer.getId())) {
            return;
        }
        throw new AccessDeniedException("Acesso negado.");
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private Customer authenticatedCustomer(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Customer customer) {
            return customer;
        }
        return null;
    }

}
