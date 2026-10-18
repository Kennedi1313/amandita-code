package com.amandita.store;

import okhttp3.*;
import com.amandita.jwt.JWTUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/melhorenvio")
public class MelhorEnvioOauthController {

    private final StoreDao storeDao;
    private final JWTUtil jwtUtil;
    private final String adminUrl;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String environment;
    private final String userAgent;
    private final MelhorEnvioShipmentService shipmentService;

    public MelhorEnvioOauthController(StoreDao storeDao,
                                      JWTUtil jwtUtil,
                                      @Value("${saas.admin-url:http://localhost:4173}") String adminUrl,
                                      @Value("${melhor-envio.client-id:}") String clientId,
                                      @Value("${melhor-envio.client-secret:}") String clientSecret,
                                      @Value("${melhor-envio.redirect-uri:}") String redirectUri,
                                      @Value("${melhor-envio.environment:sandbox}") String environment,
                                      @Value("${melhor-envio.user-agent:Amandita (contato@amandita.com.br)}") String userAgent,
                                      MelhorEnvioShipmentService shipmentService) {
        this.storeDao = storeDao;
        this.jwtUtil = jwtUtil;
        this.adminUrl = adminUrl.replaceAll("/+$", "");
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.environment = environment;
        this.userAgent = userAgent;
        this.shipmentService = shipmentService;
    }

    @PostConstruct
    public void init() {
        System.out.println("Melhor Envio OAuth configurado.");
    }

    @GetMapping("/authorize-url")
    public String authorizeUrl(HttpServletRequest request) {
        Long storeId = (Long) request.getAttribute("storeId");
        if (storeId == null) {
            throw new IllegalArgumentException("Loja não identificada");
        }
        if (StringUtils.isBlank(clientId) || StringUtils.isBlank(clientSecret)) {
            throw new IllegalStateException("Melhor Envio ainda não foi configurado no servidor.");
        }
        String state = jwtUtil.issueToken("melhor-envio-oauth", List.of("MELHOR_ENVIO_OAUTH"), storeId);
        return oauthBaseUrl() + "/oauth/authorize"
                + "?client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&response_type=code"
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&scope=" + URLEncoder.encode(
                "shipping-calculate shipping-companies cart-read cart-write orders-read products-read products-write purchases-read shipping-cancel shipping-checkout shipping-companies shipping-generate shipping-print shipping-preview shipping-tracking shipping-share ecommerce-shipping",
                StandardCharsets.UTF_8)
                + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }

    @GetMapping("/callback")
    public void handleCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state,
            HttpServletResponse response
    ) {
        if (!isValidOAuthState(state)) {
            throw new IllegalArgumentException("State OAuth inválido.");
        }
        Long storeId = jwtUtil.getStoreId(state);
        if (storeId == null) {
            throw new IllegalArgumentException("Loja não identificada");
        }
        Store store = storeDao.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O Melhor Envio está disponível apenas no plano Completo.");
        }

        OkHttpClient client = new OkHttpClient();

        okhttp3.RequestBody body = new FormBody.Builder()
                .add("grant_type", "authorization_code")
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("redirect_uri", redirectUri)
                .add("code", code)
                .build();

        Request request = new Request.Builder()
                .url(oauthBaseUrl() + "/oauth/token")
                .post(body)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/x-www-form-urlencoded")
                .addHeader("User-Agent", userAgent)
                .build();

        try (Response apiResponse = client.newCall(request).execute()) {
            if (apiResponse.isSuccessful() && apiResponse.body() != null) {
                String responseBodyStr = apiResponse.body().string();
                JSONObject json = new JSONObject(responseBodyStr);

                String accessToken = json.getString("access_token");
                String refreshToken = json.getString("refresh_token");

                store.setMelhorEnvioAccessToken(accessToken);
                store.setMelhorEnvioRefreshToken(refreshToken);
                storeDao.insertStore(store);

                String painelUrl = adminUrl + "/dashboard/shipping?melhorenvio=connected";
                response.sendRedirect(painelUrl);
            } else {
                response.sendRedirect(adminUrl + "/ship");
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private String oauthBaseUrl() {
        return "production".equalsIgnoreCase(environment)
                ? "https://melhorenvio.com.br"
                : "https://sandbox.melhorenvio.com.br";
    }

    private boolean isValidOAuthState(String state) {
        try {
            return StringUtils.isNotBlank(state)
                    && "melhor-envio-oauth".equals(jwtUtil.getSubject(state))
                    && jwtUtil.hasScope(state, "MELHOR_ENVIO_OAUTH");
        } catch (Exception exception) {
            return false;
        }
    }

    @GetMapping("/calculate")
    public String calculate(HttpServletRequest httpRequest) {
        Store store = storeDao.findById((Long) httpRequest.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O Melhor Envio está disponível apenas no plano Completo.");
        }
        if (StringUtils.isBlank(store.getMelhorEnvioAccessToken())) {
            throw new IllegalStateException("Melhor Envio não configurado para esta loja.");
        }

        OkHttpClient client = new OkHttpClient();

        JSONObject payload = new JSONObject();
        payload.put("from", new JSONObject().put("postal_code", "01001-000"));
        payload.put("to", new JSONObject().put("postal_code", "20040-000"));

        JSONArray products = new JSONArray();
        products.put(new JSONObject()
                .put("weight", 0.5)
                .put("width", 15)
                .put("height", 17)
                .put("length", 20)
                .put("quantity", 1)
        );
        payload.put("products", products);

        JSONObject options = new JSONObject();
        options.put("insurance_value", 100);
        options.put("receipt", false);
        options.put("own_hand", false);
        options.put("reverse", false);
        options.put("non_commercial", true);
        payload.put("options", options);

        okhttp3.RequestBody body = okhttp3.RequestBody.create(
                payload.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url("https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate")
                .post(body)
                .addHeader("Authorization", "Bearer " + store.getMelhorEnvioAccessToken())
                .addHeader("Content-Type", "application/json")
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (response.isSuccessful()) {
                System.out.println("Resposta da cotação:");
                return response.body().string();
            } else {
                System.out.println("Erro: " + response.code());
                return response.body().string();
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @PostMapping("/quote")
    public ResponseEntity<String> quote(HttpServletRequest request, @RequestBody String payload) {
        Store store = storeDao.findById((Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O Melhor Envio está disponível apenas no plano Completo.");
        }
        if (StringUtils.isBlank(store.getMelhorEnvioAccessToken())) {
            throw new IllegalStateException("Melhor Envio ainda não foi conectado nesta loja.");
        }

        okhttp3.RequestBody body = okhttp3.RequestBody.create(payload, MediaType.parse("application/json"));
        Request quoteRequest = new Request.Builder()
                .url(apiBaseUrl() + "/api/v2/me/shipment/calculate")
                .post(body)
                .addHeader("Authorization", "Bearer " + store.getMelhorEnvioAccessToken())
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                .addHeader("User-Agent", userAgent)
                .build();

        try (Response response = new OkHttpClient().newCall(quoteRequest).execute()) {
            if ((response.code() == 401 || response.code() == 403)
                    && StringUtils.isNotBlank(store.getMelhorEnvioRefreshToken())) {
                String refreshedToken = refreshAccessToken(store);
                if (refreshedToken != null) {
                    store.setMelhorEnvioAccessToken(refreshedToken);
                    storeDao.insertStore(store);
                    Request retryRequest = quoteRequest.newBuilder()
                            .header("Authorization", "Bearer " + refreshedToken)
                            .build();
                    try (Response retryResponse = new OkHttpClient().newCall(retryRequest).execute()) {
                        String retryBody = retryResponse.body() == null ? "{}" : retryResponse.body().string();
                        return ResponseEntity.status(retryResponse.code()).body(retryBody);
                    }
                }
            }
            String responseBody = response.body() == null ? "{}" : response.body().string();
            return ResponseEntity.status(response.code()).body(responseBody);
        } catch (IOException exception) {
            throw new RuntimeException("Falha ao consultar o Melhor Envio", exception);
        }
    }

    @PostMapping("/sales/{saleId}/label")
    public ResponseEntity<?> createSaleLabel(@PathVariable Long saleId, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.createLabel(saleId, (Long) request.getAttribute("storeId")));
    }

    @PostMapping("/sales/{saleId}/print")
    public ResponseEntity<?> printSaleLabel(@PathVariable Long saleId, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.printLabel(saleId, (Long) request.getAttribute("storeId")));
    }

    @PostMapping("/sales/{saleId}/tracking")
    public ResponseEntity<?> refreshSaleTracking(@PathVariable Long saleId, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.refreshTracking(saleId, (Long) request.getAttribute("storeId")));
    }

    private String refreshAccessToken(Store store) throws IOException {
        okhttp3.RequestBody refreshBody = new FormBody.Builder()
                .add("grant_type", "refresh_token")
                .add("client_id", clientId)
                .add("client_secret", clientSecret)
                .add("refresh_token", store.getMelhorEnvioRefreshToken())
                .build();
        Request refreshRequest = new Request.Builder()
                .url(oauthBaseUrl() + "/oauth/token")
                .post(refreshBody)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/x-www-form-urlencoded")
                .addHeader("User-Agent", userAgent)
                .build();
        try (Response response = new OkHttpClient().newCall(refreshRequest).execute()) {
            if (!response.isSuccessful() || response.body() == null) return null;
            return new JSONObject(response.body().string()).optString("access_token", null);
        }
    }

    private String apiBaseUrl() {
        return "production".equalsIgnoreCase(environment)
                ? "https://melhorenvio.com.br"
                : "https://sandbox.melhorenvio.com.br";
    }
}
