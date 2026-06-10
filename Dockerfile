# HL Sales & Receivables — production image (Next.js + Prisma + PostgreSQL)
# Build:  docker build -t hl-app .
#         # optional: pin a fixed session secret (else a random one is baked in):
#         docker build --build-arg AUTH_SECRET="$(openssl rand -hex 32)" -t hl-app .
# Run:    docker run -p 3000:3000 \
#           -e DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB \
#           -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=strong-pass \
#           hl-app
# Note: AUTH_SECRET is baked at BUILD time (Next inlines it into the Edge
# middleware), so set it as a --build-arg above, not just a runtime -e.

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# openssl is required by Prisma engines.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# --- deps: install all dependencies (incl. dev for building) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- build: bake secret, generate Prisma client (Postgres), build Next ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A real DB isn't needed at build time (all pages are dynamic); placeholder lets
# `prisma generate` run. Pass --build-arg AUTH_SECRET=... to bake a fixed secret.
ARG AUTH_SECRET=""
ENV AUTH_SECRET=$AUTH_SECRET
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# --- run: production runtime ---
FROM base AS run
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
# On start: apply schema to Postgres (db push), seed the single admin + demo data, then serve.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && npx next start -p ${PORT}"]
