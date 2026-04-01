# Database Schema

PostgreSQL via Prisma ORM. Schéma dans `prisma/schema.prisma`.

---

## Station

Table principale des stations de ski françaises. Peuplée depuis open-piste + Overpass/OSM.

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK) | Slug open-piste (ex: `val-thorens`) |
| `name` | String | Nom affiché |
| `region` | String | Région administrative (ex: `Savoie`) |
| `department` | String? | Département (ex: `73`) |
| `altitude_min` | Int? | Altitude départ (m) |
| `altitude_max` | Int? | Altitude sommet (m) |
| `latitude` | Float | Depuis Overpass/OSM |
| `longitude` | Float | Depuis Overpass/OSM |
| `km_slopes` | Int? | Kilomètres de pistes |
| `snow_cannons` | Int? | Nombre de canons à neige |
| `snow_park` | Json? | `{ available, level[], halfpipe, rails, kickers }` |
| `ski_area_id` | String? | FK → `ski_area.id` |
| `passes` | Json? | `{ full_day: { adult, child, teen }, half_day, weekly }` |
| `avg_accommodation_price` | Float? | Prix moyen hébergement/nuit (€) |
| `website` | String? | Site officiel |
| `description` | String? | Description courte |
| `access` | Json? | `{ nearest_airport, distance_from_airport_km, nearest_train_station, distance_from_train, parking }` |
| `season` | Json? | `{ start, end }` (mois d'ouverture) |
| `services` | String[] | Liste de services (ex: `["ski_school", "rental"]`) |
| `activities` | String[] | Activités hors-ski (ex: `["snowshoeing", "ice_skating"]`) |
| `open_piste_covered` | Boolean | `false` si la station n'a pas de slug dans open-piste |
| `temporarily_closed` | Boolean | `true` si la station est temporairement fermée |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

**Index :** `region`

---

## StationLiveData (`station_live_data`)

Données live synchronisées depuis l'API open-piste (3x/jour). Relation 1-to-1 avec `Station`.

| Colonne | Type | Notes |
|---|---|---|
| `station_id` | String (PK, FK → Station) | CASCADE delete |
| `lifts_open` | Int? | Remontées ouvertes |
| `lifts_total` | Int? | Remontées totales |
| `pistes_open` | Int? | Pistes ouvertes |
| `pistes_total` | Int? | Pistes totales |
| `slopes_detail` | Json? | Répartition totale `{ green, blue, red, black }` |
| `slopes_open` | Json? | Répartition ouverte `{ green, blue, red, black }` |
| `base_snow_depth_cm` | Int? | Enneigement base (cm) |
| `summit_snow_depth_cm` | Int? | Enneigement sommet (cm) |
| `avalanche_risk` | Int? | Risque avalanche (1-5) |
| `updated_at` | DateTime | Dernière sync open-piste |

---

## SkiArea (`ski_area`)

Domaines skiables regroupant plusieurs stations.

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK) | Slug (ex: `les-3-vallees`) |
| `name` | String | Nom affiché (ex: `Les 3 Vallées`) |
| `region` | String? | Région principale |
| `website` | String? | Site officiel du domaine |

---

## User

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK, cuid) | |
| `email` | String (unique) | |
| `password` | String | Hashé bcryptjs |
| `name` | String? | |
| `location_city` | String? | Ville de l'utilisateur |
| `location_latitude` | Float? | Pour calculs de distance |
| `location_longitude` | Float? | Pour calculs de distance |
| `favorite_stations` | String[] | IDs des stations favorites |
| `level` | String[] | Niveaux de ski de l'utilisateur |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

---

## UserProfile

Profil rider détaillé, lié à `User` (1-to-1).

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK, cuid) | |
| `user_id` | String (unique, FK → User) | CASCADE delete |
| `disciplines` | String[] | ex: `["ski", "snowboard"]` |
| `primary_discipline` | String? | Discipline principale |
| `ride_styles` | String[] | ex: `["freestyle", "freeride"]` |
| `freestyle_level` | String? | `beginner_park` / `intermediate` / `advanced` / `competitor` |
| `snow_preference` | String? | `groomed` / `powder` / `mixed` |
| `off_piste` | Boolean? | Rider off-piste |
| `level` | String? | Niveau général : `beginner` / `intermediate` / `advanced` / `expert` |
| `with_children` | Boolean? | Avec enfants |
| `regions` | String[] | Régions préférées |
| `budget_range` | String? | `budget` / `mid` / `premium` |

**Index :** `user_id`

---

## Session

Sortie ski tracée par l'utilisateur.

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK, cuid) | |
| `date` | DateTime | ISO 8601 complet requis |
| `station` | String | Nom libre (pas de FK) |
| `conditions` | String? | Description des conditions |
| `tricks` | String[] | Tricks réussis |
| `notes` | String? | Notes libres |
| `photos` | String[] | URLs photos |
| `rating` | Int? | Note 1-5 |
| `run_count` | Int? | Nombre de descentes |
| `max_speed` | Float? | Vitesse max (km/h) |
| `total_distance` | Float? | Distance totale (km) |
| `vertical_drop` | Int? | Dénivelé cumulé (m) |
| `user_id` | String (FK → User) | CASCADE delete |

**Index :** `user_id`, `date`

---

## Trip

Voyage planifié liant un `User` à une `Station`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK, cuid) | |
| `name` | String | ex: `Weekend aux 2 Alpes` |
| `start_date` | DateTime | |
| `end_date` | DateTime? | |
| `station_id` | String (FK → Station) | CASCADE delete |
| `user_id` | String (FK → User) | CASCADE delete |
| `participants` | String[] | Emails ou IDs |
| `notes` | String? | |
| `status` | String | `planned` / `confirmed` / `completed` / `cancelled` |

**Index :** `user_id`, `station_id`, `start_date`

---

## AgentConversation

Historique des conversations avec le Snow Planner.

| Colonne | Type | Notes |
|---|---|---|
| `id` | String (PK, cuid) | |
| `user_id` | String (FK → User) | CASCADE delete |
| `messages` | Json | Array de messages Anthropic. 40 max conservés, 20 injectés |

**Index :** `user_id`
