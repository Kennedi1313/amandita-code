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

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/melhorenvio")
public class MelhorEnvioOauthController {

    private final StoreDao storeDao;
    private final JWTUtil jwtUtil;
    private final String adminUrl;

    public MelhorEnvioOauthController(StoreDao storeDao,
                                      JWTUtil jwtUtil,
                                      @Value("${saas.admin-url:http://localhost:4173}") String adminUrl) {
        this.storeDao = storeDao;
        this.jwtUtil = jwtUtil;
        this.adminUrl = adminUrl.replaceAll("/+$", "");
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
        String state = jwtUtil.issueToken("melhor-envio-oauth", List.of("MELHOR_ENVIO_OAUTH"), storeId);
        return "https://sandbox.melhorenvio.com.br/oauth/authorize"
                + "?client_id=6236"
                + "&response_type=code"
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

        OkHttpClient client = new OkHttpClient();

        MediaType mediaType = MediaType.parse("application/json");
        String jsonBody = new JSONObject()
                .put("grant_type", "authorization_code")
                .put("client_id", "6236")
                .put("client_secret", "")
                .put("redirect_uri", "https://8474-2804-29b8-50e5-c5b4-f024-856-4062-694f.ngrok-free.app/api/v1/oauth/callback")
                .put("code", code)
                .toString();

        RequestBody body = RequestBody.create(mediaType, jsonBody);

        Request request = new Request.Builder()
                .url("https://sandbox.melhorenvio.com.br/oauth/token")
                .post(body)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                .addHeader("User-Agent", "AmanditaPratas (contato@seudominio.com.br)")
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

                String painelUrl = adminUrl + "/ship";
                response.sendRedirect(painelUrl);
            } else {
                response.sendRedirect(adminUrl + "/ship");
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
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

        RequestBody body = RequestBody.create(
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
}
