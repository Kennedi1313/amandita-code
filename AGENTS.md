# Agent Guide

This file is intended for AI assistants and agent workflows working on the Amandita repository.
It is a repo-level companion to `.github/ai-guide.md`.

## Purpose

- Provide a direct entry point for agents.
- Describe the service boundaries, runtime model, and validation commands.
- Define safe development practices for AI-driven changes.

## Project summary

Amandita is a small monorepo with three main services:

- `backend/` — Spring Boot API service using Java 21
- `frontend/` — Next.js customer storefront
- `admin/` — Vite + React admin dashboard
- `portal/` — Vite + React SaaS portal and store signup flow
- `db/` — PostgreSQL container support
- `docker-compose.yml` — local orchestration of the full stack

This repository is designed for local Docker Compose development and service-level isolation while keeping the codebase in a single repo.

## What agents should do first

1. Read `AGENTS.md` and `.github/ai-guide.md`. If `AGENTS.md` is missing, notify the user and use `.github/ai-guide.md` as the primary reference.
2. Confirm the requested scope and target service(s) with the user.
3. Clarify whether the request requires changes that affect multiple services or the overall repository architecture (for example, cross-service API changes, shared DB schema updates, or deployment topology changes).
4. Avoid changes that affect multiple services or the overall repository architecture unless the user explicitly requests them; if a cross-service change is required, document the affected services, proposed plan, and expected validation steps before implementing.
5. Preserve existing API endpoints, data formats, and runtime ports unless the user asks to change them (explicit confirmation required for breaking changes).

## Service boundaries

- `backend/` is the backend API and business logic.
- `frontend/` is the public storefront.
- `admin/` is the internal admin UI.
- `portal/` is the public SaaS portal and onboarding entry point.
- `db/` is the database container configuration.

## Key files

- `docker-compose.yml` — orchestrates all services and service ports
- `backend/pom.xml` — Java build and dependency configuration
- `backend/Dockerfile` — backend image build and runtime
- `frontend/package.json` — storefront dependencies and scripts
- `admin/package.json` — admin dependencies and scripts
- `portal/package.json` — portal dependencies and scripts
- `frontend/pages` — storefront page routes
- `admin/src` — admin frontend source code
- `backend/src/main/java` — backend source code

## Runtime ports and validation

- Backend API: `http://localhost:8080`
- Frontend dev: `http://localhost:3000`
- Admin dev: `http://localhost:4173`
- Portal dev: `http://localhost:5174`

Domain topology:
- Admin is a single shared app, not per-store subdomains.
- API is a single shared backend, not per-store subdomains.
- Storefront domains identify stores. The storefront sends `X-Store-Domain` to the API.
- Authenticated admin requests should resolve store context from the JWT `storeId`, not from host/subdomain.

Validation commands:

```bash
cd backend && mvn clean test-compile
cd admin && npm install && npm run build
cd frontend && npm install && npm run build
cd portal && npm install && npm run build
docker compose up --build
```

## Agent development best practices

Code changes:
- Make small, incremental changes with one objective per commit; prioritize safety and minimal surface area.
- When proposing changes, list affected services, files, and API contract impacts; request user confirmation for breaking or cross-service changes.

Documentation updates:
- Update `README.md`, service README files, and `.github/ai-guide.md` when changing ports, build commands, or service structure. Treat documentation updates as part of the same PR as code changes.

Coordination & cross-service changes:
- If a change impacts multiple services, document dependencies, create a validation plan, and run builds/tests for all affected services before merging.
- Notify the user and require explicit approval for architectural or DB schema changes.

Verification:
- Verify changes with service-specific build/test commands and Docker Compose before finalizing.

- Prefer service-specific README files for command and dependency details.
- Use Docker Compose as the source of truth for service links and local runtime wiring.
- If a service-specific README is missing or outdated, update it as part of the work.
- If uncertain about the user's intent, ask clarifying questions before editing.

## When to use `.github/ai-guide.md`

- For deeper runtime and service relationship context.
- For backend build details and port information.
- For agent-specific guidance that is scoped to this repo.

## Notes for Claude or other LLM-based agents

- This repository does not require a tool-specific `CLAUDE.md` file.
- Use `AGENTS.md` as a generic, tool-agnostic entrypoint.
- If you need to document tool-specific prompts or workflows, keep them separate from repository architecture guidance.

## Existing docs

- `README.md` — repo overview and Docker Compose usage
- `backend/README.md` — backend details
- `frontend/README.md` — frontend details
- `admin/README.md` — admin app details
- `.github/ai-guide.md` — AI/agent-specific project guidance
