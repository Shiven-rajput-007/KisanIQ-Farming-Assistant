# KisanIQ — Agronomic Rules & Decision Heuristics
> **Document Purpose:** Complete agronomic justification and operational thresholds for KisanIQ rule-based agricultural recommendations.  
> **Status:** Documented Agronomic Reference  
> **Important Disclaimer:** KisanIQ operates as a decision-support advisory system. It does not provide certified agronomic prescriptions or guaranteed crop disease diagnoses. Field verification by the farmer is always advised.

---

## 1. Irrigation Decision Heuristics

Irrigation recommendations are derived dynamically by cross-referencing live meteorological forecasts (Open-Meteo API) with crop stage and soil drainage characteristics:

### A. Postpone Irrigation (`NO_IRRIGATION`)
- **Trigger Conditions:**
  1. Probability of precipitation in next 24–48 hours $\ge 50\%$, OR
  2. Expected cumulative rainfall in next 48 hours $\ge 4.0\text{ mm}$.
- **Agronomic Justification:**
  - Applying supplementary irrigation immediately before significant natural rainfall saturates the root zone, inducing anaerobic soil conditions (hypoxia), root rot (*Pythium* / *Phytophthora* spp.), and wasteful leaching of applied nitrogenous fertilizers.
  - Saves farmer diesel/electricity operating costs.

### B. Timely Irrigation Advised (`IRRIGATE`)
- **Trigger Conditions:**
  1. Probability of precipitation $< 30\%$ over next 72 hours, AND
  2. Ambient temperature $\ge 34^\circ\text{C}$ with relative humidity $\le 40\%$ (high vapor pressure deficit), OR
  3. Crop is in critical moisture-sensitive stages (Flowering or Grain Filling / Pod Formation).
- **Agronomic Justification:**
  - Moisture stress during anthesis/flowering induces floret sterility, premature pod drop, and severe yield reduction.

### C. Adequate Moisture Maintained (`ADEQUATE`)
- **Trigger Conditions:**
  - Ambient temperature $< 32^\circ\text{C}$, relative humidity $40\%–65\%$, no immediate heavy precipitation.
  - Advise regular topsoil monitoring without unnecessary pumping.

---

## 2. Weather-Driven Disease & Pest Heuristics

All fungal and pest alerts are strictly probabilistic microclimate alerts, **never presented as definitive diagnoses**:

### A. Fungal Rust & Foliar Blight Alert (`INSPECT_CROP`)
- **Trigger Conditions:**
  - Ambient relative humidity $\ge 65\%$ for consecutive 12+ hours, AND
  - Ambient temperature maintained between $18^\circ\text{C}$ and $30^\circ\text{C}$.
- **Target Crops:** Wheat (Yellow/Stripe Rust *Puccinia striiformis*), Mustard (White Rust *Albugo candida*), Soybean (Rust *Phakopsora pachyrhizi*).
- **Agronomic Justification:**
  - High free moisture / atmospheric humidity coupled with moderate temperatures provides the optimal micro-environment for fungal urediniospore germination and penetration through stomata.
- **Action Advised:** Physical crop scouting — inspect the undersides of middle and lower leaves for powder pustules.

### B. Drainage & Field Sump Advisory (`CHECK_DRAINAGE`)
- **Trigger Conditions:**
  - Predicted rainfall event $\ge 15\text{ mm}$ within a 24-hour window.
- **Target Soils:** Clayey and Alluvial soils with low hydraulic conductivity.
- **Agronomic Justification:**
  - Excess ponding in fields lacking gradient drainage causes rapid collar rot and wilt.
- **Action Advised:** Clear drainage outlets, inspect field bunds, and postpone heavy foliar sprays until wind speed drops $< 15\text{ km/h}$.

---

## 3. Soil Health Assessment Criteria

Standardized against Indian Council of Agricultural Research (ICAR) and Government Soil Health Card benchmarks:

| Soil Nutrient / Parameter | Low Range | Medium Range (Optimal) | High Range | Units |
| :--- | :--- | :--- | :--- | :--- |
| **Soil Reaction ($\text{pH}$)** | $< 6.5$ (Acidic) | $6.5 – 7.8$ (Neutral) | $> 7.8$ (Alkaline/Saline) | $-\log[\text{H}^+]$ |
| **Electrical Conductivity ($\text{EC}$)** | $< 0.8$ (Normal) | $0.8 – 1.6$ (Critical for seedlings) | $> 1.6$ (Injurious to crops) | $\text{dS/m}$ |
| **Organic Carbon ($\text{OC}$)** | $< 0.50$ | $0.50 – 0.75$ | $> 0.75$ | $\%$ |
| **Available Nitrogen ($\text{N}$)** | $< 280$ | $280 – 560$ | $> 560$ | $\text{kg/ha}$ |
| **Available Phosphorus ($\text{P}_2\text{O}_5$)** | $< 10$ | $10 – 25$ | $> 25$ | $\text{kg/ha}$ |
| **Available Potassium ($\text{K}_2\text{O}$)** | $< 108$ | $108 – 280$ | $> 280$ | $\text{kg/ha}$ |

### Soil Nutrient Advisory Logic:
1. **Low Organic Carbon ($< 0.5\%$):** Advise application of Farmyard Manure (FYM) or vermicompost ($5\text{ tonnes/hectare}$) or green manuring (dhaincha / sunnhemp) prior to subsequent sowing.
2. **Low Available Nitrogen ($< 280\text{ kg/ha}$):** Advise split urea application ($50\%$ basal, $25\%$ tillering, $25\%$ flowering) or neem-coated urea to minimize volatilization.
3. **Acidic Soil ($\text{pH} < 6.0$):** Advise agricultural lime application based on buffer capacity.
4. **Alkaline / Sodic Soil ($\text{pH} > 8.2$):** Advise gypsum application and organic mulching.

---

## 4. Growth Stage Milestones

Stages are determined deterministically from **sowing date** and crop variety GDD (Growing Degree Days):

1. **Sowing / Emergence:** Days $0 – 12$. Focus on seedling vigor and soil crust prevention.
2. **Vegetative / Crown Root Initiation:** Days $13 – 45$. First critical irrigation window for cereals.
3. **Flowering / Anthesis:** Days $46 – 85$. High moisture sensitivity; avoid heavy pesticide applications that disrupt pollination.
4. **Grain Filling / Milking:** Days $86 – 110$. Moderate irrigation, monitor for terminal heat stress.
5. **Maturity / Harvest:** Days $111+$. Cease irrigation $10–14$ days before harvest to allow grain desiccation.
