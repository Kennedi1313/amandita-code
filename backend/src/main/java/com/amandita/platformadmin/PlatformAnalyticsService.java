package com.amandita.platformadmin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.time.Duration;
import java.util.Base64;

@Service
public class PlatformAnalyticsService {
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String posthogApiKey;
    private final String posthogProjectId;
    private final String posthogApiHost;
    private final String googlePropertyId;
    private final String googleServiceAccountJson;

    public PlatformAnalyticsService(
            ObjectMapper objectMapper,
            @Value("${POSTHOG_PERSONAL_API_KEY:}") String posthogApiKey,
            @Value("${POSTHOG_PROJECT_ID:}") String posthogProjectId,
            @Value("${POSTHOG_API_HOST:https://us.posthog.com}") String posthogApiHost,
            @Value("${GOOGLE_ANALYTICS_PROPERTY_ID:}") String googlePropertyId,
            @Value("${GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON_BASE64:}") String googleServiceAccountJson) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.posthogApiKey = posthogApiKey;
        this.posthogProjectId = posthogProjectId;
        this.posthogApiHost = posthogApiHost.replaceAll("/+$", "");
        this.googlePropertyId = googlePropertyId;
        this.googleServiceAccountJson = googleServiceAccountJson;
    }

    public AnalyticsReport getReport(int days) {
        return new AnalyticsReport(getPostHogReport(days), getGoogleReport(days));
    }

    private PostHogReport getPostHogReport(int days) {
        if (posthogApiKey.isBlank() || posthogProjectId.isBlank()) {
            return new PostHogReport(false, false, 0, 0, 0, 0, 0, 0, "Credenciais de leitura não configuradas.");
        }

        try {
            String query = """
                    SELECT event, count() AS event_count, uniq(distinct_id) AS people
                    FROM events
                    WHERE timestamp >= now() - INTERVAL %d DAY
                      AND properties.analytics_environment = 'production'
                      AND event IN ('$pageview', 'signup_cta_clicked', 'begin_store_creation',
                                    'store_created', 'google_sign_in_completed', 'admin_handoff_clicked')
                    GROUP BY event
                    """.formatted(days);
            ObjectNode body = objectMapper.createObjectNode();
            ObjectNode hogQl = body.putObject("query");
            hogQl.put("kind", "HogQLQuery");
            hogQl.put("query", query);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(posthogApiHost + "/api/projects/" + posthogProjectId + "/query/"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + posthogApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            JsonNode response = sendJson(request);
            long pageViews = 0;
            long visitors = 0;
            long signupClicks = 0;
            long creationStarts = 0;
            long storeCreations = 0;
            long adminHandoffs = 0;
            for (JsonNode row : response.path("results")) {
                String event = row.path(0).asText();
                long count = row.path(1).asLong();
                long people = row.path(2).asLong();
                switch (event) {
                    case "$pageview" -> {
                        pageViews = count;
                        visitors = people;
                    }
                    case "signup_cta_clicked" -> signupClicks = count;
                    case "begin_store_creation" -> creationStarts = count;
                    case "store_created" -> storeCreations = count;
                    case "admin_handoff_clicked" -> adminHandoffs = count;
                    default -> { }
                }
            }
            return new PostHogReport(true, true, pageViews, visitors, signupClicks,
                    creationStarts, storeCreations, adminHandoffs, null);
        } catch (Exception exception) {
            return new PostHogReport(true, false, 0, 0, 0, 0, 0, 0,
                    "Não foi possível consultar o PostHog. Confira projeto, região e permissões da chave.");
        }
    }

    private GoogleAnalyticsReport getGoogleReport(int days) {
        if (googlePropertyId.isBlank() || googleServiceAccountJson.isBlank()) {
            return new GoogleAnalyticsReport(false, false, 0, 0, 0, "Credenciais de leitura não configuradas.");
        }

        try {
            JsonNode serviceAccount = objectMapper.readTree(
                    Base64.getDecoder().decode(googleServiceAccountJson));
            String accessToken = getGoogleAccessToken(serviceAccount);
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode dateRanges = requestBody.putArray("dateRanges");
            ObjectNode dateRange = dateRanges.addObject();
            dateRange.put("startDate", Math.max(0, days - 1) + "daysAgo");
            dateRange.put("endDate", "today");
            ArrayNode metrics = requestBody.putArray("metrics");
            metrics.addObject().put("name", "activeUsers");
            metrics.addObject().put("name", "sessions");
            metrics.addObject().put("name", "screenPageViews");
            requestBody.putArray("metricAggregations").add("TOTAL");

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://analyticsdata.googleapis.com/v1beta/properties/"
                            + googlePropertyId + ":runReport"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();
            JsonNode response = sendJson(request);
            JsonNode values = response.path("totals").path(0).path("metricValues");
            return new GoogleAnalyticsReport(
                    true,
                    true,
                    metric(values, 0),
                    metric(values, 1),
                    metric(values, 2),
                    null
            );
        } catch (Exception exception) {
            return new GoogleAnalyticsReport(true, false, 0, 0, 0,
                    "Não foi possível consultar o Google Analytics. Confira propriedade e acesso da conta de serviço.");
        }
    }

    private String getGoogleAccessToken(JsonNode serviceAccount) throws Exception {
        String privateKey = serviceAccount.path("private_key").asText();
        String clientEmail = serviceAccount.path("client_email").asText();
        if (privateKey.isBlank() || clientEmail.isBlank()) {
            throw new IllegalArgumentException("A conta de serviço não contém chave privada e e-mail.");
        }

        long issuedAt = Instant.now().getEpochSecond();
        ObjectNode header = objectMapper.createObjectNode();
        header.put("alg", "RS256");
        header.put("typ", "JWT");
        ObjectNode claims = objectMapper.createObjectNode();
        claims.put("iss", clientEmail);
        claims.put("scope", "https://www.googleapis.com/auth/analytics.readonly");
        claims.put("aud", "https://oauth2.googleapis.com/token");
        claims.put("iat", issuedAt);
        claims.put("exp", issuedAt + 3600);

        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String unsigned = encoder.encodeToString(objectMapper.writeValueAsBytes(header)) + "."
                + encoder.encodeToString(objectMapper.writeValueAsBytes(claims));
        String pem = privateKey.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] keyBytes = Base64.getDecoder().decode(pem);
        var keySpec = new PKCS8EncodedKeySpec(keyBytes);
        var signingKey = KeyFactory.getInstance("RSA").generatePrivate(keySpec);
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(signingKey);
        signer.update(unsigned.getBytes(StandardCharsets.UTF_8));
        String assertion = unsigned + "." + encoder.encodeToString(signer.sign());

        String formBody = "grant_type="
                + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
                + "&assertion=" + URLEncoder.encode(assertion, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();
        return sendJson(request).path("access_token").asText();
    }

    private JsonNode sendJson(HttpRequest request) throws Exception {
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("Analytics provider returned HTTP " + response.statusCode());
        }
        return objectMapper.readTree(response.body());
    }

    private long metric(JsonNode values, int index) {
        return values.size() > index ? Long.parseLong(values.path(index).path("value").asText("0")) : 0;
    }

    public record AnalyticsReport(PostHogReport posthog, GoogleAnalyticsReport googleAnalytics) {}

    public record PostHogReport(
            boolean configured,
            boolean available,
            long pageViews,
            long visitors,
            long signupClicks,
            long storeCreationStarts,
            long storeCreations,
            long adminHandoffs,
            String message
    ) {}

    public record GoogleAnalyticsReport(
            boolean configured,
            boolean available,
            long activeUsers,
            long sessions,
            long pageViews,
            String message
    ) {}
}
