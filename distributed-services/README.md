# Distributed Storage System — PM2 Services

Two microservices from the CSE474 Distributed Systems project, managed by **PM2** and structured with **MVC architecture**.

---

## Services

| # | Service | Pattern | Port | Kafka In | Kafka Out |
|---|---------|---------|------|----------|-----------|
| 21 | **Replication Worker** | HTTP + Kafka Consumer | 3021 | `replication.task.created` | `replication.completed` / DLQ |
| 22 | **Rebalance Service** | Hybrid REST + Kafka | 3022 | — | `rebalance.started` |

### Databases
* **Replication Worker DB**: `replication_tasks(id PK, chunk_id, status, attempts)`
* **Rebalance Service DB**: `rebalance_runs(id PK, status)`

---

## MVC Architecture

Each service follows a strict MVC layering. No layer crosses its boundary.

```
src/
├── config/
│   └── kafka.js              → Kafka client singleton
├── models/                   ← M  data shape, validation, serialization
├── services/                 ←    business logic (between C and M)
├── controllers/              ← C  handle req/res, delegate to service
├── routes/                   ←    wire URL paths to controllers
├── consumers/                ←    Kafka entry point (mirrors routes for async)
├── app.js                    ←    Express factory, registers all routes
└── index.js                  ←    bootstrap only (start server + Kafka)
```

### Layer responsibilities

| Layer | Never does | Always does |
|-------|-----------|-------------|
| `models/` | HTTP, Kafka | Validate fields, shape data, serialize |
| `services/` | Touch `req`/`res` | Business logic, call models, publish events |
| `controllers/` | Business logic | Parse request, call service, format response |
| `routes/` | Logic | Map HTTP verbs + paths to controllers |
| `consumers/` | Business logic | Parse Kafka message, call service |
| `app.js` | Logic | Create Express app, register routes |
| `index.js` | Anything else | Bootstrap server + Kafka, graceful shutdown |

### Replication Worker MVC flow

**HTTP Flow:**
```
POST /replication/tasks
    │
    ▼
controllers/ReplicationController.js
    │
    ▼
services/ReplicationService.js  (save to DB)
    │
    ▼
models/ReplicationTask.js
```

**Kafka Flow:**
```
Kafka message (replication.task.created)
    │
    ▼
consumers/KafkaConsumer.js   (parse raw message)
    │
    ▼
services/ReplicationService.js  (reads chunk, writes target, updates chunk_locations, retry logic, DLQ, publish result)
    │
    ▼
models/ReplicationTask.js    (validate fields, update attempts/status)
    │
    ▼
config/kafka.js              (publish to replication.completed or DLQ)
```

### Rebalance Service MVC flow

```
POST /rebalance/run
    │
    ▼
routes/rebalance.js          (route definition)
    │
    ▼
controllers/RebalanceController.js  (parse req, call service, format res)
    │
    ▼
services/RebalanceService.js  (create run, publish event)
    │
    ▼
models/RebalanceRun.js        (UUID, validation, toEvent())
    │
    ▼
config/kafka.js               (publish to rebalance.started)
```

---

## PM2 Configuration

Each service has its own `ecosystem.config.js`:

| Setting | Value | Reason |
|---------|-------|--------|
| `instances: 2` | 2 | Project rule: `replicas = 2` |
| `exec_mode: 'cluster'` | cluster | Load-balanced, shared port via IPC |
| `autorestart: true` | true | Auto-recover on crash |
| `max_restarts: 10` | 10 | Prevents restart storms |
| `kill_timeout: 8000` | 8 s | Allows Kafka to flush before SIGKILL |
| `max_memory_restart` | 300 MB | Memory guard |

---

## Prerequisites

- Node.js ≥ 20
- PM2 (`npm install -g pm2`)
- Docker & Docker Compose (for full stack)

---

## Setup & Run

### 1. Install PM2 globally

```bash
npm install -g pm2
```

### 2. Install dependencies

```bash
cd replication-worker && npm install && cd ..
cd rebalance-service  && npm install && cd ..
```

### 3. Copy environment files

```bash
cp replication-worker/.env.example replication-worker/.env
cp rebalance-service/.env.example  rebalance-service/.env
```

### 4. Start both services with PM2

```bash
cd replication-worker && pm2 start ecosystem.config.js
cd ../rebalance-service && pm2 start ecosystem.config.js
```

### 5. Monitor

```bash
pm2 status                       # list all processes
pm2 logs                         # tail all logs
pm2 logs replication-worker      # tail one service
pm2 monit                        # live dashboard
```

### 6. Stop / Restart

```bash
pm2 restart replication-worker
pm2 stop    rebalance-service
pm2 delete  all
```

### 7. Save & auto-start on reboot

```bash
pm2 save
pm2 startup   # follow the printed command
```

---

## Docker (Full Stack)

Starts Zookeeper, Kafka, and both services. PM2 runs **inside** each container via `pm2-runtime`.

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Replication Worker | http://localhost:3021/health |
| Rebalance Service  | http://localhost:3022/health |

---

## API Reference

### Replication Worker

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe |
| POST | `/replication/tasks` | Create a replication task |

#### POST /replication/tasks

```json
// Request
{ "chunk_id": "uuid-1234" }

// Response 201
{
  "success": true,
  "data": { "id": "uuid", "chunk_id": "uuid-1234", "status": "pending", "attempts": 0 },
  "meta": { "service": "replication-worker", "request_id": "uuid" }
}
```

### Rebalance Service

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness probe |
| GET | `/ready` | — | Readiness probe |
| POST | `/rebalance/run` | — | Trigger rebalance → emits `rebalance.started` |

#### POST /rebalance/run

```json
// Request
{}

// Response 202
{
  "success": true,
  "data": { "id": "uuid", "status": "triggered" },
  "meta": { "service": "rebalance-service", "request_id": "uuid" }
}
```

---

## Tests

```bash
cd replication-worker && npm test
cd rebalance-service  && npm test
```

Tests cover: health endpoints, model validation, controller responses (Kafka mocked).

---

## Project Standards Compliance

- ✅ MVC architecture — models, services, controllers, routes strictly separated
- ✅ `GET /health` and `GET /ready` on every service
- ✅ Standard JSON response format (`success`, `data`, `meta`)
- ✅ Kafka consumer group IDs as per spec
- ✅ DLQ after 3 retries (Replication Worker)
- ✅ `replicas = 2` via PM2 cluster mode
- ✅ Graceful shutdown on `SIGINT` (PM2 signal)
- ✅ Containerized with `pm2-runtime` in Docker
