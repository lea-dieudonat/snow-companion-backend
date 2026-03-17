# Décisions d'implémentation — Snow Planner Agent

Décisions prises au fil du développement. Chaque entrée explique le choix et sa raison pour éviter de le remettre en question sans contexte.

---

## Fonctions plutôt que classes

**Choix :** `chatAgent()` est une fonction exportée, pas une classe `AgentService`.

**Pourquoi :** Le reste du codebase (controllers, tools) n'utilise que des fonctions exportées. Une classe instanciée une fois par requête et sans état persistant n'apporte rien — c'est du boilerplate pour rien.

**Règle :** Ne pas introduire de classes dans le module agent sauf besoin avéré d'état partagé entre méthodes.

---

## Singleton Anthropic

**Choix :** `src/config/anthropic.ts` initialise le client une seule fois au démarrage du process, comme Prisma dans `src/config/prisma.ts`.

**Pourquoi :** Recréer `new Anthropic()` à chaque requête est inutile et légèrement coûteux. `dotenv.config()` est appelé avant le premier import dans `index.ts`, donc les variables d'env sont disponibles à l'évaluation du module.

---

## Destructuration des delegates Prisma

**Choix :**
```typescript
const { user: userDb, userProfile, agentConversation, session } = prisma;
```

**Pourquoi :** Évite de répéter `prisma.` à chaque appel. Les delegates Prisma capturent leur référence client en interne via closure — la destructuration est safe.

**Note :** `user` est aliasé en `userDb` pour éviter le conflit avec la variable locale `user` dans `chatAgent`.

---

## Flag `responded` contre la race condition SSE

**Choix :**
```typescript
let responded = false;

function end(eventType: string, data: unknown): void {
  if (responded) return;
  responded = true;
  sendSSE(res, eventType, data);
  res.end();
}
```

**Pourquoi :** Si le timeout se déclenche pendant que le `try` est en cours d'exécution, les deux paths (timer + catch) appelleraient `res.end()`. Le flag garantit qu'un seul event de fin est envoyé et que `res.end()` n'est appelé qu'une fois.

---

## `sendSSE` en fonction libre

**Choix :** `function sendSSE(res, eventType, data)` est une fonction module-level qui prend `res` en paramètre.

**Pourquoi :** Évite de l'attacher à une classe ou d'en faire une closure. Testable indépendamment, réutilisable si besoin.

---

## Découplage SSE dans `agent-loop.ts`

**Choix :** `runAgenticLoop` reçoit `onText` et `onToolCall` en callbacks au lieu d'écrire directement dans `res`.

**Pourquoi :** `agent-loop.ts` ne sait rien du transport HTTP/SSE. Il est ainsi testable unitairement sans mock de `Response`, et réutilisable dans un autre contexte (WebSocket, tests, CLI).

---

## Découpage en 3 fichiers services

**Choix :** `agent.service.ts` / `agent-system-prompt.ts` / `agent-loop.ts`

**Pourquoi :**
- `agent-system-prompt.ts` est une **fonction pure** (entrée → string, pas d'effet de bord) → testable en isolation, versionnable clairement
- `agent-loop.ts` est la logique la plus complexe et la plus susceptible d'évoluer → isolée pour être modifiée sans toucher à l'orchestration
- `agent.service.ts` reste un orchestrateur lisible (~90 lignes)

---

## Mutation du tableau `messages` dans `runAgenticLoop`

**Choix :** `messages.splice(0, messages.length, ...allMessages)` en fin de boucle pour propager l'état final vers l'appelant.

**Pourquoi :** Permet à `chatAgent` de récupérer la liste complète des messages (incluant tool calls et résultats) pour la persister, sans avoir à retourner une valeur depuis `runAgenticLoop` (qui retourne `Promise<void>`).

**Alternative considérée :** Retourner `MessageParam[]` depuis `runAgenticLoop`. Rejetée car elle complexifie la signature sans avantage réel dans ce contexte.
