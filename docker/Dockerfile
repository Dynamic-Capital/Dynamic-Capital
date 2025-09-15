# syntax=docker/dockerfile:1.4
# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies for root and web app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Copy source code and build
COPY . .
RUN --mount=type=cache,target=/app/apps/web/.next/cache npm run build
RUN npm prune --omit=dev

# Stage 2: runtime
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

# Copy production dependencies and build artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN chown -R app:app /app

USER app

EXPOSE 8080
CMD ["npm", "run", "start:web"]
