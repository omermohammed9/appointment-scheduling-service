# Workflow — End-to-End Event-Driven Data Flow

> **Pattern:** Event-Driven Replication via Redis Pub/Sub
> **Services:** Patient Management (Publisher) → Appointment Scheduling (Subscriber)

---

## 1. Patient Create / Update Flow

```
Client
  │
  │  POST /patient/create  (or PUT /patient/update/:id)
  │
  ▼
Patient Management Service (Port 5000)
  │
  ├─► PatientController.createPatient()
  │       │
  │       ▼
  │   PatientService.createPatient(dto)
  │       │
  │       ├─► PatientRepository.save(patient)  ──►  PostgreSQL (PatientManagementService DB)
  │       │                                            patient table ← row inserted/updated
  │       │
  │       └─► publishUpsertEvent(id, name)
  │               │
  │               ▼
  │           redisPublisher.publish('patient_events', JSON payload)
  │
  ▼
Redis (Port 6379) — Channel: patient_events
  │
  │  Message: { event: 'patient.upserted', data: { id, name } }
  │
  ▼
Appointment Scheduling Service (Port 8000) — Subscriber Daemon
  │
  ├─► redisSubscriber.on('message', handler)
  │       │
  │       ├─► Parse JSON payload
  │       │
  │       ├─► event === 'patient.upserted'
  │       │       │
  │       │       ▼
  │       │   PatientCacheRepository.save({ id, name })
  │       │       │
  │       │       ▼
  │       │   PostgreSQL (AppointmentSchedulingService DB)
  │       │   patient_cache table ← row upserted
  │       │
  │       └─► Log: [Cache Updated] Synced patient ID: X - Name
  │
  ▼
 Done. Patient cache is now consistent.
```

---

## 2. Patient Delete Flow

```
Client
  │
  │  DELETE /patient/delete/:id
  │
  ▼
Patient Management Service
  │
  ├─► PatientService.deletePatient(id)
  │       │
  │       ├─► PatientRepository.delete(id)  ──►  PostgreSQL (row deleted)
  │       │
  │       └─► publishDeleteEvent(id)
  │               │
  │               ▼
  │           redisPublisher.publish('patient_events', { event: 'patient.deleted', data: { id } })
  │
  ▼
Redis — Channel: patient_events
  │
  ▼
Appointment Scheduling Service
  │
  └─► event === 'patient.deleted'
          │
          ▼
      PatientCacheRepository.delete(id)  ──►  PostgreSQL (cache row deleted)
```

---

## 3. Appointment Create Flow (Post-Integration)

```
Client
  │
  │  POST /appointments/create  { patientId: X, date, time, ... }
  │
  ▼
Appointment Scheduling Service (Port 8000)
  │
  ├─► AppointmentController.createAppointment()
  │       │
  │       ▼
  │   AppointmentService.createAppointment(dto)
  │       │
  │       ├─► verifyPatientExists(patientId)
  │       │       │
  │       │       ▼
  │       │   PatientCacheRepository.findOneBy({ id: patientId })
  │       │       │
  │       │       ├─► Found  ──► return true  (self-sufficient, no HTTP call)
  │       │       └─► Not Found ──► return false ──► throw Error('Patient does not exist')
  │       │
  │       ├─► isDateTimeInFuture() check
  │       │
  │       ├─► isAppointmentSlotTaken() check
  │       │
  │       └─► AppointmentRepository.createAppointment(dto)  ──►  PostgreSQL (appointment row created)
  │
  ▼
201 Created  { appointment data }
```

---

## 4. Startup Sequence

```
docker-compose up (or npm run dev per service)
    │
    ├─► Redis starts first (healthcheck: redis-cli ping)
    │
    ├─► Postgres-Patient starts (healthcheck: pg_isready)
    ├─► Postgres-Appointment starts (healthcheck: pg_isready)
    │
    ├─► Patient Management Service starts
    │       ├─► dotenv loads src/.env
    │       ├─► initializeDataSource() ──► connects to PatientManagementService DB
    │       ├─► TypeORM synchronize ──► creates/updates patient table
    │       ├─► redisPublisher initialized (ioredis)
    │       └─► Express server listens on :5000
    │
    └─► Appointment Scheduling Service starts
            ├─► dotenv loads src/.env
            ├─► AppDataSource.initialize() ──► connects to AppointmentSchedulingService DB
            ├─► TypeORM synchronize ──► creates/updates appointment + patient_cache tables
            ├─► app.listen(:8000)
            └─► startEventSubscriber() ──► redisSubscriber.subscribe('patient_events')
                    └─► Log: "Redis Event Subscriber active on channel: patient_events"
```

---

## 5. Error & Resilience Paths

| Scenario | Current Behavior | Target Behavior (Phase 3) |
|---|---|---|
| Redis down at publish | Silent failure (promise .catch logs) | Retry with exponential backoff; alert if retries exhausted |
| Redis down at subscribe | Connection error logged | Auto-reconnect via ioredis retry strategy |
| Patient Service down | N/A (Appointment reads local cache) | ✅ Already resilient post-Phase 2 |
| DB error on cache write | Error logged, event dropped | Dead letter log + retry mechanism |
| Invalid JSON in Redis message | JSON.parse throws | Wrapped try/catch (already present); add structured error log |
| Duplicate upsert event | Re-saves same data | Idempotent — safe (UPSERT by PK) |

---

## 6. Data Consistency Guarantees

| Guarantee | Mechanism |
|---|---|
| **Eventual consistency** | Patient cache syncs after Redis event delivery |
| **Idempotency** | UPSERT on `patient_cache.id` (PK) — replaying events is safe |
| **At-most-once delivery** | Redis Pub/Sub delivers once; no persistence on disconnect |
| **Cache integrity on delete** | `patient.deleted` event triggers `DELETE FROM patient_cache` |

> ⚠️ **Gap (Phase 3 target):** If Appointment Service is offline when a patient event fires, the message is lost. Mitigation: implement a reconciliation endpoint or upgrade to Redis Streams (persistent, replayable).
