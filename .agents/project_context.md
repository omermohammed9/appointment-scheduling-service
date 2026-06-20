# Project Context — Microservices System

> **Document Type:** Architectural Decision Record + Project Brief
> **Audience:** Developers, AI Agents, Code Reviewers

---

## 1. Project Purpose

This system is a **healthcare microservices platform** consisting of two independent services:

1. **Patient Management Service** — the authoritative source of patient records
2. **Appointment Scheduling Service** — manages doctor appointments, with patient verification

The two services communicate via **Redis Pub/Sub event-driven replication**, eliminating synchronous HTTP coupling and enabling the Appointment Service to remain fully operational even when the Patient Service is offline.

---

## 2. Problem Statement

### Initial Problem
The Appointment Service originally verified patient existence by making a **synchronous HTTP call** to the Patient Service (`axios.get`). This created:

- **Tight coupling** — Appointment Service breaks if Patient Service is unavailable
- **Latency** — Every appointment creation requires a network round-trip
- **Fragility** — Single point of failure for a core business flow

### Solution
Replace the synchronous HTTP call with an **event-driven local cache** pattern:

1. Patient Service publishes events on every create/update/delete
2. Appointment Service subscribes and maintains a local `patient_cache` table
3. Patient verification reads from the local DB — zero network dependency

---

## 3. Technology Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Long-term support, broad ecosystem |
| Language | TypeScript | 5.x | Type safety, IDE support, refactoring confidence |
| Framework | Express | 4.x | Lightweight, well-understood, minimal overhead |
| ORM | TypeORM | 0.3.x | Decorator-based entities, migration support, PostgreSQL alignment |
| Database | PostgreSQL | 15 | ACID compliance, relational integrity |
| Message Broker | Redis (Pub/Sub) | 7 | Simple, fast, zero-config for pub/sub; ioredis client |
| Validation | class-validator + class-transformer | latest | Declarative DTO validation |
| Logging | Winston + Morgan | latest | Structured JSON logs, request logging |
| Containerization | Docker + Docker Compose | v2 | Reproducible environments, infra-as-code |

---

## 4. Architecture Decisions

### ADR-001: Redis Pub/Sub over REST
- **Decision:** Use Redis `patient_events` channel instead of HTTP polling or webhook
- **Rationale:** Fire-and-forget; Appointment Service cannot block Patient Service operations
- **Trade-off:** At-most-once delivery (Phase 3 will address with Redis Streams consideration)

### ADR-002: Minimal Event Payload
- **Decision:** Publish only `{ id, name }` in patient events — not the full Patient object
- **Rationale:** PatientCache stores only what Appointment Service needs; avoids over-sharing sensitive medical data (HIPAA-awareness)
- **Trade-off:** If more fields are needed later, the event contract must be versioned

### ADR-003: Separate PostgreSQL Instances
- **Decision:** Two separate Postgres databases (PatientManagementService, AppointmentSchedulingService)
- **Rationale:** True service isolation; each service owns its data domain
- **Trade-off:** No cross-service joins; data must be replicated explicitly via events

### ADR-004: TypeORM `synchronize: true` (Development Only)
- **Decision:** Use `synchronize: true` during development for rapid iteration
- **Trade-off:** MUST be disabled before production; replace with TypeORM migrations
- **Action Item:** Phase 5 includes migration strategy

### ADR-005: ioredis over `redis` npm package
- **Decision:** Use `ioredis` for both services
- **Rationale:** Better TypeScript types, built-in retry strategy, Pub/Sub stability, widely adopted

---

## 5. Service Boundaries & Ownership

| Domain | Owner Service | Rule |
|---|---|---|
| Patient CRUD | Patient Management Service | Only this service writes to the `patient` table |
| Patient existence verification | Appointment Scheduling Service | Reads from its own `patient_cache` — never calls Patient Service |
| Appointment CRUD | Appointment Scheduling Service | Only this service writes to the `appointment` table |
| Event publishing | Patient Management Service | All `patient_events` originate here |
| Event consumption | Appointment Scheduling Service | Processes `patient_events`, updates local cache |

---

## 6. Constraints

| Constraint | Impact |
|---|---|
| Redis Pub/Sub is not persistent | Messages lost if subscriber is offline during publish |
| No authentication layer (yet) | Both services are open; JWT/API key layer is a future phase |
| TypeORM `synchronize` in dev | Schema drift risk; must migrate to explicit migrations for production |
| No message ordering guarantee | Redis Pub/Sub delivers in order per connection, but not across reconnects |
| Single Redis instance | No Redis Cluster or Sentinel; SPOF for the event bus |

---

## 7. Non-Goals (Out of Scope)

- Authentication/authorization (planned future phase)
- Patient data encryption at rest
- Multi-region deployment
- GraphQL API layer
- Message replay / event sourcing (may be addressed in Phase 3 with Redis Streams)

---

## 8. Development Setup

### Prerequisites
- Node.js 20 LTS
- Docker Desktop
- npm 9+

### Quick Start
```bash
# Clone both repos
# Navigate to Desktop/microservices-workspace

docker-compose up -d            # Start Redis + both Postgres instances
# In Patient Management Service:
npm install && npm run dev      # Starts on :5000
# In Appointment Scheduling Service:
npm install && npm run dev      # Starts on :8000
```

### File Structure (per service)
```
src/
  .env                          # Local environment variables (never commit)
  server.ts                     # Entry point
  app.ts                        # Express app setup (appointment service only)
  controller/                   # HTTP request handlers
  service/                      # Business logic layer
  repository/                   # Data access layer
  entity/                       # TypeORM entity definitions
  dto/                          # Data Transfer Objects (input validation)
  routes/                       # Route definitions
  middleware/                   # Express middleware (error handling, auth)
  Database/ or database/        # TypeORM DataSource configuration
  winston/                      # Logger configuration
  utils/                        # Utility functions (date helpers, etc.)
.agents/                        # AI agent docs, phase checklists, architecture docs
.env.example                    # Environment variable template (committed)
Dockerfile                      # Container build instructions
docker-compose.dev.yml          # Solo dev run (this service + its DB only)
```
