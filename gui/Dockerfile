FROM node:20-slim as build-stage

# Create app directory and install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy source code and build the app
COPY . .
RUN npm run build

# Production stage: use Nginx to serve static files
FROM nginx:stable-alpine as production-stage

# Copy build files from previous stage to nginx html directory
COPY --from=build-stage /app/dist/spa /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]