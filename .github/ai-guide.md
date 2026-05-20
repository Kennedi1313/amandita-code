# Amandita AI Guide

This file is intended to help AI assistants and agents understand the structure, runtime model, and important files of the Amandita project.

## Project overview

Amandita is a small monorepo containing:

- `admin/` — React/Vite admin dashboard
- `frontend/` — Next.js storefront
- `backend/` — Spring Boot API service
- `db/` — PostgreSQL container support
- `docker-compose.yml` — local development orchestration for all services

The repository is intentionally kept in a single GitHub repo because the services are deployed together using Docker Compose.

## Service boundaries

- `admin/` is the internal admin application.
- `frontend/` is the public customer-facing storefront.
- `backend/` is the API and business logic layer.
- `db/` contains the container definition and storage volume configuration for PostgreSQL.

## Runtime and build commands

### Docker Compose

The main local runtime is defined in `docker-compose.yml`:

- `db` uses the local PostgreSQL image built from `db/Dockerfile`
- `amandita-api` builds from `backend/Dockerfile`
- `amandita-admin` builds from `admin/Dockerfile`
- `amandita-frontend` builds from `frontend/Dockerfile`

Run everything locally with:

```bash
docker compose up --build
```

Stop the stack with:

```bash
docker compose down
```

### Backend

The backend is a Maven Spring Boot project.

Build and run locally:

```bash
cd backend
mvn clean package
mvn spring-boot:run
```

Compile only:

```bash
mvn clean test-compile
```

### Admin frontend

Install and run:

```bash
cd admin
npm install
npm run dev
```

### Public frontend

Install and run:

```bash
cd frontend
npm install
npm run dev
```

## Key files and locations

- `docker-compose.yml` — orchestrates all services
- `backend/pom.xml` — Java dependencies and build configuration
- `backend/Dockerfile` — backend build/runtime containers
- `admin/package.json` — admin app dependencies and scripts
- `frontend/package.json` — storefront dependencies and scripts
- `backend/src/main/java` — backend source code
- `frontend/pages` — storefront routes and pages
- `admin/src` — admin app source code

## Important project details

- Backend uses Java 21 and Spring Boot 3.0.0.
- The backend API port is `8080`.
- The storefront runs on `3000` in local development.
- The admin frontend runs on `4173` in local development.
- Docker Compose names services: `amandita-db`, `amandita-api`, `amandita-admin`, `amandita-frontend`, and `cloudflared`.
- The backend container expects the database at `jdbc:postgresql://db:5432/amandita`.

## Guidance for agents

- Prefer the root `docker-compose.yml` for service wiring and runtime relationships.
- Use the service-specific README files for detailed per-service commands.
- When making changes, preserve the monorepo architecture unless the user explicitly asks to split services.
- Verify changes with the project build and test commands before finalizing.
- Avoid broad refactors across frontend and backend simultaneously unless the user explicitly requests cross-cutting work.
- Keep API contracts stable; do not change backend endpoint paths, request/response shapes, or database schemas unless the user asks for it.
- Note runtime ports and service dependencies: backend `8080`, frontend `3000`, admin `4173`, database `postgres://db:5432/amandita`.
- For backend changes, focus on `backend/pom.xml`, `backend/Dockerfile`, and `backend/src/main/java`.
- For storefront work, focus on `frontend/pages`, `frontend/components`, `frontend/lib`, and `frontend/package.json`.
- For admin work, focus on `admin/src`, `admin/package.json`, and `admin/Dockerfile`.
- If uncertain about scope, ask the user for exact goals before proceeding.

## Agent-driven development best practices

- Start with a clear user request and map it to service boundaries.
- Make small, incremental changes with one clear objective at a time.
- Keep docs and runtime guidance aligned: update `README.md`, service README files, and `.github/ai-guide.md` when changing ports, build commands, or service structure.
- Use the existing toolchain:
  - backend: Maven and Spring Boot
  - admin: npm + Vite
  - frontend: npm + Next.js
  - integration: Docker Compose
- Verify local behavior with the service-specific commands:
  - `cd backend && mvn clean test-compile`
  - `cd admin && npm install && npm run dev` or `npm run build`
  - `cd frontend && npm install && npm run dev` or `npm run build`
  - `docker compose up --build`
- Preserve current technology choices unless the user asks for modernization.
- When adding or updating dependencies, choose stable, compatible versions and reflect any runtime changes in Dockerfiles and docs.
- Document environment, ports, and service contracts clearly for future agent use.
- Don’t assume deployment targets beyond local Docker Compose unless the user specifies cloud or production requirements.

## Existing docs

- `README.md` — repo overview and Docker Compose usage
- `backend/README.md` — backend details
- `frontend/README.md` — frontend details
- `admin/README.md` — admin app details
- `AGENTS.md` — repo-level agent guidance
