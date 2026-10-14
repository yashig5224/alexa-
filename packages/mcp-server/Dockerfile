FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configs and package manifests for monorepo workspace resolution
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install all dependencies (workspaces will be linked automatically)
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/mcp-server ./packages/mcp-server

# Build in topological order
RUN npm run build --workspace=@trackmate/shared
RUN npm run build --workspace=@trackmate/database
RUN npm run build --workspace=@trackmate/mcp-server

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install curl/wget for healthchecks
RUN apk add --no-cache curl wget

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist

WORKDIR /app/packages/mcp-server

EXPOSE 3002

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/health || exit 1

CMD ["node", "dist/server.js"]
