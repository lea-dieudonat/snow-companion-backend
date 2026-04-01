# Tools — Snow Planner Agent

7 tools disponibles, chacun dans `src/tools/`. Tous implémentent l'interface `AgentTool` : une `definition` (schéma Anthropic) et une fonction `execute(input, userId)`.

---

## get_weather

**Fichier :** `get-weather.tool.ts`
**Déclencheur :** Obligatoire dès qu'une station est mentionnée (règle system prompt).

Appelle Open-Meteo pour les prévisions météo à 7 jours à partir des coordonnées de la station. Retourne température, enneigement, vent et couverture nuageuse.

---

## get_slope_conditions

**Fichier :** `get-slope-conditions.tool.ts`
**Déclencheur :** Obligatoire dès qu'une station est mentionnée (règle system prompt), en parallèle de `get_weather`.

Récupère les données live depuis `StationLiveData` (synchronisées depuis l'API open-piste). Accepte jusqu'à 5 `station_ids`.

| Champ retourné | Description |
|---|---|
| `live_data_available` | `false` si aucune donnée live en DB |
| `lifts_open / lifts_total` | Remontées ouvertes |
| `pistes_open / pistes_total` | Pistes ouvertes |
| `slopes_detail` | Répartition totale des pistes `{ green, blue, red, black }` |
| `slopes_open` | Répartition des pistes ouvertes `{ green, blue, red, black }` |
| `base_snow_depth_cm` | Enneigement en bas de station |
| `summit_snow_depth_cm` | Enneigement au sommet |
| `avalanche_risk` | Risque avalanche (1-5) |
| `updated_at` | Horodatage de la dernière sync — toujours cité dans la réponse |

---

## get_stations

**Fichier :** `get-stations.tool.ts`

Filtre les stations françaises en DB. Retourne uniquement les stations ayant des données live (`liveData` non null).

| Filtre | Type | Description |
|---|---|---|
| `region` | string | Région (insensitive) |
| `level` | enum | beginner / intermediate / advanced / expert — dérivé de `slopesDetail` (≥ 3 pistes par couleur) |
| `has_snow_park` | boolean | Snow park disponible |
| `snow_park_level` | enum | Niveau minimum du snow park |
| `has_halfpipe` | boolean | Halfpipe disponible |
| `activity` | string | Activité hors-ski |
| `max_pass_price` | number | Prix forfait adulte journée (€) |
| `min_altitude` | number | Altitude max minimale (m) |
| `only_open` | boolean | Uniquement stations avec remontées ouvertes |
| `limit` | number | Nombre de résultats (défaut: 10, max: 20) |

---

## get_station_activities

**Fichier :** `get-station-activities.tool.ts`

Retourne les activités hors-ski et services disponibles pour une station. À utiliser avec `get_weather` pour les questions activités.

---

## get_user_sessions

**Fichier :** `get-user-sessions.tool.ts`

Retourne l'historique des sessions ski de l'utilisateur connecté. Permet de personnaliser les recommandations ("Tu avais noté...").

---

## get_user_favorites

**Fichier :** `get-user-favorites.tool.ts`

Retourne les stations favorites de l'utilisateur avec leurs données complètes.

---

## compare_stations

**Fichier :** `compare-stations.tool.ts`
**Déclencheur :** Quand l'utilisateur hésite entre plusieurs stations (2-5).

Classe les stations par score pondéré selon le profil rider. Inclut les données live dans le scoring.

| Critère | Points max | Condition |
|---|---|---|
| Altitude | 20 | Normalisé sur 3600m |
| Taille du domaine | 15 | Normalisé sur 600km |
| Snow park | 30-35 | Selon niveau freestyle du rider |
| Freeride / off-piste | 20 | % de pistes noires si rider freeride |
| Famille | 10 | Garderie si `withChildren: true` |
| Budget | +10 / -5 | Forfait dans la fourchette budget |
| Remontées ouvertes | 15 | `(liftsOpen / liftsTotal) * 15` |
| Enneigement sommet | 10 | `min(summitSnowDepthCm / 100, 1) * 10` |

Si `live_data_available: false` → 0 pts live + raison "Données live non disponibles".
