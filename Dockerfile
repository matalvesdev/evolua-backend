# Build deps + Prisma generate
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY contracts/package.json contracts/
COPY prisma ./prisma
RUN npm install --workspaces --include-workspace-root
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TS
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:contracts
RUN npm run build:api

# Runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# OpenSSL 1.1 compatibilidade para Prisma engine
RUN apk add --no-cache openssl1.1-compat
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/contracts ./contracts
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
