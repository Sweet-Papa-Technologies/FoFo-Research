# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from app directory
COPY app/package*.json ./
COPY app/yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile || npm ci

# Copy source code
COPY app/ .

# Build Quasar app
RUN yarn build || npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist/spa /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN adduser -D -H -u 1001 -s /sbin/nologin nginx-user

# Set ownership
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]