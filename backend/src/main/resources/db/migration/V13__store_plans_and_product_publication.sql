ALTER TABLE store
    ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'FREE';

ALTER TABLE product
    ADD COLUMN published BOOLEAN NOT NULL DEFAULT TRUE;

WITH ranked_products AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY id DESC) AS store_rank
    FROM product
    WHERE active = TRUE AND store_id IS NOT NULL
)
UPDATE product
SET published = FALSE
WHERE id IN (SELECT id FROM ranked_products WHERE store_rank > 10);
