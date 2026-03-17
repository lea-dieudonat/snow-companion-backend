# Agent IA — Snow Planner

Ce document guide Claude Code dans l'intégration de l'agent IA dans Snow Companion.
Il complète le CLAUDE.md principal du projet.

---

## Contexte de reprise

L'étape en cours est la **Phase 1 — Fondations backend**.

Ce qui est **déjà fait** :

- `src/data/stations.json` remplacé → 32 stations avec le champ `snow_park` structuré
- `constants/station-labels.constants.ts` créé → traductions activities/services/snow park
- `prisma/seed.ts` patché → `snowPark: station.snow_park ?? null` dans update + create

Ce qui **reste à faire** (dans l'ordre) :

1. Mettre à jour `prisma/schema.prisma` (voir section Schéma ci-dessous)
2. Lancer la migration : `make prisma-migrate name=add_snow_park_user_profile_agent`
3. Créer les fichiers backend de l'agent (voir section Fichiers)
4. Brancher la route dans `src/app.ts`
5. Installer le SDK : `npm install @anthropic-ai/sdk`
6. Ajouter les variables d'environnement
7. Tester le pipeline SSE avec curl
8. Créer le composable frontend `useAgent.ts`
9. Créer la page `pages/agent.vue`

---

## Schéma Prisma — modifications à appliquer

### Sur le modèle `Station` existant

Ajouter après `activities String[]` :

```prisma
snowPark    Json?    @map("snow_park")
```

### Sur le modèle `User` existant

Ajouter les deux relations :

```prisma
profile             UserProfile?
agentConversations  AgentConversation[]
```

### Nouveaux modèles à ajouter en bas du fichier

```prisma
model UserProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  disciplines       String[]
  primaryDiscipline String?
  rideStyles        String[]
  freestyleLevel    String?
  snowPreference    String?
  offPiste          Boolean  @default(false)
  level             String?
  withChildren      Boolean  @default(false)
  regions           String[]
  budgetRange       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  @@index([userId])
}

model AgentConversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Json     @default("[]")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
}
```

---

## Structure des fichiers à créer

```
src/
├── types/
│   └── agent.types.ts           ← déjà rédigé, à copier
├── controllers/
│   └── agent.controller.ts      ← déjà rédigé, à copier
├── routes/
│   └── agent.routes.ts          ← déjà rédigé, à copier
├── services/
│   └── agent.service.ts         ← déjà rédigé, à copier
└── tools/
    ├── index.ts                  ← déjà rédigé, à copier
    ├── get-weather.tool.ts       ← déjà rédigé, à copier
    ├── get-stations.tool.ts      ← déjà rédigé, à copier
    ├── get-station-activities.tool.ts  ← déjà rédigé, à copier
    ├── get-user-sessions.tool.ts ← déjà rédigé, à copier
    ├── get-user-favorites.tool.ts ← déjà rédigé, à copier
    └── compare-stations.tool.ts  ← déjà rédigé, à copier

# Frontend (repo Nuxt)
composables/
└── useAgent.ts                   ← déjà rédigé, à copier
constants/
└── station-labels.constants.ts  ← déjà en place
```

---

## Branchement dans src/app.ts

Ajouter après les autres routes existantes :

```typescript
import agentRoutes from '@/routes/agent.routes';
app.use('/api/agent', agentRoutes);
```

---

## Variables d'environnement (.env)

```env
ANTHROPIC_API_KEY=sk-ant-...
AGENT_MODEL_SYNTHESIS=claude-sonnet-4-6
AGENT_MODEL_TOOLS=claude-haiku-4-5-20251001
AGENT_MAX_ITERATIONS=5
AGENT_MAX_TOKENS=1024
AGENT_TIMEOUT_MS=30000
```

---

## Test de validation du pipeline

Une fois les étapes 1-7 faites, valider avec curl avant de toucher au frontend :

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

Résultat attendu : flux d'événements SSE avec `event: tool_call` (get_weather),
puis `event: token` (mots de la réponse), puis `event: done`.

---

## Décisions d'architecture clés (à ne pas remettre en question)

| Décision                  | Choix retenu                        | Raison                                   |
| ------------------------- | ----------------------------------- | ---------------------------------------- |
| Streaming                 | SSE (Server-Sent Events)            | Non-négociable UX — 8-15s sans streaming |
| Modèle LLM                | claude-sonnet-4-6                   | Qualité + coût équilibré                 |
| Boucle agentique          | Hybride workflow + loop limitée à 5 | Prédictible et économique                |
| Persistance conversations | Table AgentConversation en BDD      | Mémoire inter-sessions demandée          |
| Profil rider              | Table UserProfile séparée           | Multi-pratique, non-exclusif             |
| Snow park                 | Champ JSON structuré par station    | Filtrable, pas du texte libre            |
| Activités hors-ski        | Strictement depuis la BDD           | Zéro hallucination                       |

---

## Points de vigilance

- **`userId` vient toujours du token JWT** (`req.userId`), jamais du body de la requête
- **Le streaming est initié avant les tool calls** — `res.flushHeaders()` doit être appelé immédiatement
- **`prisma.userProfile` et `prisma.agentConversation`** ne seront disponibles qu'après `make prisma-generate`
- **`snow_park` peut être `null`** dans la BDD pour les stations sans park — toujours vérifier `?.available`
- **Les traductions** activities/services sont dans `constants/station-labels.constants.ts` — ne pas dupliquer dans les tools

---

## Phase suivante (après validation du pipeline)

Phase 5 — Frontend : créer `pages/agent.vue` avec :

- Interface de chat (messages user/assistant)
- Indicateur de streaming (curseur clignotant pendant la réponse)
- Badge discret des tools utilisés (petite info pour l'utilisateur)
- 5 suggestions de prompts pré-remplis au démarrage
- Déclenchement de l'onboarding si `UserProfile` vide
