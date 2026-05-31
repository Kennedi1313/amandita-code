package com.amandita.store;

import com.amandita.auth.GoogleLoginRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/tenants")
public class StoreRegistrationController {

    private final StoreRegistrationService storeRegistrationService;

    public StoreRegistrationController(StoreRegistrationService storeRegistrationService) {
        this.storeRegistrationService = storeRegistrationService;
    }

    @PostMapping("/register")
    public ResponseEntity<StoreRegistrationResponse> register(@RequestBody StoreRegistrationRequest request) {
        return ResponseEntity.ok(storeRegistrationService.register(request));
    }

    @PostMapping("/admin")
    public ResponseEntity<StoreAdminRegistrationResponse> registerAdmin(@RequestBody StoreAdminRegistrationRequest request) {
        StoreAdminRegistrationResponse response = storeRegistrationService.registerAdmin(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, response.token())
                .body(response);
    }

    @PostMapping("/admin/google")
    public ResponseEntity<StoreAdminRegistrationResponse> registerAdminWithGoogle(@RequestBody GoogleLoginRequest request) {
        StoreAdminRegistrationResponse response = storeRegistrationService.registerAdminWithGoogle(request.credential());
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, response.token())
                .body(response);
    }

    @PostMapping("/store")
    public ResponseEntity<StoreRegistrationResponse> createStore(@RequestBody StoreCreationRequest request,
                                                                 @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        StoreRegistrationResponse response = storeRegistrationService.createStore(request, authorizationHeader);
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, response.token())
                .body(response);
    }
}
