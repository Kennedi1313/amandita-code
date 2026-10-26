package com.amandita.store;

public record StoreUpdateRequest(
        String name,
        String taxDocument,
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
    public StoreUpdateRequest(
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
            java.util.List<DeliveryDistanceRange> deliveryDistanceRanges) {
        this(name, null, logoUrl, headerBackgroundColor, bannerUrl, bannerMobileUrl,
                iconUrl, instagram, whatsapp, pickupEnabled, pickupAddress,
                localDeliveryEnabled, localDeliveryFee, freeShippingMinAmount,
                shippingOriginZip, localDeliveryEta, deliveryDistanceRanges);
    }
}
