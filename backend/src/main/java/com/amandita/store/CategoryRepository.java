package com.amandita.store;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

@Transactional
public interface CategoryRepository extends JpaRepository<Category, Long> {
    @Override
    List<Category> findAll();

    @Query("select c from Category c where c.store.id = ?1")
    List<Category> findAllByStoreId(Long storeId);
}
