package com.amandita.store;

import java.util.List;

public interface CategoryDao {
    List<Category> getCategories();
    List<Category> getCategoriesByStore(Long storeId);
    Category addCategory(Long storeId, CategoryRequest request);
    Category updateCategory(Long storeId, Long categoryId, CategoryRequest request);
    void deleteCategory(Long storeId, Long categoryId);
}
