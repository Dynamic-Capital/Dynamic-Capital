# syntax=docker/dockerfile:1

FROM node:18-alpine AS deps
WORKDIR /app

COPY scout-demo-service/package.json ./
RUN npm install --omit=dev

FROM node:18-alpine AS runner
WORKDIR /app

ENV BLUEBIRD_WARNINGS=0 \
  NODE_ENV=production \
  NODE_NO_WARNINGS=1 \
  NPM_CONFIG_LOGLEVEL=warn \
  SUPPRESS_NO_CONFIG_WARNING=true

COPY --from=deps /app/node_modules ./node_modules
COPY scout-demo-service/. ./

EXPOSE 3000
CMD ["node", "app.js"]
