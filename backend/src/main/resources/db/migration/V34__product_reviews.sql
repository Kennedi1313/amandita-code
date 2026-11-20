CREATE TABLE IF NOT EXISTS product_review (
    id BIGSERIAL PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES store(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    sale_id BIGINT NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    sale_item_id BIGINT NOT NULL UNIQUE REFERENCES sale_item(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customer(id) ON DELETE SET NULL,
    reviewer_name VARCHAR(120) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(120),
    comment TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('PUBLISHED', 'HIDDEN')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_review_public
    ON product_review (store_id, product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_review_store
    ON product_review (store_id, created_at DESC);
