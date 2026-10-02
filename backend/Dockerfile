# Production Dockerfile for Eva-Ai Backend Service
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Ensure production environment
ENV NODE_ENV=production

# Install dependencies deterministically
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY --chown=node:node src ./src

# Expose default port
EXPOSE 5000

# Use non-root node user for container security
USER node

# Start Eva-Ai Backend
CMD ["node", "src/app.js"]
