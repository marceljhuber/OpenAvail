# ─── build stage: compile the SPA and the server ────────────────────────────
FROM node:24-slim AS build
WORKDIR /app

# install all workspace deps (dev included) using only manifests for caching
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY . .
RUN npm run build

# ─── runtime stage: production deps + built artifacts only ───────────────────
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    STATIC_DIR=/app/web/dist \
    DB_PATH=/data/openavail.db \
    PORT=8787

COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist

EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "server/dist/index.js"]
