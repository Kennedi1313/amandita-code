-- Run against a copy of production before deploying the Flyway migrations.
-- Any returned rows must be reviewed/deduplicated before applying unique indexes.

SELECT store_id, lower(email) AS normalized_email, count(*) AS total
FROM customer
WHERE email IS NOT NULL
GROUP BY store_id, lower(email)
HAVING count(*) > 1;

SELECT lower(email) AS normalized_owner_email, count(*) AS total
FROM customer
WHERE owned_store_id IS NOT NULL
  AND email IS NOT NULL
GROUP BY lower(email)
HAVING count(*) > 1;
