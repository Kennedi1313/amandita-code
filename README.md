# Amandita

This repository contains a small Docker Compose application with three frontend services and one backend service:

- `portal/` — Vite + React SaaS landing and store signup flow
- `admin/` — Vite + React admin dashboard
- `frontend/` — Next.js storefront
- `backend/` — Spring Boot API service
- `db/` — PostgreSQL database

This monorepo structure is a good fit for a small project using Docker Compose, because it keeps all services together and makes local orchestration easier.

## Why one repository is fine

- For a small app, a single GitHub repo reduces overhead.
- Docker Compose works naturally with multiple services in one repo.
- You can still keep service boundaries clean by separating folders.
- If the project grows later, you can split services into multiple repos.

## Project structure

- `portal/` — public SaaS portal powered by Vite and React
- `admin/` — admin web UI powered by Vite and React
- `frontend/` — public storefront built with Next.js
- `backend/` — Java Spring Boot API
- `db/` — database service Dockerfile and configuration
- `docker-compose.yml` — local orchestration for all services

## Local development

### Start all services with Docker Compose

```bash
docker compose up --build
```

Open the services in your browser:

- Admin: `http://localhost:4173`
- Storefront: `http://localhost:3000`
- Portal: `http://localhost:5174`
- API: `http://localhost:8080`

### Domain model

Local Docker uses one shared admin and one shared API:

- Admin is always served from the admin app, for example `http://localhost:4173`.
- API is always served from the backend app, for example `http://localhost:8080`.
- Storefront domains identify the store, for example `kendindin.mostradigital.com.br`.

In local development, the storefront sends the current browser hostname to the backend using `X-Store-Domain`. Authenticated admin requests use the `storeId` from the JWT instead of a domain header.

To test a storefront domain locally, point only the storefront domain to localhost:

```txt
127.0.0.1 kendindin.mostradigital.com.br
```

Then open:

```txt
http://kendindin.mostradigital.com.br:3000
```

Do not create per-store admin or API hosts like `admin.kendindin...` or `api.kendindin...`; those are not part of the current topology.

### Stop services

```bash
docker compose down
```

## Service-specific setup

See the service README files for details:

- `admin/README.md`
- `frontend/README.md`
- `backend/README.md`

## Notes

- The repo uses Docker Compose to keep all services in a single development environment.
- This is a reasonable setup for a small project, especially when the frontends and backend are deployed together.
- Keep the Docker Compose file in sync with service ports and build args when you update service folders.
