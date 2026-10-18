package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
public class MercadoPagoSubscriptionApiClient {
    private static final String API_BASE_URL = "https://api.mercadopago.com";

    private final String accessToken;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public MercadoPagoSubscriptionApiClient(
            @Value("${mercadopago.subscription-access-token:}") String accessToken,
            ObjectMapper objectMapper) {
        this.accessToken = accessToken;
        this.objectMapper = objectMapper;
    }

    public JsonNode request(String path, String method, JsonNode payload, String idempotencyKey) {
        if (StringUtils.isBlank(accessToken)) {
            throw new IllegalStateException("Configure MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN da aplicação de Assinaturas.");
        }
        if (StringUtils.isBlank(path) || !path.startsWith("/") || path.contains("..")
                || !("GET".equals(method) || "POST".equals(method) || "PUT".equals(method))) {
            throw new IllegalArgumentException("Requisição de assinatura Mercado Pago inválida.");
        }
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(API_BASE_URL + path))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/json");
            if (payload != null) {
                builder.header("Content-Type", "application/json");
            }
            if (StringUtils.isNotBlank(idempotencyKey)) {
                builder.header("X-Idempotency-Key", idempotencyKey);
            }
            HttpRequest.BodyPublisher body = payload == null
                    ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload));
            HttpResponse<String> response = httpClient.send(
                    builder.timeout(Duration.ofSeconds(20))
                            .method(method, body).build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new MercadoPagoSubscriptionApiException(response.statusCode(), response.body(), objectMapper);
            }
            return objectMapper.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("A chamada de assinatura ao Mercado Pago foi interrompida.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível comunicar com o Mercado Pago Assinaturas.", exception);
        }
    }

    public static class MercadoPagoSubscriptionApiException extends RuntimeException {
        private final int statusCode;
        private final String errorSummary;

        public MercadoPagoSubscriptionApiException(int statusCode, String responseBody, ObjectMapper objectMapper) {
            super("Mercado Pago Assinaturas retornou HTTP " + statusCode + ".");
            this.statusCode = statusCode;
            this.errorSummary = summarizeError(responseBody, objectMapper);
        }

        public int getStatusCode() {
            return statusCode;
        }

        public String getErrorSummary() {
            return errorSummary;
        }

        private String summarizeError(String responseBody, ObjectMapper objectMapper) {
            try {
                JsonNode error = objectMapper.readTree(responseBody);
                List<String> details = new ArrayList<>();
                addDetail(details, "erro", error.path("error").asText(null));
                addDetail(details, "mensagem", error.path("message").asText(null));
                JsonNode causes = error.path("cause");
                if (causes.isArray()) {
                    for (JsonNode cause : causes) {
                        addDetail(details, "código", cause.path("code").asText(null));
                        addDetail(details, "descrição", cause.path("description").asText(null));
                    }
                }
                return details.isEmpty()
                        ? "O Mercado Pago não forneceu detalhes estruturados."
                        : String.join("; ", details);
            } catch (IOException exception) {
                return "O Mercado Pago retornou uma resposta de erro sem detalhes estruturados.";
            }
        }

        private void addDetail(List<String> details, String label, String value) {
            if (StringUtils.isNotBlank(value) && details.size() < 6) {
                String sanitized = value.replaceAll("[\\r\\n\\t]", " ");
                details.add(label + ": " + StringUtils.abbreviate(sanitized, 200));
            }
        }
    }
}
