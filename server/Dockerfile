# Fly GACA API — Cloud Run container.
#
# Two stages so the runtime image carries no TypeScript toolchain and no dev
# dependencies. Node 24 matches `engines.node` and Cloud Run's supported runtimes.
#
# Build from the REPO ROOT so the corpus can be copied in:
#   docker build -f server/Dockerfile -t flygaca-api .

FROM node:24-slim AS build
WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/lib ./lib
COPY server/migrations ./migrations
COPY server/scripts ./scripts

# The BM25 index is built from this at boot. Baking it in avoids a cold-start
# fetch; set CORPUS_URL to an https bucket URL instead to keep the image small.
COPY public/data/library-search.json ./data/library-search.json
ENV CORPUS_URL=/app/data/library-search.json

# Cloud Run injects PORT; 8080 is its default contract.
EXPOSE 8080
CMD ["node", "lib/index.js"]
