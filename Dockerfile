FROM node:24.4.1-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG PNPM_STORE_PATH=/pnpm/store
ENV PNPM_STORE_PATH=$PNPM_STORE_PATH

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=${PNPM_STORE_PATH} \
    pnpm fetch --frozen-lockfile

COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/worker/package.json packages/worker/

RUN --mount=type=cache,id=pnpm-store,target=${PNPM_STORE_PATH} \
    pnpm install --frozen-lockfile --offline

COPY packages/worker/ packages/worker/

RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /usr/src/app/packages/worker

RUN pnpm build

FROM base AS pruned

WORKDIR /usr/src/app

RUN pnpm --filter worker --prod deploy pruned

FROM gcr.io/distroless/nodejs24-debian12 AS worker
WORKDIR /app

COPY --from=build /usr/src/app/packages/worker/dist .
COPY --from=pruned /usr/src/app/pruned/node_modules ./node_modules

CMD ["/app/index.js"]
