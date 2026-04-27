# ============================================
# Stage 1: Build the Angular application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build production bundle
RUN npm run build:prod

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built Angular app from builder stage
COPY --from=builder /app/dist/app /usr/share/nginx/html

# Cloud Run uses port 8080
EXPOSE 8080

# Run nginx in foreground (required for containers)
CMD ["nginx", "-g", "daemon off;"]
