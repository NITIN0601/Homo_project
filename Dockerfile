# ==============================================================================
# Agastya Classical Homeopathy EHR - Frontend Multi-Stage Dockerfile
# Stage 1: Build production React bundle with Vite
# Stage 2: Serve with high-performance Nginx Alpine on port 5173
# ==============================================================================

# ─── Stage 1: Build Frontend Assets ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with npm ci
COPY package.json package-lock.json ./
RUN npm ci

# Copy source tree and compile
COPY . .
RUN npm run build

# ─── Stage 2: Production Nginx Server ─────────────────────────────────────────
FROM nginx:alpine

# Remove default nginx static page
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy and SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:5173/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
