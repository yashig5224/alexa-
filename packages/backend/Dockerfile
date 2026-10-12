FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package manifests
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN npm ci

# Copy sources
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/backend ./packages/backend

# Build packages
RUN npm run build --workspace=@trackmate/shared
RUN npm run build --workspace=@trackmate/database
RUN npm run build --workspace=@trackmate/backend

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["node", "dist/server.js"]
