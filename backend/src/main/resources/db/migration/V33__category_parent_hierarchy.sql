ALTER TABLE category
    ADD COLUMN IF NOT EXISTS parent_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_category_parent'
    ) THEN
        ALTER TABLE category
            ADD CONSTRAINT fk_category_parent
            FOREIGN KEY (parent_id) REFERENCES category(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_category_parent_store
    ON category (store_id, parent_id);
