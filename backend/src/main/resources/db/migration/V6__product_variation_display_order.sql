ALTER TABLE product_variation
    ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE product_variation
SET display_order = COALESCE(display_order, id);

ALTER TABLE product_variation
    ALTER COLUMN display_order SET DEFAULT 0;
