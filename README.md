# Distributed File Storage System

## Overview
This project implements a distributed file storage platform using a microservices architecture.  
The system simulates a simplified cloud storage service that supports file upload, download, and metadata management.

## Architecture
The system consists of multiple independent microservices where each service:
- Owns its own database
- Communicates using REST APIs
- Runs inside Docker containers
- Is deployed using Kubernetes

Each service exposes standard health endpoints:

GET /health  
GET /ready  

## Features
- Distributed chunk-based storage
- File metadata management
- Replication and failure recovery
- Monitoring and observability
- CI/CD pipeline
