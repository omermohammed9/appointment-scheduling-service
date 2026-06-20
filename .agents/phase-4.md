# Phase 4 — Observability & Logging

> **Goal:** Add structured logging, health check endpoints, and request tracing so both services are fully observable in production.
> **Model:** `gemini-flash` (boilerplate logging config, route scaffolding)
> **Prerequisite:** Phase 3 gate must be fully passed
> **Gate:** Health endpoints respond correctly; all log output is structured JSON in production mode

---

## 📋 Both Services — Structured Logging

### 4.1 Winston Logger Configuration Audit
**Patient Management Service — `src/winston/WinstonLogger.ts`:**
- [ ] Confirm logger exists and is exported as default
- [ ] Add `SERVICE_NAME` to every log entry using `defaultMeta`:
  ```typescript
  const logger = createLogger({
    defaultMeta: { service: 'patient-management-service' },
    // ...
  });
  ```
- [ ] Confirm transport includes:
  - **Console transport** (development): human-readable `colorize` + `simple` format
  - **File transport** (production): JSON format, file `logs/combined.log` + `logs/error.log`
- [ ] Add environment-conditional transport:
  ```typescript
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ];

  if (process.env.NODE_ENV === 'production') {
    transports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    transports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
  }
  ```
- [ ] Add `logs/` to `.gitignore`

**Appointment Scheduling Service:**
- [ ] Confirm Winston logger exists (check if in same location or create at `src/logger/logger.ts`)
- [ ] Apply same `defaultMeta: { service: 'appointment-scheduling-service' }` pattern
- [ ] Apply same transport configuration

### 4.2 Request Logging (Morgan → Winston)
**Patient Management Service:**
- [ ] Confirm Morgan is configured with Winston stream (verified in Phase 1 — already done ✅)
- [ ] Confirm Morgan format is `'combined'` for production, `'dev'` for development:
  ```typescript
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.http(message.trim()) }
  }));
  ```

**Appointment Scheduling Service:**
- [ ] Confirm Morgan middleware is registered in `src/app.ts`
- [ ] Apply same Winston stream integration

### 4.3 Structured Log Format for Key Events
Replace any remaining plain logs with structured Winston calls:

**Patient Management Service:**
- [ ] `createPatient` success: `logger.info('Patient created', { patientId: saved.id, name: saved.name })`
- [ ] `updatePatient` success: `logger.info('Patient updated', { patientId: id })`
- [ ] `deletePatient` success: `logger.info('Patient deleted', { patientId: id })`
- [ ] Redis publish success: `logger.info('[Redis] Event published', { event, patientId: id })`
- [ ] Redis publish failure: `logger.error('[Redis] Publish failed', { event, patientId: id, error })`

**Appointment Scheduling Service:**
- [ ] `createAppointment` success: `logger.info('Appointment created', { appointmentId: a.id, patientId: a.patientId })`
- [ ] Cache sync success: `logger.info('[Cache] Patient synced', { patientId: id, name })`
- [ ] Cache delete: `logger.info('[Cache] Patient removed', { patientId: id })`
- [ ] Patient not found: `logger.warn('Patient not in cache', { patientId })`

---

## 📋 Both Services — Health Check Endpoints

### 4.4 Patient Management Service — `/health` Route
- [ ] Create `src/routes/healthRoutes.ts`:
  ```typescript
  import { Router, Request, Response } from 'express';
  import AppDataSource from '../Database/database';
  import redisPublisher from '../redis/redisPublisher';

  const healthRouter = Router();

  healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, string> = {};
    let status = 'ok';

    try {
      await AppDataSource.query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      status = 'degraded';
    }

    try {
      await redisPublisher.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      status = 'degraded';
    }

    res.status(status === 'ok' ? 200 : 503).json({
      status,
      service: 'patient-management-service',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  export default healthRouter;
  ```
- [ ] Register in `server.ts`: `app.use('/health', healthRouter)`
- [ ] Test: `GET http://localhost:5000/health` → `200 { status: "ok", ... }`
- [ ] Test: stop Redis → `GET /health` → `503 { status: "degraded", checks: { redis: "error" } }`

### 4.5 Appointment Scheduling Service — `/health` Route
- [ ] Apply same pattern using `AppDataSource` and `redisSubscriber`
- [ ] Register in `src/app.ts`: `app.use('/health', healthRouter)`
- [ ] Test: `GET http://localhost:8000/health` → `200 { status: "ok", ... }`
- [ ] Test: subscriber not connected → `503`

### 4.6 Startup Log Summary
- [ ] Both services log a startup summary after all connections are ready:
  ```
  [Patient Management Service] Started
    Port:     5000
    Database: PatientManagementService @ localhost:5432
    Redis:    redis://localhost:6379
    Env:      development
  ```

---

## 📋 Both Services — Request Tracing

### 4.7 Correlation ID Middleware (Optional but Recommended)
- [ ] Add `x-correlation-id` header support:
  ```typescript
  // src/middleware/correlationId.ts
  import { Request, Response, NextFunction } from 'express';
  import { v4 as uuidv4 } from 'uuid';

  export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  };
  ```
- [ ] Install `uuid`: `npm install uuid && npm install --save-dev @types/uuid`
- [ ] Register before routes in both services
- [ ] Include `correlationId` in all Winston log entries for request tracing

---

## 📋 Log File Management

### 4.8 Log Directory Setup
- [ ] Create `logs/` directory in both project roots (empty, gitignored)
- [ ] Add to `.gitignore`:
  ```
  logs/
  *.log
  ```
- [ ] Confirm Winston file transport writes to `logs/combined.log` and `logs/error.log`

### 4.9 Log Rotation (Production Consideration)
- [ ] Install `winston-daily-rotate-file`: `npm install winston-daily-rotate-file`
- [ ] Update logger to use rotating transport:
  ```typescript
  import DailyRotateFile from 'winston-daily-rotate-file';

  new DailyRotateFile({
    filename: 'logs/%DATE%-combined.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
  });
  ```

---

## 🧪 Phase 4 Observability Tests

### 4.10 Log Quality Check
- [ ] Run `npm run dev`, make several API calls, check `logs/combined.log`:
  - [ ] Each log line is valid JSON (in production mode)
  - [ ] Each log has `service`, `level`, `message`, `timestamp` fields
  - [ ] Request logs include method, url, status code, response time
- [ ] Confirm `logs/error.log` only contains `error` level entries

### 4.11 Health Check Tests
- [ ] `GET /health` on both services returns `200` with all checks `"ok"`
- [ ] Stop Redis → both `/health` endpoints return `503` with `redis: "error"`
- [ ] Restart Redis → both return `200` again (no restart needed)

---

## ✅ Phase 4 Gate

- [ ] `npx tsc --noEmit` passes in both services (0 errors)
- [ ] Both `/health` endpoints respond correctly under normal and degraded conditions
- [ ] All key events produce structured log entries
- [ ] Log files are written and not committed to git
- [ ] User sign-off: **☐ Approved to proceed to Phase 5**
