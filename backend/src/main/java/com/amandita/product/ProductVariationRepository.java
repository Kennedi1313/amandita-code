package com.amandita.product;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
@Transactional
public interface ProductVariationRepository extends JpaRepository<ProductVariation, Integer> {}
