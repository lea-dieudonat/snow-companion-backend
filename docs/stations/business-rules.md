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

## Profil de difficulté (`getStationLevelProfile`)

Le profil de difficulté d'une station **n'est pas stocké en DB** — il est calculé dynamiquement depuis `liveData.slopesDetail`.

```
total = green + blue + red + black
beginner     = round(green  / total * 100)  // % pistes vertes
intermediate = round(blue   / total * 100)  // % pistes bleues
advanced     = round(red    / total * 100)  // % pistes rouges
expert       = round(black  / total * 100)  // % pistes noires
```

- Retourne `null` si `slopesDetail` est absent ou total = 0
- Il n'y a **pas de filtre par niveau** dans l'API — le profil est fourni à titre informatif

**Affichage :** `🟢 22% · 🔵 39% · 🔴 31% · ⚫ 8%` via `getSlopesLevelSummary()` (frontend)

**Implémentation :**
- Backend : `src/utils/station-levels.ts` → `getStationLevelProfile`
- Frontend : `utils/station-levels.ts` (Nuxt auto-import) + `utils/station.utils.ts` → `getSlopesLevelSummary`

**Agent `compare_stations` :** le score freeride utilise `levelProfile.expert / 100 * 20`.

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
