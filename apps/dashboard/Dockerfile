FROM node:18-alpine

# Install curl for health checks and create non-root user
RUN apk add --no-cache curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files and set ownership
COPY --chown=appuser:nodejs . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]