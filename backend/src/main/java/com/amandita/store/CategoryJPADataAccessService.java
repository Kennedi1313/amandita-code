package com.amandita.store;

import com.amandita.exception.DuplicateResourceException;
import com.amandita.exception.ResourceConflictException;
import com.amandita.exception.ResourceNotFoundException;
import com.amandita.product.ProductRepository;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Repository;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Repository
public class CategoryJPADataAccessService implements CategoryDao {
    public CategoryRepository categoryRepository;
    private final StoreDao storeDao;
    private final ProductRepository productRepository;

    public CategoryJPADataAccessService (CategoryRepository categoryRepository, StoreDao storeDao, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.storeDao = storeDao;
        this.productRepository = productRepository;
    }
    @Override
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @Override
    public List<Category> getCategoriesByStore(Long storeId) {
        return categoryRepository.findAllByStoreId(storeId);
    }

    @Override
    public Category addCategory(Long storeId, String name) {
        Store store = storeDao.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("Loja não identificada"));
        String cleanName = validateName(name);
        assertUniqueName(storeId, cleanName, null);

        Category category = new Category();
        category.setName(cleanName);
        category.setPath(toPath(cleanName));
        category.setStore(store);
        return categoryRepository.save(category);
    }

    @Override
    public Category updateCategory(Long storeId, Long categoryId, String name) {
        Category category = findStoreCategory(storeId, categoryId);
        String cleanName = validateName(name);
        assertUniqueName(storeId, cleanName, categoryId);

        String oldSlug = category.getPath() != null
                ? category.getPath().substring(category.getPath().lastIndexOf("/") + 1)
                : null;
        String newPath = toPath(cleanName);
        String newSlug = newPath.substring(newPath.lastIndexOf("/") + 1);

        category.setName(cleanName);
        category.setPath(newPath);
        Category saved = categoryRepository.save(category);

        if (StringUtils.isNotBlank(oldSlug) && !oldSlug.equals(newSlug)) {
            productRepository.updateCategoryByStore(storeId, oldSlug, newSlug);
        }

        return saved;
    }

    @Override
    public void deleteCategory(Long storeId, Long categoryId) {
        Category category = findStoreCategory(storeId, categoryId);
        String slug = category.getPath() != null
                ? category.getPath().substring(category.getPath().lastIndexOf("/") + 1)
                : null;
        if (StringUtils.isNotBlank(slug) && productRepository.existsByStoreIdAndCategory(storeId, slug)) {
            throw new ResourceConflictException("Não é possível remover uma categoria que possui produtos.");
        }
        categoryRepository.delete(category);
    }

    private Category findStoreCategory(Long storeId, Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada."));
        if (category.getStore() == null || !storeId.equals(category.getStore().getId())) {
            throw new ResourceNotFoundException("Categoria não encontrada nesta loja.");
        }
        return category;
    }

    private String validateName(String name) {
        if (StringUtils.isBlank(name)) {
            throw new IllegalArgumentException("Nome da categoria não pode ser vazio.");
        }
        return name.trim();
    }

    private void assertUniqueName(Long storeId, String name, Long currentCategoryId) {
        List<Category> categories = categoryRepository.findAllByStoreId(storeId);
        boolean duplicated = categories.stream().anyMatch(category ->
                !category.getId().equals(currentCategoryId)
                        && category.getName() != null
                        && category.getName().equalsIgnoreCase(name)
        );
        if (duplicated) {
            throw new DuplicateResourceException("Já existe uma categoria com esse nome.");
        }
    }

    private String toPath(String name) {
        String slug = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return "/products/" + slug;
    }
}
