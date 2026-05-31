CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_store_email
    ON customer(store_id, lower(email))
    WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_owned_store_email
    ON customer(lower(email))
    WHERE owned_store_id IS NOT NULL
      AND email IS NOT NULL;
