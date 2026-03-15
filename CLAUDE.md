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
- **stations** — read-only ski resort data seeded from `src/data/stations.json` (32 French resorts); supports filtering by region/price/altitude/level and Haversine-based nearby search

**Data models** (defined in `prisma/schema.prisma`):
- `User` → has many `Session`, `Trip`; holds `favoriteStations` as string[] of station IDs
- `Session` → belongs to `User`; tracks one ski outing
- `Station` → standalone resort data; has many `Trip`
- `Trip` → planned trip linking a `User` to a `Station`

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
```
