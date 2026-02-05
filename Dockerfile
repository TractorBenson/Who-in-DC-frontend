# Multi-stage build for Next.js static export served by NGINX

########## 1) Build stage (Next.js export) ###################################
FROM node:20-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy manifests first for better cache use
COPY package*.json ./

# Install dependencies (BuildKit cache enabled if available)
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline

# Copy the rest of the source
COPY . .

# Build static export (Next.js with output: 'export') to /app/out
RUN npm run build


########## 2) Runtime stage (NGINX static) ###################################
FROM nginx:1.27-alpine

# Provide nginx config (expects /healthz route). Replace if you have your own.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy exported static files
COPY --from=build /app/out /usr/share/nginx/html

# Optionally run as non-root:
# USER 101:101

EXPOSE 80



# Notes:
# - If you keep dynamic Next.js features, use `next start` instead of export and skip nginx.
# - Adjust Node version if you pin elsewhere.
# - Ensure .dockerignore excludes node_modules, .next, out, etc., to keep image lean.