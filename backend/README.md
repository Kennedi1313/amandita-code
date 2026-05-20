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
