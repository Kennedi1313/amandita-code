package com.amandita.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/auth")
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("login")
    public ResponseEntity<?> login(@RequestBody AuthenticationRequest request, HttpServletRequest httpRequest) {
        AuthenticationResponse response = authenticationService.login(request, (Long) httpRequest.getAttribute("storeId"));
        return ResponseEntity.ok()
                .header(HttpHeaders.AUTHORIZATION, response.token())
                .body(response);
    }

}
