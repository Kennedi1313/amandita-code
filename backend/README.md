# Amandita Backend

This service is the Spring Boot API for Amandita.

## Stack

- Java 21
- Spring Boot 3.0.0
- Maven
- PostgreSQL

## Local development

Build the backend:

```bash
cd backend
mvn clean package
```

Run locally:

```bash
cd backend
mvn spring-boot:run
```

The API is available at `http://localhost:8080`.

## Docker

This service is built by `docker-compose.yml` as `amandita-api`.

Run the full stack:

```bash
docker compose up --build
```

The backend depends on the `db` service, so use the root Compose file for a complete local environment.

## Notes

- The backend image is built from `backend/Dockerfile`.
- Environment variables are loaded from `.env` when using Docker Compose.
- The application connects to `jdbc:postgresql://db:5432/amandita` in Compose.
- The KIZI plan subscription uses the Mercado Pago Subscriptions API, separately from store sales. Configure `MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN` with the Access Token from the subscription app's **Test credentials** while testing, and `MERCADOPAGO_SUBSCRIPTION_WEBHOOK_SECRET` with that app's webhook signature secret. The subscription webhook and checkout return URLs are derived from `MERCADOPAGO_WEBHOOK_URL` and use the same public HTTPS host; the return endpoint redirects to `SAAS_ADMIN_URL`. `notification_url` is sent when each subscription is created. The public HTTPS tunnel must remain reachable for webhook delivery. Do not use production credentials for tests.
- When starting a subscription, the admin enters a billing email in a confirmation dialog; it is sent as `payer_email` to create the subscription. The customer is then redirected to Mercado Pago's hosted checkout to choose or add a payment method, and does not need to authorize a Mercado Pago account with KIZI. For tests, enter the test buyer's email.
- The plan is activated only after an authorized recurring payment is confirmed as `approved` or `processed`; an `authorized` preapproval by itself is not proof of payment. The backend reconciles subscription and payment status every five minutes and when the admin requests a manual sync, so missed webhooks do not permanently leave the plan out of sync.
