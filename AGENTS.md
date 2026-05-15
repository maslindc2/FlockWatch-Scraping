# FlockWatch Scraping

TypeScript web scraping service that automates a Playwright browser against the USDA Tableau dashboard for HPAI (avian flu) detections, downloads CSV exports, parses/transforms the data, and delivers structured data to Flock Watch Server.

## Commands

| Command | Description |
|---|---|
| `npm test` | Run all Jest tests with coverage |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only (requires MongoDB) |
| `npm run test:system` | System tests with coverage |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Build then run compiled server |
| `npm run nodemon` | Dev server with auto-reload (ts-node) |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | ESLint auto-fix |
| `npm run format` | Prettier format all JS/TS/JSON |
| `npm run docs` | Generate TypeDoc HTML in `docs/` |
| `npm run docs:serve` | TypeDoc watch mode |

## Architecture

### Data Flow

```
USDA Tableau dashboard
    ↓ Playwright headless browser automation
SharedArrayBuffer (CSV bytes, UTF-16LE encoded)
    ↓ CSVParser (csv-parse/sync)
Record<string, string>[]
    ↓ *Transformer classes
Typed interfaces (FlockCasesByState[], Last30Days[], SiteDetails[])
    ↓ Flock Watch Server
HTTP POST (via FetchRetry with exponential backoff + jitter)
```

### Two Delivery Modes

1. **Auto-Update** (`AUTO_UPDATE=true`): Cron-driven self-update. Service checks DB age on schedule, re-scrapes if data is >24h old, POSTs to `SERVER_UPDATE_URL`. The `/scraper/get-data` route is disabled.

2. **Request-Driven** (`AUTO_UPDATE=false`): Express route `GET /scraper/get-data` receives requests from Flock Watch Server. Protected by Bearer token auth (auth_id in MongoDB) and rate limiting (1 req/30s).

### Module Layout

| Module | Responsibility |
|---|---|
| `controllers/scraper.controller.ts` | Orchestrates full scrape lifecycle |
| `controllers/data.controller.ts` | Reads auth ID and last scraped date from DB |
| `modules/scraper/` | Playwright browser automation against USDA Tableau |
| `modules/data-processing/` | CSV parsing + data transformation pipeline |
| `modules/data-processing/csv/` | Raw CSV string → `Record<string, string>[]` |
| `modules/data-processing/data-transformers/` | Row data → typed interfaces |
| `modules/fetch-retry/` | HTTP POST/GET with exponential backoff + jitter |
| `modules/last-report-date/` | Mongoose model for scrape tracking (date + auth_id) |
| `modules/update-data/` | SelfUpdate: checks if DB is >24h old, triggers re-scrape |
| `routes/` | Express route definitions |
| `db/` | MongoDB connection via Mongoose |
| `utils/` | Winston logger |

### Key Interfaces

| Interface | Fields |
|---|---|
| `FlockCasesByState` | `state_abbreviation`, `state`, `backyard_flocks`, `commercial_flocks`, `birds_affected`, `total_flocks`, `latitude`, `longitude`, `last_reported_detection` |
| `Last30Days` | `period_name`, `total_birds_affected`, `total_flocks_affected`, `total_backyard_flocks_affected`, `total_commercial_flocks_affected` |
| `SiteDetails` | `special_id`, `county`, `state`, `production_type`, `confirmed_diagnosis_date`, `status`, `control_area_released_date?`, `birds_affected` |
| `HistoricalSummary` | `total_birds_affected_all_time`, `total_sites_all_time`, `total_active_sites`, `total_released_sites`, `total_na_sites`, `total_birds_active` |
| `StatusTransitionSummary` | `sites_confirmed_last_30_days`, `sites_released_last_30_days`, `birds_affected_last_30_days` |
| `LastReportDate` | `last_scraped_date`, `auth_id` |

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Controls CORS behavior and HTTPS validation |
| `PORT` | `4000` | Express server port |
| `MONGODB_URI` | *(required)* | MongoDB connection string |
| `SCRAPE_URL` | *(required)* | USDA Tableau dashboard URL |
| `SERVER_DOMAIN` | `http://localhost:8080` | Allowed CORS origin in production |
| `SERVER_UPDATE_URL` | `http://localhost:8080/data/data-update` | Where to POST scraped data |
| `AUTO_UPDATE` | `true` | Enable cron-driven self-update mode |
| `CRON` | `10 12 * * 1-5` | Cron expression for auto-update (default: weekdays at 12:10pm) |
| `LOG_LEVEL` | `error` | Winston log level (e.g., `silly`, `info`, `error`) |

## Development Setup

The project includes a `.devcontainer/` with Docker Compose that provisions both the Node.js app container and a MongoDB instance (`admin`/`flockwatch`). For local development outside devcontainers, a local MongoDB is expected.

### Testing Notes

- Integration tests use `mongodb-memory-server` (in-memory MongoDB).
- Unit tests mock Playwright/Mongoose dependencies.
- Tests live in `tests/` mirroring `src/` structure.

### CSV Quirks

- Tableau CSVs are **UTF-16LE encoded**; decoded via `TextDecoder("utf-16le")`.
- Some CSVs use **tab delimiters**; headers sometimes start on row 2 (row 1 is the sheet title).
- The `confirmedFlocksTotalCSV` is not a standard CSV — it's a `key\tvalue` per line format, parsed inline in `DataProcessor.processLast30DayTotalsCSVs()`.

## Conventions

- ES module imports (no default exports except for the Express router).
- Classes export via named export: `export { ClassName }`.
- Interfaces in dedicated `*.interface.ts` files.
- Transformers are stateless classes with `static transformData()`.
- Error handling: always `throw new Error(msg, { cause })` in catch blocks.
- Logger: use `import { logger } from "../../utils/winston-logger"`.
