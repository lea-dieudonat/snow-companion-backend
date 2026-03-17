# Agent IA — Snow Planner

Ce document guide Claude Code dans le développement de la feature agent de Snow Companion.
Il complète le CLAUDE.md principal du projet.

---

## État d'avancement

**Phase 1 — Fondations backend : ✅ terminée**

Tout le backend agent est en place et fonctionnel :

- `prisma/schema.prisma` — modèles `UserProfile`, `AgentConversation` ajoutés ; `Station.snowPark` (JSON?) ; relations `User` mises à jour
- Migration `add_snow_park_user_profile_agent` appliquée
- `@anthropic-ai/sdk` installé
- Variables d'environnement agent ajoutées dans `.env`

**Prochaine étape : Phase 5 — Frontend**

- Étape 7 : valider le pipeline SSE avec curl (voir section Test ci-dessous)
- Étape 8 : créer le composable `useAgent.ts` (repo Nuxt)
- Étape 9 : créer la page `pages/agent.vue`

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
    ├── index.ts                         — Registre des 6 tools
    ├── get-weather.tool.ts              — Open-Meteo API, prévisions 7j
    ├── get-stations.tool.ts             — Filtres Prisma incl. snow_park JSON
    ├── get-station-activities.tool.ts   — Activités + règles météo contextuelles
    ├── get-user-sessions.tool.ts        — Historique + stats agrégées
    ├── get-user-favorites.tool.ts       — Favoris + météo actuelle optionnelle
    └── compare-stations.tool.ts         — Scoring pondéré par profil rider
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

## Phase 5 — Frontend (prochaine)

Page `pages/agent.vue` avec :

- Interface de chat (messages user/assistant)
- Indicateur de streaming (curseur clignotant pendant la réponse)
- Badge discret des tools utilisés
- 5 suggestions de prompts pré-remplis au démarrage
- Déclenchement de l'onboarding si `UserProfile` vide

Routes backend à ajouter pour le profil rider (Phase 4) :
- `GET /api/users/profile` — retourne le `UserProfile` de l'utilisateur connecté
- `PUT /api/users/profile` — crée ou met à jour le profil

---

## Documentation détaillée

- [docs/agent/architecture.md](docs/agent/architecture.md) — vue d'ensemble, boucle agentique, SSE, mémoire
- [docs/agent/decisions.md](docs/agent/decisions.md) — décisions d'implémentation (patterns, conventions, raisons)

---

## Décisions d'architecture (à ne pas remettre en question)

| Décision                  | Choix retenu                        | Raison                                   |
| ------------------------- | ----------------------------------- | ---------------------------------------- |
| Streaming                 | SSE (Server-Sent Events)            | Non-négociable UX — 8-15s sans streaming |
| Modèle LLM                | claude-sonnet-4-6                   | Qualité + coût équilibré                 |
| Boucle agentique          | Loop limitée à 5 itérations         | Prédictible et économique                |
| Persistance conversations | Table `AgentConversation` en BDD    | Mémoire inter-sessions                   |
| Profil rider              | Table `UserProfile` séparée         | Multi-pratique, non-exclusif             |
| Snow park                 | Champ JSON structuré par station    | Filtrable, pas du texte libre            |
| Activités hors-ski        | Strictement depuis la BDD           | Zéro hallucination                       |

---

## Points de vigilance

- **`userId` vient toujours du token JWT** (`req.userId`), jamais du body
- **`res.flushHeaders()` avant tout traitement** dans le controller — obligatoire pour le SSE
- **`snow_park` peut être `null`** — toujours vérifier `?.available` avant d'accéder aux propriétés
- **Après chaque modification de `schema.prisma`** : `make prisma-generate`
- **Les traductions** activities/services sont dans `get-station-activities.tool.ts` — ne pas dupliquer
