# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || npm ci

# Copy source code
COPY . .

# Build application
RUN yarn build || npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY yarn.lock* ./
RUN yarn install --production --frozen-lockfile || npm ci --production

# Copy built application
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p logs reports config && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

CMD ["node", "dist/server.js"]