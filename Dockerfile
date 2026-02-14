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

# Cloud-first default runtime (PostgreSQL path). Override at deploy time if needed.
CMD ["npm", "run", "start:pg"]
