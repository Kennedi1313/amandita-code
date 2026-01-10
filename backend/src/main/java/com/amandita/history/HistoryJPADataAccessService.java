package com.amandita.history;

import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class HistoryJPADataAccessService implements HistoryDao {
    private final HistoryRepository historyRepository;

    public HistoryJPADataAccessService(HistoryRepository historyRepository) {
        this.historyRepository = historyRepository;
    }

    @Override
    public List<History> selectAllHistory() {
        return historyRepository.findAll();
    }

    @Override
    public History insertHistory(History history) {
        return historyRepository.save(history);
    }
}
