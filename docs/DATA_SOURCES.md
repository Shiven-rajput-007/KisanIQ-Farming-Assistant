# KisanIQ — External Data Sources Documentation
> **Compliance & Transparency Standard:** Full disclosure of external APIs, official data sources, refresh semantics, and legal usage attributions.

---

## 1. Agricultural Market Prices & Quantities (Mandi)

- **Official Provider:** CEDA Agmarknet Agricultural-Market Data API.
- **Provider Body:** Centre for Economic Data and Analysis (CEDA), Ashoka University.
- **Official Documentation Portal:** [https://api.ceda.ashoka.edu.in/documentation/](https://api.ceda.ashoka.edu.in/documentation/)
- **API Base URL:** `https://api.ceda.ashoka.edu.in/v1` (configurable via `CEDA_BASE_URL`)
- **Authentication:** Bearer token (`Authorization: Bearer <CEDA_API_KEY>`)
- **Distinctive Clarification:** This is the **CEDA Agmarknet agricultural-market data API**, which programmatically serves verified Agmarknet commodity, geography, market, price, and arrival quantity records. **It is NOT an e-NAM API.**
- **Key API Endpoints:**
  - `GET /agmarknet/commodities` — Complete catalog of agricultural commodities and crop IDs
  - `GET /agmarknet/geographies` — States, census IDs, and district hierarchies
  - `POST /agmarknet/markets` — Specific APMC market yards filtered by commodity, state, and district
  - `POST /agmarknet/prices` — Real minimum, maximum, and modal auction settlement prices
  - `POST /agmarknet/quantities` — Physical arrival volumes/quantities recorded at APMC mandis
- **Data Attributes Ingested & Normalized:**
  - `state` — Administrative state name (resolved from `census_state_id`)
  - `district` — Market district (resolved from `census_district_id`)
  - `marketName` — Physical APMC mandi yard (resolved from `market_id`)
  - `commodity` — Agricultural produce (e.g. Wheat, Mustard, Soybean, Onion)
  - `variety` — Cultivar / variety
  - `grade` — Quality classification (FAQ / Grade A)
  - `arrivalDate` — Actual bulletin date of commodity arrival (`YYYY-MM-DD`)
  - `minPrice` — Minimum auction price in ₹/quintal
  - `maxPrice` — Maximum auction price in ₹/quintal
  - `modalPrice` — Most frequent auction settlement price in ₹/quintal
  - `quantity` — Arrival quantity in quintals / tonnes
  - `source` — `CEDA Agmarknet`
- **Refresh Frequency:** Published as physical APMC trading auctions conclude and daily bulletins are finalized. Synchronized into KisanIQ PostgreSQL.
- **Data Semantics:** Displayed strictly as *"Latest available mandi price"* alongside the explicit source date and `fetched_at` timestamp. Never labelled as tick-by-tick real-time financial trading data.
- **API Key Security:** Restricted strictly to backend environment configuration (`CEDA_API_KEY`). **Never** bundled into frontend client assets.

---

## 2. Weather & Agro-Meteorology

- **Official Provider:** Open-Meteo Weather API (`api.open-meteo.com`).
- **Endpoint Pattern:**  
  `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=...&daily=...&timezone=Asia%2FKolkata`
- **Data Attributes Ingested:**
  - 2-meter air temperature (`temperature_2m`) and apparent temperature (`apparent_temperature`)
  - Relative humidity (`relative_humidity_2m`)
  - 10-meter wind speed (`wind_speed_10m`)
  - Instantaneous and cumulative precipitation (`precipitation`, `precipitation_sum`)
  - Probability of precipitation (`precipitation_probability_max`)
  - WMO weather interpretation codes (`weather_code`)
- **Refresh Frequency:** Model updates run 4 times daily (ECMWF, GFS, and ICON numerical models). KisanIQ caches responses for 30 minutes to reduce external latency and respect rate limits.
- **Failure Policy:** If Open-Meteo is temporarily unreachable, the system returns HTTP 503 `WEATHER_UNAVAILABLE` and displays an explicit "Weather data is temporarily unavailable" notice. Fake fallback metrics are strictly prohibited.
- **License / Terms:** Open-Meteo API is open-source and free for non-commercial / open agricultural use with attribution.

---

## 3. Geocoding & Coordinate Resolution

- **Official Provider:** Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`).
- **Data Attributes Ingested:** Latitude, longitude, administrative district, and state.
- **Usage:** Used when the farmer selects or searches their village, tehsil, or district during onboarding or location switching.
- **Limitation:** Fallback to user-entered coordinates or district center coordinates if geocoding query is ambiguous.

---

## 4. Soil Health Laboratory Accreditation

- **Official Reference Body:** National Accreditation Board for Testing and Calibration Laboratories (NABL), Quality Council of India.
- **Official Directory Portal:** [https://www.nabl-india.org](https://www.nabl-india.org) / NABL Accredited Testing Laboratories Search.
- **Usage & Classification:**
  - KisanIQ provides direct links and verified laboratory directory profiles.
  - Distinguishes clearly between **NABL ISO/IEC 17025 accredited laboratories** and **Government Soil Health Card (SHC) testing centers**.
  - No synthetic laboratory names, fabricated NABL certificate codes, or fake expiry dates are ever created.

---

## 5. National Agriculture Market (e-NAM)

- **Official Portal:** [https://www.enam.gov.in](https://www.enam.gov.in)
- **Integration Status:** Reference & linking only.
- **Policy:** e-NAM does not currently offer a public, machine-readable open REST API without institutional licensing and bilateral APMC clearance. Therefore, KisanIQ provides official links ("View on e-NAM") and relies on **CEDA Agmarknet API** for standardized, machine-readable auction and arrival prices. KisanIQ never scrapes e-NAM pages.
