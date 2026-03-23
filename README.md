# Snow Companion — Backend API

REST API for a ski and snowboard companion app. Tracks sessions, manages trips and favorites, serves data for 32 French ski resorts, and powers an AI planning assistant.

**Frontend:** [snow-companion-front](https://github.com/lea-dieudonat/snow-companion-front) — Nuxt 4 interface

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT + bcryptjs
- **Validation:** Zod
- **AI:** Anthropic SDK (`claude-haiku` + `claude-sonnet`) via SSE streaming
- **Testing:** Vitest + Supertest
- **Live station data:** [open-piste API](https://open-piste.raed.workers.dev/) polled 3×/day via `node-cron`

## Getting Started

**Prerequisites:** Node.js 18+, PostgreSQL 16 running locally.

```bash
# 1. Install dependencies
npm install

# 2. Create .env at project root (see Environment section below)

# 3. Create databases
psql -U <user> -d postgres -c "CREATE DATABASE snow_companion;"
psql -U <user> -d postgres -c "CREATE DATABASE snow_companion_test;"

# 4. Apply migrations + seed
make prisma-reset

# 5. Start dev server
npm run dev
```

The seed creates 32 ski stations and a demo account:

```
email:    demo@snowcompanion.app
password: demo1234
```

## Environment

Create a `.env` file at the project root:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://<user>@localhost:5432/snow_companion"
DATABASE_URL_TEST="postgresql://<user>@localhost:5432/snow_companion_test"
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"

# AI Agent
ANTHROPIC_API_KEY=sk-ant-...
AGENT_MODEL_SYNTHESIS=claude-sonnet-4-6
AGENT_MODEL_TOOLS=claude-haiku-4-5-20251001
AGENT_MAX_ITERATIONS=5
AGENT_MAX_TOKENS=1024
AGENT_TIMEOUT_MS=30000
```

## API Reference

All protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path                 | Auth | Description                 |
| ------ | -------------------- | ---- | --------------------------- |
| POST   | `/api/auth/register` | —    | Create account, returns JWT |
| POST   | `/api/auth/login`    | —    | Login, returns JWT          |

### Sessions

| Method | Path                | Auth | Description          |
| ------ | ------------------- | ---- | -------------------- |
| GET    | `/api/sessions`     | ✓    | List user's sessions |
| POST   | `/api/sessions`     | ✓    | Create a session     |
| PUT    | `/api/sessions/:id` | ✓    | Update a session     |
| DELETE | `/api/sessions/:id` | ✓    | Delete a session     |

### Stations

| Method | Path                   | Auth | Description                                                                    |
| ------ | ---------------------- | ---- | ------------------------------------------------------------------------------ |
| GET    | `/api/stations`        | —    | List stations (supports filters: `region`, `level`, `maxPrice`, `minAltitude`) |
| GET    | `/api/stations/:id`    | —    | Get a station by ID                                                            |
| GET    | `/api/stations/nearby` | —    | Find stations by coordinates (Haversine)                                       |

Station responses include a `liveData` object with real-time resort status:

```json
"liveData": {
  "liftsOpen": 29,
  "liftsTotal": 29,
  "pistesOpen": 84,
  "pistesTotal": 84,
  "baseSnowDepthCm": 200,
  "summitSnowDepthCm": 265,
  "avalancheRisk": 2,
  "updatedAt": "2026-03-23T07:13:19.938Z"
}
```

> Stations with all-null live data are excluded from list and nearby endpoints. `GET /api/stations/:id` always returns the station regardless.

### Trips

| Method | Path             | Auth | Description               |
| ------ | ---------------- | ---- | ------------------------- |
| GET    | `/api/trips`     | ✓    | List user's planned trips |
| POST   | `/api/trips`     | ✓    | Create a trip             |
| PUT    | `/api/trips/:id` | ✓    | Update a trip             |
| DELETE | `/api/trips/:id` | ✓    | Delete a trip             |

### Users

| Method | Path                              | Auth | Description                    |
| ------ | --------------------------------- | ---- | ------------------------------ |
| GET    | `/api/users/favorites`            | ✓    | List favorite stations         |
| POST   | `/api/users/favorites/:stationId` | ✓    | Add a favorite                 |
| DELETE | `/api/users/favorites/:stationId` | ✓    | Remove a favorite              |
| GET    | `/api/users/profile`              | ✓    | Get rider profile              |
| PUT    | `/api/users/profile`              | ✓    | Create or update rider profile |

### Agent

| Method | Path              | Auth | Description                           |
| ------ | ----------------- | ---- | ------------------------------------- |
| POST   | `/api/agent/chat` | ✓    | Send a message — streams SSE response |

## AI Agent Architecture

The Snow Planner agent is a dedicated service exposed via `POST /api/agent/chat`. It uses Anthropic streaming with tool calling (function calling) to access live data.

**Multi-tier model strategy:**

- Routing iteration (deciding which tools to call) → `claude-haiku` — fast and cost-efficient
- Synthesis iteration (final response after tool results) → `claude-sonnet` — quality and personalization

**Agentic loop** (max 5 iterations):

1. Anthropic call with streaming → tokens sent as SSE in real time
2. If `stop_reason === 'tool_use'` → parallel tool execution (`Promise.all`)
3. Results injected into messages → new Anthropic call
4. If `stop_reason === 'end_turn'` → loop ends

**6 tools available to the agent:**

| Tool                     | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `get_weather`            | 7-day forecast via Open-Meteo API                            |
| `get_stations`           | Filter stations by region, level, snow park, price, altitude |
| `get_station_activities` | Off-ski activities with contextual weather rules             |
| `get_user_sessions`      | Session history + aggregated stats                           |
| `get_user_favorites`     | Favorite stations with optional live weather                 |
| `compare_stations`       | Weighted scoring based on rider profile                      |

**SSE events:** `token` (streaming words) · `tool_call` (active tool) · `done` · `error`

> Note: `EventSource` is not used on the frontend — it doesn't support POST requests. The client uses native `fetch` with `ReadableStream`.

## Development

```bash
npm run dev           # Dev server with hot reload (ts-node-dev)
npm run build         # Compile TypeScript + resolve path aliases
npm start             # Run compiled production server
npm test              # Test suite (against snow_companion_test DB)
npm run test:coverage # Coverage report
npm run lint:fix      # Lint + format

# Database
make prisma-generate  # Regenerate Prisma Client after schema changes
make prisma-migrate   # Create and apply a new migration
make prisma-studio    # Open Prisma GUI
make prisma-reset     # Reset DB + reseed
```

## Project Structure

```
src/
├── controllers/     — Request handlers (one per domain)
├── routes/          — Express routers
├── schemas/         — Zod validation schemas
├── services/        — Business logic (agent orchestration, station sync)
│   ├── agent.service.ts
│   ├── agent-system-prompt.ts
│   ├── agent-loop.ts
│   └── station-sync.service.ts  — Fetches open-piste API and upserts StationLiveData
├── cron/            — Scheduled jobs
│   └── station-sync.cron.ts     — node-cron schedule (6am, 12pm, 6pm)
├── tools/           — 6 agent tools (one file each)
├── middlewares/     — auth, errorHandler
├── types/           — TypeScript interfaces
├── config/          — Prisma client instance
└── data/            — stations.json (32 French resorts)
prisma/
├── schema.prisma    — Data models
├── migrations/      — Migration history
└── seed.ts          — Demo account + station seeding
```
