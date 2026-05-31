package com.amandita.store;

import java.util.List;

public record StorePublicResponse(
        Long id,
        String name,
        String domain,
        String logoUrl,
        String bannerUrl,
        String iconUrl,
        String mercadoPagoPublicKey,
        String instagram,
        String whatsapp,
        Boolean pickupEnabled,
        Boolean localDeliveryEnabled,
        Integer localDeliveryFee,
        Integer freeShippingMinAmount,
        String shippingOriginZip,
        String localDeliveryEta,
        List<CategoryPublicResponse> categories
) {
    public static StorePublicResponse fromEntity(Store store) {
        return new StorePublicResponse(
                store.getId(),
                store.getName(),
                store.getDomain(),
                store.getLogoUrl(),
                store.getBannerUrl(),
                store.getIconUrl(),
                store.getMercadoPagoPublicKey(),
                store.getInstagram(),
                store.getWhatsapp(),
                store.getPickupEnabled(),
                store.getLocalDeliveryEnabled(),
                store.getLocalDeliveryFee(),
                store.getFreeShippingMinAmount(),
                store.getShippingOriginZip(),
                store.getLocalDeliveryEta(),
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
