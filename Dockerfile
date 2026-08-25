# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# --- Dépendances ---
FROM base AS deps
COPY package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm install

# --- Build client (React/Vite) ---
FROM deps AS client-build
COPY client client
RUN npm run build --workspace client

# --- Build serveur (Express/Prisma) ---
FROM deps AS server-build
COPY server server
RUN npm run build --workspace server

# --- Image finale ---
FROM base AS runner
ENV NODE_ENV=production
# Le moteur Prisma (query/schema engine) a besoin d'OpenSSL au runtime ;
# absent par défaut sur node:22-alpine, ce qui fait planter Prisma au
# démarrage ("Could not parse schema engine response").
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules node_modules
COPY server/package.json server/package.json
COPY server/prisma server/prisma
COPY --from=server-build /app/server/dist server/dist
COPY --from=server-build /app/node_modules/@prisma node_modules/@prisma
COPY --from=server-build /app/node_modules/.prisma node_modules/.prisma
COPY --from=client-build /app/client/dist client/dist

# Répertoire dédié aux données persistantes (à monter en volume sur la
# plateforme de déploiement) : distinct de server/prisma pour ne jamais
# masquer les migrations/le seed copiés dans l'image quand le volume,
# vide au premier montage, est attaché.
RUN mkdir -p /app/data

EXPOSE 3001
# Applique les migrations (et le seed initial si la base est vide) puis démarre l'API,
# qui sert aussi le build du client.
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && (npx tsx prisma/seed.ts || true) && node dist/index.js"]
