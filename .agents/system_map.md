# System Map — Microservices Architecture

> **Status:** Living Document | Updated as architecture evolves
> **Scope:** Patient Management Service + Appointment Scheduling Service

---

## 1. Service Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client / API Consumer                        │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │ HTTP                             │ HTTP
               ▼                                 ▼
┌──────────────────────────┐       ┌──────────────────────────────────┐
│  Patient Management       │       │  Appointment Scheduling          │
│  Service                  │       │  Service                         │
│                           │       │                                  │
│  Port: 5000               │       │  Port: 8000                      │
│  DB:   PatientMgmtSvc     │       │  DB:   AppointmentSchedulingSvc  │
│  Role: Publisher          │       │  Role: Subscriber                │
└──────────────┬────────────┘       └──────────────────────────────────┘
               │                                 ▲
               │  PUBLISH patient_events          │ SUBSCRIBE patient_events
               ▼                                 │
        ┌──────────────┐                         │
        │  Redis 6379  │─────────────────────────┘
        │  Pub/Sub     │
        │  Channel:    │
        │  patient_    │
        │  events      │
        └──────────────┘
```

---

## 2. Service Details

### Patient Management Service (Publisher)
| Property | Value |
|---|---|
| **Port** | `5000` |
| **Language** | TypeScript / Node.js / Express |
| **ORM** | TypeORM |
| **Database** | PostgreSQL — `PatientManagementService` |
| **DB Config** | `src/Database/PostgresDataSourceOptions.ts` *(Capital D)* |
| **Entry Point** | `src/server.ts` |
| **Redis Role** | Publisher only |
| **Redis Client** | `ioredis` |
| **Redis Channel** | `patient_events` |
| **Logging** | Winston + Morgan |

### Appointment Scheduling Service (Subscriber)
| Property | Value |
|---|---|
| **Port** | `8000` |
| **Language** | TypeScript / Node.js / Express |
| **ORM** | TypeORM |
| **Database** | PostgreSQL — `AppointmentSchedulingService` |
| **DB Config** | `src/database/PostgresDataSourceOptions.ts` *(Lowercase d)* |
| **Entry Point** | `src/server.ts` |
| **Redis Role** | Subscriber only (daemon runs after DB init) |
| **Redis Client** | `ioredis` |
| **Redis Channel** | `patient_events` |

---

## 3. Database Schema

### `PatientManagementService` — `patient` table
| Column | Type | Constraint |
|---|---|---|
| `id` | `int` | PK, autoincrement |
| `name` | `varchar` | NOT NULL |
| `gender` | `varchar` | nullable |
| `dateOfBirth` | `date` | NOT NULL |
| `phoneNumber` | `varchar` | nullable |
| `email` | `varchar` | nullable |
| `address` | `varchar` | nullable |
| `emergencyContactName` | `varchar` | nullable |
| `emergencyContactPhone` | `varchar` | nullable |
| `bloodType` | `varchar` | nullable |
| `allergies` | `simple-array` | nullable |
| `medicalConditions` | `varchar` | nullable |
| `nationalId` | `varchar` | UNIQUE, nullable |
| `createdDate` | `timestamp` | auto |
| `lastUpdated` | `timestamp` | auto |

### `AppointmentSchedulingService` — `appointment` table
| Column | Type | Constraint |
|---|---|---|
| `id` | `int` | PK, autoincrement |
| `date` | `date` | NOT NULL |
| `timezone` | `varchar` | NOT NULL |
| `AppointmentTime` | `varchar` | NOT NULL |
| `duration` | `int` | NOT NULL, Min(1) |
| `doctorName` | `varchar` | NOT NULL |
| `patientId` | `int` | NOT NULL (FK-mirror) |

### `AppointmentSchedulingService` — `patient_cache` table *(to be created in Phase 2)*
| Column | Type | Constraint |
|---|---|---|
| `id` | `int` | PK (non-autoincrement, mirrors Patient.id) |
| `name` | `varchar` | NOT NULL |

---

## 4. Event Contract

### Channel: `patient_events`

#### Event: `patient.upserted`
```json
{
  "event": "patient.upserted",
  "data": {
    "id": 12,
    "name": "Jane Doe"
  }
}
```
**Trigger:** Patient created or updated in Patient Management Service.  
**Consumer action:** UPSERT into `patient_cache` table.

#### Event: `patient.deleted`
```json
{
  "event": "patient.deleted",
  "data": {
    "id": 12
  }
}
```
**Trigger:** Patient deleted in Patient Management Service.  
**Consumer action:** DELETE from `patient_cache` by id.

---

## 5. API Endpoints

### Patient Management Service (`localhost:5000`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/patient/create` | Create a new patient |
| `GET` | `/patient/getpatientbyid/:id` | Get patient by ID |
| `PUT` | `/patient/update/:id` | Update patient |
| `DELETE` | `/patient/delete/:id` | Delete patient |

### Appointment Scheduling Service (`localhost:8000`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/appointments/create` | Create appointment (verifies patient via local cache) |
| `GET` | `/appointments` | List all appointments |
| `GET` | `/appointments/:id` | Get appointment by ID |
| `PUT` | `/appointments/:id` | Update appointment |
| `DELETE` | `/appointments/:id` | Delete appointment |

---

## 6. Infrastructure (Docker Compose)

| Container | Image | Port Mapping | Network |
|---|---|---|---|
| `microservices-redis` | `redis:7-alpine` | `6379:6379` | `microservices-net` |
| `microservices-postgres-patient` | `postgres:15-alpine` | `5432:5432` | `microservices-net` |
| `microservices-postgres-appointment` | `postgres:15-alpine` | `5433:5432` | `microservices-net` |
| `patient-management-service` | Local build | `5000:5000` | `microservices-net` |
| `appointment-scheduling-service` | Local build | `8000:8000` | `microservices-net` |

---

## 7. Known Architecture Decisions

| Decision | Rationale |
|---|---|
| Redis Pub/Sub over HTTP calls | Eliminates tight coupling; Appointment Service is self-sufficient if Patient Service goes down |
| Local `patient_cache` table | Appointment Service queries its own DB — zero network latency for patient verification |
| Separate Postgres instances | Data isolation; each service owns its data domain |
| Event payload minimal (`id` + `name` only) | PatientCache stores only what Appointment Service needs — least privilege data sharing |
| `ioredis` over native redis client | Better TypeScript support, connection retry, and Pub/Sub API |
