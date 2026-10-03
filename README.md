# KisanIQ — Intelligent Digital Farming Assistant (Production Full-Stack)

> **“KisanIQ does not just show farming data. KisanIQ converts farming data into clear decisions and actions.”**  
> Core flow: **DATA → INTELLIGENCE → DECISION → ACTION**  
> Primary farmer question: **“Aaj mujhe kya karna hai?” / “आज मला काय करायचे आहे?”**

---

## 🏗️ Production Full-Stack Architecture

```
React 18 + Vite + Tailwind Frontend (Port 5173)
        │
        │ HTTP REST APIs (JSON / JWT / Marathi-First i18n)
        ▼
Node.js + Express + TypeScript Backend (Port 8000)
        │
   ┌────┴────────────────────────┬────────────────────────┬────────────────────────┐
   ▼                             ▼                        ▼                        ▼
PostgreSQL Database        Open-Meteo API           Explainable Decision     Soil Health & NABL
(Embedded PGlite or       (Live agricultural       Engine (Rules + FAO-56   Lab System (7-Stage
External PostgreSQL)       weather & forecast)      + Mandi Optimization)    Tracking & Agronomy)
```

---

## 📋 10-Step Setup & Run Instructions

Follow these exact steps to run the complete KisanIQ application locally:

### 1. Install Node.js
Ensure Node.js (v18.0.0 or higher) and npm are installed on your system:
```bash
node -v
npm -v
```

### 2. Install PostgreSQL (Optional)
KisanIQ supports two PostgreSQL database modes:
- **Default (Zero Setup)**: Uses embedded real PostgreSQL (`@electric-sql/pglite`) persisting data locally to `./server/db/data`. No external database, Docker, or PostgreSQL service installation is required.
- **External PostgreSQL**: If you prefer connecting to your own PostgreSQL server (local, Supabase, Neon, RDS), ensure your PostgreSQL service is running and create a database.

### 3. Create Database (If using external PostgreSQL)
```sql
CREATE DATABASE kisaniq_db;
```

### 4. Configure Environment Variables
Copy `.env.example` to `server/.env` and adjust if necessary:
```bash
cp .env.example server/.env
```
Default settings:
```ini
PORT=8000
DATABASE_URL=
JWT_SECRET=kisaniq-super-secret-production-key-2026
FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
WEATHER_API_KEY=
```
*(Leave `DATABASE_URL` blank to use the embedded PostgreSQL database automatically).*

### 5. Install Dependencies
Install dependencies for both backend and frontend from the root workspace:
```bash
# In server
cd server && npm install

# In frontend
cd ../frontend && npm install

# Back to root
cd ..
```

### 6. Run Database Migrations / Schema Setup
Initialize the database tables:
- **Direct SQL**: Handled automatically on backend startup via `server/db/schema.sql` (25 relational tables).
- **Prisma**: The complete schema is defined in `prisma/schema.prisma`:
```bash
npx prisma generate
```

### 7. Seed the Database
Populate verified seed data (farmer accounts, APMC mandis, accredited laboratories, soil reports, vehicles, and crop stages):
```bash
# From root
npm run db:seed

# Or via Prisma
npx tsx prisma/seed.ts
```

### 8. Start Backend Server
```bash
# From root
npm run server
# (Runs on http://localhost:8000)
```

### 9. Start Frontend Server
```bash
# From root (in another terminal)
npm run dev:frontend
# (Runs on http://localhost:5173)
```

**Convenient Single-Command Start:**
To launch both backend and frontend simultaneously:
```bash
npm run dev:full
```

### 10. Open in Browser
Visit **[http://localhost:5173/](http://localhost:5173/)** to access the complete KisanIQ application.  
Health check endpoint: **[http://localhost:8000/api/health](http://localhost:8000/api/health)**

---

## 🚀 Working Development Commands Reference

| Command | Action |
|---|---|
| `npm run dev:full` | Start both Backend and Frontend concurrently |
| `npm run dev` | Start both services |
| `npm run server` | Start Express TypeScript backend (`http://localhost:8000`) |
| `npm run dev:frontend` | Start React Vite frontend (`http://localhost:5173`) |
| `npm run db:seed` | Seed PostgreSQL database with development records |
| `npm run build` | Build production bundles for both backend and frontend |
| `npm run test` | Run the automated 14-point API integration test suite |

---

## 🗄️ Database Architecture & Entities

The database schema is defined in both [`server/db/schema.sql`](server/db/schema.sql) and [`prisma/schema.prisma`](prisma/schema.prisma) covering 25 relational models:

1. **`users`**: Authentication credentials, phone numbers, bcrypt password hashes, and user roles (`farmer` / `buyer` / `admin`).
2. **`farmers`**: Farm profiles, GPS coordinates, location hierarchy (village, district, state), and language preferences.
3. **`farms` & `fields`**: Land holdings, soil classifications (alluvial, black, red, loamy), and irrigation sources.
4. **`crops`, `crop_stages` & `crop_actions`**: Crop growth stage timelines, health status, and action checklists.
5. **`markets` & `market_prices`**: Real APMC mandi directory, geodesic Haversine distance, and daily commodity prices.
6. **`selling_decisions`**: Multi-factor decision engine calculations, net realizations, and partial selling splits.
7. **`recommendations` & `alerts`**: Contextual, explainable daily agronomic actions with "Kyun?" (Why?) data points.
8. **`notifications`**: Real-time alerts for weather risks, mandi price changes, and crop inspection milestones.
9. **`chat_messages`**: Conversational history with assistant messages persisted in PostgreSQL.
10. **`orders`, `shipments` & `vehicles`**: Farm-gate direct logistics, vehicle assignment, and shipment tracking codes (`TRK-...`).
11. **`buyer_profiles`, `crop_listings` & `marketplace_orders`**: Direct farmer-to-buyer marketplace with zero middleman commissions.
12. **`laboratories`**: Directory of certified NABL / ICAR agricultural soil testing centers.
13. **`soil_test_requests`**: 7-stage sample tracking lifecycle (`REQUESTED` $\to$ `COMPLETED`).
14. **`soil_reports`**: NABL lab test results (pH, EC, OC, N, P, K) with crop-calibrated deficiency rules.
15. **`soil_sensor_readings`**: IoT telemetry readings explicitly tagged as **`DEMO SENSOR DATA`**.

---

## 📡 Core API Endpoints

### Health & Dashboard
- `GET /api/health` — Returns `{ success: true, message: "KisanIQ backend is running", databaseConnected: true }`
- `GET /api/dashboard` — Aggregated daily briefing for "Aaj Kya Karein" / "आज काय करायचे"

### Authentication & Profiles
- `POST /api/auth/register` — Farmer and buyer registration with password hashing
- `POST /api/auth/login` — Phone + password authentication returning JWT bearer token
- `GET /api/auth/me` — Authenticated session verification
- `GET /api/farmer/profile` — Farmer profile, farm dimensions, soil, and irrigation
- `PUT /api/farmer/profile` — Update farmer details

### Weather & Agronomic Intelligence
- `GET /api/weather/current` — Live Open-Meteo weather with agricultural implications
- `GET /api/crops` — Farmer crops, stage timeline, and pending action items
- `POST /api/crops` — Add new crop to field
- `GET /api/recommendations/daily` — Explainable actions with "Kyun?" reasoning data points
- `POST /api/recommendations/:id/complete` — Mark action completed in database
- `GET /api/risk/assessment` — Multi-factor farm risk index (0–100)

### Mandi Intelligence & Direct Marketplace
- `GET /api/market/comparison` — Geodesic APMC mandi comparisons, freight costs, and net returns
- `POST /api/market/orders` — Book transport and create farm-gate logistics order
- `GET /api/marketplace/listings` — Browse verified crop listings
- `POST /api/marketplace/listings` — Publish direct crop listing
- `POST /api/marketplace/orders` — Place order directly with farmer

### Soil Testing & Laboratory Workflow
- `GET /api/soil/labs` — Directory of accredited agricultural testing laboratories
- `GET /api/soil/requests` — Farmer soil test requests with active status
- `POST /api/soil/requests` — Submit soil test request (Accredited Lab, Field Kit, IoT)
- `PUT /api/soil/requests/:id/status` — Advance sample lifecycle stage
- `GET /api/soil/reports/latest/:farmerId` — Latest verified lab report with agronomic interpretation
- `GET /api/soil/reports/history/:farmerId` — Historical test reports
- `GET /api/soil/sensors/latest/:fieldId` — IoT sensor reading with `DEMO SENSOR DATA` tag

### Voice & Text Assistant
- `POST /api/assistant/chat` — Context-aware NLU assistant supporting Marathi, Hindi, and English
- `GET /api/assistant/history` — Chat interaction history

---

## 🌐 Marathi-First Experience (`mr` / `mr-IN`)
- **Default Application Language**: Marathi (`mr`) is the primary language across all pages, navigation, headers, forms, and dialogs.
- **Tri-State Switcher**: Instant switching between **मराठी**, **हिन्दी**, and **English**.
- **Voice Assistant**: Slide-over drawer with 5 explicit lifecycle states (`IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`, `ERROR`) and authentic Marathi speech recognition and audio replay.
