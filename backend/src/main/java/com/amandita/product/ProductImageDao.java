package com.amandita.product;

import java.util.List;

public interface ProductImageDao {
    public List<String> getImageIdsByProductId(Integer productId);
}
