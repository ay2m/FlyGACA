# Fly GACA API — Cloud Run container.
#
# Two stages so the runtime image carries no TypeScript toolchain and no dev
# dependencies. Node 24 matches `engines.node` and Cloud Run's supported runtimes.
#
# This lives at the REPO ROOT, not in server/, for two reasons: the build needs
# public/data/rag-chunks.json (outside server/), and both `gcloud run deploy
# --source .` and the Cloud Build trigger only auto-detect ./Dockerfile — with it
# under server/ they silently fell back to buildpacks and built the Vite SPA.
#   docker build -t flygaca-api .

FROM node:24-slim AS build
WORKDIR /app

# .npmrc carries `legacy-peer-deps`, without which `npm ci` fails ERESOLVE on the
# dev tree; scripts/ has to land before the install because package.json's
# `postinstall` runs one of them.
COPY server/package*.json server/.npmrc ./
COPY server/scripts ./scripts
RUN npm ci

COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json server/.npmrc ./
COPY server/scripts ./scripts
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/lib ./lib
COPY server/migrations ./migrations

# The BM25 index is built from this at boot. Baking it in avoids a cold-start
# fetch; set CORPUS_URL to an https bucket URL instead to keep the image small.
COPY public/data/rag-chunks.json ./data/rag-chunks.json
ENV CORPUS_URL=/app/data/rag-chunks.json

# Cloud Run injects PORT; 8080 is its default contract.
EXPOSE 8080
CMD ["node", "lib/index.js"]
