# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /usr/src/app

# Copy dependency files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --legacy-peer-deps --omit=dev

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine

# Add tini for proper signal handling in containers
RUN apk add --no-cache tini

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /usr/src/app

# Copy node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Cloud Run expects PORT env var (defaults to 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Use tini as entrypoint for proper signal forwarding
ENTRYPOINT ["/sbin/tini", "--"]

# Start the server
CMD ["node", "server.js"]
