FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY contracts/package.json contracts/
COPY prisma ./prisma
RUN npm install --workspaces --include-workspace-root && \
    npx prisma generate --schema=prisma/schema.prisma

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN npm run build:contracts && \
    npm run build:api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NODE_OPTIONS="--enable-source-maps"
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=appuser:appgroup /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=appuser:appgroup /app/contracts ./contracts
COPY --from=build --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/package.json ./
EXPOSE 3000
USER appuser
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
