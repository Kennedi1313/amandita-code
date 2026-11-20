ALTER TABLE sale
    ADD COLUMN IF NOT EXISTS melhor_envio_cart_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS melhor_envio_order_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS melhor_envio_operation_status VARCHAR(40),
    ADD COLUMN IF NOT EXISTS melhor_envio_operation_environment VARCHAR(20);
