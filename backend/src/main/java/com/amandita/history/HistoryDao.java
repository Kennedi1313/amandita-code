package com.amandita.history;

import java.util.List;

public interface HistoryDao {
    List<History> selectAllHistory();
    History insertHistory(History history);
}
