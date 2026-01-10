package com.amandita.store;

import okhttp3.*;
import jakarta.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.PostConstruct;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/melhorenvio")
public class MelhorEnvioOauthController {

    private final StoreDao storeDao;

    public MelhorEnvioOauthController(StoreDao storeDao) {
        this.storeDao = storeDao;
    }

    @PostConstruct
    public void init() {
        System.out.println("Melhor Envio OAuth configurado.");
    }

    @GetMapping("/callback")
    public void handleCallback(
            @RequestParam("code") String code,
            @RequestParam(value = "state", required = false) String state,
            HttpServletResponse response
    ) {
        Store store = storeDao.findById(Long.valueOf(state))
            .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));

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

                // Salvar token da loja (via state)
                System.out.println("Access Token: " + accessToken);
                System.out.println("Refresh Token: " + refreshToken);

                store.setMelhorEnvioAccessToken(accessToken);
                store.setMelhorEnvioRefreshToken(refreshToken);
                storeDao.insertStore(store);

                String painelUrl = "https://painel." + store.getDomain() + "/ship";
                response.sendRedirect(painelUrl);
            } else {
                response.sendRedirect("https://painel." + store.getDomain() + "/ship");
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/calculate")
    public String calculate() {
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
                .addHeader("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2MjM2IiwianRpIjoiZWNkYmQwNTA1YTRlNGIxYzg2MjU1NjVkZmRmYjBhODI3YzQ4MDI3MDM1MDU0MDZiZGU2ZTk0MGYyOWM0MDViOGNjZDY5N2E2OTc2NzY0MzMiLCJpYXQiOjE3NDkzOTk3NzYuMTM2NTA5LCJuYmYiOjE3NDkzOTk3NzYuMTM2NTEyLCJleHAiOjE3NTE5OTE3NzYuMTEwMDU2LCJzdWIiOiI5ZjExZjI1My0xNzVkLTQwNjAtOThlOS1lNTlhNDNhMWNmYWEiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIiwiY29tcGFuaWVzLXdyaXRlIiwiY291cG9ucy1yZWFkIiwiY291cG9ucy13cml0ZSIsIm5vdGlmaWNhdGlvbnMtcmVhZCIsIm9yZGVycy1yZWFkIiwicHJvZHVjdHMtcmVhZCIsInByb2R1Y3RzLXdyaXRlIiwicHVyY2hhc2VzLXJlYWQiLCJzaGlwcGluZy1jYWxjdWxhdGUiLCJzaGlwcGluZy1jYW5jZWwiLCJzaGlwcGluZy1jaGVja291dCIsInNoaXBwaW5nLWNvbXBhbmllcyIsInNoaXBwaW5nLWdlbmVyYXRlIiwic2hpcHBpbmctcHJldmlldyIsInNoaXBwaW5nLXByaW50Iiwic2hpcHBpbmctc2hhcmUiLCJzaGlwcGluZy10cmFja2luZyIsImVjb21tZXJjZS1zaGlwcGluZyIsInRyYW5zYWN0aW9ucy1yZWFkIiwidXNlcnMtcmVhZCIsInVzZXJzLXdyaXRlIl19.EzJkQ06F2DFOk2xLC9qzolCfnt81cwK9DjYGqtja9zXy-IuuH-0REOHW2z4v_gzi1pYOquFTKabeVTxsLwmfdxYFnXpF5apyY3cucWNAg2uQhaEtKJ-ti3fM5D1R8ToCkLalj2hHkBPgVy1qWEihkPXo5I_Egd7ayXz3Mp0wr0Ernn1cCIvPYEoWcqUJc1v810X6gacw9y-CuIaBEv99th7tSmEvB6re0ZT_FU4o1Oh6j1D_xxhNBMigdZ8EQPN8hI7jv7vQq5wzmCOJWBuX4I4pEFZZRPNc8UtP00uPM0uwFIvA_IuoM_5mEhmQvjALqbOA2K3dL0C0sTuoa53WRKaw3kU_fWAVQ1nXnlTRFjkY9uBU5jWs5f_erXUBubXtnkXqGyAU2bNcu8gCJzJ_Z4fqy--UVeJXmVuFuA2qFXSgmkQcryqtgJVJhL8q50KgeaxK9RZGq9CWLrTYRrLRoXfbQ_0XTz-v4CZVgpD5BhoR8eud0xMp-cRU6RJeGOQxLHTX3ectgVINTUG4z_LMk8IPzDGZF-wJd4MOaU40Z6GXOe0-EbNhKvJcLTJ4BV_3nbCFsr8JGmpFKyJSE8c7nrfPxk2PFVVbOucwKC6BShtA8nwyF3CcRxRF7hNJGr_1travspFX95EDQthqOrcjchz54giuYwTBe4GMk6TWEVY")
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
