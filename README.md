> [!WARNING]
> **DEPRECATED**: This service has been migrated into the unified Hospital Microservices Monorepo. Please view the new repository here: [SumerCare](https://github.com/omermohammed9/SumerCare-)

# Appointment Scheduling Service

> **Role:** Microservice | Subscriber
> **Port:** `8000`
> **Database:** PostgreSQL — `AppointmentSchedulingService`
> **Event Bus:** Redis Pub/Sub — subscribes to `patient_events` channel

---

## Overview

The Appointment Scheduling Service manages doctor appointments for patients. It is designed to operate **fully independently** — it maintains a local `patient_cache` table synced from the Patient Management Service via Redis events, so it never makes synchronous HTTP calls for patient verification.

This makes the service **self-sufficient**: even if the Patient Management Service is offline, appointments can still be created for cached patients.

---

## Architecture

```
Client ──► Express API (:8000)
               │
               ├─► AppointmentController
               │       └─► AppointmentService
               │               ├─► AppointmentRepository ──► PostgreSQL (appointment table)
               │               └─► PatientCacheRepository ──► PostgreSQL (patient_cache table)
               │
               └─► Error Middleware ──► Winston Logger

Redis (:6379) ──► Subscriber Daemon
               └─► startEventSubscriber()
                       └─► patient_events → PatientCache upsert/delete
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5 (strict mode) |
| Framework | Express 4 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 15 |
| Event Bus | Redis 7 (ioredis — subscriber) |
| Logging | Winston + Morgan |
| Validation | class-validator + class-transformer |
| Container | Docker |

---

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15 (or Docker)
- Redis 7 (or Docker)
- npm 9+
- **Patient Management Service** must be running to sync patient data initially

---

## Quick Start (Local)

```bash
# 1. Clone and install
cd "appointment scheduling service"
npm install

# 2. Configure environment
cp .env.example src/.env
# Edit src/.env with your DB credentials

# 3. Start infrastructure (Docker)
docker run -d -p 5433:5432 -e POSTGRES_DB=AppointmentSchedulingService -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# 4. Start the service
npm run dev
```

Service will be available at `http://localhost:8000`

On startup, the Redis subscriber daemon activates and you will see:
```
[Subscriber] Redis Event Subscriber active on channel: patient_events
```

---

## Quick Start (Docker Compose — Full Stack)

```bash
cd Desktop/microservices-workspace
docker-compose up
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | HTTP server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | — | PostgreSQL username |
| `DB_PASSWORD` | — | PostgreSQL password |
| `DB_DATABASE` | `AppointmentSchedulingService` | Database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `NODE_ENV` | `development` | Environment (`development` / `production`) |

---

## API Endpoints

| Method | Path | Description | Body |
|---|---|---|---|
| `POST` | `/appointments/create` | Create appointment | `{ patientId, date, timezone, AppointmentTime, duration, doctorName }` |
| `GET` | `/appointments` | List all appointments | — |
| `GET` | `/appointments/:id` | Get appointment by ID | — |
| `PUT` | `/appointments/:id` | Update appointment | Partial appointment fields |
| `DELETE` | `/appointments/:id` | Delete appointment | — |
| `GET` | `/health` | Health check | — |

### Create Appointment — Request Example

```json
{
  "patientId": 1,
  "date": "2026-07-15",
  "timezone": "UTC",
  "AppointmentTime": "10:00",
  "duration": 30,
  "doctorName": "Dr. Smith"
}
```

**Validation rules:**
- `patientId` must exist in local `patient_cache` (synced from Patient Service)
- `date` + `AppointmentTime` must be in the future
- Appointment slot must not conflict with an existing booking

---

## Events Consumed

### Channel: `patient_events`

| Event | Action |
|---|---|
| `patient.upserted` | UPSERT into `patient_cache` (id, name) |
| `patient.deleted` | DELETE from `patient_cache` by id |

> ⚠️ Patient cache syncs asynchronously. If Patient Service has never published a patient, that patientId cannot be used in appointments until synced.

---

## Project Structure

```
src/
├── .env                          # Local secrets (not committed)
├── server.ts                     # Entry point + DB init + subscriber activation
├── app.ts                        # Express app setup
├── database/                     # TypeORM DataSource config (lowercase d)
├── controller/                   # HTTP request handlers
├── service/                      # Business logic
├── repository/                   # Data access layer
├── entity/                       # TypeORM entities (Appointment, PatientCache)
├── dto/                          # Input validation DTOs
├── routes/                       # Route definitions
├── middleware/                   # Error handling, correlation ID
├── redis/                        # Redis subscriber singleton
├── utils/                        # DateUtils, etc.
└── ResponseHelper/               # Standardized response formatting
.agents/                          # Architecture docs, phase checklists
.env.example                      # Environment variable template
Dockerfile                        # Production container build
docker-compose.dev.yml            # Solo dev run
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run migration:generate` | Generate TypeORM migration |
| `npm run migration:run` | Run pending migrations |

---

## Health Check

```bash
GET http://localhost:8000/health

# Response (200 OK)
{
  "status": "ok",
  "service": "appointment-scheduling-service",
  "timestamp": "2026-06-19T15:00:00.000Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Key Design Decision: Local Patient Cache

This service does **not** call the Patient Management Service over HTTP. Instead:

1. Patient Service publishes events to Redis on every create/update/delete
2. This service maintains a `patient_cache` table (id, name only)
3. `verifyPatientExists()` queries the local cache — zero network dependency

**Result:** If the Patient Service goes down, this service continues to function for all cached patients.

---

## Related Services

- [Patient Management Service](../Patient%20Management%20Service/README.md) — publisher of `patient_events`
- [System Map](../microservices-workspace/system_map.md) — full architecture topology
- [Workflow](../microservices-workspace/workflow.md) — end-to-end data flow
