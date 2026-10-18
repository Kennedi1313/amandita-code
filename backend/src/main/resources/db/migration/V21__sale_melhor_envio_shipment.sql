ALTER TABLE sale ADD COLUMN IF NOT EXISTS melhor_envio_shipment_id VARCHAR(120);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS melhor_envio_tracking_code VARCHAR(120);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS melhor_envio_label_url TEXT;
ALTER TABLE sale ADD COLUMN IF NOT EXISTS melhor_envio_status VARCHAR(80);
