package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class MercadoPagoOAuthService {
    private static final String AUTHORIZE_URL = "https://auth.mercadopago.com.br/authorization";
    private static final String API_BASE_URL = "https://api.mercadopago.com";
    private static final long STATE_TTL_SECONDS = 600;
    private static final String ENCRYPTED_TOKEN_PREFIX = "enc:v1:";
    private static final int GCM_NONCE_BYTES = 12;

    private final StoreDao storeDao;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String adminUrl;
    private final String applicationFee;
    private final boolean sandbox;
    private final String tokenEncryptionKey;

    public MercadoPagoOAuthService(StoreDao storeDao, ObjectMapper objectMapper,
                                   @Value("${mercadopago.client-id:}") String clientId,
                                   @Value("${mercadopago.client-secret:}") String clientSecret,
                                   @Value("${mercadopago.redirect-uri:}") String redirectUri,
                                   @Value("${saas.admin-url:http://localhost:4173}") String adminUrl,
                                   @Value("${mercadopago.application-fee:}") String applicationFee,
                                   @Value("${mercadopago.sandbox:false}") boolean sandbox,
                                   @Value("${mercadopago.token-encryption-key:${jwt.secret}}") String tokenEncryptionKey) {
        this.storeDao = storeDao;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.adminUrl = adminUrl.replaceAll("/+$", "");
        this.applicationFee = applicationFee;
        this.sandbox = sandbox;
        this.tokenEncryptionKey = tokenEncryptionKey;
    }

    public String authorizationUrl(Long storeId) {
        requireConfigured();
        String state = createState(storeId);
        return authorizationUrl(state);
    }

    private String authorizationUrl(String state) {
        return AUTHORIZE_URL + "?client_id=" + encode(clientId)
                + "&response_type=code&platform_id=mp&state=" + encode(state)
                + "&redirect_uri=" + encode(redirectUri);
    }

    public String failureRedirect() { return adminUrl + "/dashboard/payments?mercadopago=error"; }

    @Transactional
    public String handleCallback(String code, String state, String oauthError) {
        if (StringUtils.isNotBlank(oauthError)) {
            return failureRedirect();
        }
        if (StringUtils.isBlank(code) || code.length() > 2048 || StringUtils.isBlank(state)) {
            throw new IllegalArgumentException("Callback OAuth inválido.");
        }
        Long storeId = verifyState(state);
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja da autorização não encontrada."));
        if (store.getPlan() != StorePlan.COMPLETE) {
            return failureRedirect();
        }
        JsonNode tokens = requestToken("authorization_code", code, null);
        String accessToken = text(tokens, "access_token");
        String refreshToken = text(tokens, "refresh_token");
        if (StringUtils.isAnyBlank(accessToken, refreshToken)) {
            throw new IllegalStateException("O Mercado Pago não retornou os tokens esperados.");
        }
        store.setMpAccessToken(encryptToken(accessToken));
        store.setMpRefreshToken(encryptToken(refreshToken));
        storeDao.insertStore(store);
        return adminUrl + "/dashboard/payments?mercadopago=connected";
    }

    /** Executes an authenticated call with this store's OAuth token, refreshing once after HTTP 401. */
    @Transactional
    public JsonNode createPayment(Long storeId, JsonNode paymentPayload, String idempotencyKey) {
        if (StringUtils.isBlank(idempotencyKey) || idempotencyKey.length() > 128) {
            throw new IllegalArgumentException("Informe um Idempotency-Key válido.");
        }
        if (paymentPayload == null || !paymentPayload.isObject()
                || !paymentPayload.path("transaction_amount").isNumber()
                || paymentPayload.path("transaction_amount").decimalValue().signum() <= 0
                || StringUtils.isBlank(paymentPayload.path("payment_method_id").asText())) {
            throw new IllegalArgumentException("Dados de pagamento inválidos.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada."));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O Mercado Pago está disponível no plano Completo.");
        }
        if (StringUtils.isBlank(store.getMpAccessToken())) {
            throw new IllegalStateException("Esta loja ainda não conectou o Mercado Pago.");
        }

        addConfiguredApplicationFee(paymentPayload);
        return requestMerchantApi(storeId, "/v1/payments", "POST", paymentPayload, idempotencyKey);
    }

    @Transactional
    public JsonNode requestMerchantApi(Long storeId, String apiPath, String method, JsonNode payload,
                                       String idempotencyKey) {
        if (StringUtils.isBlank(apiPath) || !apiPath.startsWith("/") || apiPath.contains("..")
                || !("GET".equals(method) || "POST".equals(method))) {
            throw new IllegalArgumentException("Requisição Mercado Pago inválida.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada."));
        if (StringUtils.isBlank(store.getMpAccessToken())) {
            throw new IllegalStateException("Esta loja ainda não conectou o Mercado Pago.");
        }
        String accessToken = decryptToken(store.getMpAccessToken());
        String refreshToken = decryptToken(store.getMpRefreshToken());
        if (!isEncrypted(store.getMpAccessToken()) || !isEncrypted(store.getMpRefreshToken())) {
            store.setMpAccessToken(encryptToken(accessToken));
            if (StringUtils.isNotBlank(refreshToken)) store.setMpRefreshToken(encryptToken(refreshToken));
            storeDao.insertStore(store);
        }
        HttpResponse<String> response = sendApiRequest(apiPath, method, payload, idempotencyKey, accessToken);
        if (response.statusCode() == 401 && StringUtils.isNotBlank(refreshToken)) {
            JsonNode refreshed = requestToken("refresh_token", null, refreshToken);
            accessToken = text(refreshed, "access_token");
            refreshToken = text(refreshed, "refresh_token");
            if (StringUtils.isAnyBlank(accessToken, refreshToken)) {
                throw new IllegalStateException("Não foi possível renovar a conexão Mercado Pago.");
            }
            store.setMpAccessToken(encryptToken(accessToken));
            store.setMpRefreshToken(encryptToken(refreshToken));
            storeDao.insertStore(store);
            response = sendApiRequest(apiPath, method, payload, idempotencyKey, accessToken);
        }
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new MercadoPagoApiException(response.statusCode(), response.body());
        }
        try {
            return objectMapper.readTree(response.body());
        } catch (Exception e) {
            throw new IllegalStateException("Resposta inválida do Mercado Pago.", e);
        }
    }

    private HttpResponse<String> sendApiRequest(String apiPath, String method, JsonNode payload,
                                                String idempotencyKey, String accessToken) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(API_BASE_URL + apiPath))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/json");
            if (payload != null) builder.header("Content-Type", "application/json");
            if (StringUtils.isNotBlank(idempotencyKey)) builder.header("X-Idempotency-Key", idempotencyKey);
            if ("GET".equals(method)) builder.GET();
            else builder.POST(payload == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)));
            HttpRequest request = builder.build();
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Chamada ao Mercado Pago interrompida.", e);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao chamar o Mercado Pago.", e);
        }
    }

    private JsonNode requestToken(String grantType, String code, String refreshToken) {
        requireConfigured();
        try {
            var payload = objectMapper.createObjectNode()
                    .put("client_id", clientId)
                    .put("client_secret", clientSecret)
                    .put("grant_type", grantType)
                    .put("redirect_uri", redirectUri);
            if ("authorization_code".equals(grantType)) payload.put("code", code);
            if ("refresh_token".equals(grantType)) payload.put("refresh_token", refreshToken);
            if (sandbox) payload.put("test_token", true);
            HttpRequest request = HttpRequest.newBuilder(URI.create(API_BASE_URL + "/oauth/token"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Mercado Pago recusou a autorização/renovação (HTTP " + response.statusCode() + ").");
            }
            return objectMapper.readTree(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Chamada OAuth ao Mercado Pago interrompida.", e);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Falha na comunicação OAuth com o Mercado Pago.", e);
        }
    }

    private void addConfiguredApplicationFee(JsonNode payload) {
        com.fasterxml.jackson.databind.node.ObjectNode objectPayload = (com.fasterxml.jackson.databind.node.ObjectNode) payload;
        objectPayload.remove("application_fee");
        // application_fee (em reais) só será enviado quando a comissão estiver explicitamente configurada.
        if (StringUtils.isBlank(applicationFee)) return;
        java.math.BigDecimal fee = new java.math.BigDecimal(applicationFee);
        if (fee.signum() < 0 || fee.compareTo(payload.path("transaction_amount").decimalValue()) > 0) {
            throw new IllegalStateException("MERCADOPAGO_APPLICATION_FEE deve estar entre zero e o valor da transação.");
        }
        objectPayload.put("application_fee", fee);
    }

    private String createState(Long storeId) {
        byte[] nonce = new byte[24];
        new SecureRandom().nextBytes(nonce);
        String payload = storeId + ":" + Instant.now().getEpochSecond() + ":" +
                Base64.getUrlEncoder().withoutPadding().encodeToString(nonce);
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return encoded + "." + sign(encoded);
    }

    private Long verifyState(String state) {
        try {
            String[] parts = state.split("\\.", -1);
            if (parts.length != 2 || !MessageDigest.isEqual(
                    sign(parts[0]).getBytes(StandardCharsets.US_ASCII), parts[1].getBytes(StandardCharsets.US_ASCII))) {
                throw new IllegalArgumentException("State OAuth inválido.");
            }
            String[] values = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8).split(":", 3);
            long issuedAt = Long.parseLong(values[1]);
            long age = Instant.now().getEpochSecond() - issuedAt;
            if (age < 0 || age > STATE_TTL_SECONDS) throw new IllegalArgumentException("A autorização expirou. Tente conectar novamente.");
            return Long.parseLong(values[0]);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("State OAuth inválido.");
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível assinar o state OAuth.", e);
        }
    }

    private void requireConfigured() {
        if (StringUtils.isAnyBlank(clientId, clientSecret, redirectUri)) {
            throw new IllegalStateException("Configure MERCADOPAGO_CLIENT_ID, MERCADOPAGO_CLIENT_SECRET e MERCADOPAGO_REDIRECT_URI.");
        }
    }

    private String text(JsonNode node, String field) { return node.path(field).asText(null); }
    private String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }

    private boolean isEncrypted(String value) {
        return value != null && value.startsWith(ENCRYPTED_TOKEN_PREFIX);
    }

    private String encryptToken(String value) {
        if (StringUtils.isBlank(value) || isEncrypted(value)) return value;
        try {
            byte[] nonce = new byte[GCM_NONCE_BYTES];
            new SecureRandom().nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, tokenKey(), new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] result = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, result, 0, nonce.length);
            System.arraycopy(encrypted, 0, result, nonce.length, encrypted.length);
            return ENCRYPTED_TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(result);
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível proteger as credenciais Mercado Pago.", e);
        }
    }

    private String decryptToken(String value) {
        if (StringUtils.isBlank(value) || !isEncrypted(value)) return value;
        try {
            byte[] encrypted = Base64.getUrlDecoder().decode(value.substring(ENCRYPTED_TOKEN_PREFIX.length()));
            if (encrypted.length <= GCM_NONCE_BYTES) throw new IllegalArgumentException("Token cifrado inválido.");
            byte[] nonce = new byte[GCM_NONCE_BYTES];
            byte[] ciphertext = new byte[encrypted.length - GCM_NONCE_BYTES];
            System.arraycopy(encrypted, 0, nonce, 0, nonce.length);
            System.arraycopy(encrypted, nonce.length, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, tokenKey(), new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível ler as credenciais Mercado Pago protegidas. Verifique a chave de criptografia.", e);
        }
    }

    private SecretKeySpec tokenKey() throws Exception {
        if (StringUtils.isBlank(tokenEncryptionKey)) {
            throw new IllegalStateException("Configure MERCADOPAGO_TOKEN_ENCRYPTION_KEY ou JWT_SECRET.");
        }
        byte[] key = MessageDigest.getInstance("SHA-256").digest(
                ("amandita:mercadopago-token:v1:" + tokenEncryptionKey).getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(key, "AES");
    }

    public static class MercadoPagoApiException extends RuntimeException {
        private final int statusCode;
        private final String responseBody;
        public MercadoPagoApiException(int statusCode, String responseBody) {
            super("Mercado Pago respondeu HTTP " + statusCode);
            this.statusCode = statusCode;
            this.responseBody = responseBody;
        }
        public int getStatusCode() { return statusCode; }
        public String getResponseBody() { return responseBody; }
    }
}
