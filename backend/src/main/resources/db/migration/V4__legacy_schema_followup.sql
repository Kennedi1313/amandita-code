ALTER TABLE sale ADD COLUMN IF NOT EXISTS preference_id VARCHAR(255);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS store_id BIGINT REFERENCES store(id);

ALTER TABLE sale_item ADD COLUMN IF NOT EXISTS variation_id INTEGER REFERENCES product_variation(id);

UPDATE category
SET path = '/products/' || trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
WHERE path IS NULL
  AND name IS NOT NULL;

UPDATE category
SET path = '/products/categoria-' || id
WHERE path IS NULL;

CREATE INDEX IF NOT EXISTS idx_sale_payment_id ON sale(payment_id);
