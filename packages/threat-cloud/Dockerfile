FROM node:20-slim

WORKDIR /app

# Install libatomic1 for better-sqlite3 native addon + build tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends libatomic1 python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Rewrite workspace refs to published npm versions
RUN sed -i 's/"workspace:\*"/"^1.3.0"/g' package.json

# Install dependencies (gets @panguard-ai/core from npm, not monorepo)
RUN npm install --install-strategy=nested

# Copy source
COPY src/ ./src/

# Create standalone tsconfig (no monorepo references)
RUN echo '{ \
  "compilerOptions": { \
    "target": "ES2022", \
    "module": "NodeNext", \
    "moduleResolution": "NodeNext", \
    "rootDir": "./src", \
    "outDir": "./dist", \
    "declaration": true, \
    "declarationMap": true, \
    "sourceMap": true, \
    "strict": true, \
    "esModuleInterop": true, \
    "skipLibCheck": true, \
    "resolveJsonModule": true \
  }, \
  "include": ["src/**/*.ts"], \
  "exclude": ["node_modules", "dist"] \
}' > tsconfig.json

# Build
RUN npx tsc --build --force

# Runtime - remove build tools
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

EXPOSE 3000

# Use /data for persistent storage (Railway volume mount)
ENV TC_DB_PATH=/data/threat-cloud.db

CMD ["node", "dist/cli.js"]
