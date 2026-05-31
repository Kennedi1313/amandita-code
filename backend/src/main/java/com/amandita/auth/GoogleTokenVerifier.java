package com.amandita.auth;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleTokenVerifier {

    private static final String GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

    private final RestTemplate restTemplate = new RestTemplate();
    private final String googleClientId;

    public GoogleTokenVerifier(@Value("${google.oauth.client-id:}") String googleClientId) {
        this.googleClientId = googleClientId;
    }

    public GoogleTokenInfo verify(String credential) {
        if (StringUtils.isBlank(googleClientId)) {
            throw new IllegalStateException("GOOGLE_CLIENT_ID não configurado no backend.");
        }
        if (StringUtils.isBlank(credential)) {
            throw new IllegalArgumentException("Credencial do Google não informada.");
        }

        String url = UriComponentsBuilder
                .fromHttpUrl(GOOGLE_TOKENINFO_URL)
                .queryParam("id_token", credential)
                .toUriString();

        GoogleTokenInfo tokenInfo;
        try {
            tokenInfo = restTemplate.getForObject(url, GoogleTokenInfo.class);
        } catch (RestClientException e) {
            throw new IllegalArgumentException("Credencial do Google invalida.", e);
        }

        if (tokenInfo == null) {
            throw new IllegalArgumentException("Credencial do Google invalida.");
        }
        if (!googleClientId.equals(tokenInfo.aud())) {
            throw new IllegalArgumentException("Credencial do Google emitida para outro aplicativo.");
        }
        if (!Boolean.TRUE.equals(tokenInfo.emailVerified())) {
            throw new IllegalArgumentException("Email do Google não verificado.");
        }
        if (StringUtils.isBlank(tokenInfo.email())) {
            throw new IllegalArgumentException("Credencial do Google sem email.");
        }

        return tokenInfo;
    }
}
