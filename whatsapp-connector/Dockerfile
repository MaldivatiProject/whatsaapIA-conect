FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY prisma ./prisma

RUN npm run prisma:generate
RUN npm run build

# ── Production stage ──────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --chown=appuser:appgroup --from=builder /app/dist ./dist
COPY --chown=appuser:appgroup --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=appuser:appgroup prisma ./prisma
COPY --chown=appuser:appgroup api ./api

RUN mkdir -p /app/sessions && chown appuser:appgroup /app/sessions
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
