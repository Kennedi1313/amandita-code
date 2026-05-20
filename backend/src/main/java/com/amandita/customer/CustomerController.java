package com.amandita.customer;

import com.amandita.jwt.JWTUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("api/v1/customers")
public class CustomerController {

    private final CustomerService customerService;
    private final RoleService roleService;
    private final JWTUtil jwtUtil;
    private final CustomerDTOMapper customerDTOMapper;

    public CustomerController(CustomerService customerService, RoleService roleService,
                              JWTUtil jwtUtil, CustomerDTOMapper customerDTOMapper) {
        this.customerService = customerService;
        this.roleService = roleService;
        this.jwtUtil = jwtUtil;
        this.customerDTOMapper = customerDTOMapper;
    }

    @GetMapping
    public List<CustomerDTO> getCustomersByStore(HttpServletRequest httpRequest) {
        return customerService.getAllCustomersByStore((Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("{customerId}")
    public CustomerDTO getCustomer(
            @PathVariable("customerId") Integer customerId) {
        return customerService.getCustomer(customerId);
    }

    @GetMapping("email/{email}")
    public CustomerDTO getCustomerByEmailByStore(@PathVariable("email") String email, HttpServletRequest httpRequest) {
        return customerService.getCustomerByEmailByStore(email, (Long) httpRequest.getAttribute("storeId"));
    }

    @GetMapping("cpf/{cpf}")
    public CustomerDTO searchCustomerByCpfByStore(@PathVariable("cpf") String cpf, HttpServletRequest httpRequest) {
        return customerService.findCustomerByCpfByStore(cpf, (Long) httpRequest.getAttribute("storeId"));
    }

    @PostMapping
    public ResponseEntity<?> registerCustomerByStore(
            @RequestBody CustomerRegistrationRequest request, HttpServletRequest httpRequest) {
        Role requestedRole = roleService.findByName(request.role())
                .orElse(null);

        if (requestedRole == null) {
            requestedRole = roleService.findByName("ROLE_USER").orElseThrow();
        }

        Customer newCustomer = customerService.addCustomer(request, (Long) httpRequest.getAttribute("storeId"));

        // Save the customer with the role
        customerService.updateCustomer(
                newCustomer.getId(),
                new CustomerUpdateRequest(null, null, requestedRole, null, null, null, null, null, null, null, null));

        // Creating JWT token
        CustomerDTO customerDTO = customerDTOMapper.apply(newCustomer);
        String jwtToken = jwtUtil.issueToken(customerDTO.username(), customerDTO.roles(), (Long) httpRequest.getAttribute("storeId"));
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.AUTHORIZATION, jwtToken);
        return new ResponseEntity<>
                (newCustomer, headers, HttpStatus.OK);
    }

    @DeleteMapping("{customerId}")
    public void deleteCustomer(
            @PathVariable("customerId") Integer customerId) {
        customerService.deleteCustomerById(customerId);
    }

    @PutMapping("{customerId}")
    public void updateCustomer(
            @PathVariable("customerId") Integer customerId,
            @RequestBody CustomerUpdateRequest updateRequest) {
        customerService.updateCustomer(customerId, updateRequest);
    }

    @PostMapping(
            value = "{customerId}/profile-image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public void uploadCustomerProfileImage(
            @PathVariable("customerId") Integer customerId,
            @RequestParam("file") MultipartFile file) {
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

}
