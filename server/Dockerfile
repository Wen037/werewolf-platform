# ── Stage 1: Build TypeScript ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only install production dependencies (skip devDependencies + test packages)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Fly.io injects PORT; fallback to 5000 for local Docker testing
ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/server.js"]
