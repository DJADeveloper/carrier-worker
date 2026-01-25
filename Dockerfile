FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Install Playwright browsers and system dependencies
# This must happen after npm ci but before npm prune
RUN npx playwright install --with-deps chromium

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove devDependencies and cache to reduce image size
# Note: Keep playwright in dependencies, browsers are already installed above
RUN npm prune --production && npm cache clean --force

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Healthcheck using the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-8080}/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Run the worker
CMD ["node", "dist/index.js"]
