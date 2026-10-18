package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
public class AsaasSubaccountService {
    private final StoreDao storeDao;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final String baseUrl;
    private final String apiKey;

    public AsaasSubaccountService(StoreDao storeDao,
                                  ObjectMapper objectMapper,
                                  @Value("${asaas.base-url}") String baseUrl,
                                  @Value("${asaas.api-key}") String apiKey) {
        this.storeDao = storeDao;
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.apiKey = apiKey;
    }

    public AsaasSubaccountResponse createOrLink(Long storeId, AsaasSubaccountRequest request)
            throws IOException, InterruptedException {
        if (StringUtils.isBlank(apiKey)) {
            throw new IllegalStateException("ASAAS_API_KEY não configurada.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (StringUtils.isNotBlank(store.getAsaasWalletId())) {
            return new AsaasSubaccountResponse(true);
        }
        validateRequest(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", request.name());
        payload.put("email", request.email());
        payload.put("cpfCnpj", request.cpfCnpj());
        payload.put("birthDate", request.birthDate());
        payload.put("companyType", request.companyType());
        payload.put("phone", request.phone());
        payload.put("mobilePhone", request.mobilePhone());
        payload.put("address", request.address());
        payload.put("addressNumber", request.addressNumber());
        payload.put("complement", request.complement());
        payload.put("province", request.province());
        payload.put("postalCode", request.postalCode());
        payload.put("incomeValue", request.incomeValue());

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/accounts"))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("access_token", apiKey)
                .header("User-Agent", "Amandita/1.0.0")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();
        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalArgumentException("Erro ao criar subconta Asaas: " + response.body());
        }
        JsonNode root = objectMapper.readTree(response.body());
        String walletId = root.path("walletId").asText(null);
        if (StringUtils.isBlank(walletId)) {
            throw new IllegalArgumentException("Resposta do Asaas sem walletId.");
        }
        store.setAsaasWalletId(walletId);
        storeDao.insertStore(store);
        return new AsaasSubaccountResponse(true);
    }

    private void validateRequest(AsaasSubaccountRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Dados da subconta Asaas não informados.");
        }
        require(request.name(), "nome ou razão social");
        require(request.email(), "e-mail");
        require(request.cpfCnpj(), "CNPJ");
        require(request.companyType(), "tipo de empresa");
        if (!Set.of("MEI", "LIMITED", "INDIVIDUAL", "ASSOCIATION")
                .contains(request.companyType().trim().toUpperCase())) {
            throw new IllegalArgumentException("Tipo de empresa inválido para o Asaas.");
        }
        require(request.mobilePhone(), "celular");
        require(request.address(), "endereço");
        require(request.addressNumber(), "número");
        require(request.province(), "bairro");
        require(request.postalCode(), "CEP");
    }

    private void require(String value, String label) {
        if (StringUtils.isBlank(value)) {
            throw new IllegalArgumentException("Informe o campo " + label + ".");
        }
    }
}
