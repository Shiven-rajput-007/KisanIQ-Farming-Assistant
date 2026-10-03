# KisanIQ — Complete Project Context & Architecture Documentation
> **Target Audience:** ChatGPT / Claude / AI Assistants & Developers  
> **Use Case:** Copy-paste this entire document or upload it to ChatGPT to give it 100% full context on the KisanIQ project.

---

## 1. Executive Summary & Project Purpose

**KisanIQ** is a full-stack intelligent agricultural assistant and decision-support web application tailored for Indian farmers.

- **Primary Language / Localization:** **Marathi-First (`mr-IN`)** by default, with seamless real-time switching between **Marathi (`mr`)**, **Hindi (`hi`)**, and **English (`en`)**.
- **Target Audience:** Smallholder and medium farmers in India (demo profile: Ramesh Patil, Gwalior district, cultivating HD-2967 Wheat).
- **Core Mission:** Move beyond generic static advice into actionable, financially sound decision-making:
  1. **APMC Mandi Intelligence:** "Highest price $\neq$ Best decision". Computes true net return factoring in distance, vehicle transport costs, APMC commission fees, loading/unloading charges, and transit wastage.
  2. **Accredited Soil Health Testing:** 7-stage sample tracking pipeline, accredited NABL laboratories directory, digital soil health cards, and customized N-P-K nutrient application advisories.
  3. **Real Voice Assistant:** Native voice interface using browser SpeechRecognition (STT in `mr-IN`/`hi-IN`/`en-IN`) and SpeechSynthesis (TTS) backed by domain intent detection.
  4. **Dynamic Agro-Meteorology:** Live weather integration via Open-Meteo API cross-referenced with crop growth stages (FAO-56 crop coefficient model) to advise irrigation, spray timing, and disease prevention.

---

## 2. Technology Stack

| Layer | Technologies / Packages |
| :--- | :--- |
| **Frontend Framework** | **React 18** + **Vite** + **TypeScript** |
| **Styling & Icons** | **Tailwind CSS v4**, **Lucide React** icons |
| **State & Routing** | `react-router-dom` v6, React Context (`FarmContext`), custom hooks |
| **Localization (i18n)**| `i18next`, `react-i18next`, `i18next-browser-languagedetector` |
| **Voice / Speech** | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`, `speechSynthesis`) |
| **Backend Runtime** | **Node.js** + **Express** + **TypeScript** (`tsx` dev / `tsc` build) |
| **Database Engine** | **PostgreSQL** / Embedded **PGlite** (`@electric-sql/pglite` v0.2.14) for zero-dependency execution |
| **ORM / Schema** | **Prisma ORM** (`prisma/schema.prisma` with 25 relational models) |
| **Security & Auth** | `bcryptjs`, `jsonwebtoken` (JWT), input validation (`zod`) |
| **External APIs** | Open-Meteo Weather API, Agmarknet / APMC Market Price feeds |

---

## 3. Repository Directory Structure

```text
d:/antigravitry/
├── KisanIQ-project.zip       # Complete standalone project archive (excluding node_modules)
├── CHATGPT_PROJECT_CONTEXT.md# This document
│
├── frontend/                 # React 18 + Vite + Tailwind CSS frontend
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts        # Configured with proxy to backend & 0.0.0.0 host
│   ├── .env                  # VITE_API_BASE_URL=http://localhost:8000/api
│   ├── public/
│   └── src/
│       ├── main.tsx          # Application entrypoint with Suspense & i18n
│       ├── App.tsx           # RouterProvider & useLanguage hook
│       ├── api/
│       │   ├── client.ts     # Centralized fetch wrapper with JWT header injection
│       │   └── mockData.ts   # Optional fallback/test fixtures
│       ├── components/
│       │   ├── domain/       # Agricultural domain components
│       │   │   ├── aaj-kya-karein.tsx     # Daily action advisories
│       │   │   ├── crop-card.tsx          # Crop stage & health widget
│       │   │   ├── market-card.tsx        # Mandi net return card
│       │   │   ├── weather-card.tsx       # Live weather & farming impact
│       │   │   └── soil/                  # Soil testing UI & NABL certificate modal
│       │   ├── layout/       # AppHeader, BottomNav, DesktopSidebar, AppShell
│       │   ├── ui/           # Button, Card, Badge, Skeleton, Modal, Tabs
│       │   └── voice/        # VoiceAssistant drawer & animated mic controls
│       ├── context/
│       │   └── FarmContext.tsx # Global state: active farmer, crops, alerts, language
│       ├── hooks/
│       │   ├── useLanguage.ts      # Multi-language selector & RTL/LTR syncing
│       │   ├── useOnlineStatus.ts  # Offline detection & caching
│       │   └── useVoiceAssistant.ts# SpeechRecognition & SpeechSynthesis engine
│       ├── i18n/
│       │   ├── config.ts           # i18next initialization (mr default)
│       │   └── locales/
│       │       ├── mr/             # Marathi: common, home, crop, market, soil, etc.
│       │       ├── hi/             # Hindi translations
│       │       └── en/             # English translations
│       ├── pages/
│       │   ├── home/               # Daily briefing & alerts
│       │   ├── meri-fasal/         # Crop timeline & health monitoring
│       │   ├── market/             # APMC Mandi comparisons & selling decisions
│       │   ├── soil/               # Lab directory, booking, sample tracking
│       │   ├── weather/            # 7-day forecast & agricultural notes
│       │   ├── assistant/          # AI Chat & Voice Assistant page
│       │   └── profile/            # Farmer & Farm profile settings
│       ├── routes/
│       │   ├── index.tsx           # React Router v6 route configuration
│       │   └── paths.ts            # Type-safe route string constants
│       └── types/                  # Shared TypeScript interfaces
│
├── server/                   # Express + TypeScript backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── server.ts             # Express server entry point (Universal CORS, Port 8000)
│   ├── controllers/          # Request handlers
│   │   ├── authController.ts
│   │   ├── cropController.ts
│   │   ├── dashboardController.ts
│   │   ├── farmerController.ts
│   │   ├── marketController.ts
│   │   ├── soilController.ts
│   │   └── weatherController.ts
│   ├── db/
│   │   ├── index.ts          # PGlite connection pool & migration runner
│   │   ├── schema.sql        # Full DDL (25 relational tables)
│   │   ├── seed.ts           # Database seeder (Ramesh farmer, Mandis, Labs, Reports)
│   │   └── data/             # Embedded PGlite storage files
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication & optionalAuth middleware
│   │   └── errorHandler.ts   # Centralized HTTP error handler
│   ├── routes/
│   │   ├── index.ts          # Main API router (/api/health, /api/dashboard, etc.)
│   │   ├── authRoutes.ts
│   │   ├── cropRoutes.ts
│   │   ├── farmerRoutes.ts
│   │   ├── marketRoutes.ts
│   │   ├── soilRoutes.ts
│   │   └── weatherRoutes.ts
│   └── services/
│       ├── decisionEngine.ts # APMC Net Return & Irrigation decision logic
│       ├── weatherService.ts # Open-Meteo external API integration
│       └── assistantService.ts# NLP / intent routing for farmer questions
│
├── prisma/                   # Prisma ORM specifications
│   ├── schema.prisma         # 25 production models with relations and indexes
│   └── seed.ts               # Standalone Prisma client seed script
│
└── scripts/
    └── create_zip.py         # Whitelisted ZIP archiver excluding node_modules
```

---

## 4. Database Schema (25 Relational Models)

Defined in both `prisma/schema.prisma` and `server/db/schema.sql`:

1. **`users`**: Authentication credentials (`phone`, `password_hash`, `role: farmer | buyer | admin`).
2. **`farmers`**: Farmer demographic data (`name`, `village`, `district`, `state`, `preferred_language`, `coordinates`).
3. **`farms`**: Land holdings (`total_area`, `soil_type`, `irrigation_source`).
4. **`fields`**: Individual parcels belonging to a farm.
5. **`crops`**: Cultivated crops (`name`, `variety`, `sowing_date`, `current_stage`, `days_old`, `expected_yield`).
6. **`crop_stages`**: Stage tracking (Sowing $\to$ Vegetative $\to$ Flowering $\to$ Grain filling $\to$ Harvest).
7. **`soil_sensor_readings`**: Field IoT sensors (`moisture`, `temperature`, `ec`, `ph`).
8. **`weather_forecasts`**: Cached daily meteorological predictions.
9. **`apmc_mandis`**: Verified Indian agricultural markets (`name`, `district`, `state`, `distance_km`, `coordinates`).
10. **`market_prices`**: Real-time commodity arrivals (`min_price`, `max_price`, `modal_price`, `arrival_tonnes`, `source`).
11. **`selling_decisions`**: Algorithmic recommendations (`recommendation_type: SELL_NOW | HOLD | PARTIAL_SELL`, `target_market_id`, `net_return`).
12. **`soil_labs`**: NABL accredited testing facilities (`name`, `license_no`, `nabl_accredited`, `test_price`).
13. **`soil_test_requests`**: 7-stage lifecycle tracking (`REQUESTED` $\to$ `SAMPLE_COLLECTED` $\to$ `IN_TRANSIT` $\to$ `RECEIVED_AT_LAB` $\to$ `TESTING_IN_PROGRESS` $\to$ `REPORT_GENERATED` $\to$ `DELIVERED`).
14. **`soil_reports`**: Digital Soil Health Card (`ph`, `organic_carbon`, `nitrogen`, `phosphorus`, `potassium`, `recommendations_json`).
15. **`recommendations`**: Advisory notifications (`action_code`, `priority`, `why_explanation`).
16. **`alerts`**: Urgent push alerts (heavy rainfall warnings, pest outbreaks).
17. **`notifications`**: Activity feed for the farmer.
18. **`chat_messages`**: Chat history between farmer and AI assistant.
19. **`crop_listings`**: Farmer B2B marketplace sell offers.
20. **`marketplace_orders`**: B2B buyer purchases with escrow payment status.
21. **`buyers`**: Institutional / trader profiles.
22. **`fpos`**: Farmer Producer Organizations.
23. **`shipments`**: Logistics tracking for crop transit.
24. **`vehicles`**: Transport vehicle registry.
25. **`drivers`**: Transport driver assignments.

---

## 5. Backend REST API Reference

Base URL: `http://localhost:8000/api`

### Core & Diagnostics
- `GET /api/health` — System status, uptime, and database connectivity.
- `GET /api/download` — Direct download of `KisanIQ-project.zip`.
- `GET /api/dashboard` — Complete farmer dashboard briefing: weather, active crops, top 3 recommendations, urgent alerts, and best APMC market.

### Crops & Advisory
- `GET /api/crops` — List crops for current farmer.
- `GET /api/crops/:id` — Detail view with growth timeline and nutrient requirements.
- `POST /api/crops` — Register a new crop season.
- `GET /api/recommendations` — Rule-based agricultural suggestions.

### APMC Market Intelligence
- `GET /api/market/mandis` — List nearby APMC mandis.
- `GET /api/market/prices?crop=Wheat` — Live prices and arrivals per quintal.
- `GET /api/market/decision` — Evaluates net returns across Mandis using the formula:
  $$\text{Net Return} = (\text{Price} \times Q) - \text{Transport} - (\text{Price} \times Q \times \text{Commission}) - \text{Loading} - \text{Wastage}$$

### Soil Health & Lab Testing
- `GET /api/soil/labs` — Accredited laboratories directory (with NABL license numbers).
- `GET /api/soil/requests` — Active test sample status (7-stage progress tracking).
- `POST /api/soil/requests` — Book a new soil test with sample pickup.
- `GET /api/soil/reports/:id` — Complete soil report with N-P-K nutrient status and lab certificate.

### Weather & Voice Assistant
- `GET /api/weather/current` — Live Open-Meteo temperature, humidity, wind, and rain risk.
- `POST /api/assistant/chat` — Multilingual query resolution (`mr`, `hi`, `en`) with farmer-specific context.

---

## 6. Core Algorithms & Business Logic

### A. APMC Mandi Decision Engine (`decisionEngine.ts`)
Instead of simply pointing the farmer to the mandi with the highest raw price, the engine calculates:
```typescript
const grossRevenue = modalPrice * quantityQuintals;
const transportTotal = baseTransportRate + (distanceKm * perKmRate);
const commissionDeduction = grossRevenue * (commissionPercent / 100);
const loadingCharges = perQuintalLoadingRate * quantityQuintals;
const wastageLoss = grossRevenue * (transitWastagePercent / 100);

const netReturn = grossRevenue - (transportTotal + commissionDeduction + loadingCharges + wastageLoss);
```
**Outcome:** A mandi 5 km away offering ₹2,520/q frequently yields **higher net take-home profit** than a mandi 45 km away offering ₹2,600/q due to transport fuel, transit loss, and higher mandi cess.

### B. Soil Testing 7-Stage Pipeline
Samples move through an immutable status chain:
1. `REQUESTED` (Farmer books sample pickup)
2. `SAMPLE_COLLECTED` (Field agent collects soil core)
3. `IN_TRANSIT` (Sample dispatched to testing facility)
4. `RECEIVED_AT_LAB` (Sample registered with barcode)
5. `TESTING_IN_PROGRESS` (Spectrometry & chemical assay)
6. `REPORT_GENERATED` (NABL certificate & recommendations signed)
7. `DELIVERED` (Instant notification on farmer's dashboard)

---

## 7. How to Prompt ChatGPT with this Data

Paste the snippet below into ChatGPT along with your question:

```markdown
I have an existing full-stack agriculture web application called "KisanIQ" for Indian farmers.
Here is the context:
- Frontend: React 18, Vite, TypeScript, Tailwind CSS v4, Marathi-first localization (mr-IN), Web Speech API.
- Backend: Node.js, Express, TypeScript, PGlite/PostgreSQL database, Prisma ORM (25 models).
- Key Modules: APMC Mandi Net Return Calculator, Accredited Soil Health Lab Testing (7-stage pipeline), Dynamic Weather-based Crop Advisory, Voice Assistant.

[PASTE CHATGPT_PROJECT_CONTEXT.md OR SPECIFIC SECTIONS HERE]

My specific request or question is:
<TYPE YOUR QUESTION HERE>
```
