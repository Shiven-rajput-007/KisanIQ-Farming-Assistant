# KisanIQ — Production Deployment Guide
> **Production Topology:**  
> Frontend: **Netlify** (Global Edge CDN)  
> Backend: **Render** (Node.js Web Service)  
> Database: **Neon** (Serverless PostgreSQL)  
> Automation: **GitHub Actions** (Daily Mandi Ingestion)

---

## Architecture Pre-Requisites

1. **Neon Account:** [https://neon.tech](https://neon.tech)
2. **Render Account:** [https://render.com](https://render.com)
3. **Netlify Account:** [https://netlify.com](https://netlify.com)
4. **CEDA Agmarknet API Key:** [https://api.ceda.ashoka.edu.in/documentation/](https://api.ceda.ashoka.edu.in/documentation/) (Official API documentation & registration)

---

## Step 1: Provision Neon PostgreSQL Database

1. Log into your **Neon Console** and click **New Project**.
2. Name the project `kisaniq-db` and select the region nearest to your target users (e.g. `ap-southeast-1` or `eu-central-1`).
3. Under **Dashboard > Connection Details**, copy the pooled connection string:
   ```env
   DATABASE_URL="postgres://username:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/kisaniq?sslmode=require"
   ```
4. Save this string securely. It will be provided to Render and your Prisma migration runner.

---

## Step 2: Deploy Backend Web Service on Render

1. Log into **Render** and click **New > Web Service**.
2. Connect your GitHub repository (`Shiven-rajput-007/KisanIQ-Farming-Assistant`).
3. Configure the service settings:
   - **Name:** `kisaniq-backend`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `node dist/server.js`
   - **Plan:** Free or Starter
4. Add the following **Environment Variables** in the Render Dashboard:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables strict fail-fast error mode; disables PGlite fallback |
| `PORT` | `10000` | Render assigns dynamically or defaults to 10000 |
| `DATABASE_URL` | `postgres://...@ep-...neon.tech/kisaniq?sslmode=require` | Your Neon database connection URI |
| `JWT_SECRET_KEY` | *(Generate a 64-char random hex string)* | Used to sign farmer authentication tokens |
| `JWT_ALGORITHM` | `HS256` | Token signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | 24-hour session lifetime |
| `CORS_ORIGINS` | `https://your-site.netlify.app,http://localhost:5173` | Allowed frontend domains (comma-separated) |
| `CEDA_API_KEY` | *(Your CEDA Agmarknet Bearer token)* | Access key for CEDA Agmarknet API |
| `CEDA_BASE_URL` | `https://api.ceda.ashoka.edu.in/v1` | CEDA Agmarknet production endpoint |
| `MANDI_SYNC_SECRET` | *(Generate a random 32-char token)* | Protects the `POST /api/market/sync` trigger |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com` | Meteorological endpoint |

5. Click **Deploy Web Service**.
6. When deployment succeeds, test the health endpoint in your browser:
   ```text
   GET https://your-render-backend.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "message": "KisanIQ backend is running",
     "status": "ok",
     "database": "postgres-pool",
     "databaseConnected": true,
     "environment": "production"
   }
   ```

---

## Step 3: Run Database Migrations on Neon

Run Prisma migrations from your development machine against the Neon database:
```bash
# Set DATABASE_URL in server/.env or export in shell
npx prisma migrate deploy --schema=./prisma/schema.prisma
```
This applies all 25 production relational tables and indexes to your Neon PostgreSQL instance without seeding dummy records.

---

## Step 4: Deploy Frontend on Netlify

1. Log into **Netlify** and select **Add new site > Import an existing project**.
2. Connect your GitHub repository.
3. Configure the build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. In **Site Configuration > Environment Variables**, add:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://your-render-backend.onrender.com/api` | Full public URL to your Render backend `/api` |

5. **SPA Routing Rule:**  
   Verify that `frontend/public/_redirects` exists with the single line:
   ```text
   /*    /index.html   200
   ```
   This ensures direct URL navigation and page refreshes on `/market`, `/meri-fasal`, `/soil`, etc. correctly resolve through the React single-page application.
6. Click **Deploy Site**.
7. Note your Netlify URL (e.g. `https://kisaniq-farm.netlify.app`).  
   *Remember to update `CORS_ORIGINS` on Render to include this exact Netlify URL!*

---

## Step 5: Configure Scheduled Mandi Sync via GitHub Actions

1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Add the following repository secrets:
   - `BACKEND_URL`: `https://your-render-backend.onrender.com`
   - `MANDI_SYNC_SECRET`: The exact token configured on Render
3. The workflow file [`.github/workflows/mandi-sync.yml`](file:///.github/workflows/mandi-sync.yml) triggers automatically once daily at 18:30 IST (13:00 UTC) after mandis upload daily arrivals.
4. You can also trigger it manually under the **Actions** tab by selecting **Daily Mandi Sync** and clicking **Run workflow**.

---

## Step 6: Post-Deployment Smoke Verification

1. **Health Check:** Open `https://your-render-backend.onrender.com/api/health`.
2. **User Registration:** Open your Netlify frontend URL. Register a new farmer account with a real phone number.
3. **Farm Setup:** Add farm area and choose soil/irrigation type.
4. **Crop Registration:** Add an active crop (e.g., Wheat, Sown 30 days ago).
5. **Dashboard:** Verify live Open-Meteo weather is fetched for the farm coordinates.
6. **Mandi Explorer:** Filter by State and District to view latest verified APMC market prices.
7. **Net Return Calculation:** Click on any mandi to view transparent net return deduction metrics.
8. **Soil Test Booking:** Submit a sample request. Verify status begins as `REQUESTED`.
9. **Language Switch:** Toggle from Marathi (`मराठी`) to Hindi (`हिंदी`) and English (`English`).
10. **Logout & Login:** Log out and log back in to verify JWT persistence.
