# Amandita Admin

This service is the admin user interface for the Amandita application.

## Stack

- React
- Vite
- Chakra UI
- Axios

## Local development

Install dependencies:

```bash
cd admin
npm install
```

Run the dev server:

```bash
npm run dev
```

The admin app should be available at `http://localhost:4173`.

## Docker

This service is built by `docker-compose.yml` as `amandita-admin`.

To build and run with Docker Compose:

```bash
docker compose up --build admin
```

## Notes

- The admin service expects the backend API at `http://amandita-api:8080` when running under Docker Compose.
- Use the root `docker-compose.yml` for a complete local stack with database and backend.
