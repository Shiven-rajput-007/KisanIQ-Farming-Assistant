# KisanIQ — External Data Sources Documentation
> **Compliance & Transparency Standard:** Full disclosure of external APIs, official data sources, refresh semantics, and legal usage attributions.

---

## 1. Agricultural Market Prices (Mandi)

- **Official Provider:** Government of India — Open Government Data (OGD) Platform / Directorate of Marketing & Inspection (DMI) / AGMARKNET.
- **Dataset Title:** Current Daily Price of Various Commodities from Various Markets (Mandi).
- **Official Resource ID:** `9ef84268-d588-465a-a308-a864a43d0070`
- **Official API Endpoint Pattern:**  
  `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=YOUR_KEY&format=json&offset=0&limit=100`
- **Data Attributes Ingested:**
  - `state` — Administrative state name
  - `district` — Market district
  - `market` — Physical APMC mandi yard
  - `commodity` — Agricultural produce (e.g. Wheat, Mustard, Soybean, Onion)
  - `variety` — Specific botanical / commercial cultivar
  - `grade` — Quality classification (FAQ / Medium / Grade A)
  - `arrival_date` — Date of commodity arrival at the mandi
  - `min_price` — Minimum auction price in ₹/quintal
  - `max_price` — Maximum auction price in ₹/quintal
  - `modal_price` — Most frequent auction settlement price in ₹/quintal
- **Refresh Frequency:** Published daily by APMC market secretaries as physical auctions conclude. Synchronized daily into KisanIQ PostgreSQL.
- **Data Semantics:** Displayed strictly as *"Latest available mandi price"* alongside the explicit `arrival_date` and our `fetched_at` timestamp. Never labelled as real-time tick-by-tick stock quotes.
- **Attribution & Terms:** Data provided under the National Data Sharing and Accessibility Policy (NDSAP) of the Government of India.
- **API Key Security:** Restricted strictly to backend environment configuration (`DATA_GOV_IN_API_KEY`). Never bundled into frontend client assets.

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
- **Policy:** e-NAM does not currently offer a public, machine-readable open REST API without institutional licensing and bilateral APMC clearance. Therefore, KisanIQ provides official links ("View on e-NAM") and relies on Government of India Open Government Data (AGMARKNET) for machine-readable auction prices. KisanIQ never scrapes e-NAM pages.
