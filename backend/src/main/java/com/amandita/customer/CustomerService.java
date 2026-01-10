package com.amandita.customer;

import com.amandita.exception.DuplicateResourceException;
import com.amandita.exception.RequestValidationException;
import com.amandita.exception.ResourceNotFoundException;
import com.amandita.s3.S3Buckets;
import com.amandita.s3.S3Service;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerDao customerDao;
    private final CustomerDTOMapper customerDTOMapper;
    private final PasswordEncoder passwordEncoder;
    private final S3Service s3Service;
    private final S3Buckets s3Buckets;
    private final StoreDao storeDao;

    public CustomerService(@Qualifier("jpa") CustomerDao customerDao,
                           CustomerDTOMapper customerDTOMapper,
                           PasswordEncoder passwordEncoder,
                           S3Service s3Service,
                           S3Buckets s3Buckets,
                           StoreDao storeDao) {
        this.customerDao = customerDao;
        this.customerDTOMapper = customerDTOMapper;
        this.passwordEncoder = passwordEncoder;
        this.s3Service = s3Service; 
        this.s3Buckets = s3Buckets;
        this.storeDao = storeDao;
    }

    public List<CustomerDTO> getAllCustomersByStore(Long storeId) {
        return customerDao.selectAllCustomersByStore(storeId)
                .stream()
                .map(customerDTOMapper)
                .collect(Collectors.toList());
    }

    public CustomerDTO getCustomer(Integer id) {
        return customerDao.selectCustomerById(id)
                .map(customerDTOMapper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "customer with id [%s] not found".formatted(id)
                ));
    }

    public CustomerDTO getCustomerByEmailByStore(String email, Long storeId) {
        return customerDao.selectUserByEmailByStore(email, storeId)
                .map(customerDTOMapper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "customer with email [%s] not found".formatted(email)
                ));
    }

    public CustomerDTO findCustomerByCpfByStore(String cpf, Long storeId) {
        return customerDao.selectUserByCpfByStore(cpf, storeId)
                .map(customerDTOMapper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "customer with cpf [%s] not found".formatted(cpf)
                ));
    }

    public Customer addCustomer(CustomerRegistrationRequest customerRegistrationRequest, Long storeId) {
        // check if email exists
        String email = customerRegistrationRequest.email();

        if (StringUtils.isBlank(email)) {
            throw new ResourceNotFoundException("Email não pode ser vazio.");
        }

        if (customerDao.existsCustomerByEmailByStore(email, storeId)) {
            throw new DuplicateResourceException(
                    "Já existe um usuário cadastrado com esse email. Tente fazer login ou cadastre um novo email."
            );
        }

        Address address = new Address(
                customerRegistrationRequest.zip(),
                customerRegistrationRequest.street(),
                customerRegistrationRequest.number(),
                customerRegistrationRequest.district(),
                customerRegistrationRequest.city(),
                customerRegistrationRequest.reference()
        );

        // add
        Customer customer = new Customer(
                customerRegistrationRequest.name(),
                customerRegistrationRequest.email(),
                customerRegistrationRequest.password() != null ?
                    passwordEncoder.encode(customerRegistrationRequest.password()) :
                            null,
                customerRegistrationRequest.age() != null ?
                    customerRegistrationRequest.age() : 18,
                customerRegistrationRequest.gender() != null ?
                    customerRegistrationRequest.gender() : Gender.FEMALE,
                customerRegistrationRequest.phone(),
                customerRegistrationRequest.cpf());
        customer.addAddress(address);

        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));
        customer.setStore(store);

        return customerDao.insertCustomer(customer);
    }

    public void deleteCustomerById(Integer customerId) {
        checkIfCustomerExistsOrThrow(customerId);
        customerDao.deleteCustomerById(customerId);
    }

    private void checkIfCustomerExistsOrThrow(Integer customerId) {
        if (!customerDao.existsCustomerById(customerId)) {
            throw new ResourceNotFoundException(
                    "customer with id [%s] not found".formatted(customerId)
            );
        }
    }

    public void updateCustomer(Integer customerId,
                               CustomerUpdateRequest updateRequest) {

        Customer customer = customerDao.selectCustomerById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "customer with id [%s] not found".formatted(customerId)
                ));

        boolean changes = false;

        if (updateRequest.name() != null && !updateRequest.name().equals(customer.getName())) {
            customer.setName(updateRequest.name());
            changes = true;
        }

        if (updateRequest.age() != null && !updateRequest.age().equals(customer.getAge())) {
            customer.setAge(updateRequest.age());
            changes = true;
        }

        if(updateRequest.role() != null && !customer.getRoles().contains(updateRequest.role())) {
            customer.getRoles().add(updateRequest.role());
            changes = true;
        }

        if (updateRequest.cpf() != null && !updateRequest.cpf().equals(customer.getCpf())) {
            customer.setCpf(updateRequest.cpf());
            changes = true;
        }

        if (updateRequest.phone() != null && !updateRequest.phone().equals(customer.getPhone())) {
            customer.setPhone(updateRequest.phone());
            changes = true;
        }

        Address address = customer.getAddresses().stream().findFirst().orElseThrow(null);

        if (updateRequest.zip() != null && !updateRequest.zip().equals(address.getZip())) {
            address.setZip(updateRequest.zip());
            changes = true;
        }

        if (updateRequest.street() != null && !updateRequest.street().equals(address.getStreet())) {
            address.setStreet(updateRequest.street());
            changes = true;
        }

        if (updateRequest.number() != null && !updateRequest.number().equals(address.getNumber())) {
            address.setNumber(updateRequest.number());
            changes = true;
        }

        if (updateRequest.district() != null && !updateRequest.district().equals(address.getDistrict())) {
            address.setDistrict(updateRequest.district());
            changes = true;
        }

        if (updateRequest.city() != null && !updateRequest.city().equals(address.getCity())) {
            address.setCity(updateRequest.city());
            changes = true;
        }

        if (updateRequest.reference() != null && !updateRequest.reference().equals(address.getReference())) {
            address.setReference(updateRequest.reference());
            changes = true;
        }

        if (!changes) {
           throw new RequestValidationException("Nenhum campo a ser atualizado.");
        }

        customerDao.updateCustomer(customer);
    }

    public void uploadCustomerProfileImage(Integer customerId,
                                           MultipartFile file) {
        checkIfCustomerExistsOrThrow(customerId);
        String profileImageId = UUID.randomUUID().toString();
        try {
            s3Service.putObject(
                    s3Buckets.getCustomer(),
                    "profile-images/%s/%s.jpg".formatted(customerId, profileImageId),
                    file.getBytes()
            );
        } catch (IOException e) {
            throw new RuntimeException("failed to upload profile image", e);
        }
        customerDao.updateCustomerProfileImageId(profileImageId, customerId);
    }

    public byte[] getCustomerProfileImage(Integer customerId) {
        var customer = customerDao.selectCustomerById(customerId)
                .map(customerDTOMapper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "customer with id [%s] not found".formatted(customerId)
                ));

        if (StringUtils.isBlank(customer.profileImageId())) {
            throw new ResourceNotFoundException(
                    "customer with id [%s] profile image not found".formatted(customerId));
        }

        byte[] profileImage = s3Service.getObject(
                s3Buckets.getCustomer(),
                "profile-images/%s/%s.jpg".formatted(customerId, customer.profileImageId())
        );
        return profileImage;
    }
}

