package com.amandita.store;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LocalDeliveryService {
    private record Coordinates(double latitude, double longitude, Instant expiresAt) {}

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();
    private final ObjectMapper objectMapper;
    private final String awesomeApiBaseUrl;
    private final String brasilApiBaseUrl;
    private final ConcurrentHashMap<String, Coordinates> coordinateCache = new ConcurrentHashMap<>();

    public LocalDeliveryService(ObjectMapper objectMapper,
                                @Value("${local-delivery.geocoder-url:https://cep.awesomeapi.com.br/json}") String awesomeApiBaseUrl,
                                @Value("${local-delivery.fallback-geocoder-url:https://brasilapi.com.br/api/cep/v2}") String brasilApiBaseUrl) {
        this.objectMapper = objectMapper;
        this.awesomeApiBaseUrl = awesomeApiBaseUrl.replaceAll("/+$", "");
        this.brasilApiBaseUrl = brasilApiBaseUrl.replaceAll("/+$", "");
    }

    public LocalDeliveryQuote quote(Store store, String destinationZip, int subtotalInCents)
            throws IOException, InterruptedException {
        if (Boolean.FALSE.equals(store.getLocalDeliveryEnabled())) {
            return unavailable("Esta loja não oferece entrega local.");
        }
        if (StringUtils.isBlank(store.getShippingOriginZip())) {
            return unavailable("A loja ainda não configurou o CEP de origem.");
        }
        List<DeliveryDistanceRange> ranges = store.getDeliveryDistanceRanges();
        if (ranges == null || ranges.isEmpty()) {
            return unavailable("A loja ainda não configurou as faixas de entrega.");
        }

        Coordinates origin = coordinatesFor(store.getShippingOriginZip());
        Coordinates destination = coordinatesFor(destinationZip);
        String normalizedOriginZip = store.getShippingOriginZip().replaceAll("\\D", "");
        String normalizedDestinationZip = destinationZip == null ? "" : destinationZip.replaceAll("\\D", "");
        if (!normalizedOriginZip.equals(normalizedDestinationZip)
                && sameCoordinates(origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude())) {
            return unavailable("Não foi possível estimar a distância entre esses CEPs com precisão. Confirme a entrega com a loja pelo WhatsApp.");
        }
        double distance = distanceKm(origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude());
        BigDecimal roundedDistance = BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);

        DeliveryDistanceRange matched = ranges.stream()
                .filter(range -> range.maxDistanceKm() != null && range.maxDistanceKm().doubleValue() >= distance)
                .min((first, second) -> first.maxDistanceKm().compareTo(second.maxDistanceKm()))
                .orElse(null);
        if (matched == null) {
            return new LocalDeliveryQuote(false, roundedDistance, null, "Este endereço está fora da área de entrega.");
        }

        int fee = Math.max(matched.fee() == null ? 0 : matched.fee(), 0);
        int freeShippingMinAmount = store.getFreeShippingMinAmount() == null ? 0 : store.getFreeShippingMinAmount();
        if (freeShippingMinAmount > 0 && subtotalInCents >= freeShippingMinAmount) {
            fee = 0;
        }
        return new LocalDeliveryQuote(true, roundedDistance, fee, null);
    }

    private LocalDeliveryQuote unavailable(String message) {
        return new LocalDeliveryQuote(false, null, null, message);
    }

    static boolean sameCoordinates(double firstLatitude, double firstLongitude,
                                   double secondLatitude, double secondLongitude) {
        return Double.compare(firstLatitude, secondLatitude) == 0
                && Double.compare(firstLongitude, secondLongitude) == 0;
    }

    private Coordinates coordinatesFor(String zip) throws IOException, InterruptedException {
        String normalizedZip = zip == null ? "" : zip.replaceAll("\\D", "");
        if (!normalizedZip.matches("\\d{8}")) {
            throw new IllegalArgumentException("Informe um CEP válido para calcular a entrega.");
        }
        Coordinates cached = coordinateCache.get(normalizedZip);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached;
        }

        try {
            Coordinates result;
            try {
                result = fetchCoordinates(awesomeApiBaseUrl, normalizedZip, "lat", "lng", false);
            } catch (IOException | IllegalArgumentException primaryFailure) {
                result = fetchCoordinates(brasilApiBaseUrl, normalizedZip, "latitude", "longitude", true);
            }
            coordinateCache.put(normalizedZip, result);
            return result;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw exception;
        }
    }

    private Coordinates fetchCoordinates(String baseUrl, String zip, String latitudeField,
                                         String longitudeField, boolean nestedBrasilApi)
            throws IOException, InterruptedException {
        String encodedZip = URLEncoder.encode(zip, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/" + encodedZip))
                .timeout(Duration.ofSeconds(7))
                .header("Accept", "application/json")
                .header("User-Agent", "Amandita/1.0 (local delivery quote)")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalArgumentException("O provedor de CEP não encontrou o endereço.");
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode coordinates = nestedBrasilApi ? root.path("location").path("coordinates") : root;
        String latitudeText = coordinates.path(latitudeField).asText();
        String longitudeText = coordinates.path(longitudeField).asText();
        if (StringUtils.isBlank(latitudeText) || StringUtils.isBlank(longitudeText)) {
            throw new IllegalArgumentException("O provedor de CEP não retornou coordenadas.");
        }
        try {
            double latitude = Double.parseDouble(latitudeText);
            double longitude = Double.parseDouble(longitudeText);
            if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                    || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                throw new NumberFormatException("Coordenadas fora dos limites geográficos.");
            }
            return new Coordinates(latitude, longitude, Instant.now().plus(Duration.ofDays(7)));
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("O provedor de CEP retornou coordenadas inválidas.");
        }
    }

    private double distanceKm(double latitude1, double longitude1, double latitude2, double longitude2) {
        double earthRadiusKm = 6371.0088;
        double latitudeDelta = Math.toRadians(latitude2 - latitude1);
        double longitudeDelta = Math.toRadians(longitude2 - longitude1);
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(Math.toRadians(latitude1)) * Math.cos(Math.toRadians(latitude2))
                * Math.pow(Math.sin(longitudeDelta / 2), 2);
        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    }
}
