package com.amandita.store;

import java.util.List;

public interface CategoryDao {
    List<Category> getCategories();
    List<Category> getCategoriesByStore(Long storeId);
    Category addCategory(Long storeId, String name);
    Category updateCategory(Long storeId, Long categoryId, String name);
    void deleteCategory(Long storeId, Long categoryId);
}
