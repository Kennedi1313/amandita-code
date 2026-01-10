package com.amandita.store;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class CategoryJPADataAccessService implements CategoryDao {
    public CategoryRepository categoryRepository;

    public CategoryJPADataAccessService (CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    @Override
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @Override
    public List<Category> getCategoriesByStore(Long storeId) {
        return categoryRepository.findAllByStoreId(storeId);
    }
}
