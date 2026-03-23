# Station Population

## Scope

Stations françaises uniquement (`country: "fr"` dans l'API open-piste). ~144 resorts couverts.

## Sources de données

| Source | URL | Données fournies |
|---|---|---|
| **open-piste API** | `https://open-piste.raed.workers.dev/resorts` | Slugs, noms, live data (remontées, pistes, neige) |
| **Overpass API** | `https://overpass-api.de/api/interpreter` | Coordonnées, altitude min/max, région (OSM) |

**open-piste** est la source de vérité pour les slugs (= IDs de station) et les données live.
**Overpass** enrichit les données statiques manquantes.

## Données minimales pour insérer une station

`name` + `latitude` + `longitude` (depuis Overpass). Tous les autres champs sont nullable — une station sans altitude ou sans description est acceptable.

## Flow de population (`station-populate.service.ts`)

```
open-piste API (144 stations FR)
  ├── déjà en DB → Overpass → overwrite latitude/longitude/altitude/région
  └── nouvelle   → Overpass → si name + coords trouvés → insert
                            → sinon → skipped (rapport)
```

Throttle : 500ms entre chaque requête Overpass pour respecter le rate limit.

## Commandes

```bash
npm run populate:stations    # Population / enrichissement manuel
npm run migrate:station-ids  # Migration one-time des IDs (déjà exécutée)
```

## Cron hebdomadaire

`src/cron/station-populate.cron.ts` — tous les lundis à 3h du matin.
Appelle le même service que le script CLI. Découvre automatiquement les nouvelles stations françaises ajoutées dans open-piste.

## Station ID = open-piste slug

Les IDs de station sont les slugs open-piste (`val-thorens`, `deux-alpes`, etc.). Stables, utilisés comme FK dans `Trip`.

## Flag `openPisteCovered`

5 stations de la DB originale n'ont pas de correspondance dans open-piste. Elles sont flaggées `openPisteCovered: false` et ne recevront jamais de live data :

| ID | Nom |
|---|---|
| `meribel` | Méribel (remplacé par 3 sous-stations distinctes) |
| `la-colmiane` | La Colmiane |
| `greolieres-les-neiges` | Gréolières les Neiges |
| `roubion` | Roubion - Les Buisses |
| `la-plagne-tarentaise` | La Plagne Tarentaise |

## Historique des renames d'IDs

4 IDs de la DB originale ont été renommés pour correspondre aux slugs open-piste :

| Ancien ID | Nouvel ID |
|---|---|
| `les-2-alpes` | `deux-alpes` |
| `val-isere` | `val-d-isere` |
| `alpe-huez` | `alpe-d-huez` |
| `superdevoluy` | `super-devoluy` |

Script : `npm run migrate:station-ids` (idempotent).