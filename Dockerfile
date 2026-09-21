# Multi-Language Competitive Coding Judge Container for DebugArena
FROM node:20-bookworm-slim

# Install OpenJDK 17, GCC/G++ for C/C++, Python3, and SQLite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    build-essential \
    python3 \
    sqlite3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Java environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev || npm install --omit=dev

# Copy server codebase
COPY server/ ./server/

# Build TypeScript
RUN cd server && npx tsc

WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/server.js"]
