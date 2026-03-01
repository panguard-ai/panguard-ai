FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install dependencies - copy all package.json files for proper workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/panguard/package.json packages/panguard/
COPY packages/panguard-auth/package.json packages/panguard-auth/
COPY packages/panguard-guard/package.json packages/panguard-guard/
COPY packages/panguard-scan/package.json packages/panguard-scan/
COPY packages/panguard-chat/package.json packages/panguard-chat/
COPY packages/panguard-report/package.json packages/panguard-report/
COPY packages/panguard-trap/package.json packages/panguard-trap/
COPY packages/panguard-web/package.json packages/panguard-web/
COPY packages/threat-cloud/package.json packages/threat-cloud/
COPY security-hardening/package.json security-hardening/

RUN pnpm install --frozen-lockfile --prod=false

# Copy source (exclude website - it deploys on Vercel separately)
COPY packages/core/ packages/core/
COPY packages/panguard/ packages/panguard/
COPY packages/panguard-auth/ packages/panguard-auth/
COPY packages/panguard-guard/ packages/panguard-guard/
COPY packages/panguard-scan/ packages/panguard-scan/
COPY packages/panguard-chat/ packages/panguard-chat/
COPY packages/panguard-report/ packages/panguard-report/
COPY packages/panguard-trap/ packages/panguard-trap/
COPY packages/panguard-web/ packages/panguard-web/
COPY packages/threat-cloud/ packages/threat-cloud/
COPY security-hardening/ security-hardening/
COPY config/ config/
COPY tsconfig.json ./

# Build backend packages only (skip website)
RUN pnpm --filter '!@panguard-ai/website' -r run build

# Prune dev dependencies to reduce image size
RUN pnpm prune --prod

# Create non-root user and data directory
RUN groupadd --system panguard && useradd --system --gid panguard panguard \
    && mkdir -p /data && chown panguard:panguard /data

USER panguard

ENV NODE_ENV=production
ENV PANGUARD_DATA_DIR=/data
ENV PANGUARD_PORT=3000

EXPOSE 3000

# No Docker HEALTHCHECK — Railway handles healthchecks natively
CMD ["node", "packages/panguard/dist/cli/index.js", "serve", "--port", "3000", "--host", "0.0.0.0", "--db", "/data/auth.db"]
