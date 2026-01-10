package com.amandita.s3;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "aws.s3.buckets")
public class S3Buckets {

    private String customer;
    private String product;

    public String getCustomer() {
        return customer;
    }

    public String getProduct() {
        return product;
    }

    public void setCustomer(String customer) {
        this.customer = customer;
    }

    public void setProduct(String product) {
        this.product = product;
    }
}
