ALTER TABLE sale ADD COLUMN IF NOT EXISTS melhor_envio_invoice_key VARCHAR(44);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS external_tracking_code VARCHAR(100);
