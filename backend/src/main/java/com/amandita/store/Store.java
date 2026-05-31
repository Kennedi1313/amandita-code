package com.amandita.store;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.sql.Timestamp;
import java.util.List;

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
    private String bannerUrl;
    private String iconUrl;
    private String mercadoPagoSecretKey;
    private String mercadoPagoPublicKey;

    private String melhorEnvioAccessToken;
    private String melhorEnvioRefreshToken;
    private String instagram;
    private String whatsapp;
    private Boolean pickupEnabled = true;
    private Boolean localDeliveryEnabled = true;
    private Integer localDeliveryFee = 0;
    private Integer freeShippingMinAmount = 0;
    private String shippingOriginZip;
    private String localDeliveryEta;
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

    public String getBannerUrl() {
        return bannerUrl;
    }

    public void setBannerUrl(String bannerUrl) {
        this.bannerUrl = bannerUrl;
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
}
