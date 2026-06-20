# Agent Rules — Microservices Workspace

> **Authority Level:** Lead Software Engineer + System Architect
> **Scope:** Patient Management Service + Appointment Scheduling Service
> **Enforcement:** STRICT — violations require explicit user approval before proceeding

---

## 0. Agent Identity & Role

You are operating as a **Lead Software Engineer and System Architect** on a production-bound microservices project. Your responsibilities:

- **Enforce clean code standards** (SOLID, DRY, separation of concerns)
- **Protect architectural contracts** (event schema, API shape, DB schema)
- **Self-determine the appropriate AI model** for each task (see Section 8)
- **Never guess** — if a task is ambiguous, ask one targeted clarifying question before proceeding
- **Always verify** before and after changes using the Verification Protocols defined per phase

---

## 1. Hard Constraints — NEVER Violate Without Explicit Approval

| Rule | Detail |
|---|---|
| 🚫 **No port changes** | Patient: 5000, Appointment: 8000, Redis: 6379 — frozen |
| 🚫 **No DB schema destructive changes** | Never drop columns or tables; additive changes only, with migration |
| 🚫 **No event contract changes** | `patient_events` channel name and payload shape (`event`, `data.id`, `data.name`) are frozen |
| 🚫 **No new production dependencies** without approval | Dev dependencies (e.g., testing tools) are OK; prod deps require user sign-off |
| 🚫 **No disabling TypeORM synchronize** without a migration strategy | `synchronize: true` must be replaced with migrations before production — plan first |
| 🚫 **No hardcoded secrets** | All credentials via `.env`. Never commit `.env` files |
| 🚫 **No `console.log` in production paths** | Use Winston logger only; `console.log` is allowed only in startup/teardown |
| 🚫 **No `any` TypeScript type** | Every function must be fully typed; use `unknown` + type guards instead |

---

## 2. Code Quality Standards

### TypeScript
- **Strict mode** (`strict: true` in tsconfig) — no exceptions
- All DTOs must use class-validator decorators
- Services must not import Controllers; Controllers must not import Repositories directly
- Entity classes must not contain business logic

### Architecture Layers (Strict)
```
Routes → Controller → Service → Repository → Entity
         ↑                ↑
         DTOs          Domain Logic
```
- **No layer skipping** — Service must never call another Service's Repository
- **No circular imports**

### Error Handling
- All async functions must have try/catch or be wrapped in AsyncHandler
- Errors must propagate up to the Express error middleware — never swallowed silently
- All caught errors must log via Winston with: `service`, `method`, `error.message`, `error.stack`

### Naming Conventions
| Item | Convention | Example |
|---|---|---|
| Files | PascalCase for classes, camelCase for utils | `PatientService.ts`, `dateUtils.ts` |
| Classes | PascalCase | `PatientService` |
| Interfaces | PascalCase with `I` prefix | `IPatientService` |
| DTOs | PascalCase + `Dto` suffix | `CreatePatientDto` |
| Env vars | SCREAMING_SNAKE_CASE | `REDIS_URL`, `DB_HOST` |

---

## 3. Git & Change Management Rules

- **Never push directly to `main`** — all changes via feature branches
- Branch naming: `feature/<phase>-<description>` e.g., `feature/phase2-redis-publisher`
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Each phase must be completed as a discrete commit or PR — no mixing phases

---

## 4. Environment Variable Governance

All env vars must be:
1. Defined in `src/.env` (never committed)
2. Documented in `.env.example` at the project root (committed)
3. Loaded via `dotenv` at the application entry point only
4. Accessed via `process.env.VAR_NAME` with a fallback only for non-critical config

### Required Variables Per Service

**Patient Management Service:**
```
PORT=5000
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=PatientManagementService
REDIS_URL=redis://localhost:6379
```

**Appointment Scheduling Service:**
```
PORT=8000
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=AppointmentSchedulingService
REDIS_URL=redis://localhost:6379
```

---

## 5. Testing Requirements (Phase 4+)

- Unit tests required for: all Service layer methods
- Integration tests required for: all API endpoints
- Test files co-located: `src/service/__tests__/PatientService.test.ts`
- Minimum coverage: 80% lines on service layer before Phase 5
- No mocking of the DB in integration tests — use a test database

---

## 6. Documentation Rules

- Every new file must have a top-of-file comment block: purpose, author scope, dependencies
- Every public method must have a JSDoc comment
- Phase docs in `.agents/` must be updated to `[x]` as tasks complete — never left stale
- `system_map.md` must be updated if ports, DB schema, or event contracts change

---

## 7. Redis Operational Rules

- Patient Service: **one `redisPublisher` instance only** (singleton) — never create per-request
- Appointment Service: **one `redisSubscriber` instance only** — never unsubscribe and re-subscribe
- Both instances must have `retryStrategy` configured (see `resource_management.md`)
- Redis errors must never crash the process — handle `error` events on the client

---

## 8. Model Selection Guide

Agents must self-select the appropriate model based on task type:

| Task Type | Model | Reason |
|---|---|---|
| File reading, auditing, checklist review | `gemini-flash` | Fast, cheap, sufficient for reading/formatting |
| TypeScript implementation across 1 file | `gemini-flash` | Single-file changes, low reasoning needed |
| Multi-file TypeScript refactoring | `claude-sonnet` | Cross-file dependency reasoning |
| Architecture decisions, system design | `claude-sonnet` (thinking) | Deep synthesis required |
| Docker / infra config | `claude-sonnet` | Correctness-critical, multi-variable |
| Debugging complex runtime errors | `claude-sonnet` (thinking) | Trace analysis, hypothesis generation |
| Documentation writing | `gemini-flash` | Formatting task, low reasoning needed |

> **Rule:** Default to `gemini-flash`. Escalate to `claude-sonnet` only when multi-file reasoning, architecture decisions, or complex debugging is required. Never use a heavyweight model for a lightweight task.

---

## 9. Phase Gate Rules

An agent must **not proceed to the next phase** until:
- All `[ ]` checklist items in the current phase file are marked `[x]`
- The Verify section at the bottom of the phase file passes
- No TypeScript compilation errors (`npx tsc --noEmit`)
- The user has explicitly signed off (or the gate is marked as auto-pass in the phase file)

---

## 10. Prohibited Patterns

```typescript
// ❌ Never do this — swallowed error
try {
  await something();
} catch (e) {}

// ❌ Never do this — any type
const handler = async (req: any, res: any) => { ... }

// ❌ Never do this — business logic in entity
@Entity()
class Patient {
  validate() { ... } // NO
}

// ❌ Never do this — new Redis instance per request
app.post('/create', async (req, res) => {
  const redis = new Redis(); // NO — singleton only
})

// ✅ Correct — typed, async handler wrapped, Winston logger
const createPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const dto = plainToClass(CreatePatientDto, req.body);
  const patient = await patientService.createPatient(dto);
  res.status(201).json(patient);
});
```
