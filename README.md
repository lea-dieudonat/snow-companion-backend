# 🏂 Snow Companion - Backend

API REST pour Snow Companion, une plateforme complète pour riders de snowboard et ski.

## 🚀 Stack

- **Node.js** + **Express** - Framework web
- **TypeScript** - Typage statique
- **Prisma ORM** - Gestion de la base de données
- **PostgreSQL** (Supabase) - Base de données

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Crée un fichier `.env` à la racine :

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://..."
```

## 🏃 Lancer le projet

```bash
# Mode développement
npm run dev

# Build production
npm run build
npm start
```

## 🗄️ Base de données

```bash
# Créer une migration
npx prisma migrate dev --name nom_de_la_migration

# Ouvrir Prisma Studio
npx prisma studio
```

## 🛠️ Développement

Structure du projet :

```
src/
├── config/         # Configuration (Prisma, etc.)
├── controllers/    # Logique métier
├── routes/         # Routes Express
├── types/          # Types TypeScript
└── index.ts        # Point d'entrée
```
