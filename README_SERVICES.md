# File-Sharing-Management-System: Services & CI/CD Guide

## Overview

This repository contains two microservices for a distributed file-sharing management system:

1. **config-service** — Centralized configuration management
2. **feature-flag-service** — Dynamic feature flag management

Both services are containerized, deploy to Kubernetes, and have automated CI/CD pipelines.

---

## 1. Config-Service (Configuration Management)

### Purpose
Manages centralized configuration for the entire file-sharing system. Provides APIs to read/write configuration settings, with PostgreSQL persistence and Kafka event publishing.

### Technology Stack
- **Runtime:** Node.js 18
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Event Stream:** Kafka
- **Container:** Docker
- **Orchestration:** Kubernetes (K8s)
- **Observability:** Prometheus + Grafana, Jaeger tracing

### Directory Structure
```
config-service/
├── src/
│   ├── index.js                 # App entry point
│   ├── controllers/             # Request handlers
│   ├── routes/                  # API endpoints
│   ├── db/
│   │   ├── pool.js             # PostgreSQL connection pool
│   │   └── migrations.js        # DB schema migrations
│   ├── kafka/
│   │   └── producer.js         # Kafka event producer
│   ├── middleware/
│   │   ├── errorHandler.js     # Global error handling
│   │   └── requestId.js        # Request correlation
│   ├── metrics.js              # Prometheus metrics
│   ├── logger.js               # Structured logging
│   └── tracing.js              # Jaeger tracing setup
├── tests/
│   ├── config.test.js          # Main test suite
│   ├── unit/                   # Unit tests
│   │   ├── config.unit.test.js
│   │   ├── db.pool.unit.test.js
│   │   ├── db.migrations.unit.test.js
│   │   ├── errorHandler.unit.test.js
│   │   └── kafka.producer.unit.test.js
│   ├── integration/            # Integration tests
│   │   └── config.integration.test.js
│   └── coverage/               # Coverage reports (generated)
├── k8s/                        # Kubernetes manifests
├── helm/                       # Helm charts for deployment
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Key Features
- **Configuration API:** GET, POST, PUT, DELETE endpoints
- **Database Persistence:** Automatic migrations on startup
- **Event Publishing:** Changes published to Kafka topic
- **Health Checks:** Liveness & readiness endpoints for K8s
- **Logging & Tracing:** Structured logs, distributed tracing
- **Metrics:** Prometheus-compatible metrics endpoint

### Running Locally
```bash
# Install dependencies
npm install

# Run development server (requires PostgreSQL + Kafka)
npm start

# Run unit tests only
npm run test:unit

# Run all tests
npm test

# Generate coverage report
npm run test:coverage
```

### Test Results
Tests validate:
- ✅ Database connection pooling
- ✅ Migration execution
- ✅ Kafka message production
- ✅ Express middleware (error handling, request IDs)
- ✅ API controller logic
- ✅ Config CRUD operations

---

## 2. Feature-Flag-Service (Feature Management)

### Purpose
Provides a runtime feature flag system. Allows enabling/disabling features without redeployment, with PostgreSQL persistence, Kafka notifications, and a REST API for management.

### Technology Stack
- **Runtime:** Node.js 18
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Event Stream:** Kafka
- **Container:** Docker
- **Orchestration:** Kubernetes (K8s)
- **Observability:** Prometheus + Grafana, Jaeger tracing

### Directory Structure
```
Feature_flag service/
├── src/
│   ├── index.js                # App entry point
│   ├── controllers/            # Request handlers
│   ├── routes/                 # API endpoints
│   ├── db/
│   │   ├── pool.js            # PostgreSQL connection pool
│   │   └── migrations.js       # DB schema migrations
│   ├── kafka/
│   │   └── producer.js        # Kafka event producer
│   ├── middleware/
│   │   ├── errorHandler.js    # Global error handling
│   │   └── requestId.js       # Request correlation
│   ├── metrics.js             # Prometheus metrics
│   ├── logger.js              # Structured logging
│   └── tracing.js             # Jaeger tracing setup
├── tests/
│   ├── flags.test.js          # Main test suite
│   ├── unit/                  # Unit tests
│   │   └── flags.unit.test.js
│   ├── integration/           # Integration tests
│   │   └── flags.integration.test.js
│   └── coverage/              # Coverage reports (generated)
├── k8s/                       # Kubernetes manifests
├── helm/                      # Helm charts for deployment
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Key Features
- **Flag Management API:** Create, retrieve, update, delete flags
- **Flag Evaluation:** Fast in-memory evaluation with cache invalidation
- **Database Persistence:** Flags stored in PostgreSQL
- **Event Notifications:** Flag changes published to Kafka
- **Health Checks:** Liveness & readiness endpoints for K8s
- **Logging & Tracing:** Structured logs, distributed tracing
- **Metrics:** Prometheus-compatible metrics endpoint

### Running Locally
```bash
# Install dependencies
npm install

# Run development server (requires PostgreSQL + Kafka)
npm start

# Run unit tests only
npm run test:unit

# Run all tests
npm test

# Generate coverage report
npm run test:coverage
```

### Test Results
Tests validate:
- ✅ Flag CRUD operations
- ✅ Database persistence
- ✅ Migration execution
- ✅ Kafka event publishing
- ✅ Express middleware
- ✅ In-memory flag caching
- ✅ API request/response handling

---

## 3. CI/CD Pipeline Explanation

### What We Fixed

**Problem:** Initial CI/CD workflows failed due to:
1. ❌ Missing `working-directory` — npm commands ran at repo root, not in service folders
2. ❌ `npm ci` without `package-lock.json` — failed because lock files didn't exist
3. ❌ ESLint misconfigured — used default config that didn't exist
4. ❌ Kafka image pull failures — `bitnami/kafka:latest`, `vectorized/redpanda:latest`, and `confluentinc/cp-kafka:7.4.0` had availability issues
5. ❌ No Kafka readiness check — tests started before Kafka was ready

**Solution:**
- ✅ Added `defaults.run.working-directory` to each job (config-service or Feature_flag service)
- ✅ Changed `npm ci` to `npm install` everywhere
- ✅ Added ESLint fallback flags: `--no-eslintrc --env node,es2021 --parser-options=ecmaVersion:2021`
- ✅ Used `confluentinc/cp-kafka:7.4.0` (public, reliable image)
- ✅ Added Kafka readiness loop before `npm test` (wait 30 attempts, 5s each)

### Workflow Files

**config-service-ci-cd.yml**
```yaml
on:
  push:
    branches: [main, Team3]
  pull_request:
    branches: [main, Team3]

jobs:
  lint:
    # ESLint with fallback config
    # working-directory: config-service
  
  test:
    # PostgreSQL + Kafka services
    # Kafka readiness check before tests
    # working-directory: config-service
  
  docker-build-push:
    # Push to ghcr.io on main and Team3
    # Build context: config-service/
  
  deploy:
    # Deploy to K8s only on main branch
    # kubectl apply -f config-service/k8s/
```

**feature-flag-ci-cd.yml**
```yaml
on:
  push:
    branches: [main, Team3]
  pull_request:
    branches: [main, Team3]

jobs:
  lint:
    # ESLint with fallback config
    # working-directory: "Feature_flag service"
  
  test:
    # PostgreSQL + Kafka services
    # Kafka readiness check before tests
    # working-directory: "Feature_flag service"
  
  docker-build-push:
    # Push to ghcr.io on main and Team3
    # Build context: "Feature_flag service"/
  
  deploy:
    # Deploy to K8s only on main branch
    # kubectl apply -f "Feature_flag service"/k8s/
```

### Pipeline Stages

#### 1. **Lint** (Sequential)
- Installs dependencies
- Runs ESLint on `src/` with fallback config
- Fails fast on syntax/style errors

#### 2. **Test** (Depends on Lint)
- Spins up PostgreSQL + Kafka services
- Waits for Kafka to be ready (30 retries, 5s intervals)
- Runs full test suite (unit + integration)
- Generates coverage report
- Uploads coverage as artifact

#### 3. **Docker Build & Push** (Depends on Test)
- Runs **only on main and Team3 branches**
- Logs into GitHub Container Registry (GHCR)
- Builds Docker image from service Dockerfile
- Pushes image tagged with git SHA
- Also pushes `latest` tag

#### 4. **Deploy** (Depends on Docker Build & Push)
- Runs **only on main branch**
- Configures kubectl from KUBECONFIG secret
- Applies K8s manifests (deployment, service, configmap, etc.)
- Updates deployment image to newly built image
- Waits for rollout to complete
- Automatically rolls back on failure

### Kafka Readiness Check (New)
```bash
# Wait for Kafka on localhost:9092
for i in $(seq 1 30); do
  if timeout 1 bash -c "</dev/tcp/localhost/9092" >/dev/null 2>&1; then
    echo "Kafka is up"
    break
  fi
  echo "Waiting for Kafka... ($i/30)"
  sleep 5
done
```
- Tries up to 30 times
- Waits 5 seconds between attempts
- Ensures Kafka is listening before tests start
- Prevents flaky test failures due to timing

---

## 4. Running Tests Locally

### Prerequisites
```bash
# Install Docker (for PostgreSQL + Kafka)
# Install Node.js 18+
# Clone repo
cd File-Sharing-Management-System
```

### Config-Service Tests
```bash
# Start services (if not using CI)
docker-compose -f config-service/docker-compose.yml up -d

# Install and test
cd config-service
npm install
npm test
npm run test:coverage

# View coverage report
open tests/coverage/index.html
```

### Feature-Flag-Service Tests
```bash
# Start services (if not using CI)
docker-compose -f "Feature_flag service/docker-compose.yml" up -d

# Install and test
cd "Feature_flag service"
npm install
npm test
npm run test:coverage

# View coverage report
open tests/coverage/index.html
```

---

## 5. Test Coverage & Results

### Expected Coverage Metrics
- **config-service:** ~85-95% line coverage
- **feature-flag-service:** ~85-95% line coverage

### Coverage Report Locations
- `config-service/tests/coverage/index.html` — Interactive HTML report
- `config-service/tests/coverage/lcov.info` — LCOV format (for CI tools)
- `Feature_flag service/tests/coverage/index.html`
- `Feature_flag service/tests/coverage/lcov.info`

### Test Categories
1. **Unit Tests** — Isolated module testing
   - Database pool initialization
   - Migration execution
   - Kafka producer
   - Error handler middleware
   
2. **Integration Tests** — End-to-end API testing
   - Config CRUD with real DB
   - Kafka event publishing
   - HTTP request/response
   - Error scenarios

---

## 6. Deployment

### To Kubernetes (main branch only)
Pipeline automatically deploys on push to `main`.

### Manual Deploy
```bash
# Config-Service
kubectl apply -f config-service/k8s/

# Feature-Flag-Service
kubectl apply -f Feature_flag service/k8s/

# Check status
kubectl get deployments -n cse474-prod
kubectl describe deployment config-service -n cse474-prod
```

### Rollback
```bash
kubectl rollout undo deployment/config-service -n cse474-prod
kubectl rollout undo deployment/feature-flag-service -n cse474-prod
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests fail locally but pass in CI | Run with services: `docker-compose up -d` |
| Kafka connection timeout | Check readiness loop; increase wait timeout if needed |
| Coverage missing | Run `npm run test:coverage` after tests pass |
| Lint errors with ESLint | Ensure fallback flags are present: `--no-eslintrc --env node,es2021` |
| Docker build fails | Verify Dockerfile exists in service root; check build context path |
| Deploy fails | Verify `KUBECONFIG` secret exists; check K8s manifests |

---

## Summary

**Config-Service** and **Feature-Flag-Service** are production-ready Node.js microservices with:
- ✅ Automated CI/CD pipeline (lint → test → build → deploy)
- ✅ Comprehensive test coverage (unit + integration)
- ✅ Kubernetes-native deployment
- ✅ Event-driven architecture (Kafka)
- ✅ Observability (logging, metrics, tracing)

The pipeline ensures code quality, test coverage, and reliable deployments to production.

---

**Last Updated:** May 20, 2026  
**Branch:** Team3  
**Status:** ✅ All workflows passing with Kafka readiness checks
