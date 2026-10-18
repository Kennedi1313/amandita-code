package com.amandita.store;

import java.util.List;

public record StorePublicResponse(
        Long id,
        StorePlan plan,
        String name,
        String domain,
        String logoUrl,
        String headerBackgroundColor,
        String bannerUrl,
        String bannerMobileUrl,
        String iconUrl,
        boolean asaasConfigured,
        boolean mercadoPagoConfigured,
        String mercadoPagoPublicKey,
        boolean melhorEnvioConfigured,
        String instagram,
        String whatsapp,
        Boolean pickupEnabled,
        PickupAddress pickupAddress,
        Boolean localDeliveryEnabled,
        Integer localDeliveryFee,
        Integer freeShippingMinAmount,
        String shippingOriginZip,
        String localDeliveryEta,
        List<DeliveryDistanceRange> deliveryDistanceRanges,
        List<CategoryPublicResponse> categories
) {
    public static StorePublicResponse fromEntity(Store store) {
        return fromEntity(store, store.getMercadoPagoPublicKey());
    }

    public static StorePublicResponse fromEntity(Store store, String mercadoPagoPublicKey) {
        return fromEntity(store, mercadoPagoPublicKey, Boolean.TRUE.equals(store.getPickupEnabled()), true);
    }

    public static StorePublicResponse fromEntityForAdmin(Store store, String mercadoPagoPublicKey) {
        return fromEntity(store, mercadoPagoPublicKey, true, false);
    }

    private static StorePublicResponse fromEntity(
            Store store,
            String mercadoPagoPublicKey,
            boolean includePickupAddress,
            boolean applyPlanLimits) {
        boolean completePlan = !applyPlanLimits || store.getPlan() == StorePlan.COMPLETE;
        return new StorePublicResponse(
                store.getId(),
                store.getPlan(),
                store.getName(),
                store.getDomain(),
                store.getLogoUrl(),
                store.getHeaderBackgroundColor(),
                store.getBannerUrl(),
                store.getBannerMobileUrl(),
                store.getIconUrl(),
                completePlan && store.getAsaasWalletId() != null && !store.getAsaasWalletId().isBlank(),
                completePlan && store.getMpAccessToken() != null && !store.getMpAccessToken().isBlank(),
                completePlan ? mercadoPagoPublicKey : null,
                completePlan && store.getMelhorEnvioAccessToken() != null && !store.getMelhorEnvioAccessToken().isBlank(),
                store.getInstagram(),
                store.getWhatsapp(),
                store.getPickupEnabled(),
                includePickupAddress ? store.getPickupAddress() : null,
                completePlan && Boolean.TRUE.equals(store.getLocalDeliveryEnabled()),
                store.getLocalDeliveryFee(),
                store.getFreeShippingMinAmount(),
                store.getShippingOriginZip(),
                store.getLocalDeliveryEta(),
                !completePlan || store.getDeliveryDistanceRanges() == null
                        ? List.of() : store.getDeliveryDistanceRanges(),
                store.getCategories() == null
                        ? List.of()
                        : store.getCategories().stream()
                                .map(CategoryPublicResponse::fromEntity)
                                .toList()
        );
    }

    public record CategoryPublicResponse(
            Long id,
            String name,
            String path
    ) {
        public static CategoryPublicResponse fromEntity(Category category) {
            return new CategoryPublicResponse(
                    category.getId(),
                    category.getName(),
                    category.getPath()
            );
        }
    }
}
