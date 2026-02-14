FROM node:20-alpine AS base

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source.
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Default runtime (PostgreSQL path).
CMD ["node", "server_pg.js"]
