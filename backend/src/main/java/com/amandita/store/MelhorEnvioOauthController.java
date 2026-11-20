package com.amandita.store;

import okhttp3.*;
import com.amandita.jwt.JWTUtil;
import com.amandita.product.Product;
import com.amandita.product.ProductDao;
import com.amandita.product.ProductVariation;
import com.amandita.Sale.SaleItemRequest;
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
import java.util.Comparator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;

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
    private final ProductDao productDao;

    public MelhorEnvioOauthController(StoreDao storeDao,
                                      JWTUtil jwtUtil,
                                      @Value("${saas.admin-url:http://localhost:4173}") String adminUrl,
                                      @Value("${melhor-envio.client-id:}") String clientId,
                                      @Value("${melhor-envio.client-secret:}") String clientSecret,
                                      @Value("${melhor-envio.redirect-uri:}") String redirectUri,
                                      @Value("${melhor-envio.environment:sandbox}") String environment,
                                      @Value("${melhor-envio.user-agent:Amandita (contato@amandita.com.br)}") String userAgent,
                                      MelhorEnvioShipmentService shipmentService,
                                      ProductDao productDao) {
        this.storeDao = storeDao;
        this.jwtUtil = jwtUtil;
        this.adminUrl = adminUrl.replaceAll("/+$", "");
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.environment = environment;
        this.userAgent = userAgent;
        this.shipmentService = shipmentService;
        this.productDao = productDao;
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
                "shipping-calculate shipping-companies companies-read users-read cart-read cart-write orders-read products-read products-write purchases-read shipping-cancel shipping-checkout shipping-generate shipping-print shipping-preview shipping-tracking shipping-share ecommerce-shipping",
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
                try {
                    syncMelhorEnvioOrigin(store, accessToken);
                } catch (RuntimeException syncException) {
                    // A conexão OAuth continua válida mesmo quando a conta não libera
                    // a consulta de empresas/endereço (por exemplo, 403 no sandbox).
                    System.err.println("Não foi possível sincronizar o endereço de postagem do Melhor Envio: "
                            + syncException.getMessage());
                }
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

    private void syncMelhorEnvioOrigin(Store store, String accessToken) throws IOException {
        try {
            String companiesBody = getMelhorEnvio(accessToken, "/api/v2/me/companies");
            JSONArray companies = responseArray(companiesBody, "companies");
            if (!companies.isEmpty()) {
                JSONObject company = companies.getJSONObject(0);
                String companyId = String.valueOf(company.opt("id"));
                store.setMelhorEnvioCompanyId(companyId);

                String addressesBody = getMelhorEnvio(accessToken,
                        "/api/v2/me/companies/" + companyId + "/addresses");
                JSONArray addresses = responseArray(addressesBody, "addresses");
                if (!addresses.isEmpty()) {
                    PickupAddress incomingAddress = toPickupAddress(addresses.getJSONObject(0));
                    store.setMelhorEnvioOriginAddress(incomingAddress);
                    return;
                }
            }
        } catch (RuntimeException ignored) {
            // Algumas contas/sandbox não liberam a consulta de empresas.
        }

        // Fallback apenas para contas que não possuem uma empresa/loja cadastrada.
        try {
            String profileBody = getMelhorEnvio(accessToken, "/api/v2/me");
            JSONObject profile = new JSONObject(profileBody);
            JSONArray profileAddresses = profile.optJSONArray("addresses");
            if (profileAddresses != null && !profileAddresses.isEmpty()) {
                Object rawAddress = profileAddresses.get(0);
                JSONObject address = rawAddress instanceof JSONObject
                        ? (JSONObject) rawAddress
                        : new JSONObject().put("id", String.valueOf(rawAddress));
                String addressId = address.has("id") ? address.optString("id", "") : "";
                if (address.has("postal_code")) {
                    store.setMelhorEnvioOriginAddress(toPickupAddress(address));
                    return;
                }
                if (StringUtils.isNotBlank(addressId)) {
                    store.setMelhorEnvioOriginAddress(toPickupAddress(
                            new JSONObject(getMelhorEnvio(accessToken, "/api/v2/me/addresses/" + addressId))));
                    return;
                }
            }
        } catch (RuntimeException ignored) {
            // Algumas contas permitem consultar empresas, mas não o perfil /me.
        }

        store.setMelhorEnvioOriginAddress(null);
    }

    private PickupAddress toPickupAddress(JSONObject address) {
        Object stateValue = address.has("state") ? address.opt("state") : address.opt("state_abbr");
        String state = stateValue instanceof JSONObject
                ? ((JSONObject) stateValue).optString("state_abbr", "")
                : String.valueOf(stateValue == null ? "" : stateValue);
        if (state.trim().startsWith("{")) {
            state = new JSONObject(state).optString("state_abbr", "");
        }
        if (StringUtils.isBlank(state)) {
            state = address.optString("state_abbr", "");
        }
        Object cityValue = address.opt("city");
        String city = cityValue instanceof JSONObject
                ? ((JSONObject) cityValue).optString("city", "")
                : String.valueOf(cityValue == null ? "" : cityValue);
        if (cityValue instanceof JSONObject) {
            JSONObject cityObject = (JSONObject) cityValue;
            JSONObject nestedState = cityObject.optJSONObject("state");
            if (nestedState != null) {
                state = nestedState.optString("state_abbr", state);
            }
        }
        return new PickupAddress(
                address.optString("postal_code", "").replaceAll("\\D", ""),
                address.optString("address", address.optString("street", "")),
                address.optString("number", ""),
                address.optString("district", address.optString("neighborhood", "")),
                city,
                state,
                address.optString("complement", address.optString("reference", "")));
    }

    private PickupAddress mergeOriginAddress(PickupAddress previous, PickupAddress incoming) {
        if (previous == null || StringUtils.isNotBlank(incoming.state())) return incoming;
        if (StringUtils.equals(StringUtils.deleteWhitespace(previous.zip()),
                StringUtils.deleteWhitespace(incoming.zip()))) {
            return new PickupAddress(incoming.zip(), incoming.street(), incoming.number(),
                    incoming.district(), incoming.city(), previous.state(), incoming.reference());
        }
        return incoming;
    }

    private JSONArray responseArray(String body, String namedField) {
        String normalized = StringUtils.defaultString(body, "[]").trim();
        if (normalized.startsWith("[")) {
            return new JSONArray(normalized);
        }
        JSONObject object = new JSONObject(normalized);
        JSONArray array = object.optJSONArray("data");
        if (array != null) return array;
        array = object.optJSONArray(namedField);
        if (array != null) return array;
        return new JSONArray();
    }

    private String getMelhorEnvio(String accessToken, String path) throws IOException {
        Request request = new Request.Builder()
                .url(apiBaseUrl() + path)
                .get()
                .addHeader("Authorization", "Bearer " + accessToken)
                .addHeader("Accept", "application/json")
                .addHeader("User-Agent", userAgent)
                .build();
        try (Response response = new OkHttpClient().newCall(request).execute()) {
            String body = response.body() == null ? "[]" : response.body().string();
            if (!response.isSuccessful()) {
                throw new IllegalStateException("Não foi possível consultar o endereço de postagem no Melhor Envio: HTTP " + response.code());
            }
            return body;
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
        PickupAddress origin = store.getMelhorEnvioOriginAddress();
        if (origin == null || StringUtils.isBlank(origin.zip())) {
            throw new IllegalStateException("Conecte novamente o Melhor Envio para sincronizar o endereço de postagem.");
        }
        payload.put("from", new JSONObject().put("postal_code", origin.zip()));
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
    public ResponseEntity<String> quote(HttpServletRequest request, @RequestBody MelhorEnvioQuoteRequest quote) {
        Long storeId = (Long) request.getAttribute("storeId");
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O Melhor Envio está disponível apenas no plano Completo.");
        }
        if (StringUtils.isBlank(store.getMelhorEnvioAccessToken())) {
            throw new IllegalStateException("Melhor Envio ainda não foi conectado nesta loja.");
        }

        String fingerprint = MelhorEnvioQuoteFingerprint.create(quote.items(), storeId, productDao);
        String destinationZip = quote.destinationZip() == null ? "" : quote.destinationZip().replaceAll("\\D", "");
        if (!destinationZip.matches("\\d{8}")) throw new IllegalArgumentException("Informe um CEP válido.");
        PickupAddress origin = store.getMelhorEnvioOriginAddress();
        if (origin == null || origin.zip() == null || !origin.zip().replaceAll("\\D", "").matches("\\d{8}")) {
            throw new IllegalStateException("A loja ainda não configurou um endereço de postagem válido no Melhor Envio.");
        }
        JSONObject payload = buildQuotePayload(quote.items(), storeId, origin.zip(), destinationZip);
        okhttp3.RequestBody body = okhttp3.RequestBody.create(payload.toString(), MediaType.parse("application/json"));
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
                        return quoteResponse(retryResponse.code(), retryBody, storeId, destinationZip, fingerprint);
                    }
                }
            }
            String responseBody = response.body() == null ? "{}" : response.body().string();
            return quoteResponse(response.code(), responseBody, storeId, destinationZip, fingerprint);
        } catch (IOException exception) {
            throw new RuntimeException("Falha ao consultar o Melhor Envio", exception);
        }
    }

    private JSONObject buildQuotePayload(List<SaleItemRequest> items, Long storeId, String originZip, String destinationZip) {
        JSONObject payload = new JSONObject();
        payload.put("from", new JSONObject().put("postal_code", originZip.replaceAll("\\D", "")));
        payload.put("to", new JSONObject().put("postal_code", destinationZip));
        JSONArray products = new JSONArray();
        for (SaleItemRequest item : items) {
            Product product = productDao.selectProductByIdAndStore(item.getProductId(), storeId).orElseThrow();
            int price = product.getPrice();
            Integer promo = product.getPromo();
            if (item.getVariationId() != null) {
                ProductVariation variation = product.getVariations().stream()
                        .filter(candidate -> item.getVariationId().equals(candidate.getId())).findFirst().orElseThrow();
                price = variation.getPrice();
                promo = variation.getPromo();
            }
            int finalPrice = promo == null || promo <= 0 ? price : BigDecimal.valueOf(price)
                    .multiply(BigDecimal.valueOf(100L - promo)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
            products.put(new JSONObject().put("name", product.getName()).put("quantity", item.getQuantity())
                    .put("unitary_value", BigDecimal.valueOf(finalPrice).movePointLeft(2))
                    .put("weight", product.getWeightKg()).put("width", product.getWidthCm())
                    .put("height", product.getHeightCm()).put("length", product.getLengthCm()));
        }
        payload.put("products", products);
        payload.put("options", new JSONObject().put("insurance_value", quoteSubtotal(items, storeId))
                .put("receipt", false).put("own_hand", false).put("reverse", false).put("non_commercial", true));
        return payload;
    }

    private BigDecimal quoteSubtotal(List<SaleItemRequest> items, Long storeId) {
        return items.stream().map(item -> {
            Product product = productDao.selectProductByIdAndStore(item.getProductId(), storeId).orElseThrow();
            int price = product.getPrice(); Integer promo = product.getPromo();
            if (item.getVariationId() != null) {
                ProductVariation variation = product.getVariations().stream().filter(v -> item.getVariationId().equals(v.getId())).findFirst().orElseThrow();
                price = variation.getPrice(); promo = variation.getPromo();
            }
            int finalPrice = promo == null || promo <= 0 ? price : BigDecimal.valueOf(price).multiply(BigDecimal.valueOf(100L-promo)).divide(BigDecimal.valueOf(100),0,RoundingMode.HALF_UP).intValue();
            return BigDecimal.valueOf((long) finalPrice * item.getQuantity(), 2);
        }).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private ResponseEntity<String> quoteResponse(int status, String body, Long storeId, String zip, String fingerprint) {
        if (status < 200 || status >= 300) return ResponseEntity.status(status).body(body);
        JSONArray quotes = responseArray(body, "quotes");
        for (int i = 0; i < quotes.length(); i++) {
            JSONObject quote = quotes.optJSONObject(i);
            if (quote == null || quote.has("error") || !quote.has("id")) continue;
            Object rawFee = quote.has("custom_price") ? quote.opt("custom_price") : quote.opt("price");
            try {
                long feeCents = new BigDecimal(String.valueOf(rawFee)).movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
                String token = jwtUtil.issueToken("melhor-envio-checkout-quote", Map.of("storeId", storeId,
                        "quoteId", String.valueOf(quote.get("id")), "quoteFeeCents", feeCents,
                        "destinationZip", zip, "cartFingerprint", fingerprint), Duration.ofMinutes(20));
                quote.put("kiziQuoteToken", token);
            } catch (RuntimeException ignored) { }
        }
        return ResponseEntity.ok(quotes.toString());
    }

    @PostMapping("/sales/{saleId}/label")
    public ResponseEntity<?> createSaleLabel(@PathVariable Long saleId, @RequestBody(required = false) LabelRequest body, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.createLabel(saleId, (Long) request.getAttribute("storeId"), body == null ? null : body.invoiceKey()));
    }

    @PostMapping("/sales/{saleId}/print")
    public ResponseEntity<?> printSaleLabel(@PathVariable Long saleId, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.printLabel(saleId, (Long) request.getAttribute("storeId")));
    }

    @PostMapping("/sales/{saleId}/tracking")
    public ResponseEntity<?> refreshSaleTracking(@PathVariable Long saleId, HttpServletRequest request) {
        return ResponseEntity.ok(shipmentService.refreshTracking(saleId, (Long) request.getAttribute("storeId")));
    }

    private record LabelRequest(String invoiceKey) {}

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
            JSONObject tokenResponse = new JSONObject(response.body().string());
            String refreshedToken = tokenResponse.optString("access_token", null);
            String refreshedRefreshToken = tokenResponse.optString("refresh_token", null);
            if (StringUtils.isNotBlank(refreshedRefreshToken)) {
                store.setMelhorEnvioRefreshToken(refreshedRefreshToken);
            }
            return refreshedToken;
        }
    }

    private String apiBaseUrl() {
        return "production".equalsIgnoreCase(environment)
                ? "https://melhorenvio.com.br"
                : "https://sandbox.melhorenvio.com.br";
    }
}
