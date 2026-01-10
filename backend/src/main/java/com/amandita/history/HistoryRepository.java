package com.amandita.history;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;

@Transactional
public interface HistoryRepository extends JpaRepository<History, Integer> {
}
