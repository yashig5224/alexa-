FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json turbo.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install dependencies
RUN npm ci

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY packages/mcp-server ./packages/mcp-server

# Build packages
RUN npm run build --workspace=@trackmate/shared
RUN npm run build --workspace=@trackmate/database
RUN npm run build --workspace=@trackmate/mcp-server

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/mcp-server/package.json ./packages/mcp-server/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist

WORKDIR /app/packages/mcp-server

EXPOSE 3002

CMD ["node", "dist/server.js"]
