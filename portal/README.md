# KIZI Portal

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
- `GOOGLE_ANALYTICS_ID` — optional GA4 web-stream Measurement ID, usually `G-...`.
- `POSTHOG_PROJECT_KEY` — optional PostHog web project key, usually `phc_...`.
- `POSTHOG_HOST` — PostHog ingestion host. Defaults to `https://us.i.posthog.com`; use the host shown in your project's settings if it is in another region.

The portal creates storefront domains like `nomedaloja.mostradigital.com.br`.
Admin and API are shared services and should not be generated per store.

### Analytics setup and validation

The analytics IDs are optional and public browser configuration, not server secrets. Never use a PostHog personal API key here. Add the variables to the repository-root `.env` file; Docker Compose passes them into the portal's static build.

Append these entries to the existing root `.env` (keep the rest of its current values):

```dotenv
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
POSTHOG_PROJECT_KEY=phc_your_project_key
POSTHOG_HOST=https://us.i.posthog.com
```

1. In Google Analytics, create a GA4 web stream for the portal and copy its Measurement ID (`G-...`) into `GOOGLE_ANALYTICS_ID`.
2. In PostHog, create a Web project and copy its Project API key (`phc_...`) into `POSTHOG_PROJECT_KEY`. Set `POSTHOG_HOST` to the ingestion host for that project's region if it is not the US default.
3. Rebuild the portal so Vite receives the values:

   ```bash
   docker compose up --build -d amandita-portal
   ```

4. Open `http://localhost:5174` in a private/incognito window. Before choosing “Aceitar métricas”, the page should not load Google Tag Manager or send PostHog events. Accept metrics, then check the browser Network panel for requests to `googletagmanager.com` and the configured PostHog host.
5. In PostHog, check Live Events for `$pageview`, `signup_cta_clicked`, and `google_sign_in_completed`. Local events include `analytics_environment: local`. For GA4 local validation, `debug_mode` is enabled automatically on localhost; use DebugView or Realtime reports.
6. Choose “Recusar métricas” and confirm that further events stop. Reopen “Preferências de cookies” in the footer to change the choice again.

For direct Vite development (`npm run dev`), put the corresponding `VITE_GOOGLE_ANALYTICS_ID`, `VITE_POSTHOG_PROJECT_KEY`, and `VITE_POSTHOG_HOST` values in `portal/.env.local` instead. Do not commit that local file.

The portal records only explicit, coarse funnel events (`signup_cta_clicked`, `assisted_setup_whatsapp_clicked`, `google_sign_in_completed`, `begin_store_creation`, `store_created`, and `admin_handoff_clicked`). PostHog autocapture, exception/performance capture, and session recordings are disabled. Analytics load only after consent; refusing is the default until a choice is made. The project key/Measurement ID are embedded in the browser bundle, so they must not contain private API credentials.
