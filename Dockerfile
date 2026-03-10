# ============================================
#  Dockerfile for Node.js Rate Limiter Server
# ============================================

# Use a lightweight Node.js image
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package.json package-lock.json* ./

# Install dependencies inside the container
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the app port (informational — actual mapping in docker-compose)
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
