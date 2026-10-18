ALTER TABLE store
    ADD COLUMN mp_subscription_id VARCHAR(100),
    ADD COLUMN mp_subscription_status VARCHAR(32),
    ADD COLUMN mp_subscription_init_point TEXT,
    ADD COLUMN mp_subscription_next_payment_at TIMESTAMPTZ,
    ADD COLUMN mp_subscription_period_end TIMESTAMPTZ,
    ADD COLUMN mp_subscription_last_payment_id VARCHAR(100),
    ADD COLUMN mp_subscription_last_payment_status VARCHAR(32);

CREATE INDEX idx_store_mp_subscription_id
    ON store (mp_subscription_id)
    WHERE mp_subscription_id IS NOT NULL;

UPDATE product
SET published = FALSE
WHERE store_id IN (
    SELECT id FROM store WHERE plan = 'COMPLETE' AND mp_subscription_id IS NULL
);

UPDATE store
SET plan = 'FREE'
WHERE plan = 'COMPLETE' AND mp_subscription_id IS NULL;
