# Business Rules — Stations

## Périmètre

**Stations françaises uniquement.** Source : `country: "fr"` dans l'API open-piste. Les stations d'autres pays ne sont pas dans la DB.

---

## Règles d'exclusion des listes

Deux flags indépendants excluent des stations des endpoints `GET /api/stations` et `GET /api/stations/nearby`, et du tool agent `get_stations` :

### `temporarilyClosed: true`

Station temporairement fermée (saison avortée, fermeture exceptionnelle). Filtre appliqué en premier, au niveau du `WHERE` Prisma.

- Exclue de : listes, nearby, `get_stations` agent
- Accessible via : `GET /api/stations/:id` uniquement
- Exemple : `rouge-gazon`

### Aucune donnée live (`hasLiveData`)

Une station dont tous les champs live sont `null` est considérée inactive pour la saison. Filtre appliqué en mémoire après la requête DB.

- Condition : au moins un de `liftsOpen`, `liftsTotal`, `pistesOpen`, `pistesTotal`, `baseSnowDepthCm`, `summitSnowDepthCm` doit être non-null
- Stations sans ligne `StationLiveData` → également exclues
- `GET /api/stations/:id` ignore cette règle (retourne toujours la station)

---

## Dérivation du niveau (`getStationLevels`)

Le niveau d'une station **n'est pas stocké en DB** — il est calculé dynamiquement depuis `liveData.slopesDetail`.

| Condition | Niveau attribué |
|---|---|
| `slopesDetail.green >= 3` | `beginner` |
| `slopesDetail.blue >= 3` | `intermediate` |
| `slopesDetail.red >= 3` | `advanced` |
| `slopesDetail.black >= 3` | `expert` |

- Une station peut avoir plusieurs niveaux simultanément
- Si `slopesDetail` est `null` → tableau vide `[]`
- Le seuil de 3 évite de taguer une station pour 1-2 pistes isolées

**Implémentation :**
- Backend : `src/utils/station-levels.ts`
- Frontend : `utils/station-levels.ts` (Nuxt auto-import)

Le filtre `?level=advanced` dans `GET /api/stations` et dans `get_stations` applique cette fonction en mémoire (pas de colonne DB).

---

## Flag `openPisteCovered`

`Boolean @default(true)`. Indique si la station est trackée par l'API open-piste.

- `false` → pas de `StationLiveData`, jamais de données live
- Ces stations sont présentes en DB pour les trips/favoris mais exclues des listes (règle `hasLiveData`)
- 5 stations concernées — voir [`population.md`](population.md)

---

## Domaines skiables (`SkiArea`)

Les stations peuvent être rattachées à un domaine skiable via `skiAreaId`. La relation est optionnelle — toutes les stations n'appartiennent pas à un domaine connu.

Un domaine regroupe plusieurs stations commercialement liées (ex: Les 3 Vallées = Val Thorens + Méribel + Courchevel...). L'entité `SkiArea` est utilisée à titre informatif — elle n'influe pas sur les règles de filtrage.

---

## Recherche textuelle

`GET /api/stations?search=...` recherche (insensitive) sur :
- `Station.name`
- `Station.region`
- `SkiArea.name` (via relation)

---

## Nearby (recherche géographique)

Distance calculée avec la formule de Haversine (`calculateDistance` dans `station.controller.ts`). Paramètres : `latitude`, `longitude`, `maxDistance` (défaut 300 km). Les mêmes règles d'exclusion (`temporarilyClosed`, `hasLiveData`) s'appliquent.
