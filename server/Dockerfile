FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p /data/plugins/versions

# Expose port
EXPOSE 3001

# Environment variables
ENV PORT=3001
ENV DATA_DIR=/data/plugins
ENV ADMIN_API_KEY=admin-secret-key-2024
ENV DEVELOPER_API_KEY=dev-secret-key-2024

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-standalone -qO- http://localhost:3001/health || exit 1

# Start command
CMD ["npm", "start"]
