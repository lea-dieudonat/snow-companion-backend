# Snow Companion — Backend API

Express + TypeScript REST API for a ski companion app. Tracks ski sessions, manages favorite resorts, and provides resort data for 32 French ski stations.

## Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL (local) via Prisma ORM
- **Auth:** JWT + bcryptjs
- **Validation:** Zod
- **Testing:** Vitest + Supertest

## Getting Started

**Prerequisites:** Node.js 18+, PostgreSQL 16 running locally.

```bash
# 1. Install dependencies
npm install

# 2. Create .env at project root
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://<user>@localhost:5432/snow_companion"
DATABASE_URL_TEST="postgresql://<user>@localhost:5432/snow_companion_test"
JWT_SECRET="your-secret"
JWT_EXPIRES_IN="7d"

# 3. Create databases
psql -U <user> -d postgres -c "CREATE DATABASE snow_companion;"
psql -U <user> -d postgres -c "CREATE DATABASE snow_companion_test;"

# 4. Apply migrations + seed stations
make prisma-reset

# 5. Start dev server
npm run dev
```

## API

All protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account, returns JWT |
| POST | `/api/auth/login` | — | Login, returns JWT |

### Sessions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sessions` | ✓ | List authenticated user's sessions |
| POST | `/api/sessions` | ✓ | Create a session |
| PUT | `/api/sessions/:id` | ✓ | Update a session |
| DELETE | `/api/sessions/:id` | ✓ | Delete a session |

### Stations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stations` | — | List stations (supports filters) |
| GET | `/api/stations/:id` | — | Get a station by ID |
| GET | `/api/stations/nearby` | — | Find stations by coordinates |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/favorites` | ✓ | List favorite stations |
| POST | `/api/users/favorites/:stationId` | ✓ | Add a favorite |
| DELETE | `/api/users/favorites/:stationId` | ✓ | Remove a favorite |

## Development

```bash
npm run dev           # Dev server with hot reload
npm test              # Run test suite (against snow_companion_test DB)
npm run test:watch    # Watch mode
npm run lint:fix      # Lint + format
npm run build         # Compile for production
```
