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
COPY --from=deps /app/node_modules node_modules
COPY server/package.json server/package.json
COPY server/prisma server/prisma
COPY --from=server-build /app/server/dist server/dist
COPY --from=server-build /app/node_modules/@prisma node_modules/@prisma
COPY --from=client-build /app/client/dist client/dist

EXPOSE 3001
# Applique les migrations (et le seed initial si la base est vide) puis démarre l'API,
# qui sert aussi le build du client.
CMD sh -c "cd server && npx prisma migrate deploy && (npx tsx prisma/seed.ts || true) && node dist/index.js"
