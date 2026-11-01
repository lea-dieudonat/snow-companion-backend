# Déploiement

## Image Docker

Le `Dockerfile` a deux étapes : `build` (dépendances complètes, `prisma generate`, `tsc`, puis `npm prune --omit=dev`) et `runtime` (node_modules de production, `dist/`, `prisma/`). `prisma` est une dépendance (pas une devDependency) car le CLI sert à `migrate deploy` au démarrage.

```bash
docker build -t snow-companion-api .
docker run --rm -p 3001:3001 --env-file .env snow-companion-api
```

La commande par défaut (`npm run start:prod`) exécute `prisma migrate deploy` puis démarre l'API. `migrate deploy` n'applique que les migrations en attente, ne supprime jamais de données, et prend un verrou : plusieurs instances qui démarrent ensemble ne se marchent pas dessus. Pour un worker dédié : `node dist/worker.js` (voir `RUN_CRONS`).

## Variables d'environnement obligatoires en production

`NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (32+ caractères), `CORS_ORIGIN` (URL du front, pas de `*`), `ANTHROPIC_API_KEY`. Ajouter `TRUST_PROXY=1` derrière le reverse proxy de l'hébergeur (sinon le rate-limit par IP voit l'IP du proxy). Liste complète : `.env.example`.

## Base de données neuve : amorçage

Après le premier déploiement (migrations appliquées au démarrage), la table des stations est vide. Depuis votre machine, avec `DATABASE_URL` pointant vers la base de production :

```bash
DATABASE_URL="postgresql://..." npm run populate:stations   # découvre et insère les stations françaises
DATABASE_URL="postgresql://..." npm run sync:live-data      # première synchro des données de pistes
```

Ensuite les crons prennent le relais (synchro 3x/jour, découverte le lundi). Le seed (`prisma db seed`) crée le compte démo seulement hors production ou avec `SEED_DEMO=true` et `SEED_DEMO_PASSWORD`.

## Hébergement : limites à connaître

Les crons tournent dans le processus de l'API. Un hébergeur gratuit qui endort le service après inactivité (cas de l'offre gratuite de Render) saute donc des exécutions ; au réveil, `syncLiveDataIfStale` relance la synchro si les données ont plus de 12 h, ce qui suffit pour un usage perso/portfolio.

Avec une base Postgres « serverless » (ex. Neon), utiliser l'URL de connexion directe (sans `-pooler`) pour `DATABASE_URL` : les migrations et les verrous advisory se comportent mieux sans pooler en mode transaction.
