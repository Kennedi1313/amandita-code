# KIZI Platform Admin

Private dashboard for the KIZI platform owner. It is separate from the store
admin and runs at http://localhost:4174 in Docker Compose.

## Access code

Set `PLATFORM_ADMIN_ACCESS_TOKEN` in the API environment to a random secret of
at least 32 characters. The dashboard prompts for this code and keeps it only
in the current browser session. Requests send it in the
`X-Platform-Admin-Token` header; the API compares it in constant time. If the
setting is empty, the API rejects access. Never put this value in frontend
build arguments or commit it to source control.

The API response includes integration connection status only. It never returns
provider credentials or tokens.

## Local development

    npm install
    npm run dev

The development server uses the Vite defaults from vite.config.js. Set
VITE_API_RUNTIME_URL to the public API base ending in /api/v1 when needed.

## Current dashboard data

- Store count and plan split (FREE and COMPLETE)
- Store owner name and email
- Mercado Pago, Asaas, Melhor Envio, pickup, and local delivery status
- Cumulative sale count and gross sales by store
- Store creation and sales trends for 7, 30, or 90 days
- Order status counts and active stores in the selected period
- Google Analytics sessions/users and PostHog portal signup funnel when API
  read credentials are configured

## Optional analytics reporting credentials

The public measurement ID and project token in the portal are used to send
analytics events. The platform API needs separate read credentials to query
reports. Add these to the root .env file; keep the secret values private:

    POSTHOG_PERSONAL_API_KEY=
    POSTHOG_PROJECT_ID=
    POSTHOG_API_HOST=https://us.posthog.com
    GOOGLE_ANALYTICS_PROPERTY_ID=
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON_BASE64=

The PostHog personal key needs project query read permission. The Google
service-account JSON should be Base64-encoded, and its email must have Viewer
access to the GA4 property.

## Production build

The container serves the compiled app with Nginx. Keep its URL behind the
platform's private access path; the API token protects dashboard data.
