package com.amandita.store;

public record StoreUpdateRequest(
        String name,
        String logoUrl,
        String headerBackgroundColor,
        String bannerUrl,
        String bannerMobileUrl,
        String iconUrl,
        String instagram,
        String whatsapp,
        Boolean pickupEnabled,
        PickupAddress pickupAddress,
        Boolean localDeliveryEnabled,
        Integer localDeliveryFee,
        Integer freeShippingMinAmount,
        String shippingOriginZip,
        String localDeliveryEta,
        java.util.List<DeliveryDistanceRange> deliveryDistanceRanges
) {
}
