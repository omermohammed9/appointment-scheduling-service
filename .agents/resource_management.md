# Resource Management — Microservices System

> **Scope:** Redis connection lifecycle, PostgreSQL connection pooling, graceful shutdown
> **Applies to:** Both Patient Management Service and Appointment Scheduling Service

---

## 1. Redis Connection Strategy

### Singleton Pattern (Required)

Both services must instantiate Redis clients **once at module load** — never inside request handlers or per-operation.

```typescript
// ✅ Correct — module-level singleton
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Retry strategy — exponential backoff, max 10 retries
  retryStrategy(times: number): number | null {
    if (times > 10) {
      console.error('[Redis] Max retries reached. Giving up.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 3000); // 200ms → 3s cap
    console.warn(`[Redis] Retry #${times} in ${delay}ms`);
    return delay;
  },
  // Connection timeout
  connectTimeout: 10000,
  // Reconnect on idle
  keepAlive: 30000,
  // Disable offline queue if subscriber — events are ephemeral
  enableOfflineQueue: false, // Set true for publisher (to queue publishes)
});

redisClient.on('connect', () => console.info('[Redis] Connected'));
redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
redisClient.on('close', () => console.warn('[Redis] Connection closed'));
redisClient.on('reconnecting', (ms: number) => console.warn(`[Redis] Reconnecting in ${ms}ms`));

export default redisClient;
```

### Per-Service Configuration

| Setting | Publisher (Patient Svc) | Subscriber (Appointment Svc) |
|---|---|---|
| `enableOfflineQueue` | `true` (queue publish on disconnect) | `false` (ephemeral events) |
| `retryStrategy` | Exponential backoff, 10 retries | Exponential backoff, unlimited |
| Instance count | **1** publisher | **1** subscriber |
| Shared with app requests | No — dedicated to event publishing | No — dedicated to subscriptions |

---

## 2. PostgreSQL Connection Pool

TypeORM manages the connection pool via the DataSource configuration. Both services should set explicit pool limits:

```typescript
// src/Database/PostgresDataSourceOptions.ts (Patient)
// src/database/PostgresDataSourceOptions.ts (Appointment)

export const PostgresDataSourceOptions = (): DataSourceOptions => {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.NODE_ENV !== 'production', // NEVER sync in production
    logging: process.env.NODE_ENV === 'development',
    entities: [ /* ... */ ],
    // ── Pool Configuration ────────────────────────────────
    extra: {
      max: 10,           // Max connections in pool
      min: 2,            // Minimum idle connections kept alive
      idleTimeoutMillis: 30000,    // 30s idle before connection released
      connectionTimeoutMillis: 5000, // 5s to acquire connection before error
    },
  };
};
```

### Pool Sizing Guide

| Environment | `max` | `min` | Rationale |
|---|---|---|---|
| Development (local) | 5 | 1 | Low concurrency, save resources |
| Staging | 10 | 2 | Simulate light production load |
| Production | 20–50 | 5 | Based on expected RPS × avg query time |

> **Rule:** `max` connections × 2 services should not exceed Postgres `max_connections` (default: 100). Set Postgres `max_connections=200` in production.

---

## 3. Graceful Shutdown

Both services must handle `SIGTERM` and `SIGINT` to:
1. Stop accepting new requests
2. Drain in-flight requests
3. Close DB connections cleanly
4. Disconnect Redis client

```typescript
// src/server.ts — Graceful Shutdown Pattern

const shutdown = async (signal: string): Promise<void> => {
  console.info(`[Server] ${signal} received. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    console.info('[Server] HTTP server closed');

    try {
      // 2. Close DB connection pool
      await AppDataSource.destroy();
      console.info('[DB] Connection pool closed');

      // 3. Disconnect Redis
      await redisClient.quit();
      console.info('[Redis] Client disconnected');

      console.info('[Server] Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 15s if drain takes too long
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

---

## 4. Memory & Process Limits

### Node.js Heap
Set explicit memory limits in the Docker container:
```yaml
# docker-compose.yml
services:
  patient-management:
    environment:
      - NODE_OPTIONS=--max-old-space-size=512
    deploy:
      resources:
        limits:
          memory: 768m
```

### Redis Memory
Redis is configured with:
```
maxmemory 256mb
maxmemory-policy allkeys-lru
```
- `allkeys-lru` evicts least-recently-used keys when memory is full
- Patient cache keys will be evicted under pressure — **acceptable** since events will re-sync on next publish

---

## 5. Health Check Endpoints (Phase 4)

Both services must expose a `/health` endpoint that checks:

```typescript
// GET /health
// Response: 200 OK or 503 Service Unavailable

app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    service: process.env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
    }
  };

  try {
    await AppDataSource.query('SELECT 1');
    health.checks.database = 'ok';
  } catch {
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  try {
    await redisClient.ping();
    health.checks.redis = 'ok';
  } catch {
    health.checks.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 6. Connection Leak Prevention

| Pattern | Rule |
|---|---|
| TypeORM QueryRunner | Always call `release()` in a `finally` block |
| Manual DB queries | Use `AppDataSource.getRepository()` — never `createQueryRunner()` unless transaction needed |
| Redis blocking commands | Never use `BLPOP`/`BRPOP` on the publisher client |
| Event listeners | Remove listeners on graceful shutdown (`redisClient.removeAllListeners()`) |

---

## 7. Logging Resource Events

All resource lifecycle events must be logged at the appropriate level:

| Event | Level | Logger |
|---|---|---|
| DB connected | `info` | Winston |
| DB connection pool exhausted | `error` | Winston |
| Redis connected | `info` | Winston |
| Redis reconnecting | `warn` | Winston |
| Redis max retries exceeded | `error` | Winston |
| Graceful shutdown start | `info` | Winston |
| Forced shutdown (timeout) | `error` | Winston |
| Health check failure | `warn` | Winston |
