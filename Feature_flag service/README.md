# Feature Flag Service

A Node.js microservice for managing feature flags per service and publishing Kafka events on updates.

## Features

- CRUD API for feature flags
- PostgreSQL persistence
- Kafka event publishing on flag updates
- Health, readiness, metrics, and Swagger documentation
- Request ID middleware, structured logging, Prometheus metrics, and OpenTelemetry tracing

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

## Run with Docker

```bash
docker-compose up --build
```

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

## API Endpoints

### POST /flags
Create a new feature flag.

```bash
curl -X POST http://localhost:3032/flags \
  -H "Content-Type: application/json" \
  -d '{"service":"auth-service","name":"DARK_MODE","enabled":false}'
```

### PUT /flags/:service/:name
Update a flag.

```bash
curl -X PUT http://localhost:3032/flags/auth-service/DARK_MODE \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

### GET /flags/:service
Get all flags for a service.

```bash
curl http://localhost:3032/flags/auth-service
```

### GET /flags/:service/:name
Get a single flag.

```bash
curl http://localhost:3032/flags/auth-service/DARK_MODE
```

### DELETE /flags/:service/:name
Delete a flag.

```bash
curl -X DELETE http://localhost:3032/flags/auth-service/DARK_MODE
```

### GET /health

```bash
curl http://localhost:3032/health
```

### GET /ready

```bash
curl http://localhost:3032/ready
```

### GET /metrics

```bash
curl http://localhost:3032/metrics
```

### Swagger UI

```bash
open http://localhost:3032/api-docs
```

## Kubernetes

```bash
kubectl apply -f k8s/
```

## Helm

```bash
helm install cse474-flags ./helm
```

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| PORT | Service port | `3032` |
| DB_HOST | PostgreSQL host | `localhost` |
| DB_PORT | PostgreSQL port | `5432` |
| DB_NAME | PostgreSQL database name | `flags_db` |
| DB_USER | PostgreSQL user | `postgres` |
| DB_PASSWORD | PostgreSQL password | `postgres` |
| KAFKA_BROKER | Kafka broker address | `kafka:9092` |
| KAFKA_CLIENT_ID | Kafka client ID | `feature-flag-service` |
| KAFKA_TOPIC | Kafka topic for updates | `flag.updated` |
| JAEGER_ENDPOINT | Jaeger trace collector endpoint | `http://jaeger:14268/api/traces` |

## Tests

```bash
npm test
npm run test:coverage
```

## CI/CD

This repository includes a GitHub Actions pipeline with the following stages:

- `lint` — validates source code with ESLint
- `test` — runs unit and integration tests and uploads coverage artifacts
- `docker-build-push` — builds and pushes the container image to GHCR
- `deploy` — applies Kubernetes manifests and updates the deployment image
