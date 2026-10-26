package com.amandita.store;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;

class LocalDeliveryServiceTest {
    private HttpServer geocoder;
    private ConcurrentHashMap<String, String> points;
    private LocalDeliveryService service;

    @BeforeEach
    void setUp() throws Exception {
        points = new ConcurrentHashMap<>();
        points.put("59056275", "{\"lat\":\"-5.8117083\",\"lng\":\"-35.2162446\"}");
        points.put("59073240", "{\"lat\":\"-5.8525163\",\"lng\":\"-35.2550151\"}");
        geocoder = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        geocoder.createContext("/awesome/", exchange -> {
            String zip = exchange.getRequestURI().getPath().substring("/awesome/".length());
            byte[] response = points.getOrDefault(zip, "{}").getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            try (var body = exchange.getResponseBody()) {
                body.write(response);
            }
        });
        geocoder.start();
        String baseUrl = "http://127.0.0.1:" + geocoder.getAddress().getPort();
        service = new LocalDeliveryService(new ObjectMapper(), baseUrl + "/awesome", baseUrl + "/brasilapi");
    }

    @AfterEach
    void tearDown() {
        geocoder.stop(0);
    }

    @Test
    void identifiesDifferentPostalCodesMappedToTheSameApproximatePoint() {
        assertThat(LocalDeliveryService.sameCoordinates(-5.795, -35.20944, -5.795, -35.20944)).isTrue();
    }

    @Test
    void preservesDistinctGeocodedPoints() {
        assertThat(LocalDeliveryService.sameCoordinates(-5.795, -35.20944, -5.849623, -35.256436)).isFalse();
    }

    @Test
    void calculatesLocalDeliveryBetweenTheTwoNatalPostalCodes() throws Exception {
        LocalDeliveryQuote quote = service.quote(store(), "59073-240", 0);

        assertThat(quote.available()).isTrue();
        assertThat(quote.distanceKm()).isBetween(new BigDecimal("6.0"), new BigDecimal("7.0"));
        assertThat(quote.fee()).isEqualTo(800);
    }

    @Test
    void doesNotQuoteWhenTheGeocoderReturnsOneGenericPointForDifferentPostalCodes() throws Exception {
        points.put("59073240", "{\"lat\":\"-5.8117083\",\"lng\":\"-35.2162446\"}");

        LocalDeliveryQuote quote = service.quote(store(), "59073240", 0);

        assertThat(quote.available()).isFalse();
        assertThat(quote.message()).contains("Confirme a entrega");
    }

    @Test
    void freeShippingDoesNotMakeAnOutOfRangePostalCodeDeliverable() throws Exception {
        Store store = store();
        store.setFreeShippingMinAmount(10000);
        store.setDeliveryDistanceRanges(List.of(new DeliveryDistanceRange(new BigDecimal("5"), 800)));

        LocalDeliveryQuote quote = service.quote(store, "59073-240", 20000);

        assertThat(quote.available()).isFalse();
        assertThat(quote.message()).contains("fora da área");
    }

    private Store store() {
        Store store = new Store();
        store.setLocalDeliveryEnabled(true);
        store.setShippingOriginZip("59056-275");
        store.setFreeShippingMinAmount(0);
        store.setDeliveryDistanceRanges(List.of(new DeliveryDistanceRange(new BigDecimal("10"), 800)));
        return store;
    }
}
