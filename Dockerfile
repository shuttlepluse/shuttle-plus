# Shuttle Plus PWA - Docker Configuration
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ .

# Copy frontend files
WORKDIR /app
COPY index.html manifest.json sw.js ./
COPY pages/ ./pages/
COPY css/ ./css/
COPY js/ ./js/
COPY images/ ./images/

# Back to server directory
WORKDIR /app/server

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server
CMD ["npm", "start"]
