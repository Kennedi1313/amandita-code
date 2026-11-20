package com.amandita.store;

import com.amandita.Sale.Sale;
import com.amandita.Sale.SaleDao;
import com.amandita.Sale.SaleItem;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerRepository;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.FormBody;
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
    private final CustomerRepository customerRepository;
    private final String environment;
    private final String userAgent;
    private final String clientId;
    private final String clientSecret;
    private final Object[] labelLocks = new Object[64];

    public MelhorEnvioShipmentService(
            SaleDao saleDao,
            StoreDao storeDao,
            CustomerRepository customerRepository,
            @Value("${melhor-envio.environment:sandbox}") String environment,
            @Value("${melhor-envio.user-agent:Amandita (contato@amandita.com.br)}") String userAgent,
            @Value("${melhor-envio.client-id:}") String clientId,
            @Value("${melhor-envio.client-secret:}") String clientSecret) {
        this.saleDao = saleDao;
        this.storeDao = storeDao;
        this.customerRepository = customerRepository;
        this.environment = environment;
        this.userAgent = userAgent;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        for (int i = 0; i < labelLocks.length; i++) {
            labelLocks[i] = new Object();
        }
    }

    public Sale createLabel(Long saleId, Long storeId) {
        return createLabel(saleId, storeId, null);
    }

    public Sale createLabel(Long saleId, Long storeId, String invoiceKey) {
        Object lock = labelLocks[Math.floorMod(
                Long.hashCode(saleId), labelLocks.length)];
        synchronized (lock) {
            return createLabelLocked(saleId, storeId, invoiceKey);
        }
    }

    private Sale createLabelLocked(Long saleId, Long storeId, String invoiceKey) {
        Sale sale = saleDao.findByIdAndStoreId(saleId, storeId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Pedido não encontrado."));

        if (!"PREPARANDO".equalsIgnoreCase(sale.getStatus())) {
            throw new IllegalStateException(
                    "A etiqueta só pode ser gerada para pedidos em preparação.");
        }

        if (StringUtils.isNotBlank(sale.getMelhorEnvioShipmentId())
                || "GENERATED".equals(sale.getMelhorEnvioOperationStatus())) {
            throw new IllegalStateException(
                    "Este pedido já possui uma remessa do Melhor Envio.");
        }

        resetRecoveryStateForEnvironmentChange(sale);

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

        PickupAddress origin = store.getMelhorEnvioOriginAddress();

        if (origin == null || StringUtils.isAnyBlank(
                origin.zip(), origin.street(), origin.number(),
                origin.district(), origin.city(), origin.state())) {
            throw new IllegalStateException(
                    "O endereço de postagem do Melhor Envio não foi sincronizado. "
                            + "Acesse Configurações > Melhor Envio, confirme o endereço autorizado e reconecte a conta antes de gerar a etiqueta.");
        }

        String ownerDocument = onlyDigits(store.getTaxDocument());
        if (StringUtils.isBlank(ownerDocument)) {
            Customer storeOwner = customerRepository.findFirstByOwnedStoreId(storeId)
                    .orElseThrow(() -> new IllegalStateException("Cadastre o CNPJ da loja antes de usar NF-e."));
            ownerDocument = onlyDigits(storeOwner.getCpf());
        }
        if (ownerDocument.length() != 14 && StringUtils.isNotBlank(invoiceKey)) {
            throw new IllegalStateException("Cadastre um CNPJ válido da loja antes de gerar etiqueta com NF-e.");
        }

        if (StringUtils.isAnyBlank(sale.getShippingAddressStreet(), sale.getShippingAddressDistrict(),
                sale.getShippingAddressCity(), sale.getShippingAddressState(), sale.getShippingZip())
                || sale.getShippingAddressNumber() == null) {
            throw new IllegalStateException(
                    "Este pedido não possui o endereço de entrega salvo na compra.");
        }

        JSONObject quote = new JSONObject(
                StringUtils.defaultString(sale.getShippingQuote(), "{}"));

        JSONObject from = addressPayload(
            origin.street(),
            origin.number(),
            "",
            origin.district(),
            origin.city(),
            origin.state(),
            origin.zip(),
            store.getName(),
            ownerDocument,
            "",
            "",
            ownerDocument.length() == 14 ? "ISENTO" : "",
            ""
        );

        JSONObject to = addressPayload(
                sale.getShippingAddressStreet(),
                String.valueOf(sale.getShippingAddressNumber()),
                "",
                sale.getShippingAddressDistrict(),
                sale.getShippingAddressCity(),
                sale.getShippingAddressState(),
                sale.getShippingZip(),
                sale.getCustomer() == null ? "" : sale.getCustomer().getName(),
                sale.getCustomer() == null ? "" : sale.getCustomer().getCpf(),
                sale.getCustomer() == null ? "" : sale.getCustomer().getPhone(),
                sale.getCustomer() == null ? "" : sale.getCustomer().getEmail(),
                "",
                ""
        );

        // Non-commercial shipment: no invoice is sent.
        // Confirm the sender is eligible for this shipment type.
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

        String normalizedInvoiceKey = StringUtils.trimToEmpty(invoiceKey).replaceAll("\\D", "");
        if (StringUtils.isNotBlank(invoiceKey) && normalizedInvoiceKey.length() != 44) {
            throw new IllegalStateException("A chave da NF-e deve conter 44 dígitos.");
        }
        String savedInvoiceKey = StringUtils.defaultString(
                sale.getMelhorEnvioInvoiceKey());
        if (StringUtils.isNotBlank(sale.getMelhorEnvioOperationStatus())
                && !savedInvoiceKey.equals(normalizedInvoiceKey)) {
            throw new IllegalStateException(
                    "A tentativa anterior desta etiqueta já começou com outros dados de NF-e. "
                            + "Mantenha a mesma chave para continuar a operação com segurança.");
        }
        sale.setMelhorEnvioInvoiceKey(StringUtils.isBlank(normalizedInvoiceKey)
                ? null : normalizedInvoiceKey);
        saleDao.insertSale(sale);

        JSONObject options = new JSONObject()
            .put("non_commercial", StringUtils.isBlank(normalizedInvoiceKey))
            .put("reverse", false)
            .put("insurance_value", insuranceValue)
            .put("receipt", false)
            .put("own_hand", false)
            .put("collect", false)
            .put("platform", "Kizi")
            .put("tags", new JSONArray().put(new JSONObject()
                    .put("tag", "KIZI-SALE-" + sale.getId())
                    .put("url", JSONObject.NULL)))
            .put("reminder", "");
        if (StringUtils.isNotBlank(normalizedInvoiceKey)) {
            options.remove("non_commercial");
            options.put("invoice", new JSONObject().put("key", normalizedInvoiceKey));
        }

        JSONObject payload = new JSONObject()
                .put("from", from)
                .put("to", to)
                .put("options", options)
                .put("service", serviceId)
                .put("volumes", volumesPayload(sale))
                .put("frequent_destination_id", "")
                .put("products", productsPayload(sale));

        ensureCurrentEnvironment(sale);
        ensureCartCreated(sale, store, payload);
        ensureOrderPurchased(sale, store);
        generateLabel(sale, store);

        sale.setMelhorEnvioTrackingCode(quote.optString("tracking", null));

        return saleDao.insertSale(sale);
    }

    private void resetRecoveryStateForEnvironmentChange(Sale sale) {
        String currentEnvironment = normalizedEnvironment();
        String previousEnvironment = sale.getMelhorEnvioOperationEnvironment();
        if (StringUtils.isBlank(previousEnvironment)
                || previousEnvironment.equals(currentEnvironment)) {
            return;
        }

        sale.setMelhorEnvioCartId(null);
        sale.setMelhorEnvioOrderId(null);
        sale.setMelhorEnvioOperationStatus(null);
        sale.setMelhorEnvioOperationEnvironment(null);
        saleDao.insertSale(sale);
    }

    private void ensureCurrentEnvironment(Sale sale) {
        if (!normalizedEnvironment().equals(sale.getMelhorEnvioOperationEnvironment())) {
            sale.setMelhorEnvioOperationEnvironment(normalizedEnvironment());
            saleDao.insertSale(sale);
        }
    }

    private void ensureCartCreated(Sale sale, Store store, JSONObject payload) {
        if (StringUtils.isNotBlank(sale.getMelhorEnvioCartId())) {
            return;
        }

        String operationStatus = sale.getMelhorEnvioOperationStatus();
        if ("CART_PENDING".equals(operationStatus)
                || "CART_UNCONFIRMED".equals(operationStatus)) {
            JSONObject cartPage = getOptional(store, "/api/v2/me/cart");
            java.util.Set<String> recoveredIds = findTaggedCartIds(
                    cartPage, "KIZI-SALE-" + sale.getId());
            if (recoveredIds.size() == 1) {
                sale.setMelhorEnvioCartId(recoveredIds.iterator().next());
                sale.setMelhorEnvioOperationStatus("CART_CREATED");
                saleDao.insertSale(sale);
                return;
            }
            if (recoveredIds.size() > 1) {
                throw new IllegalStateException(
                        "Há mais de uma etiqueta com a identificação KIZI-SALE-"
                                + sale.getId()
                                + ". Confira o carrinho no Melhor Envio antes de continuar.");
            }

            JSONObject orders = getOptional(store, "/api/v2/me/orders");
            java.util.Set<String> recoveredOrderIds = findTaggedCartIds(
                    orders, "KIZI-SALE-" + sale.getId());
            if (recoveredOrderIds.size() == 1) {
                String recoveredOrderId = recoveredOrderIds.iterator().next();
                sale.setMelhorEnvioCartId(recoveredOrderId);
                sale.setMelhorEnvioOrderId(recoveredOrderId);
                sale.setMelhorEnvioOperationStatus("ORDER_PURCHASED");
                saleDao.insertSale(sale);
                return;
            }
            if (recoveredOrderIds.size() > 1) {
                throw new IllegalStateException(
                        "Há mais de uma etiqueta comprada com a identificação KIZI-SALE-"
                                + sale.getId()
                                + ". Confira o painel do Melhor Envio antes de continuar.");
            }

            // Both provider listings confirmed that the tagged label is absent.
            // It is now safe to retry the cart insertion.
            sale.setMelhorEnvioCartId(null);
            sale.setMelhorEnvioOrderId(null);
            sale.setMelhorEnvioOperationStatus(null);
            saleDao.insertSale(sale);
            operationStatus = null;
        }
        if (StringUtils.isNotBlank(operationStatus)) {
            throw new IllegalStateException(
                    "O estado do carrinho do Melhor Envio não permite uma nova tentativa segura.");
        }

        sale.setMelhorEnvioOperationStatus("CART_PENDING");
        saleDao.insertSale(sale);

        try {
            JSONObject cartResponse = post(store, "/api/v2/me/cart", payload);
            String cartId = firstId(cartResponse, "id", "order_id");
            if (StringUtils.isBlank(cartId)) {
                sale.setMelhorEnvioOperationStatus("CART_UNCONFIRMED");
                saleDao.insertSale(sale);
                throw new IllegalStateException(
                        "O Melhor Envio não retornou o ID da remessa. A tentativa foi bloqueada para evitar duplicidade.");
            }

            sale.setMelhorEnvioCartId(cartId);
            sale.setMelhorEnvioOperationStatus("CART_CREATED");
            saleDao.insertSale(sale);
        } catch (IllegalStateException exception) {
            if ("CART_PENDING".equals(sale.getMelhorEnvioOperationStatus())) {
                sale.setMelhorEnvioOperationStatus(
                        isClientRejection(exception) ? null : "CART_UNCONFIRMED");
                saleDao.insertSale(sale);
            }
            throw exception;
        }
    }

    private void ensureOrderPurchased(Sale sale, Store store) {
        if (StringUtils.isNotBlank(sale.getMelhorEnvioOrderId())) {
            return;
        }

        if ("CHECKOUT_PENDING".equals(sale.getMelhorEnvioOperationStatus())) {
            JSONObject existingOrder = getOptional(
                    store, "/api/v2/me/orders/" + sale.getMelhorEnvioCartId());
            if (existingOrder != null) {
                String recoveredOrderId = firstId(existingOrder, "id", "order_id");
                sale.setMelhorEnvioOrderId(StringUtils.defaultIfBlank(
                        recoveredOrderId, sale.getMelhorEnvioCartId()));
                sale.setMelhorEnvioOperationStatus("ORDER_PURCHASED");
                saleDao.insertSale(sale);
                return;
            }

            JSONObject unpaidCartItem = getOptional(
                    store, "/api/v2/me/cart/" + sale.getMelhorEnvioCartId());
            if (unpaidCartItem == null) {
                throw new IllegalStateException(
                        "A compra da etiqueta no Melhor Envio ficou sem confirmação. "
                                + "O sistema não vai cobrar de novo automaticamente. Confira o envio no painel do Melhor Envio.");
            }
            sale.setMelhorEnvioOperationStatus("CART_CREATED");
            saleDao.insertSale(sale);
        }

        if (!"CART_CREATED".equals(sale.getMelhorEnvioOperationStatus())
                || StringUtils.isBlank(sale.getMelhorEnvioCartId())) {
            throw new IllegalStateException(
                    "O carrinho do Melhor Envio não está confirmado para este pedido.");
        }

        sale.setMelhorEnvioOperationStatus("CHECKOUT_PENDING");
        saleDao.insertSale(sale);

        try {
            JSONObject checkout = post(
                    store,
                    "/api/v2/me/shipment/checkout",
                    new JSONObject().put(
                            "orders", new JSONArray().put(sale.getMelhorEnvioCartId())));
            String orderId = firstId(checkout, "id", "order_id", "orders");
            if (StringUtils.isBlank(orderId)) {
                throw new IllegalStateException(
                        "O checkout não retornou o ID do pedido.");
            }

            sale.setMelhorEnvioOrderId(orderId);
            sale.setMelhorEnvioOperationStatus("ORDER_PURCHASED");
            saleDao.insertSale(sale);
        } catch (IllegalStateException exception) {
            if ("CHECKOUT_PENDING".equals(sale.getMelhorEnvioOperationStatus())
                    && isClientRejection(exception)) {
                sale.setMelhorEnvioOperationStatus("CART_CREATED");
                saleDao.insertSale(sale);
            }
            throw exception;
        }
    }

    private void generateLabel(Sale sale, Store store) {
        String operationStatus = sale.getMelhorEnvioOperationStatus();
        if (!"ORDER_PURCHASED".equals(operationStatus)
                && !"GENERATION_PENDING".equals(operationStatus)) {
            throw new IllegalStateException(
                    "A compra da etiqueta no Melhor Envio ainda não está confirmada.");
        }

        String orderId = StringUtils.defaultIfBlank(
                sale.getMelhorEnvioOrderId(), sale.getMelhorEnvioCartId());
        if (StringUtils.isBlank(orderId)) {
            throw new IllegalStateException(
                    "O Melhor Envio não retornou o ID do pedido comprado.");
        }

        sale.setMelhorEnvioOperationStatus("GENERATION_PENDING");
        saleDao.insertSale(sale);

        post(store, "/api/v2/me/shipment/generate", new JSONObject()
                .put("orders", new JSONArray().put(orderId)));

        sale.setMelhorEnvioShipmentId(orderId);
        sale.setMelhorEnvioStatus("GENERATED");
        sale.setMelhorEnvioOperationStatus("GENERATED");
        saleDao.insertSale(sale);
    }

    private JSONObject getOptional(Store store, String path) {
        return getOptional(store, path, true);
    }

    private JSONObject getOptional(Store store, String path, boolean allowTokenRefresh) {
        Request request = buildGetRequest(path, store.getMelhorEnvioAccessToken());
        try (Response response = new OkHttpClient().newCall(request).execute()) {
            if (response.code() == 404) {
                return null;
            }

            String body = response.body() == null ? "" : response.body().string();
            if (allowTokenRefresh
                    && (response.code() == 401 || response.code() == 403)
                    && refreshAccessToken(store)) {
                return getOptional(store, path, false);
            }
            if (!response.isSuccessful()) {
                throw new IllegalStateException("Erro Melhor Envio | HTTP: "
                        + response.code() + " | Resposta: " + body);
            }
            if (body.isBlank()) {
                return new JSONObject();
            }
            return body.startsWith("[")
                    ? new JSONObject().put("data", new JSONArray(body))
                    : new JSONObject(body);
        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Falha ao consultar o Melhor Envio para recuperar a etiqueta.", exception);
        }
    }

    private java.util.Set<String> findTaggedCartIds(
            Object node, String expectedTag) {
        java.util.Set<String> ids = new java.util.LinkedHashSet<>();
        collectTaggedCartIds(node, expectedTag, ids);
        return ids;
    }

    private void collectTaggedCartIds(
            Object node, String expectedTag, java.util.Set<String> ids) {
        if (node instanceof JSONObject object) {
            if (object.has("id") && containsTag(object, expectedTag)) {
                String id = String.valueOf(object.opt("id"));
                if (StringUtils.isNotBlank(id) && !"null".equals(id)) {
                    ids.add(id);
                }
            }
            for (String key : object.keySet()) {
                collectTaggedCartIds(object.opt(key), expectedTag, ids);
            }
        } else if (node instanceof JSONArray array) {
            for (int index = 0; index < array.length(); index++) {
                collectTaggedCartIds(array.opt(index), expectedTag, ids);
            }
        }
    }

    private boolean containsTag(Object node, String expectedTag) {
        if (node instanceof JSONObject object) {
            if (expectedTag.equals(object.optString("tag"))) {
                return true;
            }
            for (String key : object.keySet()) {
                if (containsTag(object.opt(key), expectedTag)) {
                    return true;
                }
            }
        } else if (node instanceof JSONArray array) {
            for (int index = 0; index < array.length(); index++) {
                if (containsTag(array.opt(index), expectedTag)) {
                    return true;
                }
            }
        }
        return false;
    }

    private Request buildGetRequest(String path, String accessToken) {
        return new Request.Builder()
                .url(apiBaseUrl() + path)
                .get()
                .addHeader("Authorization", "Bearer " + accessToken)
                .addHeader("Accept", "application/json")
                .addHeader("User-Agent", userAgent)
                .build();
    }

    private boolean isClientRejection(IllegalStateException exception) {
        String message = exception.getMessage();
        if (message == null) {
            return false;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("HTTP: (4\\d\\d)")
                .matcher(message);
        return matcher.find() && !"401".equals(matcher.group(1))
                && !"403".equals(matcher.group(1));
    }

    private String normalizedEnvironment() {
        return "production".equalsIgnoreCase(environment)
                ? "production" : "sandbox";
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
        String complement,
        String district,
        String city,
        String stateAbbr,
        String zip,
        String name,
        String document,
        String phone,
        String email,
        String stateRegister,
        String economicActivityCode) {

        if (StringUtils.isAnyBlank(
                street, number, district, city, stateAbbr, zip)) {
                throw new IllegalStateException(
                        "O endereço precisa ter rua, número, bairro, cidade, UF e CEP.");
        }

        String postalCode = zip.replaceAll("\\D", "");
        if (postalCode.length() != 8) {
                throw new IllegalStateException(
                        "O CEP deve conter 8 dígitos.");
        }

        String digits = onlyDigits(document);

        JSONObject address = new JSONObject()
                .put("name", StringUtils.defaultString(name).trim())
                .put("phone", StringUtils.defaultString(phone))
                .put("postal_code", postalCode)
                .put("address", street.trim())
                .put("number", number.trim())
                .put("complement", StringUtils.defaultString(complement))
                .put("district", district.trim())
                .put("city", city.trim())
                .put("state_abbr", stateAbbr.trim().toUpperCase(
                        java.util.Locale.ROOT))
                .put("email", StringUtils.defaultString(email));

        if (digits.length() == 11) {
                address.put("document", digits);
        } else if (digits.length() == 14) {
                address.put("company_document", digits);
                address.put("state_register", StringUtils.defaultString(stateRegister));
                if (StringUtils.isNotBlank(economicActivityCode)) {
                        address.put("economic_activity_code", economicActivityCode);
                }
        } else {
                throw new IllegalStateException(
                        "O CPF/CNPJ do remetente ou destinatário é inválido.");
        }

        return address;
    }

    private String onlyDigits(String value) {
        return StringUtils.defaultString(value).replaceAll("\\D", "");
    }

    private JSONArray productsPayload(Sale sale) {
        if (sale.getSaleItems() == null || sale.getSaleItems().isEmpty()) {
            throw new IllegalStateException(
                    "O pedido precisa ter pelo menos um produto.");
        }

        JSONArray products = new JSONArray();

        for (SaleItem item : sale.getSaleItems()) {
            if (item == null || item.getProduct() == null) {
                throw new IllegalStateException(
                        "Existe um item sem produto associado.");
            }

            var product = item.getProduct();

            if (item.getQuantity() <= 0
                    || StringUtils.isBlank(product.getName())
                    || item.getPrice() == null
                    || item.getPrice() < 0) {
                throw new IllegalStateException(
                        "Verifique o nome, a quantidade e o preço dos produtos.");
            }

            products.put(new JSONObject()
                    .put("name", product.getName().trim())
                    .put("quantity", String.valueOf(item.getQuantity()))
                    .put("unitary_value", valueInReais(item.getPrice())));
        }

        return products;
    }

    private JSONArray volumesPayload(Sale sale) {
        if (sale.getSaleItems() == null || sale.getSaleItems().isEmpty()) {
            throw new IllegalStateException(
                    "O pedido precisa ter pelo menos um item para envio.");
        }

        BigDecimal weight = BigDecimal.ZERO;
        int width = 0;
        int height = 0;
        int length = 0;

        for (SaleItem item : sale.getSaleItems()) {
            if (item == null || item.getProduct() == null) {
                throw new IllegalStateException(
                        "Existe um item sem produto associado.");
            }

            var product = item.getProduct();

            if (product.getWeightKg() == null
                    || product.getWidthCm() == null
                    || product.getHeightCm() == null
                    || product.getLengthCm() == null) {
                throw new IllegalStateException(
                        "Todos os produtos precisam ter peso e dimensões cadastrados.");
            }

            int quantity = item.getQuantity();

            if (quantity <= 0
                    || product.getWeightKg().signum() <= 0
                    || product.getWidthCm() <= 0
                    || product.getHeightCm() <= 0
                    || product.getLengthCm() <= 0) {
                throw new IllegalStateException(
                        "O peso, as dimensões e as quantidades devem ser positivos.");
            }

            weight = weight.add(product.getWeightKg()
                    .multiply(BigDecimal.valueOf(quantity)));

            width = Math.max(width, product.getWidthCm());
            length = Math.max(length, product.getLengthCm());

            height = Math.addExact(
                    height,
                    Math.multiplyExact(product.getHeightCm(), quantity));
        }

        JSONObject volume = new JSONObject()
                .put("height", String.valueOf(height))
                .put("width", String.valueOf(width))
                .put("length", String.valueOf(length))
                .put("weight", weight.doubleValue());

        return new JSONArray().put(volume);
    }

    private JSONObject post(Store store, String path, JSONObject payload) {
        try (Response response = executePost(store, path, payload)) {

            String body = response.body() == null
                    ? ""
                    : response.body().string();

            if (!response.isSuccessful()) {
                if (response.code() == 422
                        && hasInvalidOriginPostalCodeError(body)) {
                    String originZip = payload.optJSONObject("from") == null
                            ? ""
                            : payload.optJSONObject("from")
                                    .optString("postal_code", "");
                    String formattedOriginZip = originZip.matches("\\d{8}")
                            ? originZip.substring(0, 5) + "-" + originZip.substring(5)
                            : originZip;
                    throw new IllegalStateException(
                            "O Melhor Envio recusou o CEP de postagem"
                                    + (StringUtils.isBlank(formattedOriginZip)
                                            ? ""
                                            : " " + formattedOriginZip)
                                    + ". Atualize o endereço de origem na sua conta Melhor Envio e depois reconecte a integração em Configurações > Melhor Envio.");
                }
                throw new IllegalStateException(
                        "Erro Melhor Envio"
                        + " | HTTP: " + response.code()
                        + " | Resposta: " + body);
            }

            if (body.isBlank()) {
                return new JSONObject();
            }

            return new JSONObject(body);

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Falha de comunicação com o Melhor Envio.",
                    exception);
        }
    }

    private Response executePost(Store store, String path, JSONObject payload)
            throws IOException {
        Response response = new OkHttpClient().newCall(buildPostRequest(
                path, payload, store.getMelhorEnvioAccessToken())).execute();

        if ((response.code() == 401 || response.code() == 403)
                && refreshAccessToken(store)) {
            response.close();
            response = new OkHttpClient().newCall(buildPostRequest(
                    path, payload, store.getMelhorEnvioAccessToken())).execute();
        }

        return response;
    }

    private Request buildPostRequest(String path, JSONObject payload, String accessToken) {
        return new Request.Builder()
                .url(apiBaseUrl() + path)
                .post(okhttp3.RequestBody.create(
                        payload.toString(),
                        MediaType.parse("application/json")))
                .addHeader("Authorization", "Bearer " + accessToken)
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/json")
                .addHeader("User-Agent", userAgent)
                .addHeader("me-buy-origin", "calculator-dash")
                .addHeader("me-buy-type", "simple")
                .build();
    }

    private boolean refreshAccessToken(Store store) throws IOException {
        if (StringUtils.isAnyBlank(
                clientId, clientSecret, store.getMelhorEnvioRefreshToken())) {
            return false;
        }

        Request refreshRequest = new Request.Builder()
                .url(apiBaseUrl() + "/oauth/token")
                .post(new FormBody.Builder()
                        .add("grant_type", "refresh_token")
                        .add("client_id", clientId)
                        .add("client_secret", clientSecret)
                        .add("refresh_token", store.getMelhorEnvioRefreshToken())
                        .build())
                .addHeader("Accept", "application/json")
                .addHeader("Content-Type", "application/x-www-form-urlencoded")
                .addHeader("User-Agent", userAgent)
                .build();

        try (Response response = new OkHttpClient().newCall(refreshRequest).execute()) {
            if (!response.isSuccessful() || response.body() == null) {
                return false;
            }

            JSONObject tokenResponse = new JSONObject(response.body().string());
            String accessToken = tokenResponse.optString("access_token", "");
            if (StringUtils.isBlank(accessToken)) {
                return false;
            }

            store.setMelhorEnvioAccessToken(accessToken);
            String refreshToken = tokenResponse.optString("refresh_token", "");
            if (StringUtils.isNotBlank(refreshToken)) {
                store.setMelhorEnvioRefreshToken(refreshToken);
            }
            storeDao.insertStore(store);
            return true;
        }
    }

    private boolean hasInvalidOriginPostalCodeError(String responseBody) {
        try {
            JSONObject errors = new JSONObject(responseBody).optJSONObject("errors");
            if (errors == null) {
                return false;
            }

            if (errors.has("from.postal_code")) {
                return true;
            }

            JSONObject fromErrors = errors.optJSONObject("from");
            return fromErrors != null && fromErrors.has("postal_code");
        } catch (RuntimeException exception) {
            return false;
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
