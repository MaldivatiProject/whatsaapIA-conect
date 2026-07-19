FROM node:22-alpine AS builder

WORKDIR /app

# NEXT_PUBLIC_* variables are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_CONNECTOR_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_CONNECTOR_WS_URL=http://localhost:3000
ARG NEXT_PUBLIC_RULES_API_URL=/rules-api
ARG RULES_INTERNAL_API_URL=http://whatsaap-backend-api:8000
# Only set to "true" when this app is actually served over HTTPS (e.g. behind
# a TLS-terminating reverse proxy). It controls whether the CSP sends
# upgrade-insecure-requests — on a plain-HTTP deployment that directive makes
# browsers silently try to fetch every asset over HTTPS, which fails and
# leaves the page blank/unstyled (see next.config.ts).
ARG NEXT_PUBLIC_HTTPS_ENABLED=false
ENV NEXT_PUBLIC_CONNECTOR_API_URL=${NEXT_PUBLIC_CONNECTOR_API_URL}
ENV NEXT_PUBLIC_CONNECTOR_WS_URL=${NEXT_PUBLIC_CONNECTOR_WS_URL}
ENV NEXT_PUBLIC_RULES_API_URL=${NEXT_PUBLIC_RULES_API_URL}
ENV RULES_INTERNAL_API_URL=${RULES_INTERNAL_API_URL}
ENV NEXT_PUBLIC_HTTPS_ENABLED=${NEXT_PUBLIC_HTTPS_ENABLED}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --chown=appuser:appgroup --from=builder /app/public ./public
COPY --chown=appuser:appgroup --from=builder /app/.next/standalone ./
COPY --chown=appuser:appgroup --from=builder /app/.next/static ./.next/static

USER appuser

ENV NODE_ENV=production
ENV PORT=3000
# Docker sets HOSTNAME=<container-id> automatically, and the Next.js standalone
# server binds to $HOSTNAME if set — without this override it listens on the
# container id instead of 0.0.0.0, so localhost (used by the healthcheck) gets
# connection refused even though the process is up.
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login || exit 1

CMD ["node", "server.js"]
