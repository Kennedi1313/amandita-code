package com.amandita.history;

import java.util.Date;

public record HistoryDTO(
        Integer id,
        Date date,
        Integer customerId,
        Integer productId
) {
}
