# Suivi Achats & KPI

Reconstruction en application web (frontend + backend + base de données) de
l'outil interne de suivi des achats Induni, initialement un fichier HTML
autonome stockant ses données dans le `localStorage` du navigateur.

Modules : suivi opérationnel des achats, sujets transverses, to-do, non-
conformités fournisseur, livraisons, appels d'offres, et un tableau de bord
KPI (montants, taux de service, non-conformités, répartition par étape/
entité/fournisseur).

## Stack technique

- **Client** : React + TypeScript + Vite + Tailwind CSS, graphiques via
  Chart.js (`client/`)
- **Serveur** : Node + Express + TypeScript, API REST (`server/`)
- **Base de données** : SQLite via Prisma ORM (fichier unique, migrations
  versionnées dans `server/prisma/migrations`)

## Démarrage en local

Prérequis : Node.js 20+.

```bash
npm install

# base de données : applique les migrations puis importe les données
# réelles récupérées de l'outil HTML d'origine (achats, fournisseurs Abacus...)
cp server/.env.example server/.env
npm run --workspace server prisma:migrate
npm run seed

# lance l'API (port 3001) et le client (port 5173) dans deux terminaux
npm run dev:server
npm run dev:client
```

Le client proxy `/api` vers `http://localhost:3001` en développement (voir
`client/vite.config.ts`).

## Build de production

```bash
npm run build:client
npm run build:server
```

En production, le serveur Express sert directement les fichiers statiques du
client buildé (`client/dist`) en plus de l'API — un seul service à déployer.

## Déploiement (Railway ou autre)

Un `Dockerfile` à la racine construit le client et le serveur puis démarre un
service unique qui, au lancement, applique les migrations Prisma et importe
les données initiales si la base est vide.

Variables d'environnement à définir sur la plateforme :

- `DATABASE_URL` = `file:/app/data/dev.db`
- `PORT` — fournie automatiquement par Railway

**Important — persistance des données**. SQLite stocke tout dans un fichier
sur le disque du conteneur, qui est éphémère par défaut sur Railway (et la
plupart des PaaS) : sans volume monté, les données seraient réinitialisées à
chaque redéploiement.

Pour un usage réel, sur Railway :

1. Ouvrir le service → **Settings → Volumes → New Volume**
2. Mount path : **`/app/data`**
3. Variables → `DATABASE_URL` = **`file:/app/data/dev.db`**

⚠️ Ne pas monter le volume sur `/app/server/prisma` : ce dossier contient les
migrations et le seed copiés dans l'image Docker, et un volume est **vide**
au premier montage — il masquerait ces fichiers au lieu de les compléter,
cassant `prisma migrate deploy`. `/app/data` est un répertoire dédié, créé
vide par le `Dockerfile` et sans rien d'autre dedans, prévu pour ça.

Alternative : migrer vers un addon PostgreSQL managé (changer le `provider`
du datasource dans `server/prisma/schema.prisma` et régénérer les migrations
en conséquence).

## Données d'origine

Les données saisies dans l'outil HTML (`opData`, `trData`, `tdData`, `ncData`)
et le référentiel fournisseurs Abacus (`FOURN_ABACUS`, ~9300 entrées) ont été
extraits et importés tels quels via `server/prisma/seed.ts` /
`server/prisma/seed-data.json`. Les livraisons et appels d'offres n'existaient
que dans le `localStorage` du navigateur d'origine et n'ont pas pu être
récupérés : ces tables démarrent vides.
