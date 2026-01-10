package com.amandita.Sale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class SaleJPADataAccessService implements SaleDao {
    private final SaleRepository saleRepository;

    public SaleJPADataAccessService(SaleRepository saleRepository) {
        this.saleRepository = saleRepository;
    }

    @Override
    public Page<Sale> selectAllSales(int page, int size, Long storeId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return saleRepository.findByExcludedStatus("PENDENTE", storeId, pageable);
    }

    @Override
    public Sale insertSale(Sale sale) {
        return this.saleRepository.save(sale);
    }

    public Optional<Sale> findById(Long id) {
        return this.saleRepository.findById(id);
    }

    public Page<Sale> findByUserEmail(String email) {
        Pageable pageable = PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "id"));
        return this.saleRepository.findAllByUserEmail(email, pageable);
    }
}
