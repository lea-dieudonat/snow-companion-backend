# Architecture — Snow Planner Agent

## Vue d'ensemble

L'agent s'intègre comme un service dédié dans le backend Express, exposé via `POST /api/agent/chat`, protégé par JWT. Il utilise l'API Anthropic avec streaming SSE et un système de tools (function calling) pour accéder aux données.

```
Frontend Nuxt          Backend Express              Sources
pages/agent.vue   →   POST /api/agent/chat    →   Anthropic API
useAgent.ts            chatAgent()                 Prisma + Open-Meteo
                       runAgenticLoop()
                       6 tools
```

## Découpage des services

| Fichier | Responsabilité |
|---|---|
| `agent.service.ts` | Orchestration : charge les données user, gère le cycle de vie SSE, persiste la conversation |
| `agent-system-prompt.ts` | Fonction pure : construit le system prompt à partir du profil rider |
| `agent-loop.ts` | Boucle agentique : streaming Anthropic + exécution des tool calls |
| `tools/` | 6 tools indépendants, chacun avec sa définition Anthropic et sa fonction `execute` |

## Boucle agentique

Architecture hybride — workflows prédéfinis pour 80% des cas, boucle libre limitée à 5 itérations :

1. Appel Anthropic avec streaming → tokens envoyés en SSE en temps réel
2. Si `stop_reason === 'tool_use'` → exécution parallèle des tools (`Promise.all`)
3. Résultats injectés dans les messages → nouvel appel Anthropic
4. Si `stop_reason === 'end_turn'` → fin de boucle

## Streaming SSE

Sans streaming, une réponse complète avec tool calls prend 8-15s — rédhibitoire sur mobile. Le SSE est non-négociable.

| Composant | Implémentation |
|---|---|
| Backend | `res.setHeader('Content-Type', 'text/event-stream')` + `res.flushHeaders()` avant tout traitement |
| Events | `event: token` (mots), `event: tool_call` (tool utilisé), `event: done` (fin), `event: error` |
| Frontend | `EventSource` API ou `$fetch` avec `parseResponse` stream |

## Stratégie multi-tier (modèles)

| Tâche | Modèle |
|---|---|
| Synthèse finale, recommandation personnalisée | `claude-sonnet-4-6` |
| Tool calls simples (fetch météo, requête Prisma) | `claude-haiku-4-5-20251001` (non encore implémenté) |

## Mémoire

| Mécanisme | Détail |
|---|---|
| Court terme (`AgentConversation`) | Messages stockés en JSON, injectés dans chaque appel. Limités aux 20 derniers (injection) / 40 derniers (stockage) |
| Long terme (`UserProfile`) | Préférences rider injectées dans le system prompt à chaque appel |

## Règle fondamentale : météo avant recommandation

L'agent ne formule jamais de recommandation de station, date ou activité sans avoir préalablement appelé `get_weather`. Cette règle est encodée dans le system prompt et dans les descriptions de tools.

## Périmètre exclu

- Activités hors BDD (restaurants, bars, hébergements) : risque d'hallucination
- Réservations ou liens d'achat
- Les 6 tools se limitent strictement aux données `activities` et `services` de `stations.json`
