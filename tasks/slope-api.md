# Real-time Station Status — open-piste Integration

## Status: Implemented

## API
- Base URL: `https://open-piste.raed.workers.dev/`
- Endpoint used: `GET /resorts` — returns all 148 resorts
- Key fields: `slug`, `lifts_open`, `lifts_total`, `pistes_open`, `pistes_total`,
  `base_snow_depth_cm`, `summit_snow_depth_cm`, `avalanche_risk`, `updated_at`
- All numeric fields are nullable

## Mapping
Station IDs (e.g. `val-thorens`) match the API slugs directly — no mapping table needed.

## Sync schedule
Cron: `0 6,12,18 * * *` (6am, 12pm, 6pm daily). Also runs once on app startup.

## Filtering rule
Stations where all live data fields are null are excluded from `GET /api/stations`
and `GET /api/stations/nearby`. They remain accessible via `GET /api/stations/:id`.

## DB table: `station_live_data`

| Column               | Type                  |
| -------------------- | --------------------- |
| station_id           | String (PK, FK → Station, CASCADE) |
| lifts_open           | Int?                  |
| lifts_total          | Int?                  |
| pistes_open          | Int?                  |
| pistes_total         | Int?                  |
| base_snow_depth_cm   | Int?                  |
| summit_snow_depth_cm | Int?                  |
| avalanche_risk       | Int?                  |
| updated_at           | DateTime (auto)       |

Migration: `20260323120619_add_station_live_data`

## Files

| File | Role |
| ---- | ---- |
| `src/services/station-sync.service.ts` | Fetches `/resorts`, upserts all 32 stations |
| `src/cron/station-sync.cron.ts` | node-cron scheduler, exports `startStationSyncCron()` |
| `src/controllers/station.controller.ts` | Includes `liveData` in all 3 endpoints, filters null stations in list/nearby |
| `src/index.ts` | Calls `startStationSyncCron()` and initial `syncStationLiveData()` on boot |

## Response shape

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
