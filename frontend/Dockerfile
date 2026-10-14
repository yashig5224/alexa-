FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite frontend build-time environment variables
ARG VITE_API_BASE_URL=""

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy package manifests
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source files
COPY frontend/ ./

# Build production assets
RUN npm run build

FROM nginx:alpine AS runner

# Copy custom nginx configuration for SPA routing and API reverse-proxy
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
