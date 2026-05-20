# File-Sharing-Management-System: Services & CI/CD Guide

## Overview

This repository contains two microservices for a distributed file-sharing management system:

1. **config-service** — Centralized configuration management
2. **feature-flag-service** — Dynamic feature flag management

Both services are containerized, deploy to Kubernetes, and have automated CI/CD pipelines.

---

## System Architecture & Workflow

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                         │
│  (Web App, Mobile, CLI, Internal Services)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  (Other Microservices)
    │   Config     │  │  Feature-    │
    │   Service    │  │  Flag        │
    │   :3000      │  │  Service     │
    │              │  │  :3001       │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
           ┌────────▼──────────┐
           │   Kafka Broker    │
           │   :9092           │
           └────────┬──────────┘
                    │
        ┌───────────┼──────────────┐
        │           │              │
        ▼           ▼              ▼
    ┌────────┐  ┌────────┐   ┌─────────────┐
    │  Logs  │  │Metrics │   │  Real-time  │
    │ Jaeger │  │Prometheus  │  Updates    │
    └────────┘  │Grafana │   └─────────────┘
                └────────┘
                    
    ┌──────────────────────────────────────┐
    │      PostgreSQL Databases            │
    │  ┌──────────────┐ ┌──────────────┐   │
    │  │ config_db    │ │ flags_db     │   │
    │  └──────────────┘ └──────────────┘   │
    └──────────────────────────────────────┘
```

### Data Flow: Request to Response

```
CLIENT REQUEST
    │
    ▼
┌─────────────────────┐
│ API Gateway / LB    │  ◄─── Route to service
│ (nginx/ingress)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Kubernetes Service                 │
│  (Load balance to pod replicas)      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Config-Service or Feature-Flag Pod │
│  ┌─────────────────────────────────┤
│  │ 1. Request Validation Middleware │
│  │ 2. Correlation ID Assignment     │
│  │ 3. Route → Controller            │
│  │ 4. Business Logic Execution      │
│  │ 5. Database Query (if needed)    │
│  │ 6. Cache Update (if applicable)  │
│  │ 7. Publish Kafka Event (Change)  │
│  │ 8. Error Handler (if error)      │
│  │ 9. Response Serialization        │
│  │ 10. Metrics/Logging              │
│  └─────────────────────────────────┤
└────────┬────────────────────────────┘
         │
    ┌────┴──────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────────────────┐
│Response│  │Kafka Event Broker  │
│to Client   │(Async Notification)
└────────┘  └────────┬───────────┘
                     │
                     ▼
            ┌──────────────────┐
            │Other Services    │
            │(Subscribe to     │
            │ change events)   │
            └──────────────────┘
```

### Request Lifecycle (Detailed Steps)

#### 1. **Config-Service: Get All Configurations**

```
CLIENT: GET /api/configs
    │
    ▼
CONFIG-SERVICE RECEIVES REQUEST
    ├─ Middleware: Extract request ID (for tracing)
    ├─ Middleware: Log incoming request
    ├─ Middleware: Validate auth headers
    │
    ▼
CONTROLLER: getConfigs()
    ├─ Check cache (in-memory or Redis)
    │  └─ If cached: Return immediately
    │
    ├─ If NOT cached:
    │  ├─ Query PostgreSQL: SELECT * FROM configs
    │  ├─ Serialize results
    │  └─ Store in cache (TTL: 5 min)
    │
    ├─ Emit Prometheus metric: configs_fetched_total
    │
    ▼
RESPONSE: 200 OK
    {
      "configs": [
        { "id": "log_level", "value": "debug" },
        { "id": "timeout", "value": "30000" }
      ]
    }
    
    ├─ Middleware: Log response
    ├─ Middleware: Add correlation ID to headers
    └─ Send to Client
```

#### 2. **Config-Service: Create/Update Configuration**

```
CLIENT: POST /api/configs
Body: { "key": "api_rate_limit", "value": "1000" }
    │
    ▼
CONFIG-SERVICE RECEIVES REQUEST
    ├─ Middleware: Request ID assignment
    ├─ Middleware: Validate request body
    ├─ Middleware: Check authorization
    │
    ▼
CONTROLLER: createConfig()
    ├─ Validate input (key, value format)
    │
    ├─ Database transaction START
    │  ├─ INSERT INTO configs (key, value)
    │  ├─ INSERT INTO config_audit_log (for history)
    │  └─ COMMIT
    │
    ├─ Clear cache (invalidate all)
    │
    ├─ PUBLISH KAFKA EVENT
    │  ├─ Topic: "config.updated"
    │  └─ Payload: {
    │       event: "CONFIG_CREATED",
    │       key: "api_rate_limit",
    │       value: "1000",
    │       timestamp: "2026-05-20T10:30:00Z",
    │       requestId: "req-123-abc"
    │     }
    │
    ├─ Emit Prometheus metrics:
    │  ├─ configs_created_total++
    │  └─ config_write_duration_ms
    │
    ▼
RESPONSE: 201 Created
    {
      "id": "cfg_001",
      "key": "api_rate_limit",
      "value": "1000",
      "createdAt": "2026-05-20T10:30:00Z"
    }
    
    └─ ALL SERVICES LISTENING TO KAFKA:
       ├─ Feature-Flag-Service: Receives event, validates
       ├─ Logging System: Logs configuration change
       ├─ Audit Service: Records who changed what
       └─ Cache Invalidation Service: Clears distributed cache
```

#### 3. **Feature-Flag-Service: Evaluate Flag**

```
CLIENT: GET /api/flags/feature.new-ui
    │
    ▼
FEATURE-FLAG-SERVICE RECEIVES REQUEST
    ├─ Middleware: Request ID assignment
    ├─ Middleware: Extract user context (if provided)
    │
    ▼
CONTROLLER: getFlag()
    ├─ Check IN-MEMORY CACHE (fastest)
    │  └─ If found & not stale: Return immediately
    │
    ├─ If NOT cached or STALE:
    │  ├─ Query PostgreSQL: SELECT * FROM flags WHERE name = ?
    │  ├─ Evaluate based on:
    │  │  ├─ User ID (if provided)
    │  │  ├─ User segment/cohort
    │  │  ├─ Percentage rollout
    │  │  └─ Custom rules
    │  │
    │  ├─ Store in in-memory cache (TTL: 1 min)
    │
    ├─ Emit Prometheus metrics:
    │  ├─ flag_evaluations_total
    │  ├─ flag_enabled_count
    │  └─ flag_disabled_count
    │
    ▼
RESPONSE: 200 OK
    {
      "name": "feature.new-ui",
      "enabled": true,
      "description": "New UI redesign",
      "rolloutPercentage": 50,
      "userEligible": true,
      "evaluatedAt": "2026-05-20T10:30:00Z"
    }
    
    └─ Client can make decision: Use new UI or fallback
```

#### 4. **Feature-Flag-Service: Update Flag (Kafka Event)**

```
CLIENT: PUT /api/flags/feature.new-ui
Body: { "enabled": false, "rolloutPercentage": 30 }
    │
    ▼
FEATURE-FLAG-SERVICE RECEIVES REQUEST
    ├─ Middleware: Request ID assignment
    ├─ Middleware: Check authorization (admin only)
    │
    ▼
CONTROLLER: updateFlag()
    ├─ Validate payload
    │
    ├─ Database transaction START
    │  ├─ UPDATE flags SET enabled=?, rolloutPercentage=?
    │  ├─ INSERT INTO flag_audit_log (who changed what)
    │  └─ COMMIT
    │
    ├─ Clear IN-MEMORY CACHE
    │
    ├─ PUBLISH KAFKA EVENT
    │  ├─ Topic: "flags.updated"
    │  └─ Payload: {
    │       event: "FLAG_UPDATED",
    │       flagName: "feature.new-ui",
    │       enabled: false,
    │       rolloutPercentage: 30,
    │       changedBy: "admin@company.com",
    │       timestamp: "2026-05-20T10:31:00Z"
    │     }
    │
    ├─ Emit Prometheus metrics
    │
    ▼
RESPONSE: 200 OK
    {
      "name": "feature.new-ui",
      "enabled": false,
      "rolloutPercentage": 30,
      "updatedAt": "2026-05-20T10:31:00Z"
    }
    
    └─ OTHER SYSTEMS LISTEN:
       ├─ Clients subscribed to WebSocket: Get real-time notification
       ├─ Logging systems: Record audit trail
       ├─ Monitoring systems: Alert on flag changes
       └─ Analytics systems: Log feature adoption metrics
```

---

## Complete System Workflow: End-to-End Example

### Scenario: Rolling out a new feature safely

```
TIMELINE:

10:00 AM - Feature Flag Created
  └─ Admin creates "feature.new-dashboard" → disabled
    └─ Kafka event published
    └─ All services notified

10:15 AM - Internal Testing (0% rollout)
  └─ Admin updates flag → enabled for team members
    └─ Kafka event published
    └─ Team members can test

10:30 AM - Beta Testing (10% rollout)
  └─ Admin updates rolloutPercentage to 10
    └─ Kafka event published
    └─ 10% of users see new dashboard
    └─ Monitoring begins (errors, performance)

10:45 AM - Increase Rollout (25% rollout)
  └─ Admin increases to 25%
    └─ More users can access feature
    └─ Metrics show 2x traffic, no errors
    └─ Decision: Looks good!

11:00 AM - Full Rollout (100%)
  └─ Admin enables for all users
    └─ All clients get flag evaluation = true
    └─ Feature-Flag-Service serves from cache
    └─ No database hit needed

12:00 PM - Monitor & Collect Metrics
  └─ Prometheus collects:
    ├─ feature.new-dashboard evaluations/sec
    ├─ latency percentiles (p50, p95, p99)
    ├─ error rate
    └─ user adoption curve
    
  └─ Grafana dashboard shows:
    ├─ Feature adoption over time
    ├─ Performance comparison (new vs old)
    └─ Error/exception rates

2:00 PM - Issue Detected
  └─ Spike in error_rate for new-dashboard users
    └─ Admin immediately:
      ├─ Updates flag to rolloutPercentage: 50 (rollback)
      ├─ Kafka event published
      ├─ Clients refresh and get new flag value
      ├─ 50% of users switch back to old UI
      └─ Error rate drops to normal
    
  └─ Team investigates root cause
    └─ Fixes issue in code

3:00 PM - Re-deploy & Test
  └─ New build deployed to staging
    └─ QA team tests with feature flag disabled
    └─ Tests pass

4:00 PM - Gradual Re-rollout
  └─ Admin enables flag again at 10%
    └─ Kafka event published
    └─ Careful monitoring begins again
    └─ Metrics show normal error rate
    └─ Gradually increase: 25% → 50% → 100%

5:00 PM - Success! Feature fully rolled out
  └─ New dashboard available to all users
  └─ Old code can be removed in next release
```

---

## How Services Communicate

### 1. **Synchronous (REST API)**
```
Client App
    │
    ├─→ GET /api/configs          → Config-Service
    │
    └─→ GET /api/flags/{name}     → Feature-Flag-Service
```

### 2. **Asynchronous (Kafka Events)**
```
Config-Service
    │
    └─→ Publishes: "config.updated" → Kafka Topic
                                        │
                                        ├─→ Feature-Flag-Service (listens)
                                        ├─→ Logging Service (listens)
                                        ├─→ Audit Service (listens)
                                        └─→ Other Microservices (listen)

Feature-Flag-Service
    │
    └─→ Publishes: "flags.updated" → Kafka Topic
                                        │
                                        ├─→ Web Clients (WebSocket listeners)
                                        ├─→ Mobile Clients (via backend)
                                        ├─→ Analytics Service (listens)
                                        └─→ Monitoring Dashboards (listen)
```

### 3. **Database-Backed State**
```
Config-Service
    │
    └─→ PostgreSQL: config_db
        ├─ configs table (key-value pairs)
        └─ config_audit_log (history)

Feature-Flag-Service
    │
    └─→ PostgreSQL: flags_db
        ├─ flags table (flag definitions)
        ├─ flag_rules table (evaluation rules)
        └─ flag_audit_log (change history)
```

---

## Deployment Workflow (CI/CD Pipeline)

```
Developer Pushes Code to Team3 Branch
    │
    ▼
GITHUB ACTIONS TRIGGERED
    │
    ├─ LINT JOB
    │  ├─ Install dependencies
    │  ├─ Run ESLint
    │  └─ Check for style violations
    │     └─ If FAIL: Stop pipeline, notify developer
    │
    ├─ TEST JOB (depends on LINT)
    │  ├─ Spin up PostgreSQL (Docker service)
    │  ├─ Spin up Kafka (Docker service)
    │  ├─ Wait for Kafka readiness (our fix!)
    │  ├─ Install dependencies
    │  ├─ Run unit tests
    │  ├─ Run integration tests
    │  ├─ Generate coverage report
    │  └─ Upload artifacts
    │     └─ If FAIL: Stop pipeline, show coverage
    │
    ├─ DOCKER BUILD & PUSH JOB (if main OR Team3)
    │  ├─ Authenticate to GHCR
    │  ├─ Build Docker image
    │  ├─ Tag with git SHA
    │  ├─ Push to ghcr.io/TasneemAbdelaziz
    │  └─ Also push "latest" tag
    │
    └─ DEPLOY JOB (if MAIN branch only)
       ├─ Configure kubectl from secrets
       ├─ Apply K8s manifests
       │  ├─ Namespace
       │  ├─ ConfigMap
       │  ├─ Secret
       │  ├─ Service (expose port)
       │  ├─ Deployment (roll out pods)
       │  ├─ Ingress (route from domain)
       │  └─ HPA (auto-scale if CPU > 70%)
       │
       ├─ Update deployment image to new SHA
       ├─ Wait for rollout (30s timeout)
       │  └─ If successful: New version live
       │  └─ If timeout: Automatic rollback to previous
       │
       └─ SUCCESS: Feature available in production
```

---

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
