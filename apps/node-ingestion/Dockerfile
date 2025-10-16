# Multi-stage build for Node.js application
# Build stage - install dependencies and build native modules
FROM node:18-alpine as builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Create user and group with same IDs as runtime stage
RUN addgroup -g 1001 -S nodejs \
    && adduser -S appuser -u 1001 -G nodejs

# Set working directory
WORKDIR /build

# Copy package files first for better caching
COPY package*.json ./

# Change ownership to appuser before npm install
RUN chown -R appuser:nodejs /build

# Switch to appuser for npm install
USER appuser

# Install all dependencies (production only)
RUN npm install --only=production --no-audit --no-fund

# Production stage - minimal runtime image
FROM node:18-alpine as runtime

# Install only runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S appuser -u 1001

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=3584" \
    UV_THREADPOOL_SIZE=128

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage (already owned by appuser)
COPY --from=builder /build/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown appuser:nodejs logs

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application (mode can be controlled via APP_MODE environment variable)
CMD ["node", "--enable-source-maps", "src/app.js"]