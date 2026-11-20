package com.amandita.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.Instant;
import java.time.Duration;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class JWTUtil {

    private final String secretKey;

    public JWTUtil(@Value("${jwt.secret}") String secretKey) {
        if (secretKey == null || secretKey.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 characters.");
        }
        this.secretKey = secretKey;
    }

    public String issueToken(String subject) {
        return issueToken(subject, Map.of());
    }

    public String issueToken(String subject, String ...scopes) {
        return issueToken(subject, Map.of("scopes", scopes));
    }

    public String issueToken(String subject, List<String> scopes, Long storeId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("scopes", scopes);
        claims.put("storeId", storeId);

        return issueToken(subject, claims);
    }


    public String issueToken(
            String subject,
            Map<String, Object> claims) {
        return issueToken(subject, claims, Duration.ofDays(15));
    }

    public String issueToken(String subject, Map<String, Object> claims, Duration lifetime) {
        if (lifetime == null || lifetime.isZero() || lifetime.isNegative()) {
            throw new IllegalArgumentException("Token lifetime must be positive.");
        }
        String token = Jwts
                .builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuer("https://amanditapratas.com.br")
                .setIssuedAt(Date.from(Instant.now()))
                .setExpiration(
                        Date.from(
                                Instant.now().plus(lifetime)
                        )
                )
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
        return token;
    }

    public String getSubject(String token) {
        return getClaims(token).getSubject();
    }

    private Claims getClaims(String token) {
        Claims claims = Jwts
                .parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims;
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public boolean isTokenValid(String jwt, String username) {
        String subject = getSubject(jwt);
        return subject.equals(username) && !isTokenExpired(jwt);
    }

    private boolean isTokenExpired(String jwt) {
        Date today = Date.from(Instant.now());
        return getClaims(jwt).getExpiration().before(today);
    }

    public Long getStoreId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("storeId", Long.class);
    }

    public Object getClaim(String token, String claimName) {
        return getClaims(token).get(claimName);
    }

    public boolean hasScope(String token, String scope) {
        Object scopes = getClaims(token).get("scopes");
        if (scopes instanceof List<?> list) {
            return list.stream().anyMatch(item -> scope.equals(String.valueOf(item)));
        }
        if (scopes instanceof String[] array) {
            return Arrays.asList(array).contains(scope);
        }
        return false;
    }
}
