package com.amandita.store;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("api/v1/store")
public class StoreController {

    private final StoreDao storeDao;
    private final CategoryDao categoryDao;

    public StoreController(StoreDao storeDao, CategoryDao categoryDao) {
        this.storeDao = storeDao;
        this.categoryDao = categoryDao;
    }
    @GetMapping("/info")
    public ResponseEntity<Store> getStoreInfo(HttpServletRequest request) {
        Store store = storeDao.findById( (Long) request.getAttribute("storeId"))
                .orElseThrow(() -> new IllegalArgumentException("Loja nao identificada"));
        if (store == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(store);
    }

    @GetMapping("/categories")
    public List<Category> getCategoriesByStore(HttpServletRequest request) {
        return categoryDao.getCategoriesByStore((Long) request.getAttribute("storeId"));
    }

    @GetMapping("/categories/no-store")
    public List<Category> getCategories() {
        return categoryDao.getCategories();
    }
}
