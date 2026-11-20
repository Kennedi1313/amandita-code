package com.amandita.platformadmin;

import com.amandita.Sale.SaleRepository;
import com.amandita.customer.Customer;
import com.amandita.customer.CustomerRepository;
import com.amandita.store.Store;
import com.amandita.store.StoreRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZoneOffset;
import java.time.OffsetDateTime;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/platform-admin")
public class PlatformAdminController {
    private final StoreRepository storeRepository;
    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final PlatformAnalyticsService platformAnalyticsService;
    private final String accessToken;

    public PlatformAdminController(
            StoreRepository storeRepository,
            CustomerRepository customerRepository,
            SaleRepository saleRepository,
            PlatformAnalyticsService platformAnalyticsService,
            @Value("${platform-admin.access-token:}") String accessToken) {
        this.storeRepository = storeRepository;
        this.customerRepository = customerRepository;
        this.saleRepository = saleRepository;
        this.platformAnalyticsService = platformAnalyticsService;
        this.accessToken = accessToken;
    }

    @GetMapping("/overview")
    public PlatformOverview overview(
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-Platform-Admin-Token", required = false) String suppliedToken) {
        requirePlatformAdmin(suppliedToken);
        int periodDays = Math.max(7, Math.min(days, 90));
        LocalDate today = LocalDate.now(ZoneId.of("America/Fortaleza"));
        LocalDate startDate = today.minusDays(periodDays - 1L);
        LocalDateTime startAt = startDate.atStartOfDay();

        List<StoreSummary> stores = storeRepository.findAll().stream()
                .map(this::toSummary)
                .sorted(Comparator.comparing(StoreSummary::createdAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        long proStores = stores.stream().filter(store -> "COMPLETE".equals(store.plan())).count();
        long freeStores = stores.size() - proStores;
        long withMercadoPago = stores.stream().filter(StoreSummary::mercadoPagoConnected).count();
        long withAsaas = stores.stream().filter(StoreSummary::asaasConnected).count();
        long withMelhorEnvio = stores.stream().filter(StoreSummary::melhorEnvioConnected).count();
        long saleCount = stores.stream().mapToLong(StoreSummary::salesCount).sum();
        double salesRevenue = stores.stream().mapToDouble(StoreSummary::salesRevenue).sum();
        long storesCreatedInPeriod = stores.stream()
                .filter(store -> store.createdAt() != null)
                .map(store -> LocalDateTime.parse(store.createdAt().substring(0, 19)).toLocalDate())
                .filter(created -> !created.isBefore(startDate) && !created.isAfter(today))
                .count();
        long storesCreatedToday = stores.stream()
                .filter(store -> store.createdAt() != null)
                .map(store -> LocalDateTime.parse(store.createdAt().substring(0, 19)).toLocalDate())
                .filter(today::equals)
                .count();

        Map<LocalDate, DailySales> salesByDate = new HashMap<>();
        for (Object[] row : saleRepository.findPlatformDailySales(startAt)) {
            LocalDate date = row[0] instanceof java.sql.Date sqlDate
                    ? sqlDate.toLocalDate()
                    : LocalDate.parse(row[0].toString());
            salesByDate.put(date, new DailySales(
                    ((Number) row[1]).longValue(),
                    ((Number) row[2]).longValue(),
                    ((Number) row[3]).doubleValue()
            ));
        }
        List<DailyMetric> dailySales = startDate.datesUntil(today.plusDays(1))
                .map(date -> {
                    DailySales sales = salesByDate.getOrDefault(date, new DailySales(0, 0, 0));
                    return new DailyMetric(date.toString(), sales.orders(), sales.confirmedOrders(), sales.confirmedRevenue());
                })
                .toList();
        List<DailyMetric> storeGrowth = startDate.datesUntil(today.plusDays(1))
                .map(date -> new DailyMetric(date.toString(), stores.stream()
                        .filter(store -> store.createdAt() != null)
                        .map(store -> LocalDateTime.parse(store.createdAt().substring(0, 19)).toLocalDate())
                        .filter(date::equals)
                        .count(), 0, 0))
                .toList();

        return new PlatformOverview(stores.size(), proStores, freeStores, withMercadoPago,
                withAsaas, withMelhorEnvio, saleCount, salesRevenue, saleRepository.countBySaleDateAfter(startAt),
                saleRepository.sumConfirmedSalesSince(startAt),
                saleRepository.countStoresWithConfirmedSaleSince(startAt),
                storesCreatedInPeriod, storesCreatedToday,
                saleRepository.countByStatus("PENDENTE"), saleRepository.countByStatus("APROVADO"),
                saleRepository.countByStatus("CANCELADO"), saleRepository.countByStatus("RECUSADO"),
                periodDays, dailySales, storeGrowth, platformAnalyticsService.getReport(periodDays), stores);
    }

    @GetMapping("/stores/{storeId}")
    public StoreDetail storeDetail(
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-Platform-Admin-Token", required = false) String suppliedToken) {
        requirePlatformAdmin(suppliedToken);
        int periodDays = Math.max(7, Math.min(days, 90));
        LocalDate today = LocalDate.now(ZoneId.of("America/Fortaleza"));
        LocalDate startDate = today.minusDays(periodDays - 1L);
        LocalDateTime startAt = startDate.atStartOfDay();
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loja não encontrada."));
        StoreSummary summary = toSummary(store);
        Map<LocalDate, DailySales> salesByDate = new HashMap<>();
        for (Object[] row : saleRepository.findPlatformDailyStoreSales(startAt, storeId)) {
            LocalDate date = row[0] instanceof java.sql.Date sqlDate
                    ? sqlDate.toLocalDate()
                    : LocalDate.parse(row[0].toString());
            salesByDate.put(date, new DailySales(
                    ((Number) row[1]).longValue(),
                    ((Number) row[2]).longValue(),
                    ((Number) row[3]).doubleValue()
            ));
        }
        List<DailyMetric> salesTrend = startDate.datesUntil(today.plusDays(1))
                .map(date -> {
                    DailySales sales = salesByDate.getOrDefault(date, new DailySales(0, 0, 0));
                    return new DailyMetric(date.toString(), sales.orders(), sales.confirmedOrders(), sales.confirmedRevenue());
                })
                .toList();
        List<RecentOrder> recentOrders = saleRepository
                .findTop10ByStore_IdOrderBySaleDateDesc(storeId)
                .stream()
                .map(sale -> new RecentOrder(
                        sale.getId(),
                        sale.getSaleDate(),
                        sale.getStatus(),
                        sale.getPaymentMethod()
                ))
                .toList();

        return new StoreDetail(
                summary,
                store.getMpSubscriptionStatus(),
                store.isMpSubscriptionEverPaid(),
                store.getMpSubscriptionLastPaidAt(),
                store.getMpSubscriptionNextPaymentAt(),
                saleRepository.countByStore_IdAndStatus(storeId, "PENDENTE"),
                saleRepository.countByStore_IdAndStatus(storeId, "APROVADO"),
                saleRepository.countByStore_IdAndStatus(storeId, "PREPARANDO"),
                saleRepository.countByStore_IdAndStatus(storeId, "ENVIADO"),
                saleRepository.countByStore_IdAndStatus(storeId, "ENTREGUE"),
                saleRepository.countByStore_IdAndStatus(storeId, "CANCELADO"),
                saleRepository.countByStore_IdAndStatus(storeId, "RECUSADO"),
                saleRepository.countByStore_IdAndSaleDateAfter(storeId, startAt),
                saleRepository.sumConfirmedSalesSinceForStore(startAt, storeId),
                periodDays,
                salesTrend,
                recentOrders
        );
    }

    private void requirePlatformAdmin(String suppliedToken) {
        if (accessToken == null || accessToken.length() < 32) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "O acesso ao admin da plataforma não está configurado.");
        }
        if (suppliedToken == null || suppliedToken.isBlank()
                || !MessageDigest.isEqual(
                        accessToken.getBytes(StandardCharsets.UTF_8),
                        suppliedToken.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Acesso não autorizado.");
        }
    }

    private StoreSummary toSummary(Store store) {
        Customer owner = customerRepository.findFirstByOwnedStoreId(store.getId()).orElse(null);
        Double revenue = saleRepository.sumTotalPriceByStoreId(store.getId());
        return new StoreSummary(
                store.getId(),
                store.getName(),
                store.getDomain(),
                store.getPlan().name(),
                owner == null ? null : owner.getName(),
                owner == null ? null : owner.getEmail(),
                store.getCreatedAt() == null ? null : store.getCreatedAt().toInstant().atOffset(ZoneOffset.UTC).toString(),
                store.getMpAccessToken() != null && !store.getMpAccessToken().isBlank(),
                store.getAsaasWalletId() != null && !store.getAsaasWalletId().isBlank(),
                store.getMelhorEnvioAccessToken() != null && !store.getMelhorEnvioAccessToken().isBlank(),
                Boolean.TRUE.equals(store.getPickupEnabled()),
                Boolean.TRUE.equals(store.getLocalDeliveryEnabled()),
                store.getLocalDeliveryFee() == null ? 0 : store.getLocalDeliveryFee(),
                store.getFreeShippingMinAmount() == null ? 0 : store.getFreeShippingMinAmount(),
                store.getLocalDeliveryEta(),
                store.getPickupAddress() != null,
                saleRepository.countByStore_Id(store.getId()),
                revenue == null ? 0 : revenue
        );
    }

    public record StoreSummary(
            Long id,
            String name,
            String domain,
            String plan,
            String ownerName,
            String ownerEmail,
            String createdAt,
            boolean mercadoPagoConnected,
            boolean asaasConnected,
            boolean melhorEnvioConnected,
            boolean pickupEnabled,
            boolean localDeliveryEnabled,
            int localDeliveryFee,
            int freeShippingMinAmount,
            String localDeliveryEta,
            boolean pickupAddressConfigured,
            long salesCount,
            double salesRevenue
    ) {}

    public record PlatformOverview(
            long totalStores,
            long completeStores,
            long freeStores,
            long mercadoPagoStores,
            long asaasStores,
            long melhorEnvioStores,
            long totalSales,
            double grossSales,
            long salesInPeriod,
            double confirmedRevenueInPeriod,
            long activeStoresInPeriod,
            long storesCreatedInPeriod,
            long storesCreatedToday,
            long pendingSales,
            long approvedSales,
            long cancelledSales,
            long rejectedSales,
            int periodDays,
            List<DailyMetric> salesTrend,
            List<DailyMetric> storeGrowthTrend,
            PlatformAnalyticsService.AnalyticsReport analytics,
            List<StoreSummary> stores
    ) {}

    public record StoreDetail(
            StoreSummary store,
            String mercadoPagoSubscriptionStatus,
            boolean subscriptionEverPaid,
            OffsetDateTime lastSubscriptionPaymentAt,
            OffsetDateTime nextSubscriptionPaymentAt,
            long pendingOrders,
            long approvedOrders,
            long preparingOrders,
            long shippedOrders,
            long deliveredOrders,
            long cancelledOrders,
            long rejectedOrders,
            long ordersInPeriod,
            double confirmedRevenueInPeriod,
            int periodDays,
            List<DailyMetric> salesTrend,
            List<RecentOrder> recentOrders
    ) {}

    public record RecentOrder(Long id, LocalDateTime date, String status, String paymentMethod) {}

    public record DailyMetric(String date, long count, long confirmedCount, double confirmedRevenue) {}

    private record DailySales(long orders, long confirmedOrders, double confirmedRevenue) {}
}
