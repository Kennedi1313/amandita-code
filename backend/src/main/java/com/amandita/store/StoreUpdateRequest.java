package com.amandita.store;

public record StoreUpdateRequest(
        String name,
        String logoUrl,
        String bannerUrl,
        String iconUrl,
        String instagram,
        String whatsapp,
        Boolean pickupEnabled,
        Boolean localDeliveryEnabled,
        Integer localDeliveryFee,
        Integer freeShippingMinAmount,
        String shippingOriginZip,
        String localDeliveryEta
) {
}
