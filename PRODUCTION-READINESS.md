# KIZI production readiness

Status: **not ready to open for production traffic**. The locally runnable
frontend builds and backend tests pass. Production still depends on supported
framework/database versions and infrastructure checks that cannot be completed
from this workspace.

## Local checks completed

- Rechecked on 2026-11-19: `mvn -B test` passed, 45 tests, zero failures.
- Rechecked on 2026-11-19: `npm run build` passed for `frontend`, `admin`,
  `platform-admin`, and `portal`. The admin build reports one bundle over 500 kB;
  this is an optimization warning, not a build failure.
- Rechecked on 2026-11-20: `docker compose up --build -d` completed. All Compose
  services are running, PostgreSQL reports healthy, Flyway validated 35
  migrations and applied V35, and `/actuator/health` returned `UP`. Storefront,
  admin, platform-admin, and portal returned HTTP 200. This validates local
  container startup and schema migration, not external payment/shipping flows.
- `npm audit` on `admin`, `platform-admin`, and `portal` reported zero
  vulnerabilities on 2026-11-19. The storefront audit did not finish against the
  registry in this run. Its last successful audit reported 14 advisories,
  including one critical; refresh it before launch.
- HTTP smoke checks returned `200` for the storefront, cart, checkout, login,
  signup, success, pending, payment return, category, search, product detail,
  robots, sitemap, admin, platform-admin, portal, and API health routes.
- `PLATFORM_ADMIN_ACCESS_TOKEN` is configured in the ignored local `.env` with
  a 64-character random value and file mode `0600`. The API returns `200` for
  that code and `401` for an incorrect code. The production secret must still
  be set independently on the VPS.
- Unknown store domains now receive `404` from `/api/v1/store/info` instead of
  an internal `500`; the registered local domain and product detail return
  `200`.
- `docker compose config --quiet` and `git diff --check` passed.

## Product experience gaps before opening sales

These are product findings from reviewing the storefront, admin, and signup
flows. Search suggestions, product image zoom, guest checkout, secure guest
order tracking links, and a store setup checklist are already implemented.

1. **Policies and seller information — implemented as standard templates.** The
   storefront now links delivery, returns, privacy, and terms pages. They state
   that the merchant sells and supports the order, while describing KIZI as the
   platform and preserving responsibilities that may apply under law. The copy
   is generic, not merchant-editable, and should receive legal review before
   broad onboarding.
2. **Shipping estimate on the product page — implemented.** Shoppers can enter
   a CEP and request local-delivery and Melhor Envio quotes; pickup is shown as
   an option when configured. External quote behavior still needs validation
   against each merchant's production integration.
3. **Catalog hierarchy and filters — implemented.** Merchants can create a
   parent category and nested categories. Product entry still selects one leaf;
   ancestor paths appear in menus and breadcrumbs, and parent collections
   include descendant products. Catalog filters cover price, promotion, stock,
   and sorting. This intentionally keeps product entry simpler than assigning
   each product to several categories.
4. **Verified product reviews — implemented.** A logged-in buyer can review an
   item from purchase history only after its order is marked delivered. Each
   sale item can be reviewed once; published reviews appear on the product page
   and the merchant can hide or republish them in the admin. Guest-order reviews
   are not included because guests do not currently have a purchase-history
   page.
5. **Admin setup checklist — adjusted.** First sale and paid-plan signup no
   longer count as setup tasks. Free stores are labeled as having completed
   basic configuration, with the WhatsApp-order limitation stated; they are not
   labeled ready for online checkout.

## Product improvements that can follow the first customers

- Consider variation-attribute facets (such as size and color) after merchants
  have enough catalog data to define consistent filter values.
- Add a store-level conversion funnel (visits → product views → cart → checkout
  → paid order) so merchants can find where shoppers leave. Current admin
  dashboards focus on orders and sales.
- Consider custom domains after validating demand with the first stores.

## Must resolve before production

1. **Frontend dependency security.** The current storefront uses Next.js
   `14.2.35`; the lockfile also pins `sharp` `0.33.5`. A current Next.js
   advisory rates unauthenticated RCE as critical for versions through
   `15.5.27`; its patched version is `15.5.28` and it lists `sharp >= 0.35.5` as
   a workaround. The storefront image uses Debian, so confirm and remediate this
   exposure before launch, then retest image optimization, checkout, rendering,
   and payment returns. [Next.js security advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
2. **Backend framework support.** The backend was moved from Spring Boot
   `3.2.6` to `3.5.16`, the latest 3.5 release shown in the official Spring
   documentation. The API image builds and starts locally against PostgreSQL,
   and its health endpoint responds. Test it with production-like integrations
   before launch. [Spring Boot 3.5.16 documentation](https://docs.spring.io/spring-boot/3.5/)
3. **Production database major version.** Local Compose uses PostgreSQL `14.25`
   to preserve the existing local volume. PostgreSQL 14 reached end-of-life on
   November 12, 2026; select a
   supported major version for production, take a verified backup, rehearse the
   major-version migration, and prove restore before switching traffic.
   [PostgreSQL 14 EOL notice](https://www.postgresql.org/about/news/postgresql-187-1712-1616-1520-1425-and-19-rc-2-released-3442/)
4. **Production secrets and integrations.** Set strong production values for
   database credentials, `PLATFORM_ADMIN_ACCESS_TOKEN` (32+ random characters),
   JWT signing, Mercado Pago, Melhor Envio, Google OAuth, and S3-compatible
   storage. Confirm the platform-admin service is private behind an IP allowlist,
   VPN, or authenticated proxy.
5. **Public edge and operations.** Configure DNS, HTTPS certificates, the
   reverse proxy and store-domain routing; verify CORS and OAuth callback URLs;
   configure webhook delivery and monitoring; document backup cadence, restore,
   rollback, and incident response.

## Must test against production-like services

- Complete a real test purchase in Mercado Pago sandbox: Pix, card, cancel/back,
  duplicate webhook, delayed webhook, rejected payment, and final order status.
- Complete Better Shipping OAuth and quote/label flow with the production
  account, including the store's actual origin postal code and the carrier's
  posting location rules. Confirm label cancellation and recovery behavior.
- Verify guest and logged-in checkout for delivery, local delivery, and pickup;
  confirm the order appears correctly in the store admin and can be fulfilled.
- Verify Google sign-in from the deployed domains and verify the platform-admin
  code flow with the production secret.
- Verify images can be uploaded, served, and retained in the production object
  store; test a restore from database and file backups.
- Check HTTPS, cookies, CORS, custom store domains, wildcard DNS, and all public
  routes from outside the VPS.

These checks require the production-like credentials, domains, and external
services; the workspace cannot complete them safely or truthfully.
