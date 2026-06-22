FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build-time env vars — NEXT_PUBLIC_* are baked into the client bundle at build time
ARG NEXT_PUBLIC_BLOG_URL
ARG NEXT_PUBLIC_CAREERS_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_DIAGNOSTICS_URL
ARG NEXT_PUBLIC_BLUEPRINT_URL
ARG NEXT_PUBLIC_WORKFLOWS_URL
ARG NEXT_PUBLIC_PAYMENTS_URL
ARG NEXT_PUBLIC_ROADMAP_URL

ENV NEXT_PUBLIC_BLOG_URL=$NEXT_PUBLIC_BLOG_URL \
    NEXT_PUBLIC_CAREERS_URL=$NEXT_PUBLIC_CAREERS_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_DIAGNOSTICS_URL=$NEXT_PUBLIC_DIAGNOSTICS_URL \
    NEXT_PUBLIC_BLUEPRINT_URL=$NEXT_PUBLIC_BLUEPRINT_URL \
    NEXT_PUBLIC_WORKFLOWS_URL=$NEXT_PUBLIC_WORKFLOWS_URL \
    NEXT_PUBLIC_PAYMENTS_URL=$NEXT_PUBLIC_PAYMENTS_URL \
    NEXT_PUBLIC_ROADMAP_URL=$NEXT_PUBLIC_ROADMAP_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--dns-result-order=ipv4first

# Build Next.js with env vars baked in
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]