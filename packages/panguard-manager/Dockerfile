# PanGuard Manager — self-hosted fleet aggregator container image
# Build from monorepo root: docker build -f packages/panguard-manager/Dockerfile -t panguard-manager:0.1.0 .

# ----- builder stage -----
FROM node:22-slim AS builder
WORKDIR /app

# Copy lockfile + workspace manifest first for cacheable installs
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY tsconfig.json ./

# Bring in only the packages this image needs
COPY packages/panguard-manager ./packages/panguard-manager
COPY packages/panguard-guard ./packages/panguard-guard
COPY packages/core ./packages/core
COPY packages/atr ./packages/atr
COPY packages/scan-core ./packages/scan-core
COPY packages/panguard-mcp ./packages/panguard-mcp
COPY packages/panguard-skill-auditor ./packages/panguard-skill-auditor
COPY packages/panguard-trap ./packages/panguard-trap
COPY security-hardening ./security-hardening

RUN npm install -g pnpm@10.30.2 && \
    pnpm install --frozen-lockfile && \
    pnpm --filter @panguard-ai/panguard-manager build

# ----- runtime stage -----
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8090 \
    HOST=0.0.0.0

COPY --from=builder /app/packages/panguard-manager/dist ./dist
COPY --from=builder /app/packages/panguard-manager/package.json ./package.json
COPY --from=builder /app/packages/panguard-manager/node_modules ./node_modules

# Persistent registry + config directory; mount this in production
VOLUME ["/data"]

USER 1001
EXPOSE 8090

ENTRYPOINT ["node", "dist/cli.js", "serve"]
CMD ["--port", "8090", "--host", "0.0.0.0", "--data-dir", "/data"]
