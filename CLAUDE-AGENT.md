# Agent IA — Snow Planner

Ce document guide Claude Code dans le développement de la feature agent de Snow Companion.
Il complète le CLAUDE.md principal du projet.

---

## État d'avancement

**Phase 1 — Fondations backend : ✅ terminée**

- `prisma/schema.prisma` — modèles `UserProfile`, `AgentConversation` ajoutés ; `Station.snowPark` (JSON?) ; relations `User` mises à jour
- Migration `add_snow_park_user_profile_agent` appliquée
- `@anthropic-ai/sdk` installé
- Variables d'environnement agent ajoutées dans `.env`

**Phase 4 — Routes profil rider : ✅ terminée**

- `GET /api/users/profile` — retourne le `UserProfile` de l'utilisateur connecté (null si non renseigné)
- `PUT /api/users/profile` — crée ou met à jour le profil (`upsert`)
- `UpsertProfileSchema` dans `src/schemas/user.schema.ts` — valide disciplines, niveau, styles, régions, budget
- Fix `exactOptionalPropertyTypes` : les champs optionnels Zod (`string | undefined`) sont mappés en `null` avant le passage à Prisma

**Phase 5 — Frontend : ✅ terminée**

- Étape 7 : pipeline SSE validé avec curl
- Étape 8 : composable `useAgent.ts` créé (repo Nuxt)
- Étape 9 : page `pages/agent.vue` créée

**Feature complète et fonctionnelle.**

---

## Structure des fichiers backend

```
src/
├── types/
│   └── agent.types.ts                  — AgentMessage, AgentTool, SSE events
├── schemas/
│   └── agent.schema.ts                 — Zod validation du body /chat
├── controllers/
│   └── agent.controller.ts             — Setup SSE + res.flushHeaders()
├── routes/
│   └── agent.routes.ts                 — POST /chat, protégé par authenticate
├── services/
│   ├── agent.service.ts                — Orchestrateur : charge données, SSE lifecycle, persistance
│   ├── agent-system-prompt.ts          — Fonction pure : construit le system prompt
│   └── agent-loop.ts                   — Boucle agentique : streaming + tool execution
└── tools/
    ├── index.ts                         — Registre des 7 tools
    ├── get-weather.tool.ts              — Open-Meteo API, prévisions 7j
    ├── get-slope-conditions.tool.ts     — Live data pistes depuis StationLiveData (open-piste)
    ├── get-stations.tool.ts             — Filtres Prisma incl. snow_park JSON + only_open
    ├── get-station-activities.tool.ts   — Activités + règles météo contextuelles
    ├── get-user-sessions.tool.ts        — Historique + stats agrégées
    ├── get-user-favorites.tool.ts       — Favoris + météo actuelle optionnelle
    └── compare-stations.tool.ts         — Scoring pondéré par profil rider + live conditions
```

---

## Test de validation du pipeline

```bash
# 1. Récupérer un token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@snowcompanion.app","password":"demo1234"}' \
  | jq -r '.token')

# 2. Tester l'agent (réponse SSE)
curl -N -X POST http://localhost:3001/api/agent/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Quelle météo à Val Thorens ce weekend ?"}]}'
```

Résultat attendu : flux SSE avec `event: tool_call` (get_weather),
puis `event: token` (mots de la réponse), puis `event: done`.

---

## Phase 5 — Frontend (terminée)

Repo : `snow-companion-front`

### `composables/useAgent.ts`

Gère le cycle de vie SSE côté client.

- SSE via `fetch` natif (POST) — `EventSource` ne supporte que GET, donc non utilisable ici
- Parse ligne par ligne : `event: token` → concatène dans `streamingText`, `event: tool_call` → met à jour `activeTool`, `event: done` → finalise le message, `event: error` → remonte l'erreur
- Expose : `messages`, `streamingText`, `isLoading`, `activeTool`, `conversationId`, `error`, `sendMessage()`, `reset()`

### `pages/agent.vue`

- Bannière onboarding si `GET /api/users/profile` retourne `null` → lien vers `/settings`
- 5 suggestions de prompts pré-remplis au démarrage (remplacés par la liste des messages une fois la conversation démarrée)
- Curseur clignotant (`animate-pulse`) pendant le streaming
- Badge tool actif pendant l'appel d'outil
- Badges récapitulatifs sur chaque message assistant (tools utilisés)
- Textarea avec `Enter` pour envoyer, `Shift+Enter` pour saut de ligne

---

## Documentation détaillée

- [docs/agent/architecture.md](docs/agent/architecture.md) — vue d'ensemble, boucle agentique, SSE, mémoire
- [docs/agent/decisions.md](docs/agent/decisions.md) — décisions d'implémentation (patterns, conventions, raisons)
- [docs/agent/tools.md](docs/agent/tools.md) — référence complète des 7 tools (paramètres, scoring, règles)

---

## Décisions d'architecture (à ne pas remettre en question)

| Décision                  | Choix retenu                        | Raison                                   |
| ------------------------- | ----------------------------------- | ---------------------------------------- |
| Streaming                 | SSE (Server-Sent Events)            | Non-négociable UX — 8-15s sans streaming |
| Modèle LLM — routage      | claude-haiku-4-5-20251001           | Décision tool calls, ~5x moins cher      |
| Modèle LLM — synthèse     | claude-sonnet-4-6                   | Réponse finale personnalisée             |
| Boucle agentique          | Loop limitée à 5 itérations         | Prédictible et économique                |
| Persistance conversations | Table `AgentConversation` en BDD    | Mémoire inter-sessions                   |
| Profil rider              | Table `UserProfile` séparée         | Multi-pratique, non-exclusif             |
| Snow park                 | Champ JSON structuré par station    | Filtrable, pas du texte libre            |
| Activités hors-ski        | Strictement depuis la BDD           | Zéro hallucination                       |
| Slope conditions          | `get_slope_conditions` obligatoire à chaque mention de station | Données live toujours présentes, jamais inventées |

---

## Points de vigilance

- **`userId` vient toujours du token JWT** (`req.userId`), jamais du body
- **`res.flushHeaders()` avant tout traitement** dans le controller — obligatoire pour le SSE
- **`snow_park` peut être `null`** — toujours vérifier `?.available` avant d'accéder aux propriétés
- **Après chaque modification de `schema.prisma`** : `make prisma-generate`
- **Les traductions** activities/services sont dans `get-station-activities.tool.ts` — ne pas dupliquer
