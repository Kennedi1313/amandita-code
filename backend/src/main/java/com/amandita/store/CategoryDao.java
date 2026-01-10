package com.amandita.store;

import java.util.List;

public interface CategoryDao {
    List<Category> getCategories();
    List<Category> getCategoriesByStore(Long storeId);
}
