# config-service

A production-grade Node.js microservice for runtime configuration management across distributed services. Updates are stored in PostgreSQL and broadcast over Kafka so services can hot-reload configuration changes without restarting.

## Prerequisites

- Node.js 18+
- Docker
- Docker Compose

## Running with Docker

```bash
docker-compose up --build
```

The service will be available at `http://localhost:3031`.

## Running locally

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Express server port |
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `KAFKA_BROKER` | Kafka bootstrap server |
| `KAFKA_CLIENT_ID` | Kafka client id |
| `KAFKA_TOPIC` | Kafka topic for config updates |

## API Endpoints

### PUT /config/:service
Update or insert a configuration key for a service.

```bash
curl -X PUT http://localhost:3031/config/auth-service \
  -H "Content-Type: application/json" \
  -d '{"key":"MAX_CONNECTIONS","value":"100"}'
```

### GET /config/:service
Get all configuration keys for a service.

```bash
curl http://localhost:3031/config/auth-service
```

### GET /config/:service/:key
Get a single configuration key.

```bash
curl http://localhost:3031/config/auth-service/MAX_CONNECTIONS
```

### GET /health
Health check.

```bash
curl http://localhost:3031/health
```

### GET /ready
Readiness check for DB and Kafka.

```bash
curl http://localhost:3031/ready
```

## Running tests

```bash
npm install
npm test
```

## Coverage

```bash
npm run test:coverage
```

## Kubernetes deployment

Apply the production manifests:

```bash
kubectl apply -f k8s/
```

## Helm deployment

Install the Helm chart:

```bash
helm install cse474-config ./helm
```

## Observability

- Metrics endpoint: `GET /metrics`
- Swagger UI: `GET /api-docs`
- OpenAPI JSON: `GET /api-docs.json`

## CI/CD

The repository includes a GitHub Actions workflow at `.github/workflows/ci-cd.yml` with the following stages:

1. `lint` - run ESLint on `src/`
2. `test` - run unit tests and coverage
3. `docker-build-push` - build and push Docker image to GitHub Container Registry
4. `deploy` - apply Kubernetes manifests and update deployment image
