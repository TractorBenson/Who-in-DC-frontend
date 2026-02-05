# Multi-stage build for Next.js (server-rendered)

########## 1) Build stage ###################################
FROM node:20-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy manifests first for better cache use
COPY package*.json ./

# Install dependencies (BuildKit cache enabled if available)
RUN --mount=type=cache,target=/root/.npm npm ci --prefer-offline

# Copy the rest of the source
COPY . .

# Build production bundle
RUN npm run build


########## 2) Runtime stage ###################################
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
