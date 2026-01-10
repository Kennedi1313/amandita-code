package com.amandita.Sale;

import com.amandita.customer.Address;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerDao;
import com.amandita.product.Product;
import com.amandita.product.ProductDao;
import com.amandita.store.Store;
import com.amandita.store.StoreDao;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.common.AddressRequest;
import com.mercadopago.client.common.IdentificationRequest;
import com.mercadopago.client.common.PhoneRequest;
import com.mercadopago.client.payment.*;
import com.mercadopago.client.preference.*;
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class CheckoutProService {
    private final ProductDao productDao;
    private final SaleDao saleDao;
    private final CustomerDao customerDao;
    private final StoreDao storeDao;

    public CheckoutProService(ProductDao productDao, SaleDao saleDao, CustomerDao customerDao, StoreDao storeDao) {
        this.productDao = productDao;
        this.saleDao = saleDao;
        this.customerDao = customerDao;
        this.storeDao = storeDao;
    }

    private static void updateSale(SaleRequest request, Sale sale, double totalPrice, List<SaleItem> saleItems, Customer customer, Store store) {
        sale.setTotalPrice(totalPrice);
        sale.setSaleItems(saleItems);
        sale.setCustomer(customer);
        sale.setShipment(!Objects.equals(request.getShippingFee(), BigDecimal.ZERO));
        sale.setPaymentMethod(request.getPaymentMethod());
        sale.setStore(store);
    }

    private static SaleItem getSaleItem(SaleItemRequest item, Sale sale, Product product, int unitePrice) {
        SaleItem saleItem = new SaleItem();
        saleItem.setSale(sale);
        saleItem.setProduct(product);
        saleItem.setQuantity(item.getQuantity());
        saleItem.setPrice(unitePrice);
        return saleItem;
    }

    private static PaymentPayerAddressRequest getAddressRequest(Address address) {
        return PaymentPayerAddressRequest.builder()
                .zipCode(address.getZip())
                .streetName(address.getStreet())
                .streetNumber(String.valueOf(address.getNumber()))
                .build();
    }

    private static PaymentPayerRequest getPaymentPayerRequest(Customer customer, PaymentPayerAddressRequest addressRequest) {
        String[] name = customer.getName().split(" ");
        return PaymentPayerRequest.builder()
                .email(customer.getEmail())
                .firstName(name[0])
                .lastName(name.length > 1 ? name[1] : "none")
                .phone(PaymentPayerPhoneRequest.builder()
                        .areaCode(customer.getPhone().substring(0, 4))
                        .number(customer.getPhone().substring(4)).build())
                .identification(IdentificationRequest.builder()
                        .type("CPF")
                        .number(customer.getCpf()).build())
                .address(addressRequest).build();
    }

    public ResponseEntity<Payment> createPaymentForCreditCard(PaymentRequestForCreditCard request, long storeId) throws MPException, MPApiException {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));

        MercadoPagoConfig.setAccessToken(store.getMercadoPagoSecretKey());
        PaymentClient client = new PaymentClient();
        String idempotencyKey = UUID.randomUUID().toString();
        Map<String, String> customHeaders = new HashMap<>();
        customHeaders.put("x-idempotency-key", idempotencyKey);
        MPRequestOptions requestOptions = MPRequestOptions.builder()
                .customHeaders(customHeaders)
                .build();

        Sale sale = new Sale();
        List<SaleItem> saleItems = new ArrayList<>();
        double totalPrice = 0.0;
        for (SaleItemRequest item : request.getSaleRequest().getSaleItemRequests()) {
            Product product = productDao.selectProductById(item.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado: " + item.getProductId()));

            if (product.getQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException("Estoque insuficiente para " + product.getName());
            }
            boolean hasPromo = product.getPromo() != null && product.getPromo() > 0;
            double unitePrice = hasPromo ?
                    (product.getPrice() * ( 1 - (product.getPromo() / 100.00))) :
                    product.getPrice();
            unitePrice = unitePrice / 100;
            saleItems.add(getSaleItem(item, sale, product, (int) unitePrice));
            totalPrice += unitePrice * item.getQuantity();
        }

        if (totalPrice + request.getSaleRequest().getShippingFee().doubleValue() / 100 != request.getTransactionAmount().doubleValue()) {
            throw new IllegalArgumentException("Erro ao calcular o valor total da compra. Valor calculado: " + totalPrice + " - Valor obtido: " + request.getTransactionAmount().doubleValue());
        }

        PaymentPayerRequest payerRequest = null;
        Customer customer = customerDao.selectUserByEmailByStore(request.getSaleRequest().getCustomerEmail(), storeId).orElse(null);
        if (customer != null) {
            Address address = customer.getAddresses().stream().findFirst().orElse(null);
            PaymentPayerAddressRequest addressRequest = null;
            if (address != null) {
                addressRequest = getAddressRequest(address);
            }
            payerRequest = getPaymentPayerRequest(customer, addressRequest);
        }

        updateSale(request.getSaleRequest(), sale, totalPrice, saleItems, customer, store);
        saleDao.insertSale(sale);

        PaymentCreateRequest paymentCreateRequest = PaymentCreateRequest.builder()
                .transactionAmount(request.getTransactionAmount())
                .token(request.getToken())
                .description(request.getDescription())
                .installments(request.getInstallments())
                .paymentMethodId(request.getPaymentMethodId())
                .issuerId(request.getIssuerId())
                .payer(payerRequest)
                .notificationUrl("https://api." + store.getDomain() + "/api/v1/payment/webhook?source_news=webhooks")
                .binaryMode(true)
                .statementDescriptor(store.getName())
                .externalReference(String.valueOf(sale.getId()))
                .build();

        Payment response = client.create(paymentCreateRequest, requestOptions);

        sale.setPaymentId(String.valueOf(response.getId()));
        saleDao.insertSale(sale);

        return ResponseEntity.ok(response);
    }

    public ResponseEntity<Payment> createPaymentForPix(PaymentRequestForPix request, long storeId) throws MPException, MPApiException {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));

        MercadoPagoConfig.setAccessToken(store.getMercadoPagoSecretKey());
        PaymentClient client = new PaymentClient();
        String idempotencyKey = UUID.randomUUID().toString();
        Map<String, String> customHeaders = new HashMap<>();
        customHeaders.put("x-idempotency-key", idempotencyKey);
        MPRequestOptions requestOptions = MPRequestOptions.builder()
                .customHeaders(customHeaders)
                .build();

        Sale sale = new Sale();
        List<SaleItem> saleItems = new ArrayList<>();
        double totalPrice = 0.0;
        for (SaleItemRequest item : request.getSaleRequest().getSaleItemRequests()) {
            Product product = productDao.selectProductById(item.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Produto não encontrado: " + item.getProductId()));

            if (product.getQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException("Estoque insuficiente para " + product.getName());
            }
            boolean hasPromo = product.getPromo() != null && product.getPromo() > 0;

            double unitePrice = hasPromo ?
                    (product.getPrice() * ( 1 - (product.getPromo() / 100.00))) :
                    product.getPrice();

            unitePrice = unitePrice / 100;
            saleItems.add(getSaleItem(item, sale, product, (int) unitePrice));
            totalPrice += unitePrice * item.getQuantity();
        }

        if (totalPrice + request.getSaleRequest().getShippingFee().doubleValue() / 100 != request.getTransactionAmount().doubleValue()) {
            throw new IllegalArgumentException("Erro ao calcular o valor total da compra. Valor calculado: " + totalPrice + " - Valor obtido: " + request.getTransactionAmount().doubleValue());
        }

        PaymentPayerRequest payerRequest = null;
        Customer customer = customerDao.selectUserByEmailByStore(request.getSaleRequest().getCustomerEmail(), storeId).orElse(null);
        if (customer != null) {
            Address address = customer.getAddresses().stream().findFirst().orElse(null);
            PaymentPayerAddressRequest addressRequest = null;
            if (address != null) {
                addressRequest = getAddressRequest(address);
            }
            payerRequest = getPaymentPayerRequest(customer, addressRequest);
        }

        updateSale(request.getSaleRequest(), sale, totalPrice, saleItems, customer, store);
        saleDao.insertSale(sale);

        PaymentCreateRequest paymentCreateRequest = PaymentCreateRequest.builder()
                .transactionAmount(request.getTransactionAmount())
                .paymentMethodId(request.getPaymentMethodId())
                .payer(payerRequest)
                .notificationUrl("https://api." + store.getDomain() + "/api/v1/payment/webhook?source_news=webhooks")
                .binaryMode(true)
                .statementDescriptor("Amandita Pratas")
                .externalReference(String.valueOf(sale.getId()))
                .build();
        Payment response = client.create(paymentCreateRequest, requestOptions);

        return ResponseEntity.ok(response);
    }

    public void processPayment(String payload, Long storeId) throws JsonProcessingException, MPException, MPApiException {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(payload);
        String type = jsonNode.get("type").asText();

        if ("payment".equals(type)) {
            MercadoPagoConfig.setAccessToken(store.getMercadoPagoSecretKey());
            String paymentId = jsonNode.get("data").get("id").asText();
            PaymentClient paymentClient = new PaymentClient();
            System.out.println("Payment id: " + paymentId);
            Payment payment = paymentClient.get(Long.valueOf(paymentId));

            if (payment != null) {
                String paymentStatus = payment.getStatus();
                Sale sale = saleDao.findById(Long.valueOf(payment.getExternalReference()))
                        .orElseThrow(() -> new IllegalArgumentException("Nenhuma venda encontrada: " + paymentId));
                if (sale != null) {
                    sale.setStatus("approved".equals(paymentStatus) ? "APROVADO" : "RECUSADO");
                    sale.setPaymentId(paymentId);
                    saleDao.insertSale(sale);
                    sale.getSaleItems()
                            .forEach(saleItem -> {
                                saleItem.getProduct().updateQuantity(saleItem.getQuantity());
                                productDao.updateProduct(saleItem.getProduct());
                            });
                System.out.println("Payment with paymentID " + paymentId + " had its status updated to: " + paymentStatus);
                } else {
                    System.err.println("No sale found for payment ID: " + paymentId);
                }
            } else {
                System.err.println("Payment not found for ID: " + paymentId);
            }
        }
    }

    public ResponseEntity<String> getPaymentStatus(Long paymentId, Long storeId) throws MPException, MPApiException {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));

        MercadoPagoConfig.setAccessToken(store.getMercadoPagoSecretKey());
        PaymentClient paymentClient = new PaymentClient();
        Payment payment = paymentClient.get(paymentId);
        return ResponseEntity.ok(payment.getStatus());
    }

    private Integer parseBrazilianPrice(String priceStr) {
        if (priceStr == null || priceStr.isBlank()) {
            return 0;
        }

        String cleaned = priceStr.replaceAll("[^0-9,]", "");
        if (cleaned.contains(",")) {
            String[] parts = cleaned.split(",");
            String inteiro = parts[0];
            String decimal = parts.length > 1 ? parts[1] : "0";
            if (decimal.length() == 1) decimal += "0";
            if (decimal.length() > 2) decimal = decimal.substring(0, 2);

            return Integer.parseInt(inteiro + decimal);
        }
        return Integer.parseInt(cleaned) * 100;
    }
}
