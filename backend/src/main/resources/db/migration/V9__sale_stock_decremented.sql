ALTER TABLE sale
    ADD COLUMN IF NOT EXISTS stock_decremented BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing paid/fulfilled sales have already had inventory deducted by their
-- payment webhook or POS flow. Preserve that fact to make webhook replays safe.
UPDATE sale
SET stock_decremented = TRUE
WHERE UPPER(COALESCE(status, '')) IN ('APROVADO', 'PREPARANDO', 'ENTREGUE');
