ALTER TABLE store ADD COLUMN IF NOT EXISTS melhor_envio_origin_address jsonb;
ALTER TABLE store ADD COLUMN IF NOT EXISTS melhor_envio_company_id varchar(255);
