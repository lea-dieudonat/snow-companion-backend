# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with hot reload (ts-node-dev)
npm run build        # Compile TypeScript + resolve path aliases (tsc && tsc-alias)
npm start            # Run compiled production server

# Testing (Vitest + Supertest against snow_companion_test DB)
npm test             # Run all tests once
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Linting & Formatting
npm run lint         # Check for lint/format issues
npm run lint:fix     # Auto-fix lint/format issues
npm run format       # Format all source files with Prettier

# Station population
npm run populate:stations    # Fetch French stations from open-piste + enrich with Overpass, insert new ones
npm run migrate:station-ids  # One-time migration: rename 4 station IDs to match open-piste slugs

# Database (Prisma)
make prisma-generate  # Regenerate Prisma Client after schema changes
make prisma-migrate   # Create and apply a new migration
make prisma-studio    # Open Prisma GUI
make prisma-reset     # Reset DB and reapply all migrations
make db-push          # Push schema changes without creating a migration
```

## Architecture

Express + TypeScript backend for a ski companion app. PostgreSQL (local) via Prisma ORM.

**Request flow:** `src/index.ts` → `src/app.ts` → `src/routes/*.routes.ts` → `src/controllers/*.controller.ts` → Prisma Client (`src/config/prisma.ts`)

> `src/app.ts` exports the Express app (used by both the server and tests). `src/index.ts` loads dotenv and calls `app.listen()`.

**Domain modules** (each has routes, controller, schema, and types):
- **auth** — register + login; returns JWT; passwords hashed with bcryptjs
- **sessions** — ski session tracking (date, station, tricks, conditions, rating, photos); all routes protected
- **users** — favorite stations management; all routes protected
- **stations** — read-only ski resort data. Populated from open-piste API + Overpass (OSM). Scope: French stations only. Supports filtering by region/price/altitude/level and Haversine-based nearby search
- **agent** — AI chat assistant (Snow Planner); streams SSE; route `POST /api/agent/chat`; protected

**Agent architecture** (`src/services/`):
- `agent.service.ts` — orchestrator: loads user data, manages SSE lifecycle, persists conversation
- `agent-system-prompt.ts` — pure function: builds the system prompt from user/profile/sessions
- `agent-loop.ts` — agentic loop: Anthropic streaming + tool execution (max 5 iterations)
- `src/tools/` — 7 tools: `get_weather`, `get_slope_conditions`, `get_stations`, `get_station_activities`, `get_user_sessions`, `get_user_favorites`, `compare_stations`

**Data models** (defined in `prisma/schema.prisma`):
- `User` → has many `Session`, `Trip`, `AgentConversation`; has one `UserProfile`; holds `favoriteStations` as string[] of station IDs
- `Session` → belongs to `User`; tracks one ski outing
- `Station` → French ski resort data; has many `Trip`; most fields are nullable (stations from open-piste may have partial data); `openPisteCovered` flags stations not tracked by the open-piste API
- `StationLiveData` → live lift/piste/snow data synced from open-piste API (3x/day); 1-to-1 with Station
- `Trip` → planned trip linking a `User` to a `Station`
- `UserProfile` → rider profile (disciplines, rideStyles, freestyleLevel, snowPreference, etc.)
- `AgentConversation` → persisted chat history (messages as JSON, last 40 kept)

## Station Population

**Scope:** French stations only (`country: "fr"` in open-piste API).

**Data sources:**
- **open-piste API** (`https://open-piste.raed.workers.dev/resorts`) — source of truth for French station slugs and live data (lifts, pistes, snow depths). Returns ~144 French resorts.
- **Overpass API** (OpenStreetMap) — enriches static fields: `latitude`, `longitude`, `altitudeMin`, `altitudeMax`, `region`. Queried by station name.

**Minimum data to insert a station:** `name` + `latitude` + `longitude` (from Overpass). All other fields are nullable.

**Population flow** (`src/services/station-populate.service.ts`):
1. Fetch French resorts from open-piste
2. For new resorts: query Overpass, insert if minimum data found
3. For existing stations: overwrite static fields with Overpass data

**Scripts:**
- `npm run populate:stations` — manual one-shot population/enrichment
- Weekly cron (`src/cron/station-populate.cron.ts`) — runs every Monday at 3am, auto-discovers new stations

**Station ID = open-piste slug** (e.g. `val-thorens`, `deux-alpes`). IDs are stable and used as FK in `Trip`.

**`openPisteCovered` flag:** 5 stations in the original dataset have no open-piste match and are flagged `openPisteCovered: false` — they will never receive live data (`meribel`, `la-colmiane`, `greolieres-les-neiges`, `roubion`, `la-plagne-tarentaise`).

**ID rename history:** 4 original station IDs were renamed to match open-piste slugs (`les-2-alpes` → `deux-alpes`, `val-isere` → `val-d-isere`, `alpe-huez` → `alpe-d-huez`, `superdevoluy` → `super-devoluy`). Script: `npm run migrate:station-ids`.

## Authentication

JWT-based. The `authenticate` middleware (`src/middlewares/auth.ts`) verifies `Authorization: Bearer <token>` and attaches `userId` to the request as `AuthRequest`. Session and user routes use `router.use(authenticate)` to protect all their endpoints. `userId` always comes from the token, never the request body.

## Validation

Zod schemas in `src/schemas/` validate all request bodies. `CreateSessionSchema` requires `date` as a full ISO 8601 datetime string (e.g. `2026-01-15T10:00:00Z`), not a date-only string.

## Testing

Tests live in `src/test/`. The setup:
- `global-setup.ts` — runs `prisma migrate deploy` on `snow_companion_test` DB once before all tests
- `setup.ts` — deletes all rows from `trips`, `sessions`, `users` after each test (stations are preserved)
- `helpers.ts` — `createTestUser()` utility for registering a user and getting a token
- Test files run **sequentially** (`fileParallelism: false`) to avoid cross-file DB interference

## Path Aliases

Use `@/` for imports from `src/` (e.g., `import prisma from "@/config/prisma"`). Configured in `tsconfig.json`, resolved at runtime via `tsconfig-paths` and at build time via `tsc-alias`.

## Environment

Requires a `.env` file at the project root:
```
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://<user>@localhost:5432/snow_companion"
DATABASE_URL_TEST="postgresql://<user>@localhost:5432/snow_companion_test"
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"

# Agent IA
ANTHROPIC_API_KEY=sk-ant-...
AGENT_MODEL_SYNTHESIS=claude-sonnet-4-6
AGENT_MODEL_TOOLS=claude-haiku-4-5-20251001
AGENT_MAX_ITERATIONS=5
AGENT_MAX_TOKENS=1024
AGENT_TIMEOUT_MS=30000
```
