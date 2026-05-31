# Mostra Digital Portal

Public SaaS portal for store owner signup.

## Local development

```bash
npm install
npm run dev
```

Default local URL:

- `http://localhost:5174`

## Environment

- `VITE_API_URL` — backend API base URL. Default: `http://localhost:8080/api/v1`
- `VITE_BASE_DOMAIN` — domain used to generate store subdomains. Default: `mostradigital.com.br`
- `VITE_ADMIN_URL` — admin dashboard URL shown after signup. Default: `http://localhost:4173`

The portal creates storefront domains like `nomedaloja.mostradigital.com.br`.
Admin and API are shared services and should not be generated per store.
