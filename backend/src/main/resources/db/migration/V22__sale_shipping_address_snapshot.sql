ALTER TABLE sale ADD COLUMN IF NOT EXISTS shipping_address_street VARCHAR(255);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS shipping_address_number BIGINT;
ALTER TABLE sale ADD COLUMN IF NOT EXISTS shipping_address_district VARCHAR(255);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS shipping_address_city VARCHAR(255);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS shipping_address_reference VARCHAR(255);
