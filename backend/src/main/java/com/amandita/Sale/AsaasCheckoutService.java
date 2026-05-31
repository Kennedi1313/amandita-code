package com.amandita.Sale;

import com.amandita.customer.Address;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerDao;
import com.amandita.product.Product;
import com.amandita.product.ProductDao;
import com.amandita.product.ProductVariation;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AsaasCheckoutService {

    private final ProductDao productDao;
    private final SaleDao saleDao;
    private final CustomerDao customerDao;
    private final StoreDao storeDao;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String asaasBaseUrl;
    private final String asaasApiKey;
    private final String asaasWebhookToken;
    private final String returnBaseUrl;

    public AsaasCheckoutService(ProductDao productDao,
                                SaleDao saleDao,
                                CustomerDao customerDao,
                                StoreDao storeDao,
                                ObjectMapper objectMapper,
                                @Value("${asaas.base-url}") String asaasBaseUrl,
                                @Value("${asaas.api-key}") String asaasApiKey,
                                @Value("${asaas.webhook-token:}") String asaasWebhookToken,
                                @Value("${asaas.return-base-url}") String returnBaseUrl) {
        this.productDao = productDao;
        this.saleDao = saleDao;
        this.customerDao = customerDao;
        this.storeDao = storeDao;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
        this.asaasBaseUrl = asaasBaseUrl.replaceAll("/+$", "");
        this.asaasApiKey = asaasApiKey;
        this.asaasWebhookToken = asaasWebhookToken;
        this.returnBaseUrl = returnBaseUrl;
    }

    @Transactional(rollbackOn = Exception.class)
    public AsaasCheckoutResponse createCheckout(AsaasCheckoutRequest request, Long storeId, String authenticatedEmail)
            throws IOException, InterruptedException {
        if (StringUtils.isBlank(asaasApiKey)) {
            throw new IllegalStateException("ASAAS_API_KEY não configurada.");
        }
        if (StringUtils.isBlank(asaasWebhookToken)) {
            throw new IllegalStateException("ASAAS_WEBHOOK_TOKEN não configurado.");
        }
        if (request == null || request.saleRequest() == null || request.saleRequest().getSaleItemRequests() == null
                || request.saleRequest().getSaleItemRequests().isEmpty()) {
            throw new IllegalArgumentException("Carrinho vazio.");
        }

        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        if (!StringUtils.equalsIgnoreCase(authenticatedEmail, request.saleRequest().getCustomerEmail())) {
            throw new IllegalArgumentException("Cliente autenticado não corresponde ao pedido.");
        }
        Customer customer = customerDao
                .selectUserByEmailByStore(authenticatedEmail, storeId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));

        Sale sale = buildPendingSale(request.saleRequest(), customer, store);
        saleDao.insertSale(sale);

        String asaasCustomerId = createOrGetCustomer(customer);
        Map<String, Object> payload = buildAsaasPayload(request, sale, customer, store, asaasCustomerId);
        String body = objectMapper.writeValueAsString(payload);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(asaasBaseUrl + "/checkouts"))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("access_token", asaasApiKey)
                .header("User-Agent", "Amandita/1.0.0")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalArgumentException("Erro ao criar checkout Asaas: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String checkoutId = root.path("id").asText(null);
        if (StringUtils.isBlank(checkoutId)) {
            throw new IllegalArgumentException("Resposta do Asaas sem id de checkout.");
        }

        sale.setPreferenceId(checkoutId);
        saleDao.insertSale(sale);

        return new AsaasCheckoutResponse(
                sale.getId(),
                checkoutId,
                checkoutBaseUrl() + "/checkoutSession/show?id=" + checkoutId
        );
    }

    @Transactional
    public void processWebhook(String payload) throws IOException {
        JsonNode root = objectMapper.readTree(payload);
        String event = root.path("event").asText();
        JsonNode checkout = root.path("checkout");
        String externalReference = firstText(
                checkout.path("externalReference"),
                root.path("externalReference"),
                checkout.path("payment").path("externalReference")
        );
        String checkoutId = firstText(
                checkout.path("id"),
                root.path("checkoutId"),
                root.path("checkout").path("id")
        );

        if (StringUtils.isBlank(externalReference) && StringUtils.isBlank(checkoutId)) {
            return;
        }

        Sale sale = StringUtils.isNotBlank(externalReference)
                ? saleDao.findByIdForUpdate(Long.valueOf(externalReference))
                    .orElseThrow(() -> new IllegalArgumentException("Venda não encontrada: " + externalReference))
                : saleDao.findByPreferenceIdForUpdate(checkoutId)
                    .orElseThrow(() -> new IllegalArgumentException("Venda não encontrada para checkout: " + checkoutId));

        if ("CHECKOUT_PAID".equals(event)) {
            if ("PENDENTE".equals(sale.getStatus())) {
                sale.setStatus("APROVADO");
                sale.setPaymentId(firstText(
                        checkout.path("payment").path("id"),
                        root.path("payment").path("id"),
                        root.path("paymentId"),
                        checkout.path("paymentId"),
                        checkout.path("id")
                ));
                decrementStock(sale);
                saleDao.insertSale(sale);
            }
        } else if ("CHECKOUT_CANCELED".equals(event) || "CHECKOUT_EXPIRED".equals(event)) {
            if ("PENDENTE".equals(sale.getStatus())) {
                sale.setStatus("CANCELADO");
                saleDao.insertSale(sale);
            }
        }
    }

    private Sale buildPendingSale(SaleRequest saleRequest, Customer customer, Store store) {
        Sale sale = new Sale();
        List<SaleItem> saleItems = new ArrayList<>();
        int subtotalInCents = 0;

        for (SaleItemRequest itemRequest : saleRequest.getSaleItemRequests()) {
            Product product = productDao.selectProductByIdAndStore(itemRequest.getProductId(), store.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado: " + itemRequest.getProductId()));

            ProductVariation variation = null;
            int unitPrice = product.getPrice();
            int availableQuantity = product.getQuantity();

            if (itemRequest.getVariationId() != null) {
                variation = product.getVariations().stream()
                        .filter(item -> itemRequest.getVariationId().equals(item.getId()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Variação não encontrada: " + itemRequest.getVariationId()));
                unitPrice = variation.getPrice();
                availableQuantity = variation.getQuantity();
            }

            if (availableQuantity < itemRequest.getQuantity()) {
                throw new IllegalArgumentException("Estoque insuficiente para " + product.getName());
            }

            int finalUnitPrice = applyPromo(unitPrice, variation != null ? variation.getPromo() : product.getPromo());
            SaleItem saleItem = new SaleItem();
            saleItem.setSale(sale);
            saleItem.setProduct(product);
            saleItem.setVariation(variation);
            saleItem.setQuantity(itemRequest.getQuantity());
            saleItem.setPrice(finalUnitPrice);
            saleItems.add(saleItem);

            subtotalInCents += finalUnitPrice * itemRequest.getQuantity();
        }

        int shippingFee = resolveShippingFee(saleRequest, store, subtotalInCents);
        int totalInCents = subtotalInCents + shippingFee;

        sale.setTotalPrice(totalInCents / 100.0);
        sale.setSaleItems(saleItems);
        sale.setCustomer(customer);
        sale.setShipment(shippingFee > 0);
        sale.setPaymentMethod("ASAAS");
        sale.setStore(store);
        sale.setStatus("PENDENTE");
        return sale;
    }

    private int resolveShippingFee(SaleRequest saleRequest, Store store, int subtotalInCents) {
        int requestedFee = saleRequest.getShippingFee() == null
                ? 0
                : Math.max(saleRequest.getShippingFee().intValue(), 0);
        String shippingMethod = StringUtils.defaultIfBlank(saleRequest.getShippingMethod(), inferShippingMethod(requestedFee, store));

        if ("pickup".equals(shippingMethod)) {
            if (Boolean.FALSE.equals(store.getPickupEnabled())) {
                throw new IllegalArgumentException("Retirada não está disponível para esta loja.");
            }
            return 0;
        }

        if (!"local_delivery".equals(shippingMethod)) {
            throw new IllegalArgumentException("Forma de entrega inválida.");
        }
        if (Boolean.FALSE.equals(store.getLocalDeliveryEnabled())) {
            throw new IllegalArgumentException("Entrega local não está disponível para esta loja.");
        }

        int freeShippingMinAmount = store.getFreeShippingMinAmount() == null ? 0 : store.getFreeShippingMinAmount();
        if (freeShippingMinAmount > 0 && subtotalInCents >= freeShippingMinAmount) {
            return 0;
        }
        return Math.max(store.getLocalDeliveryFee() == null ? 0 : store.getLocalDeliveryFee(), 0);
    }

    private String inferShippingMethod(int requestedFee, Store store) {
        if (requestedFee > 0) {
            return "local_delivery";
        }
        if (Boolean.FALSE.equals(store.getPickupEnabled()) && !Boolean.FALSE.equals(store.getLocalDeliveryEnabled())) {
            return "local_delivery";
        }
        return "pickup";
    }

    private Map<String, Object> buildAsaasPayload(AsaasCheckoutRequest request, Sale sale, Customer customer, Store store, String asaasCustomerId) {
        String baseUrl = StringUtils.defaultIfBlank(returnBaseUrl, "https://" + store.getDomain())
                .replaceAll("/+$", "");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("billingTypes", List.of("PIX", "CREDIT_CARD"));
        payload.put("chargeTypes", List.of("DETACHED", "INSTALLMENT"));
        payload.put("minutesToExpire", 60);
        payload.put("externalReference", String.valueOf(sale.getId()));
        payload.put("callback", Map.of(
                "cancelUrl", baseUrl + "/checkout",
                "expiredUrl", baseUrl + "/checkout",
                "successUrl", baseUrl + "/success"
        ));
        payload.put("items", buildItems(sale));
        payload.put("installment", Map.of("maxInstallmentCount", 6));
        payload.put("customer", asaasCustomerId);
        return payload;
    }

    private String createOrGetCustomer(Customer customer) throws IOException, InterruptedException {
        Map<String, Object> payload = buildCustomerData(customer);
        String body = objectMapper.writeValueAsString(payload);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(asaasBaseUrl + "/customers"))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("access_token", asaasApiKey)
                .header("User-Agent", "Amandita/1.0.0")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalArgumentException("Erro ao criar cliente Asaas: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String customerId = root.path("id").asText(null);
        if (StringUtils.isBlank(customerId)) {
            throw new IllegalArgumentException("Resposta do Asaas sem id de cliente.");
        }
        return customerId;
    }

    private List<Map<String, Object>> buildItems(Sale sale) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (SaleItem saleItem : sale.getSaleItems()) {
            String variationLabel = saleItem.getVariation() != null && saleItem.getVariation().getOptions() != null
                    ? String.join(" / ", saleItem.getVariation().getOptions().values())
                    : "";
            String name = StringUtils.isBlank(variationLabel)
                    ? saleItem.getProduct().getName()
                    : saleItem.getProduct().getName() + " - " + variationLabel;

            items.add(Map.of(
                    "name", name,
                    "description", StringUtils.defaultIfBlank(saleItem.getProduct().getDescription(), name),
                    "quantity", saleItem.getQuantity(),
                    "value", centsToReais(saleItem.getPrice())
            ));
        }
        int itemSubtotal = sale.getSaleItems().stream()
                .mapToInt(item -> item.getPrice() * item.getQuantity())
                .sum();
        int totalInCents = BigDecimal.valueOf(sale.getTotalPrice())
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int shippingInCents = totalInCents - itemSubtotal;
        if (shippingInCents > 0) {
            items.add(Map.of(
                    "name", "Frete",
                    "description", "Entrega local",
                    "quantity", 1,
                    "value", centsToReais(shippingInCents)
            ));
        }
        return items;
    }

    private Map<String, Object> buildCustomerData(Customer customer) {
        Map<String, Object> customerData = new LinkedHashMap<>();
        customerData.put("name", customer.getName());
        customerData.put("cpfCnpj", onlyDigits(customer.getCpf()));
        customerData.put("email", customer.getEmail());
        customerData.put("phone", onlyDigits(customer.getPhone()));

        Address address = customer.getAddresses().stream().findFirst().orElse(null);
        if (address != null) {
            customerData.put("address", address.getStreet());
            customerData.put("addressNumber", String.valueOf(address.getNumber()));
            customerData.put("postalCode", onlyDigits(address.getZip()));
            customerData.put("province", address.getDistrict());
        }
        return customerData;
    }

    private void decrementStock(Sale sale) {
        for (SaleItem saleItem : sale.getSaleItems()) {
            if (saleItem.getVariation() != null) {
                ProductVariation variation = saleItem.getVariation();
                variation.setQuantity(Math.max(variation.getQuantity() - saleItem.getQuantity(), 0));
                productDao.updateProduct(saleItem.getProduct());
            } else {
                Product product = saleItem.getProduct();
                product.setQuantity(Math.max(product.getQuantity() - saleItem.getQuantity(), 0));
                productDao.updateProduct(product);
            }
        }
    }

    private int applyPromo(int price, Integer promo) {
        if (promo == null || promo <= 0) {
            return price;
        }
        return BigDecimal.valueOf(price)
                .multiply(BigDecimal.valueOf(100L - promo))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    private BigDecimal centsToReais(int cents) {
        return BigDecimal.valueOf(cents)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private String onlyDigits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private String firstText(JsonNode... nodes) {
        for (JsonNode node : nodes) {
            if (node != null && !node.isMissingNode() && !node.isNull() && StringUtils.isNotBlank(node.asText())) {
                return node.asText();
            }
        }
        return null;
    }

    private String checkoutBaseUrl() {
        return asaasBaseUrl.contains("sandbox")
                ? "https://sandbox.asaas.com"
                : "https://asaas.com";
    }
}
