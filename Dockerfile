# Build deps + Prisma generate
FROM node:22-alpine3.20 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY contracts/package.json contracts/
COPY prisma ./prisma
RUN npm install --workspaces --include-workspace-root
RUN npx prisma generate --schema=prisma/schema.prisma

# Build TS
FROM node:22-alpine3.20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:contracts
RUN npm run build:api
RUN npm prune --omit=dev

# Runtime
FROM node:22-alpine3.20 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /app/contracts ./contracts
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
