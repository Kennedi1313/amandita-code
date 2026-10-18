package com.amandita.store;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "store")
public class Store {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(unique = true)
    private String domain;
    private String logoUrl;
    @Column(name = "header_background_color", nullable = false, length = 7)
    private String headerBackgroundColor = "#FFFFFF";
    private String bannerUrl;
    private String bannerMobileUrl;
    private String iconUrl;
    private String mercadoPagoSecretKey;
    private String mercadoPagoPublicKey;
    @Column(name = "mp_access_token", columnDefinition = "text")
    private String mpAccessToken;
    @Column(name = "mp_refresh_token", columnDefinition = "text")
    private String mpRefreshToken;
    @Column(name = "mp_subscription_id")
    private String mpSubscriptionId;
    @Column(name = "mp_subscription_status")
    private String mpSubscriptionStatus;
    @Column(name = "mp_subscription_init_point", columnDefinition = "text")
    private String mpSubscriptionInitPoint;
    @Column(name = "mp_subscription_next_payment_at")
    private OffsetDateTime mpSubscriptionNextPaymentAt;
    @Column(name = "mp_subscription_period_end")
    private OffsetDateTime mpSubscriptionPeriodEnd;
    @Column(name = "mp_subscription_last_payment_id")
    private String mpSubscriptionLastPaymentId;
    @Column(name = "mp_subscription_last_payment_status")
    private String mpSubscriptionLastPaymentStatus;
    @Column(name = "mp_subscription_ever_paid", nullable = false)
    private boolean mpSubscriptionEverPaid;
    private String asaasWalletId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StorePlan plan = StorePlan.FREE;

    private String melhorEnvioAccessToken;
    private String melhorEnvioRefreshToken;
    private String instagram;
    private String whatsapp;
    private Boolean pickupEnabled = true;
    @Type(JsonBinaryType.class)
    @Column(name = "pickup_address", columnDefinition = "jsonb")
    private PickupAddress pickupAddress;
    private Boolean localDeliveryEnabled = true;
    private Integer localDeliveryFee = 0;
    private Integer freeShippingMinAmount = 0;
    private String shippingOriginZip;
    private String localDeliveryEta;
    @Type(JsonBinaryType.class)
    @Column(name = "delivery_distance_ranges", columnDefinition = "jsonb")
    private List<DeliveryDistanceRange> deliveryDistanceRanges = new ArrayList<>();
    private java.sql.Timestamp createdAt;
    private java.sql.Timestamp updatedAt;

    @OneToMany(mappedBy = "store", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<Category> categories;

    public Store() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getHeaderBackgroundColor() {
        return headerBackgroundColor == null ? "#FFFFFF" : headerBackgroundColor;
    }

    public void setHeaderBackgroundColor(String headerBackgroundColor) {
        this.headerBackgroundColor = headerBackgroundColor;
    }

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
    }

    public String getBannerMobileUrl() {
        return bannerMobileUrl;
    }

    public void setBannerMobileUrl(String bannerMobileUrl) {
        this.bannerMobileUrl = bannerMobileUrl;
    }

    public String getIconUrl() {
        return iconUrl;
    }

    public void setIconUrl(String iconUrl) {
        this.iconUrl = iconUrl;
    }

    public String getMercadoPagoSecretKey() {
        return mercadoPagoSecretKey;
    }

    public void setMercadoPagoSecretKey(String mercadoPagoSecretKey) {
        this.mercadoPagoSecretKey = mercadoPagoSecretKey;
    }

    public String getMercadoPagoPublicKey() {
        return mercadoPagoPublicKey;
    }

    public void setMercadoPagoPublicKey(String mercadoPagoPublicKey) {
        this.mercadoPagoPublicKey = mercadoPagoPublicKey;
    }

    public String getMpAccessToken() { return mpAccessToken; }

    public void setMpAccessToken(String mpAccessToken) { this.mpAccessToken = mpAccessToken; }

    public String getMpRefreshToken() { return mpRefreshToken; }

    public void setMpRefreshToken(String mpRefreshToken) { this.mpRefreshToken = mpRefreshToken; }

    public String getMpSubscriptionId() { return mpSubscriptionId; }

    public void setMpSubscriptionId(String mpSubscriptionId) { this.mpSubscriptionId = mpSubscriptionId; }

    public String getMpSubscriptionStatus() { return mpSubscriptionStatus; }

    public void setMpSubscriptionStatus(String mpSubscriptionStatus) { this.mpSubscriptionStatus = mpSubscriptionStatus; }

    public String getMpSubscriptionInitPoint() { return mpSubscriptionInitPoint; }

    public void setMpSubscriptionInitPoint(String mpSubscriptionInitPoint) { this.mpSubscriptionInitPoint = mpSubscriptionInitPoint; }

    public OffsetDateTime getMpSubscriptionNextPaymentAt() { return mpSubscriptionNextPaymentAt; }

    public void setMpSubscriptionNextPaymentAt(OffsetDateTime mpSubscriptionNextPaymentAt) {
        this.mpSubscriptionNextPaymentAt = mpSubscriptionNextPaymentAt;
    }

    public OffsetDateTime getMpSubscriptionPeriodEnd() { return mpSubscriptionPeriodEnd; }

    public void setMpSubscriptionPeriodEnd(OffsetDateTime mpSubscriptionPeriodEnd) {
        this.mpSubscriptionPeriodEnd = mpSubscriptionPeriodEnd;
    }

    public String getMpSubscriptionLastPaymentId() { return mpSubscriptionLastPaymentId; }

    public void setMpSubscriptionLastPaymentId(String mpSubscriptionLastPaymentId) {
        this.mpSubscriptionLastPaymentId = mpSubscriptionLastPaymentId;
    }

    public String getMpSubscriptionLastPaymentStatus() { return mpSubscriptionLastPaymentStatus; }

    public void setMpSubscriptionLastPaymentStatus(String mpSubscriptionLastPaymentStatus) {
        this.mpSubscriptionLastPaymentStatus = mpSubscriptionLastPaymentStatus;
    }

    public boolean isMpSubscriptionEverPaid() { return mpSubscriptionEverPaid; }

    public void setMpSubscriptionEverPaid(boolean mpSubscriptionEverPaid) {
        this.mpSubscriptionEverPaid = mpSubscriptionEverPaid;
    }

    public String getAsaasWalletId() {
        return asaasWalletId;
    }

    public void setAsaasWalletId(String asaasWalletId) {
        this.asaasWalletId = asaasWalletId;
    }

    public StorePlan getPlan() {
        return plan == null ? StorePlan.FREE : plan;
    }

    public void setPlan(StorePlan plan) {
        this.plan = plan == null ? StorePlan.FREE : plan;
    }

    public String getMelhorEnvioAccessToken() {
        return melhorEnvioAccessToken;
    }

    public void setMelhorEnvioAccessToken(String melhorEnvioAccessToken) {
        this.melhorEnvioAccessToken = melhorEnvioAccessToken;
    }

    public String getMelhorEnvioRefreshToken() {
        return melhorEnvioRefreshToken;
    }

    public void setMelhorEnvioRefreshToken(String melhorEnvioRefreshToken) {
        this.melhorEnvioRefreshToken = melhorEnvioRefreshToken;
    }

    public String getInstagram() {
        return instagram;
    }

    public void setInstagram(String instagram) {
        this.instagram = instagram;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public void setWhatsapp(String whatsapp) {
        this.whatsapp = whatsapp;
    }

    public Boolean getPickupEnabled() {
        return pickupEnabled;
    }

    public void setPickupEnabled(Boolean pickupEnabled) {
        this.pickupEnabled = pickupEnabled;
    }

    public PickupAddress getPickupAddress() {
        return pickupAddress;
    }

    public void setPickupAddress(PickupAddress pickupAddress) {
        this.pickupAddress = pickupAddress;
    }

    public Boolean getLocalDeliveryEnabled() {
        return localDeliveryEnabled;
    }

    public void setLocalDeliveryEnabled(Boolean localDeliveryEnabled) {
        this.localDeliveryEnabled = localDeliveryEnabled;
    }

    public Integer getLocalDeliveryFee() {
        return localDeliveryFee;
    }

    public void setLocalDeliveryFee(Integer localDeliveryFee) {
        this.localDeliveryFee = localDeliveryFee;
    }

    public Integer getFreeShippingMinAmount() {
        return freeShippingMinAmount;
    }

    public void setFreeShippingMinAmount(Integer freeShippingMinAmount) {
        this.freeShippingMinAmount = freeShippingMinAmount;
    }

    public String getShippingOriginZip() {
        return shippingOriginZip;
    }

    public void setShippingOriginZip(String shippingOriginZip) {
        this.shippingOriginZip = shippingOriginZip;
    }

    public String getLocalDeliveryEta() {
        return localDeliveryEta;
    }

    public void setLocalDeliveryEta(String localDeliveryEta) {
        this.localDeliveryEta = localDeliveryEta;
    }

    public List<DeliveryDistanceRange> getDeliveryDistanceRanges() { return deliveryDistanceRanges; }

    public void setDeliveryDistanceRanges(List<DeliveryDistanceRange> deliveryDistanceRanges) {
        this.deliveryDistanceRanges = deliveryDistanceRanges == null ? new ArrayList<>() : deliveryDistanceRanges;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Timestamp getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Timestamp updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<Category> getCategories() {
        return categories;
    }

    public void setCategories(List<Category> categories) {
        this.categories = categories;
    }

    public String getOwnerDocument() {
        return "70388201410";
    }
}
