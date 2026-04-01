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

| Colonne | Type | Description |
|---|---|---|
| `station_id` | String (PK, FK → Station, CASCADE) | |
| `lifts_open` | Int? | Remontées ouvertes |
| `lifts_total` | Int? | Remontées totales |
| `pistes_open` | Int? | Pistes ouvertes |
| `pistes_total` | Int? | Pistes totales |
| `slopes_detail` | Json? | Répartition totale par couleur `{ green, blue, red, black }` |
| `slopes_open` | Json? | Répartition des pistes ouvertes par couleur `{ green, blue, red, black }` |
| `base_snow_depth_cm` | Int? | Enneigement en bas de station |
| `summit_snow_depth_cm` | Int? | Enneigement au sommet |
| `avalanche_risk` | Int? | Risque avalanche (1-5) |
| `updated_at` | DateTime (auto) | Dernière sync open-piste |

Migrations : `20260323120619_add_station_live_data`, `20260325160000_move_slopes_detail_to_live_data`

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
  "slopesDetail": { "green": 12, "blue": 35, "red": 28, "black": 9 },
  "slopesOpen":   { "green": 10, "blue": 30, "red": 22, "black": 6 },
  "baseSnowDepthCm": 200,
  "summitSnowDepthCm": 265,
  "avalancheRisk": 2,
  "updatedAt": "2026-03-23T07:13:19.938Z"
}
```

## Stations sans couverture

5 stations ont `openPisteCovered: false` — elles n'ont pas de slug dans open-piste et ne recevront jamais de live data. Voir [`population.md`](population.md) pour le détail.
