package com.amandita.store;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleDao;
import com.amandita.Sale.SaleItem;
import com.amandita.customer.Address;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;

@Service
public class MelhorEnvioShipmentService {
    private final SaleDao saleDao;
    private final StoreDao storeDao;
    private final String environment;
    private final String userAgent;

    public MelhorEnvioShipmentService(
            SaleDao saleDao,
            StoreDao storeDao,
            @Value("${melhor-envio.environment:sandbox}") String environment,
            @Value("${melhor-envio.user-agent:Amandita (contato@amandita.com.br)}") String userAgent) {
        this.saleDao = saleDao;
        this.storeDao = storeDao;
        this.environment = environment;
        this.userAgent = userAgent;
    }

    public Sale createLabel(Long saleId, Long storeId) {
        Sale sale = saleDao.findByIdAndStoreId(saleId, storeId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Pedido não encontrado."));

        if (!"PREPARANDO".equalsIgnoreCase(sale.getStatus())) {
            throw new IllegalStateException(
                    "A etiqueta só pode ser gerada para pedidos em preparação.");
        }

        if (StringUtils.isNotBlank(sale.getMelhorEnvioShipmentId())) {
            throw new IllegalStateException(
                    "Este pedido já possui uma remessa do Melhor Envio.");
        }

        String shippingMethod = sale.getShippingMethod();
        String prefix = "melhor_envio:";

        if (shippingMethod == null || !shippingMethod.startsWith(prefix)) {
            throw new IllegalStateException("Este pedido não usa Melhor Envio.");
        }

        String serviceIdText = shippingMethod.substring(prefix.length()).trim();

        final int serviceId;
        try {
            serviceId = Integer.parseInt(serviceIdText);
        } catch (NumberFormatException e) {
            throw new IllegalStateException(
                    "O ID do serviço Melhor Envio é inválido.", e);
        }

        if (serviceId <= 0) {
            throw new IllegalStateException(
                    "O ID do serviço Melhor Envio é inválido.");
        }

        Store store = storeDao.findById(storeId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Loja não encontrada."));

        if (StringUtils.isBlank(store.getMelhorEnvioAccessToken())) {
            throw new IllegalStateException(
                    "O Melhor Envio não está conectado nesta loja.");
        }

        PickupAddress origin = store.getPickupAddress();

        if (origin == null || StringUtils.isAnyBlank(
                origin.zip(), origin.street(), origin.number(),
                origin.district(), origin.city())) {
            throw new IllegalStateException(
                    "Cadastre o endereço de retirada antes de gerar a etiqueta.");
        }

        if (StringUtils.isBlank(store.getOwnerDocument())) {
            throw new IllegalStateException(
                    "Cadastre o CPF/CNPJ do remetente antes de gerar a etiqueta.");
        }

        if (sale.getCustomer() == null
                || sale.getCustomer().getAddresses() == null) {
            throw new IllegalStateException(
                    "O cliente não possui endereço de entrega.");
        }

        Address destination = sale.getCustomer().getAddresses()
                .stream()
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "O cliente não possui endereço de entrega."));

        JSONObject quote = new JSONObject(
                StringUtils.defaultString(sale.getShippingQuote(), "{}"));

        JSONObject from = addressPayload(
                origin.street(),
                origin.number(),
                origin.district(),
                origin.city(),
                origin.zip(),
                store.getName(),
                store.getOwnerDocument()
        );

        JSONObject to = addressPayload(
                destination.getStreet(),
                String.valueOf(destination.getNumber()),
                destination.getDistrict(),
                destination.getCity(),
                destination.getZip(),
                sale.getCustomer().getName(),
                sale.getCustomer().getCpf()
        );

        // Non-commercial shipment: no invoice is sent.
        // Confirm the sender is eligible for this shipment type.
        from.put("state_register", "ISENTO");

        BigDecimal insuranceValue = BigDecimal.ZERO;
        for (SaleItem item : sale.getSaleItems()) {
            insuranceValue = insuranceValue.add(
                    BigDecimal.valueOf(valueInReais(item.getPrice()))
                            .multiply(BigDecimal.valueOf(item.getQuantity()))
            );
        }

        if (insuranceValue.signum() <= 0) {
            throw new IllegalStateException(
                    "O valor declarado dos produtos deve ser maior que zero.");
        }

        JSONObject options = new JSONObject()
                .put("non_commercial", true)
                .put("insurance_value", insuranceValue)
                .put("receipt", false)
                .put("own_hand", false)
                .put("reverse", false);

        JSONObject payload = new JSONObject()
                .put("service", serviceId)
                .put("from", from)
                .put("to", to)
                .put("products", productsPayload(sale))
                .put("volumes", volumesPayload(sale))
                .put("options", options);

        // Avoid logging CPF/CNPJ and complete addresses in production.
        JSONObject cartResponse = post(store, "/api/v2/me/cart", payload);

        String shipmentId = firstId(cartResponse, "id", "order_id");
        if (StringUtils.isBlank(shipmentId)) {
            throw new IllegalStateException(
                    "O Melhor Envio não retornou o ID da remessa.");
        }

        JSONObject checkout = post(
                store,
                "/api/v2/me/shipment/checkout",
                new JSONObject().put(
                        "orders", new JSONArray().put(shipmentId))
        );

        String orderId = firstId(checkout, "id", "order_id", "orders");
        if (StringUtils.isBlank(orderId)) {
            throw new IllegalStateException(
                    "O checkout não retornou o ID do pedido.");
        }

        post(
                store,
                "/api/v2/me/shipment/generate",
                new JSONObject().put(
                        "orders", new JSONArray().put(orderId))
        );

        sale.setMelhorEnvioShipmentId(orderId);
        sale.setMelhorEnvioStatus("GENERATED");
        sale.setMelhorEnvioTrackingCode(quote.optString("tracking", null));

        return saleDao.insertSale(sale);
    }

    public Sale printLabel(Long saleId, Long storeId) {
        Sale sale = saleDao.findByIdAndStoreId(saleId, storeId)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));
        if (StringUtils.isBlank(sale.getMelhorEnvioShipmentId())) {
            throw new IllegalStateException("Gere a etiqueta antes de imprimir.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada."));
        JSONObject response = post(store, "/api/v2/me/shipment/print", new JSONObject()
                .put("mode", "public")
                .put("orders", new JSONArray().put(sale.getMelhorEnvioShipmentId())));
        String link = response.optString("url", response.optString("link", null));
        if (StringUtils.isBlank(link)) throw new IllegalStateException("O Melhor Envio não retornou o link da etiqueta.");
        sale.setMelhorEnvioLabelUrl(link);
        return saleDao.insertSale(sale);
    }

    public Sale refreshTracking(Long saleId, Long storeId) {
        Sale sale = saleDao.findByIdAndStoreId(saleId, storeId)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));
        if (StringUtils.isBlank(sale.getMelhorEnvioShipmentId())) {
            throw new IllegalStateException("Este pedido ainda não possui uma remessa.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada."));
        JSONObject response = post(store, "/api/v2/me/shipment/tracking", new JSONObject()
                .put("orders", new JSONArray().put(sale.getMelhorEnvioShipmentId())));
        JSONObject tracking = response.optJSONArray("orders") != null && response.optJSONArray("orders").length() > 0
                ? response.optJSONArray("orders").optJSONObject(0) : response;
        sale.setMelhorEnvioStatus(tracking.optString("status", sale.getMelhorEnvioStatus()));
        sale.setMelhorEnvioTrackingCode(tracking.optString("tracking", sale.getMelhorEnvioTrackingCode()));
        return saleDao.insertSale(sale);
    }

    private JSONObject addressPayload(
            String street,
            String number,
            String district,
            String city,
            String zip,
            String name,
            String document) {

        if (StringUtils.isAnyBlank(street, number, district, city, zip)) {
            throw new IllegalStateException(
                    "O endereço precisa ter rua, número, bairro, cidade e CEP."
            );
        }

        String postalCode = zip.replaceAll("\\D", "");
        if (postalCode.length() != 8) {
            throw new IllegalStateException("O CEP deve conter 8 dígitos.");
        }

        String normalizedCity = city.trim();
        String stateAbbr = null;

        // Accept city values such as "Natal - RN" and split the state.
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("(?i)^(.+?)\\s*[-/]\\s*([A-Z]{2})$")
                .matcher(normalizedCity);

        if (matcher.matches()) {
            normalizedCity = matcher.group(1).trim();
            stateAbbr = matcher.group(2).toUpperCase(java.util.Locale.ROOT);
        }

        JSONObject address = new JSONObject()
                .put("name", StringUtils.defaultIfBlank(name, "Amandita").trim())
                .put("address", street.trim())
                .put("number", number.trim())
                .put("district", district.trim())
                .put("city", normalizedCity)
                .put("postal_code", postalCode);

        if (stateAbbr != null) {
            address.put("state_abbr", stateAbbr);
        }

        String digits = StringUtils.defaultString(document)
                .replaceAll("\\D", "");

        if (!digits.isEmpty()) {
            if (digits.length() == 11) {
                address.put("document", digits);
            } else if (digits.length() == 14) {
                address.put("company_document", digits);
            } else {
                throw new IllegalStateException(
                        "O CPF/CNPJ do remetente ou destinatário é inválido."
                );
            }
        }

        return address;
    }

    private JSONArray productsPayload(Sale sale) {
        if (sale.getSaleItems() == null || sale.getSaleItems().isEmpty()) {
            throw new IllegalStateException(
                    "O pedido precisa ter pelo menos um produto."
            );
        }

        JSONArray products = new JSONArray();

        for (SaleItem item : sale.getSaleItems()) {
            if (item == null || item.getProduct() == null) {
                throw new IllegalStateException(
                        "Existe um item sem produto associado."
                );
            }

            var product = item.getProduct();

            if (item.getQuantity() <= 0
                    || StringUtils.isBlank(product.getName())
                    || item.getPrice() == null
                    || item.getPrice() < 0) {
                throw new IllegalStateException(
                        "Verifique o nome, a quantidade e o preço dos produtos."
                );
            }

            products.put(new JSONObject()
                    .put("name", product.getName().trim())
                    .put("quantity", item.getQuantity())
                    .put("unitary_value", valueInReais(item.getPrice())));
        }

        return products;
    }

    private JSONArray volumesPayload(Sale sale) {
        if (sale.getSaleItems() == null || sale.getSaleItems().isEmpty()) {
            throw new IllegalStateException(
                    "O pedido precisa ter pelo menos um item para envio."
            );
        }

        BigDecimal weight = BigDecimal.ZERO;
        int width = 0;
        int height = 0;
        int length = 0;

        for (SaleItem item : sale.getSaleItems()) {
            if (item == null || item.getProduct() == null) {
                throw new IllegalStateException(
                        "Existe um item sem produto associado."
                );
            }

            var product = item.getProduct();

            if (product.getWeightKg() == null
                    || product.getWidthCm() == null
                    || product.getHeightCm() == null
                    || product.getLengthCm() == null) {
                throw new IllegalStateException(
                        "Todos os produtos precisam ter peso e dimensões cadastrados."
                );
            }

            int quantity = item.getQuantity();

            if (quantity <= 0
                    || product.getWeightKg().signum() <= 0
                    || product.getWidthCm() <= 0
                    || product.getHeightCm() <= 0
                    || product.getLengthCm() <= 0) {
                throw new IllegalStateException(
                        "O peso, as dimensões e as quantidades devem ser positivos."
                );
            }

            weight = weight.add(product.getWeightKg()
                    .multiply(BigDecimal.valueOf(quantity)));

            width = Math.max(width, product.getWidthCm());
            length = Math.max(length, product.getLengthCm());

            height = Math.addExact(
                    height,
                    Math.multiplyExact(product.getHeightCm(), quantity)
            );
        }

        return new JSONArray().put(new JSONObject()
                .put("weight", weight)
                .put("width", width)
                .put("height", height)
                .put("length", length));
    }

    private JSONObject post(Store store, String path, JSONObject payload) {
        System.out.println("Melhor envio payload: " + payload.toString(2));
        System.out.println("Bearer " + store.getMelhorEnvioAccessToken());
        System.out.println("Path: " + apiBaseUrl() + path);
        Request request = new Request.Builder().url(apiBaseUrl() + path)
                .post(okhttp3.RequestBody.create(payload.toString(), MediaType.parse("application/json")))
                .addHeader("Authorization", "Bearer " + store.getMelhorEnvioAccessToken())
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                .addHeader("User-Agent", userAgent).build();
        try (Response response = new OkHttpClient().newCall(request).execute()) {
            String body = response.body() == null ? "{}" : response.body().string();
            if (!response.isSuccessful()) throw new IllegalStateException("Melhor Envio recusou a operação: " + body + " (HTTP " + response.code() + ")");
            return new JSONObject(body);
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível comunicar com o Melhor Envio.", exception);
        }
    }

    private String firstId(JSONObject object, String... keys) {
        for (String key : keys) {
            if (object.has(key) && object.get(key) instanceof JSONArray array && array.length() > 0) return String.valueOf(array.get(0));
            String value = object.optString(key, null);
            if (StringUtils.isNotBlank(value)) return value;
        }
        return null;
    }

    private double valueInReais(Number cents) { return cents == null ? 0 : cents.doubleValue() / 100d; }
    private String apiBaseUrl() { return "production".equalsIgnoreCase(environment) ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br"; }
}
