# syntax=docker/dockerfile:1

# --- Étape 1 : build (dépendances complètes + compilation TypeScript) ---
FROM node:22-slim AS build
WORKDIR /app

# openssl est requis par le moteur Prisma
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall = prisma generate ; prepare (husky) est inutile dans l'image
RUN npm ci --ignore-scripts && npx prisma generate

COPY tsconfig.json prisma.config.ts ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --ignore-scripts

# --- Étape 2 : image d'exécution (sans outils de dev ni sources TS) ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/prisma.config.ts /app/package.json ./

USER node
EXPOSE 3001

# Applique les migrations en attente puis démarre l'API.
# Worker dédié : surcharger la commande par `node dist/worker.js`.
CMD ["npm", "run", "start:prod"]
