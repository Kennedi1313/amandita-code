package com.amandita.auth;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GoogleTokenInfo(
        String iss,
        String aud,
        String sub,
        String email,
        @JsonProperty("email_verified")
        Boolean emailVerified,
        String name,
        String picture
) {
}
