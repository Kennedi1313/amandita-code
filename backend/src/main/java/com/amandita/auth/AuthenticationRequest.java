package com.amandita.auth;

public record AuthenticationRequest(
        String username,
        String password
) {
}
