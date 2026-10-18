package com.amandita.Sale;

import com.amandita.store.MercadoPagoOAuthService;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.amandita.store.StorePlan;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MercadoPagoCheckoutService {
    private final AsaasCheckoutService saleCheckout;
    private final SaleDao saleDao;
    private final StoreDao storeDao;
    private final MercadoPagoOAuthService mercadoPagoOAuthService;
    private final ObjectMapper objectMapper;
    private final String webhookUrl;
    private final String webhookSecret;
    private final String returnBaseUrl;
    private final String marketplaceFee;

    public MercadoPagoCheckoutService(AsaasCheckoutService saleCheckout, SaleDao saleDao, StoreDao storeDao,
                                      MercadoPagoOAuthService mercadoPagoOAuthService, ObjectMapper objectMapper,
                                      @Value("${mercadopago.webhook-url:}") String webhookUrl,
                                      @Value("${mercadopago.webhook-secret:}") String webhookSecret,
                                      @Value("${mercadopago.return-base-url:}") String returnBaseUrl,
                                      @Value("${mercadopago.marketplace-fee:}") String marketplaceFee) {
        this.saleCheckout = saleCheckout;
        this.saleDao = saleDao;
        this.storeDao = storeDao;
        this.mercadoPagoOAuthService = mercadoPagoOAuthService;
        this.objectMapper = objectMapper;
        this.webhookUrl = webhookUrl.replaceAll("/+$", "");
        this.webhookSecret = webhookSecret;
        this.returnBaseUrl = returnBaseUrl;
        this.marketplaceFee = marketplaceFee;
    }

    @Transactional(rollbackFor = Exception.class)
    public MercadoPagoCheckoutResponse createCheckout(MercadoPagoCheckoutRequest request, Long storeId,
                                                       String authenticatedEmail) {
        if (StringUtils.isBlank(webhookSecret) || StringUtils.isBlank(webhookUrl)
                || !webhookUrl.startsWith("https://")
                || !webhookUrl.endsWith("/api/v1/payment/mercadopago/webhook")) {
            throw new IllegalStateException("Configure MERCADOPAGO_WEBHOOK_URL (HTTPS público) e MERCADOPAGO_WEBHOOK_SECRET antes de habilitar o Checkout Pro.");
        }
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada."));
        if (store.getPlan() != StorePlan.COMPLETE) {
            throw new IllegalStateException("O plano Grátis aceita pedidos pelo WhatsApp, sem checkout online.");
        }
        if (StringUtils.isBlank(store.getMpAccessToken())) {
            throw new IllegalStateException("Conecte primeiro a conta Mercado Pago desta loja.");
        }
        if (request == null || request.saleRequest() == null) throw new IllegalArgumentException("Carrinho vazio.");

        Sale sale = saleCheckout.createPendingSaleForProvider(
                request.saleRequest(), storeId, authenticatedEmail, "MERCADO_PAGO");
        String baseUrl = storefrontBaseUrl(store);
        Map<String, Object> preference = new LinkedHashMap<>();
        preference.put("items", buildItems(sale));
        preference.put("external_reference", String.valueOf(sale.getId()));
        preference.put("notification_url", webhookUrl + "?store_id=" + storeId);
        OffsetDateTime expirationStart = OffsetDateTime.now(ZoneOffset.UTC);
        preference.put("expires", true);
        preference.put("expiration_date_from", expirationStart.toString());
        preference.put("expiration_date_to", expirationStart.plusHours(24).toString());
        preference.put("back_urls", Map.of(
                "success", baseUrl + "/success?provider=mercadopago&saleId=" + sale.getId() + "&payment=approved",
                "pending", baseUrl + "/success?provider=mercadopago&saleId=" + sale.getId() + "&payment=pending",
                "failure", baseUrl + "/checkout?payment=failed"
        ));
        preference.put("auto_return", "approved");
        preference.put("payer", Map.of("email", sale.getCustomer().getEmail()));
        preference.put("statement_descriptor", statementDescriptor(store.getName()));
        addMarketplaceFee(preference, sale);

        JsonNode body = objectMapper.valueToTree(preference);
        JsonNode response = mercadoPagoOAuthService.requestMerchantApi(
                storeId, "/checkout/preferences", "POST", body, "mp-sale-" + sale.getId());
        String preferenceId = response.path("id").asText(null);
        // O fluxo oficial de teste do Checkout Pro usa o init_point retornado pela preferência,
        // inclusive com credenciais de teste; sandbox_init_point não deve ser usado.
        String checkoutUrl = response.path("init_point").asText(null);
        if (StringUtils.isAnyBlank(preferenceId, checkoutUrl)) {
            throw new IllegalStateException("O Mercado Pago não retornou o link do Checkout Pro.");
        }
        sale.setPreferenceId(preferenceId);
        saleDao.insertSale(sale);
        return new MercadoPagoCheckoutResponse(sale.getId(), preferenceId, checkoutUrl);
    }

    private List<Map<String, Object>> buildItems(Sale sale) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (SaleItem item : sale.getSaleItems()) {
            String variation = item.getVariation() != null && item.getVariation().getOptions() != null
                    ? String.join(" / ", item.getVariation().getOptions().values()) : "";
            String title = StringUtils.isBlank(variation)
                    ? item.getProduct().getName()
                    : item.getProduct().getName() + " - " + variation;
            Map<String, Object> line = new LinkedHashMap<>();
            line.put("id", String.valueOf(item.getProduct().getId()));
            line.put("title", title);
            line.put("category_id", StringUtils.defaultIfBlank(item.getProduct().getCategory(), "others").trim());
            line.put("description", StringUtils.abbreviate(
                    StringUtils.defaultIfBlank(item.getProduct().getDescription(), title), 256));
            line.put("quantity", item.getQuantity());
            line.put("currency_id", "BRL");
            line.put("unit_price", reais(item.getPrice()));
            items.add(line);
        }
        int itemTotalCents = sale.getSaleItems().stream().mapToInt(item -> item.getPrice() * item.getQuantity()).sum();
        int totalCents = BigDecimal.valueOf(sale.getTotalPrice())
                .setScale(0, RoundingMode.HALF_UP).intValue();
        int shippingCents = totalCents - itemTotalCents;
        if (shippingCents > 0) {
            items.add(Map.of("id", "shipping", "title", "Entrega local", "category_id", "services",
                    "description", "Entrega local", "quantity", 1,
                    "currency_id", "BRL", "unit_price", reais(shippingCents)));
        }
        return items;
    }

    private void addMarketplaceFee(Map<String, Object> preference, Sale sale) {
        if (StringUtils.isBlank(marketplaceFee)) return;
        BigDecimal fee = new BigDecimal(marketplaceFee);
        BigDecimal total = BigDecimal.valueOf(sale.getTotalPrice())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (fee.signum() < 0 || fee.compareTo(total) > 0) {
            throw new IllegalStateException("MERCADOPAGO_MARKETPLACE_FEE deve estar entre zero e o valor da venda.");
        }
        preference.put("marketplace_fee", fee);
    }

    private BigDecimal reais(int cents) {
        return BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private String storefrontBaseUrl(Store store) {
        String configured = StringUtils.defaultIfBlank(returnBaseUrl, store.getDomain());
        if (StringUtils.isBlank(configured)) throw new IllegalStateException("Domínio da loja não configurado.");
        String base = configured.startsWith("http://") || configured.startsWith("https://")
                ? configured : "https://" + configured;
        URI uri = URI.create(base);
        if (uri.getHost() == null || ("https".equalsIgnoreCase(uri.getScheme()) == false
                && !"localhost".equalsIgnoreCase(uri.getHost()) && !"127.0.0.1".equals(uri.getHost()))) {
            throw new IllegalStateException("URL de retorno do checkout inválida.");
        }
        return base.replaceAll("/+$", "");
    }

    private String statementDescriptor(String storeName) {
        String safe = StringUtils.defaultIfBlank(storeName, "LOJA").replaceAll("[^A-Za-z0-9 ]", "").trim();
        return safe.length() > 13 ? safe.substring(0, 13) : safe;
    }
}
