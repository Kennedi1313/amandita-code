UPDATE store
SET pickup_address = jsonb_set(
    jsonb_set(
        pickup_address,
        '{city}',
        to_jsonb(trim(regexp_replace(pickup_address ->> 'city', '\\s+-\\s+[A-Za-z]{2}$', '')))
    ),
    '{state}',
    to_jsonb(upper(trim(substring(pickup_address ->> 'city' FROM '([A-Za-z]{2})$'))))
)
WHERE pickup_address IS NOT NULL
  AND COALESCE(pickup_address ->> 'state', '') = ''
  AND pickup_address ->> 'city' ~ '\\s+-\\s+[A-Za-z]{2}$';
