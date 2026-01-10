package com.amandita.store;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StoreService {
    @Autowired
    private StoreRepository storeRepository;
    @Autowired
    private CategoryRepository categoryRepository;

    public Store getStoreByDomain(String domain) {
        return storeRepository.findByDomain(domain)
                .orElseThrow(() -> new IllegalArgumentException("Loja não encontrada para o domínio: " + domain));
    }

    public List<Category> getCategories() {
         return categoryRepository.findAll();
    }
}