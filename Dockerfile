FROM node:18-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm install --production

# Copy server source code
WORKDIR /app
COPY server/ ./server/

# Copy frontend files
COPY index.html manifest.json sw.js ./
COPY css/ ./css/
COPY js/ ./js/
COPY pages/ ./pages/
COPY images/ ./images/
COPY emails/ ./emails/

# Set working directory to server
WORKDIR /app/server

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
