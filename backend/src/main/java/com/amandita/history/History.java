package com.amandita.history;

import com.amandita.customer.Customer;
import com.amandita.product.Product;
import jakarta.persistence.*;

import java.util.Date;
import java.util.Objects;

@Entity
@Table(name = "history")
public class History {
    @Id
    @SequenceGenerator(
            name = "history_id_seq",
            sequenceName = "history_id_seq",
            allocationSize = 1
    )
    @GeneratedValue(
            strategy = GenerationType.SEQUENCE,
            generator = "history_id_seq"
    )
    private Integer id;

    @Column(
            nullable = false,
            columnDefinition="DATE"
    )
    private Date date;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    public History() {
    }

    public History(Integer id, Date date, Customer customer, Product product) {
        this.id = id;
        this.date = date;
        this.customer = customer;
        this.product = product;
    }

    public History(Date date, Customer customer, Product product) {
        this.date = date;
        this.customer = customer;
        this.product = product;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        History history = (History) o;
        return Objects.equals(id, history.id) && Objects.equals(date, history.date) && Objects.equals(customer, history.customer) && Objects.equals(product, history.product);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, date, customer, product);
    }
}
