package com.amandita.history;

import org.springframework.stereotype.Service;

import java.util.function.Function;

@Service
public class HistoryDTOMapper implements Function<History, HistoryDTO> {
    @Override
    public HistoryDTO apply(History history) {
        return new HistoryDTO(
                history.getId(),
                history.getDate(),
                history.getCustomer().getId(),
                history.getProduct().getId()
        );
    }
}
