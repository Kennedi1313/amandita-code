ALTER TABLE store
    ADD COLUMN IF NOT EXISTS delivery_distance_ranges jsonb NOT NULL DEFAULT '[]'::jsonb;
