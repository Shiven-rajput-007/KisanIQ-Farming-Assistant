# KisanIQ Architecture & Audit Specification
> **Document Version:** 2.0.0 — Production Build  
> **Status:** Completed Audit & Target Architecture Blueprint  

---

## 1. Current Architecture Summary

The existing KisanIQ codebase is structured as a decoupled full-stack TypeScript application:

- **Frontend (`frontend/`):** React 18, Vite, TypeScript, Tailwind CSS v4, Lucide React, `react-router-dom` v6, and `react-i18next` for Marathi-first (`mr-IN`), Hindi (`hi-IN`), and English (`en-IN`) interfaces.
- **Backend (`server/`):** Node.js with Express and TypeScript, exposing REST API routes (`/api/auth`, `/api/dashboard`, `/api/crops`, `/api/market`, `/api/soil`, `/api/weather`, etc.).
- **Database (`server/db/` & `prisma/`):** PostgreSQL database schema with 25 relational models defined in `prisma/schema.prisma` and SQL migrations in `server/db/schema.sql`. Currently incorporates `@electric-sql/pglite` as an embedded zero-dependency engine alongside `pg.Pool`.

---

## 2. Problems Discovered During Audit

1. **Unwanted Auto-Seeding on Startup:**
   - `server/server.ts` automatically ran `seedDatabase()` on startup, which inserted a hardcoded demo user (`Ramesh Patil`) and predefined crop records into the database. In production, the database must start empty and only contain data created by real user workflows.
2. **Silent Fallback to Mock Data in Frontend:**
   - Hooks (`useDashboard.ts`, `useCrops.ts`, `useMarket.ts`, `useWeather.ts`, `useNotifications.ts`, `useRisk.ts`, `useProfile.ts`) caught API errors and silently substituted objects from `src/services/mock/mock-data.ts`. This masked backend failures and violated the strict zero-demo-data requirement.
3. **Hardcoded Fallbacks in Backend Services:**
   - `weatherService.ts`: In the event of an Open-Meteo API error, the service silently returned hardcoded weather metrics (32°C, 62% humidity, fake forecast) rather than returning a clean `WEATHER_UNAVAILABLE` error.
   - `marketService.ts`: Lacked direct integration with the Government of India Open Government Data (OGD) Agmarknet API (`data.gov.in`), and fell back to a hardcoded market item (`m_fallback`) when database records were empty.
   - `decisionEngine.ts`: When evaluating a farmer with no registered crops, it defaulted to hardcoded Wheat HD-2967 values instead of handling empty crop states cleanly.
4. **Silent Database Fallback in Production:**
   - `server/db/index.ts` automatically fell back to embedded PGlite when `DATABASE_URL` failed. In production (`NODE_ENV=production`), the backend must fail fast and require genuine PostgreSQL (Neon).
5. **Missing Scheduled Mandi Synchronization:**
   - No automated daily ingestion pipeline (`scripts/sync-mandi.ts`) or GitHub Actions workflow (`.github/workflows/mandi-sync.yml`) existed to fetch daily Agmarknet commodity arrivals from `api.data.gov.in`.
6. **Deployment Gaps:**
   - Frontend lacked Netlify SPA rewrite rules (`_redirects` / `netlify.toml`), causing 404 errors on direct browser refresh.
   - Production backend configuration needed formal Render `render.yaml` or specification, `PORT` binding, and strict `CORS_ORIGINS` validation.

---

## 3. Required Fixes & Implementation Plan

| Component | Audit Issue | Required Production Fix |
| :--- | :--- | :--- |
| **Database Seeding** | Auto-inserts demo farmer on startup | Disable `seedDatabase()` on startup in production; DB starts clean. Dev seeding available only via explicit `npm run seed`. |
| **Database Engine** | Silent PGlite fallback in production | Strict fail-fast check: If `NODE_ENV === 'production'`, `DATABASE_URL` is mandatory. PGlite allowed only in local development. |
| **Mandi Service** | No live government API connection | Implement `mandiService.ts` to call official OGD Agmarknet endpoint (`resource/9ef84268-d588-465a-a308-a864a43d0070`) using `DATA_GOV_IN_API_KEY`. |
| **Mandi Sync** | No automated sync | Create `scripts/sync-mandi.ts`, protected endpoint `POST /api/market/sync` (`MANDI_SYNC_SECRET`), and `.github/workflows/mandi-sync.yml`. |
| **Mandi UI** | Stale / fallback confusion | Display exact arrival date, data source ("Government of India / AGMARKNET"), and fetch timestamp. Mark data as stale if >24h old. |
| **Weather Service** | Fake fallback on failure | Remove fake values. Return `WEATHER_UNAVAILABLE` with status 503 and clear UI messaging. |
| **Frontend Hooks** | Mock data fallback catch blocks | Remove all mock data imports. Return clean error/empty states so the UI communicates real status. |
| **Soil Lifecycle** | Stages auto-advanced | Enforce strict 7-stage workflow (`REQUESTED` $\to$ `SAMPLE_COLLECTED` $\to$ `IN_TRANSIT` $\to$ `RECEIVED_AT_LAB` $\to$ `TESTING_IN_PROGRESS` $\to$ `REPORT_GENERATED` $\to$ `DELIVERED`). |
| **Hero Image** | Need authentic agricultural visual | Store high-quality, legally compliant local asset in `frontend/public/assets/` instead of external unstable URLs. |
| **Netlify / Render** | Missing deployment configs | Add `frontend/public/_redirects`, `netlify.toml`, Render setup, and comprehensive deployment docs. |

---

## 4. Target Production Architecture

```text
                                  KISANIQ
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
            Frontend Client                  Backend Service
            (Netlify CDN)                    (Render Cloud)
            React 18 + Vite                  Node.js + Express + TS
                     │                               │
                     │ (HTTPS / REST)                │
                     └───────────────┬───────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
           Neon PostgreSQL                    External Data Sources
        (Production Database)                         │
        25 Relational Models                          ├─► data.gov.in / AGMARKNET
        Prisma ORM Migrations                         │   (Mandi Prices & Arrivals)
                                                      │
                                                      └─► Open-Meteo API
                                                          (Weather & Forecast)
```

### Communication Flow:
1. **Frontend (Netlify):** Static assets served globally via Netlify CDN. Dispatches API calls to `VITE_API_URL` (e.g. `https://kisaniq-api.onrender.com/api`).
2. **Backend (Render):** Express API running on `0.0.0.0:$PORT`. Verifies JWTs, enforces farmer ownership, validates inputs via Zod, and queries Neon PostgreSQL.
3. **Database (Neon):** Managed serverless PostgreSQL. Stores farmers, crops, field sensor readings, authentic APMC mandi prices, soil reports, orders, and notifications.
4. **External Services:**
   - `api.data.gov.in`: Government of India daily mandi commodity arrival feed.
   - `api.open-meteo.com`: Real-time agro-meteorological observations and forecasts.
