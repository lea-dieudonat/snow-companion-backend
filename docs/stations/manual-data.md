# Données manuelles — Station

Ce document liste les colonnes de la table `Station` (et `StationLiveData`) qui ne sont pas alimentées automatiquement par une API.

---

## Colonnes automatisées (référence)

Pour distinguer le manuel de l'automatique :

| Colonne | Source |
|---|---|
| `id` | open-piste API (slug) |
| `name` | Overpass/OSM → open-piste fallback |
| `region` | Overpass/OSM → open-piste fallback |
| `latitude` / `longitude` | Overpass/OSM → Nominatim fallback |
| `altitudeMin` / `altitudeMax` | Overpass/OSM |
| `openPisteCovered` | Calculé par le service populate (true = slug open-piste trouvé) |
| `liveData.liftsOpen/Total` | open-piste API (sync 3x/jour) |
| `liveData.pistesOpen/Total` | open-piste API (sync 3x/jour) |
| `liveData.baseSnowDepthCm` | open-piste API (sync 3x/jour) |
| `liveData.summitSnowDepthCm` | open-piste API (sync 3x/jour) |
| `liveData.avalancheRisk` | open-piste API (sync 3x/jour) |
| `liveData.slopesDetail` | open-piste API `/resorts/{slug}` — `{ green, blue, red, black }` totaux |
| `liveData.slopesOpen` | open-piste API `/resorts/{slug}` — `{ green, blue, red, black }` ouvertes |
| `season` | open-piste API `/resorts/{slug}` — `season_open` / `season_close` |

---

## Colonnes renseignées manuellement

### Table `Station`

| Colonne | État | Notes |
|---|---|---|
| `department` | Renseigné | Complété avec connaissance IA sur les ~144 stations françaises |
| `website` | Partiellement renseigné | URLs vérifiées par l'utilisateur ; quelques stations sans site connu |
| `skiAreaId` | Renseigné | Lien vers `ski_area` créé manuellement avec connaissance IA |
| `snowCannons` | Partiellement renseigné | Idem |
| `snowPark` | Partiellement renseigné | Structure `{ available, level[], halfpipe, rails, kickers }` — renseignée à la main pour les stations d'origine |
| `passes` | Partiellement renseigné | Prix forfaits `{ full_day, half_day, weekly }` — données manuelles, peuvent être obsolètes |
| `avgAccommodationPrice` | Partiellement renseigné | Prix moyen hébergement — données manuelles, peuvent être obsolètes |
| `description` | Partiellement renseigné | Texte libre — absent pour les stations insérées automatiquement |
| `access` | Partiellement renseigné | `{ nearest_airport, nearest_train_station, ... }` — données manuelles |
| `season` | Partiellement renseigné | `{ start, end }` — données manuelles, peuvent être obsolètes |
| `services` | Partiellement renseigné | Ex: `["ski_school", "rental"]` — données manuelles |
| `activities` | Partiellement renseigné | Ex: `["snowshoeing", "paragliding"]` — données manuelles |
| `temporarilyClosed` | Manuel | Flag positionné à la main quand une station est connue comme fermée |

### Table `StationLiveData`

| Colonne | État | Notes |
|---|---|---|
| `slopesDetail` | Non alimenté | Disponible dans l'API open-piste mais **non encore fetchée** par `station-sync.service.ts` (interface `OpenPisteResort` à compléter) |
| `slopesOpen` | Non alimenté | Idem |

> `slopesDetail` et `slopesOpen` sont les colonnes utilisées pour le profil de difficulté (`getStationLevelProfile`). Tant que le sync ne les récupère pas, elles restent null pour la majorité des stations.

---

## Table `SkiArea`

L'ensemble de la table `ski_area` est renseigné manuellement (id/slug, name, region, website). Aucune API ne couvre actuellement les domaines skiables.

---

## Priorités de complétion suggérées

1. **`slopesDetail` / `slopesOpen`** — impact direct sur le profil de difficulté affiché ; nécessite seulement de mettre à jour `station-sync.service.ts`
2. **`passes`** — données qui se périment chaque saison ; envisager une source automatique ou un workflow de mise à jour annuelle
