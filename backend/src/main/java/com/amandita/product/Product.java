package com.amandita.product;

import com.amandita.store.Store;
import jakarta.persistence.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "product")
public class Product {
    @Id
    @SequenceGenerator(
            name = "product_id_seq",
            sequenceName = "product_id_seq",
            allocationSize = 1
    )
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "product_id_seq"
    )
    private Integer id;

    @Column(
            nullable = false
    )
    private String name;

    @Column(
            nullable = false
    )
    private String description;

    @Column(
            nullable = false
    )
    private Integer originalPrice;

    @Column(
            nullable = false
    )
    private Integer price;

    @Column(
            nullable = false
    )
    private Integer quantity;

    @Column(
            nullable = false
    )
    private String category;

    @Column(
            unique = true, name = "image_id"
    )
    private String profileImageId;
    private Integer promo;
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductImage> images = new HashSet<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ProductVariation> variations = new HashSet<>();

    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    public Product(Integer id, String name, String description, Integer originalPrice, Integer price, Integer quantity, String category, Integer promo) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.originalPrice = originalPrice;
        this.price = price;
        this.quantity = quantity;
        this.category = category;
        this.promo = promo;
    }

    public Product(Integer id, String name, String description, Integer originalPrice, Integer price, Integer quantity, String category, String profileImageId, Integer promo) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.originalPrice = originalPrice;
        this.price = price;
        this.quantity = quantity;
        this.category = category;
        this.profileImageId = profileImageId;
        this.promo = promo;
    }

    public Product(String name, String description, Integer originalPrice, Integer price, Integer quantity, String category, String profileImageId, Integer promo) {
        this.name = name;
        this.description = description;
        this.originalPrice = originalPrice;
        this.price = price;
        this.quantity = quantity;
        this.category = category;
        this.profileImageId = profileImageId;
        this.promo = promo;
    }

    public Product() {

    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(Integer originalPrice) {
        this.originalPrice = originalPrice;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void updateQuantity(Integer quantity) { this.quantity = Math.max(this.quantity - quantity, 0);}

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getprofileImageId() {
        return profileImageId;
    }

    public void setprofileImageId(String profileImageId) {
        this.profileImageId = profileImageId;
    }

    public Integer getPromo() {
        return promo;
    }

    public void setPromo(Integer promo) {
        this.promo = promo;
    }


    public Store getStore() {
        return store;
    }

    public void setStore(Store store) {
        this.store = store;
    }

    public Set<ProductImage> getImages() {
        return images;
    }

    public void setImages(Set<ProductImage> images) {
        this.images = images;
    }

    public void addImage(ProductImage image) {
        images.add(image);
        image.setProduct(this);
    }

    public void removeImage(ProductImage image) {
        images.remove(image);
        image.setProduct(null);
    }

    public String getProfileImageId() {
        return profileImageId;
    }

    public void setProfileImageId(String profileImageId) {
        this.profileImageId = profileImageId;
    }

    public Set<ProductVariation> getVariations() {
        return variations;
    }

    public void setVariations(Set<ProductVariation> variations) {
        this.variations = variations;
    }
}
