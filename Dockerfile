FROM node:22-bookworm AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci
RUN PLAYWRIGHT_BROWSERS_PATH=/app/browsers npx playwright install chromium

COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
    libasound2 libxshmfence1 libcups2 libpangocairo-1.0-0 \
    libxcomposite1 libxdamage1 libxrandr2 libpango-1.0-0 \
    libcairo2 libatk1.0-0 libcupsfilters1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/browsers ./browsers

RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
