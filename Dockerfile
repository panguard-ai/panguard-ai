FROM node:22-slim AS base
RUN corepack enable pnpm

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/panguard-guard/package.json packages/panguard-guard/
COPY packages/panguard-scan/package.json packages/panguard-scan/
COPY packages/panguard-chat/package.json packages/panguard-chat/
COPY packages/panguard-report/package.json packages/panguard-report/
COPY packages/panguard-trap/package.json packages/panguard-trap/

RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY packages/ packages/
COPY config/ config/
COPY tsconfig.json ./

# Build
RUN pnpm -r run build

# Production image
FROM node:22-slim AS production

RUN groupadd -r panguard && useradd -r -g panguard panguard

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/core/dist ./packages/core/dist
COPY --from=base /app/packages/core/package.json ./packages/core/
COPY --from=base /app/packages/panguard-guard/dist ./packages/panguard-guard/dist
COPY --from=base /app/packages/panguard-guard/package.json ./packages/panguard-guard/
COPY --from=base /app/packages/panguard-scan/dist ./packages/panguard-scan/dist
COPY --from=base /app/packages/panguard-scan/package.json ./packages/panguard-scan/
COPY --from=base /app/packages/panguard-chat/dist ./packages/panguard-chat/dist
COPY --from=base /app/packages/panguard-chat/package.json ./packages/panguard-chat/
COPY --from=base /app/config ./config
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./

RUN mkdir -p /data && chown panguard:panguard /data

USER panguard

ENV NODE_ENV=production
ENV PANGUARD_DATA_DIR=/data

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3100/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["node", "packages/panguard-guard/dist/cli/index.js"]
CMD ["start", "--data-dir", "/data"]
