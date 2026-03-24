FROM node:20-slim

WORKDIR /app

# Install libatomic1 for better-sqlite3 native addon
RUN apt-get update && \
    apt-get install -y --no-install-recommends libatomic1 python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Rewrite workspace refs to published npm versions
RUN sed -i 's/"workspace:\*"/"^1.3.0"/g' package.json

# Install dependencies
RUN npm install --install-strategy=nested

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc --build --force

# Runtime
EXPOSE 3000
CMD ["node", "dist/cli.js"]
