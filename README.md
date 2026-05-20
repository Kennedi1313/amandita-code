# Amandita

This repository contains a small Docker Compose application with two frontend services and one backend service:

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
- API: `http://localhost:8080`

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
