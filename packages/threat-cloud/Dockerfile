# -------------------------------------------------------
# Threat Cloud - Standalone Production Image
# 威脅雲 - 獨立生產映像
#
# Build:  docker build -t threat-cloud .
# Run:    docker run -p 8080:8080 -v tc-data:/data threat-cloud
# -------------------------------------------------------

# Stage 1: Build
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /build

# Copy only what threat-cloud needs (no monorepo dependency)
COPY package.json tsconfig.standalone.json ./
COPY src/ src/
COPY scripts/ scripts/

# Install dependencies
RUN npm install --production=false

# Build TypeScript (standalone config, no monorepo references)
RUN npx tsc -p tsconfig.standalone.json

# -------------------------------------------------------
# Stage 2: Production
FROM node:22-alpine

RUN apk add --no-cache tini curl

# Non-root user
RUN addgroup -S panguard && adduser -S panguard -G panguard

WORKDIR /app

# Copy built output + production deps
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./
COPY --from=builder /build/scripts ./scripts

# Data + backup directories
RUN mkdir -p /data /backups && chown panguard:panguard /data /backups

ENV NODE_ENV=production
ENV TC_DB_PATH=/data/threat-cloud.db
ENV TC_BACKUP_DIR=/backups
ENV TC_PORT=8080
ENV TC_HOST=0.0.0.0

EXPOSE 8080

USER panguard

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:${TC_PORT}/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/cli.js", "--port", "8080", "--host", "0.0.0.0", "--db", "/data/threat-cloud.db", "--backup-dir", "/backups"]
