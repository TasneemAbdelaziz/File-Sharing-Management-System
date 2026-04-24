# Nexus Distributed File Storage System

## Project Overview

This repository contains the architecture and implementation for the **Nexus Distributed File Storage Platform**. It is a production-style, distributed system composed of **40 independent microservices** simulating a cloud object storage platform. The system handles chunk-based distributed storage, failure recovery, event-driven communication (via Apache Kafka), and follows strict independent database ownership rules per service.

## Team Nexus - Microservices Distribution

The development is divided among the members of **Team Nexus**. Each member is responsible for specific microservices. The code for the other team members will be committed to a combined GitHub repository, but each under their respective branch.

- **Basant Awad - 22101405:** File Quota + Presigned URL
- **Nadira Mohamed Elsirafy - 22101377:** File Registry + Upload Session
- **Mohamed Alsariti - 22101901:** API Keys + Rate Limit
- **Merna Adel Abdelrahman - 22101164:** Download Orchestrator + File Sharing
- **Ahmed Adel Abdelrahman - 22101163:** Replication Worker + Rebalance

> **Note:** The remaining 30 microservices will be implemented later or will be integrated as placeholders until full deployment is completed.

---

## Finished Services (This Branch)

This branch focuses on the complete implementation of two specific microservices by **Basant Awad**, adhering strictly to the final project specifications.

### 1. File Quota Service (#35)

- **Responsibility:** Manages per-user storage quota and validates uploads against remaining space.
- **Architecture Pattern:** Layered Architecture (Controller, Service, Repository).
- **Communication:** Hybrid REST + Kafka. It publishes to the `quota.exceeded` topic when a user hits their storage limit, allowing notification services to alert the user and upload sessions to be blocked.
- **Database:** Owns private PostgreSQL DB (`quota_db`).
- **Endpoints:**
  - `GET /health` & `GET /ready`
  - `GET /quota/{user_id}`
  - `POST /quota/check`
  - `POST /quota/update`

### 2. Presigned URL Service (#36)

- **Responsibility:** Generates temporary presigned URLs for secure direct upload/download access.
- **Architecture Pattern:** Layered Architecture (Controller, Service, Repository).
- **Communication:** Pure REST Only. URL generation is a synchronous operation requiring immediate response, without any downstream reactive events.
- **Database:** Owns private PostgreSQL DB (`url_db`).
- **Endpoints:**
  - `GET /health` & `GET /ready`
  - `POST /urls/upload`
  - `POST /urls/download`

---

## Technical Stack

- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database Query Builder:** Knex.js
- **Database Engine:** PostgreSQL
- **Event Bus:** Apache Kafka + Zookeeper
- **Containerization:** Docker & Docker Compose

## Running the Services Locally

1. Ensure Docker and Docker Compose are installed.
2. At the root directory, run:
   ```bash
   docker-compose up --build -d
   ```
3. Zookeeper, Kafka, and the PostgreSQL databases will initialize. The node services will start automatically.
4. Test the health checks:
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3002/health
   ```

---

## Merna Contribution (Download Orchestrator + File Sharing)

This branch adds Merna Adel Abdelrahman services to the Team1 baseline:

### 1. Download Orchestrator
- Endpoint: GET /downloads/{file_id}/plan
- Publishes Kafka event: file.downloaded
- Background consumer stores:
  - download analytics record
  - download audit record

### 2. File Sharing
- Endpoints:
  - POST /shares
  - GET /shares/{token}
- Publishes Kafka event: file.shared
- Background consumer stores:
  - notification email log
  - share analytics log

### Added Infrastructure
- Docker setup for both services
- Kubernetes manifests:
  - k8s/download-orchestrator.yaml
  - k8s/file-sharing.yaml
- Health/readiness endpoints and test setup for both services
