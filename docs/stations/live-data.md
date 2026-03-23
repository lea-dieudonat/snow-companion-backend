# Live Data — open-piste Integration

## API

- Base URL : `https://open-piste.raed.workers.dev/`
- Endpoint : `GET /resorts` — retourne ~148 resorts (France, Italie, Suisse, Andorre)
- Champs clés : `slug`, `country`, `lifts_open`, `lifts_total`, `pistes_open`, `pistes_total`, `base_snow_depth_cm`, `summit_snow_depth_cm`, `avalanche_risk`, `updated_at`
- Tous les champs numériques sont nullable

## Sync schedule

Cron : `0 6,12,18 * * *` (6h, 12h, 18h tous les jours). Exécuté aussi au démarrage de l'app.

## Règle de filtrage

Les stations dont tous les champs live sont null sont exclues de `GET /api/stations` et `GET /api/stations/nearby`. Elles restent accessibles via `GET /api/stations/:id`.

Cette règle s'applique aussi au tool `get_stations` de l'agent.

## Table `station_live_data`

| Colonne | Type |
|---|---|
| `station_id` | String (PK, FK → Station, CASCADE) |
| `lifts_open` | Int? |
| `lifts_total` | Int? |
| `pistes_open` | Int? |
| `pistes_total` | Int? |
| `base_snow_depth_cm` | Int? |
| `summit_snow_depth_cm` | Int? |
| `avalanche_risk` | Int? |
| `updated_at` | DateTime (auto) |

Migration : `20260323120619_add_station_live_data`

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/services/station-sync.service.ts` | Fetch `/resorts`, upsert toutes les stations françaises |
| `src/cron/station-sync.cron.ts` | Scheduler node-cron, exporte `startStationSyncCron()` |
| `src/controllers/station.controller.ts` | Inclut `liveData` dans les 3 endpoints, filtre les stations null dans list/nearby |
| `src/index.ts` | Appelle `startStationSyncCron()` et `syncStationLiveData()` au boot |

## Exemple de réponse

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

## Stations sans couverture

5 stations ont `openPisteCovered: false` — elles n'ont pas de slug dans open-piste et ne recevront jamais de live data. Voir [`population.md`](population.md) pour le détail.
