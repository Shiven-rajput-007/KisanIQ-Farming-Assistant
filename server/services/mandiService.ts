import { db } from '../db/index.js';

export interface CedaCommodity {
  id: number;
  name: string;
}

export interface CedaDistrict {
  district_id: number;
  district_name: string;
}

export interface CedaGeography {
  state_id: number;
  state_name: string;
  districts: CedaDistrict[];
}

export interface CedaMarket {
  census_state_id: number;
  census_district_id: number;
  market_id: number;
  market_name: string;
}

export interface AgmarknetRecord {
  date?: string;
  state?: string;
  census_state_id?: number;
  district?: string;
  census_district_id?: number;
  market?: string;
  market_name?: string;
  market_id?: number;
  commodity?: string;
  commodity_id?: number;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
  quantity?: string | number;
}

export interface NormalizedMandiRecord {
  state: string;
  district: string;
  marketName: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string; // YYYY-MM-DD
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  quantity?: number;
  source: string; // "CEDA Agmarknet"
}

export interface MandiFilterOptions {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface MandiSyncResult {
  startedAt: string;
  completedAt: string;
  status: 'success' | 'failed';
  source: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  rejectedCount: number;
  errorMessage?: string;
}

/**
 * MandiService
 * Integrates directly with the CEDA Agmarknet API (api.ceda.ashoka.edu.in)
 * with 24-hour metadata caching, tiered geographic fallback, and concurrency locking.
 */
export class MandiService {
  private syncInProgress = false;
  private readonly DEFAULT_BASE_URL = 'https://api.ceda.ashoka.edu.in/v1';

  // Metadata cache with 24-hour TTL
  private lastMetadataFetch: number = 0;
  private readonly METADATA_TTL_MS = 24 * 60 * 60 * 1000;

  // Active sync promises by scope to coalesce duplicate concurrent requests
  private activeSyncPromises = new Map<string, Promise<MandiSyncResult>>();

  // Cooldown tracker per scope (prevents hammering CEDA if a search recently finished)
  private lastSyncTimeByScope = new Map<string, number>();
  private readonly SCOPE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

  // Lookups cache for resolving CEDA IDs to human-readable names
  private commodityIdMap = new Map<number, string>();
  private commodityNameMap = new Map<string, number>();
  private stateIdMap = new Map<number, string>();
  private stateNameMap = new Map<string, number>();
  private districtIdMap = new Map<number, string>();
  private districtNameMap = new Map<string, number>();
  private marketIdMap = new Map<number, string>();
  private marketNameMap = new Map<string, number>();

  constructor() {
    this.seedStandardLookups();
  }

  /**
   * Safely log CEDA external API requests without leaking API keys
   */
  private logCedaRequest(endpoint: string, status: number, durationMs: number, count?: number): void {
    console.log(
      `[CEDA] ${endpoint} status=${status} duration=${durationMs}ms${count !== undefined ? ` count=${count}` : ''}`
    );
  }

  /**
   * Pre-populate standard Agmarknet census IDs for rapid initial resolution
   */
  private seedStandardLookups() {
    // Standard commodities
    const standardCommodities: Array<[number, string]> = [
      [1, 'Wheat'],
      [2, 'Paddy(Dhan)(Common)'],
      [3, 'Soyabean'],
      [4, 'Mustard'],
      [5, 'Cotton'],
      [6, 'Maize'],
      [7, 'Gram Raw(Chhola)'],
      [8, 'Onion'],
      [9, 'Potato'],
      [10, 'Tomato'],
      [11, 'Barley (Jau)'],
      [12, 'Bajra(Pearl Millet/Cumbu)'],
      [13, 'Jowar(Sorghum)'],
      [14, 'Arhar (Tur/Red Gram)(Whole)'],
      [15, 'Moong(Green Gram)(Whole)'],
      [16, 'Urad (Black Gram)(Whole)'],
      [17, 'Groundnut'],
      [18, 'Sunflower'],
      [19, 'Sugarcane'],
      [20, 'Garlic'],
    ];
    for (const [id, name] of standardCommodities) {
      this.commodityIdMap.set(id, name);
      this.commodityNameMap.set(name.toLowerCase(), id);
    }

    // Key agricultural states (Census 2011 State IDs)
    const standardStates: Array<[number, string]> = [
      [1, 'Jammu and Kashmir'],
      [2, 'Himachal Pradesh'],
      [3, 'Punjab'],
      [4, 'Chandigarh'],
      [5, 'Uttarakhand'],
      [6, 'Haryana'],
      [7, 'NCT of Delhi'],
      [8, 'Rajasthan'],
      [9, 'Uttar Pradesh'],
      [10, 'Bihar'],
      [19, 'West Bengal'],
      [21, 'Odisha'],
      [22, 'Chhattisgarh'],
      [23, 'Madhya Pradesh'],
      [24, 'Gujarat'],
      [27, 'Maharashtra'],
      [28, 'Andhra Pradesh'],
      [29, 'Karnataka'],
      [32, 'Kerala'],
      [33, 'Tamil Nadu'],
      [36, 'Telangana'],
    ];
    for (const [id, name] of standardStates) {
      this.stateIdMap.set(id, name);
      this.stateNameMap.set(name.toLowerCase(), id);
    }

    // Pre-seed common agricultural districts
    const standardDistricts: Array<[number, string]> = [
      [141, 'Gautam Buddha Nagar'],
      [140, 'Ghaziabad'],
      [139, 'Meerut'],
      [142, 'Bulandshahr'],
      [143, 'Aligarh'],
      [144, 'Mathura'],
      [145, 'Agra'],
      [157, 'Lucknow'],
      [164, 'Kanpur Nagar'],
      [193, 'Varanasi'],
      [421, 'Gwalior'],
      [436, 'Indore'],
      [437, 'Bhopal'],
      [521, 'Pune'],
      [516, 'Nashik'],
      [505, 'Nagpur'],
      [104, 'Ludhiana'],
    ];
    for (const [id, name] of standardDistricts) {
      this.districtIdMap.set(id, name);
      this.districtNameMap.set(name.toLowerCase(), id);
    }
  }

  public getBaseUrl(): string {
    return (process.env.CEDA_BASE_URL || this.DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  public getApiKey(): string | undefined {
    const key = process.env.CEDA_API_KEY;
    return key && key.trim() !== '' ? key.trim() : undefined;
  }

  public isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Parse various Indian date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) into YYYY-MM-DD
   */
  public parseArrivalDate(dateStr?: string): string | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // DD/MM/YYYY
    const dmySlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmySlash) {
      const day = dmySlash[1].padStart(2, '0');
      const month = dmySlash[2].padStart(2, '0');
      const year = dmySlash[3];
      return `${year}-${month}-${day}`;
    }

    // DD-MM-YYYY
    const dmyDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmyDash) {
      const day = dmyDash[1].padStart(2, '0');
      const month = dmyDash[2].padStart(2, '0');
      const year = dmyDash[3];
      return `${year}-${month}-${day}`;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Validates and normalizes records from CEDA Agmarknet
   * Rejects incomplete, synthetic, or out-of-bounds records
   */
  public validateAndNormalize(raw: AgmarknetRecord): NormalizedMandiRecord | null {
    if (!raw) return null;

    // Resolve State
    let state = (raw.state || '').trim();
    if (!state && raw.census_state_id && this.stateIdMap.has(raw.census_state_id)) {
      state = this.stateIdMap.get(raw.census_state_id)!;
    }

    // Resolve District
    let district = (raw.district || '').trim();
    if (!district && raw.census_district_id && this.districtIdMap.has(raw.census_district_id)) {
      district = this.districtIdMap.get(raw.census_district_id)!;
    }

    // Resolve Market Name
    let marketName = (raw.market_name || raw.market || '').trim();
    if (!marketName && raw.market_id && this.marketIdMap.has(raw.market_id)) {
      marketName = this.marketIdMap.get(raw.market_id)!;
    }

    // Resolve Commodity
    let commodity = (raw.commodity || '').trim();
    if (!commodity && raw.commodity_id && this.commodityIdMap.has(raw.commodity_id)) {
      commodity = this.commodityIdMap.get(raw.commodity_id)!;
    }

    const variety = (raw.variety || 'Standard').trim();
    const grade = (raw.grade || 'FAQ').trim();

    // Reject incomplete records that lack verifiable identity
    if (!state || !marketName || !commodity) {
      return null;
    }

    const minPrice = Number(raw.min_price);
    const maxPrice = Number(raw.max_price);
    const modalPrice = Number(raw.modal_price);

    if (isNaN(minPrice) || isNaN(maxPrice) || isNaN(modalPrice)) {
      return null;
    }
    if (minPrice <= 0 || maxPrice <= 0 || modalPrice <= 0) {
      return null;
    }
    if (minPrice > maxPrice) {
      return null;
    }
    if (modalPrice < minPrice || modalPrice > maxPrice) {
      return null;
    }
    if (modalPrice < 100 || modalPrice > 100000) {
      return null; // Reject artifacts
    }

    const rawDate = raw.arrival_date || raw.date;
    const parsedDate = this.parseArrivalDate(rawDate);
    if (!parsedDate && rawDate) {
      return null; // Reject invalid date format if provided
    }
    const arrivalDate = parsedDate || new Date().toISOString().split('T')[0];

    // Optional arrival quantity
    let quantity: number | undefined;
    if (raw.quantity !== undefined && raw.quantity !== null && raw.quantity !== '') {
      const q = Number(raw.quantity);
      if (!isNaN(q) && q >= 0) {
        quantity = Math.round(q * 100) / 100;
      }
    }

    return {
      state,
      district: district || state,
      marketName,
      commodity,
      variety,
      grade,
      arrivalDate,
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      modalPrice: Math.round(modalPrice),
      quantity,
      source: 'CEDA Agmarknet',
    };
  }

  public normalizeRecord(raw: AgmarknetRecord): NormalizedMandiRecord | null {
    return this.validateAndNormalize(raw);
  }

  /**
   * Fetch commodities list from CEDA with 24-hour cache
   * GET /agmarknet/commodities
   */
  public async fetchCedaCommodities(): Promise<CedaCommodity[]> {
    if (this.commodityIdMap.size > 20 && Date.now() - this.lastMetadataFetch < this.METADATA_TTL_MS) {
      return Array.from(this.commodityIdMap.entries()).map(([id, name]) => ({ id, name }));
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured in backend environment variables.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/commodities`;
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;

    this.logCedaRequest('/agmarknet/commodities', response.status, duration);

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /commodities responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const commodities: CedaCommodity[] = json?.commodities || [];
    for (const c of commodities) {
      this.commodityIdMap.set(c.id, c.name);
      this.commodityNameMap.set(c.name.toLowerCase(), c.id);
    }
    this.lastMetadataFetch = Date.now();
    return commodities;
  }

  /**
   * Fetch geographies (states and districts) from CEDA with 24-hour cache
   * GET /agmarknet/geographies?commodity_id=<id>
   */
  public async fetchCedaGeographies(commodityId: number = 1): Promise<CedaGeography[]> {
    if (this.districtIdMap.size > 30 && Date.now() - this.lastMetadataFetch < this.METADATA_TTL_MS) {
      return [];
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured in backend environment variables.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/geographies?commodity_id=${encodeURIComponent(commodityId)}`;
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;

    this.logCedaRequest('/agmarknet/geographies', response.status, duration);

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /geographies responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const geographies: CedaGeography[] = json?.geographies || [];
    for (const g of geographies) {
      this.stateIdMap.set(g.state_id, g.state_name);
      this.stateNameMap.set(g.state_name.toLowerCase(), g.state_id);
      if (Array.isArray(g.districts)) {
        for (const d of g.districts) {
          this.districtIdMap.set(d.district_id, d.district_name);
          this.districtNameMap.set(d.district_name.toLowerCase(), d.district_id);
        }
      }
    }
    return geographies;
  }

  /**
   * Fetch markets for a given commodity, state, district from CEDA
   * POST /agmarknet/markets
   */
  public async fetchCedaMarkets(
    commodityId: number,
    stateId: number,
    districtId: number,
    indicator: 'price' | 'quantity' = 'price'
  ): Promise<CedaMarket[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured in backend environment variables.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/markets`;
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        commodity_id: commodityId,
        state_id: stateId,
        district_id: districtId,
        indicator,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - startTime;

    this.logCedaRequest('/agmarknet/markets', response.status, duration);

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /markets responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const data: CedaMarket[] = json?.data || [];
    for (const m of data) {
      this.marketIdMap.set(m.market_id, m.market_name);
      this.marketNameMap.set(m.market_name.toLowerCase(), m.market_id);
    }
    return data;
  }

  /**
   * Fetch prices from CEDA Agmarknet
   * POST /agmarknet/prices
   */
  public async fetchCedaPrices(params: {
    commodityId: number;
    stateId: number;
    districtIds?: number[];
    marketIds?: number[];
    fromDate: string;
    toDate: string;
  }): Promise<any[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured in backend environment variables.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/prices`;
    const body: any = {
      commodity_id: params.commodityId,
      state_id: params.stateId,
      from_date: params.fromDate,
      to_date: params.toDate,
    };
    if (params.districtIds && params.districtIds.length > 0) {
      body.district_id = params.districtIds;
    }
    if (params.marketIds && params.marketIds.length > 0) {
      body.market_id = params.marketIds;
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    const duration = Date.now() - startTime;

    const json: any = await response.json().catch(() => ({}));
    const recordCount = Array.isArray(json?.data) ? json.data.length : 0;
    this.logCedaRequest('/agmarknet/prices', response.status, duration, recordCount);

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /prices responded with HTTP ${response.status}: ${response.statusText}`);
    }

    return json?.data || [];
  }

  /**
   * Fetch arrival quantities from CEDA Agmarknet
   * POST /agmarknet/quantities
   */
  public async fetchCedaQuantities(params: {
    commodityId: number;
    stateId: number;
    districtIds?: number[];
    marketIds?: number[];
    fromDate: string;
    toDate: string;
  }): Promise<any[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured in backend environment variables.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/quantities`;
    const body: any = {
      commodity_id: params.commodityId,
      state_id: params.stateId,
      from_date: params.fromDate,
      to_date: params.toDate,
    };
    if (params.districtIds && params.districtIds.length > 0) {
      body.district_id = params.districtIds;
    }
    if (params.marketIds && params.marketIds.length > 0) {
      body.market_id = params.marketIds;
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    const duration = Date.now() - startTime;

    const json: any = await response.json().catch(() => ({}));
    const recordCount = Array.isArray(json?.data) ? json.data.length : 0;
    this.logCedaRequest('/agmarknet/quantities', response.status, duration, recordCount);

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /quantities responded with HTTP ${response.status}: ${response.statusText}`);
    }

    return json?.data || [];
  }

  /**
   * Resolve market_id to market_name using in-memory cache and database
   */
  public async resolveMarketName(
    marketId: number,
    commodityId?: number,
    stateId?: number,
    districtId?: number
  ): Promise<string | null> {
    if (this.marketIdMap.has(marketId)) {
      return this.marketIdMap.get(marketId)!;
    }

    // Check PostgreSQL markets table for existing record
    try {
      const res = await db.query('SELECT name FROM markets WHERE id = $1 LIMIT 1', [String(marketId)]);
      if (res.rows.length > 0 && res.rows[0].name) {
        const name = res.rows[0].name;
        this.marketIdMap.set(marketId, name);
        return name;
      }
    } catch (dbErr) {
      // ignore
    }

    // If district and commodity are known, query CEDA /agmarknet/markets once
    if (commodityId && stateId && districtId && this.isConfigured()) {
      try {
        await this.fetchCedaMarkets(commodityId, stateId, districtId);
        if (this.marketIdMap.has(marketId)) {
          return this.marketIdMap.get(marketId)!;
        }
      } catch (err) {
        // ignore
      }
    }

    return null;
  }

  public async resolveStateName(stateId: number): Promise<string | null> {
    return this.stateIdMap.get(stateId) || null;
  }

  public async resolveDistrictName(districtId: number, commodityId?: number): Promise<string | null> {
    return this.districtIdMap.get(districtId) || null;
  }

  public async resolveCommodityName(commodityId: number): Promise<string | null> {
    return this.commodityIdMap.get(commodityId) || null;
  }

  /**
   * Ingest, validate, and upsert a batch of CEDA Agmarknet records into PostgreSQL
   */
  public async ingestRecords(records: AgmarknetRecord[]): Promise<{
    insertedCount: number;
    updatedCount: number;
    rejectedCount: number;
  }> {
    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;

    for (const raw of records) {
      const validated = this.validateAndNormalize(raw);
      if (!validated) {
        rejectedCount++;
        continue;
      }

      // Upsert into market_prices
      // Deduplication based on marketName, commodity, variety, arrivalDate
      const existing = await db.query(
        `SELECT id FROM market_prices
         WHERE market_name ILIKE $1 AND commodity ILIKE $2 AND variety ILIKE $3 AND arrival_date = $4
         LIMIT 1`,
        [validated.marketName, validated.commodity, validated.variety, validated.arrivalDate]
      );

      if (existing.rows.length > 0) {
        // Update existing price record
        const id = existing.rows[0].id;
        await db.query(
          `UPDATE market_prices
           SET min_price = $1, max_price = $2, modal_price = $3, price_per_quintal = $4,
               quantity = COALESCE($5, quantity), grade = $6, state = $7, district = $8,
               source = $9, fetched_at = NOW(), updated_at = NOW()
           WHERE id = $10`,
          [
            validated.minPrice,
            validated.maxPrice,
            validated.modalPrice,
            validated.modalPrice,
            validated.quantity || null,
            validated.grade,
            validated.state,
            validated.district,
            validated.source,
            id,
          ]
        );
        updatedCount++;
      } else {
        // Insert new record
        const newId = `mp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.query(
          `INSERT INTO market_prices (
            id, state, district, market_name, commodity, variety, grade,
            arrival_date, min_price, max_price, modal_price, price_per_quintal,
            quantity, source, fetched_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())`,
          [
            newId,
            validated.state,
            validated.district,
            validated.marketName,
            validated.commodity,
            validated.variety,
            validated.grade,
            validated.arrivalDate,
            validated.minPrice,
            validated.maxPrice,
            validated.modalPrice,
            validated.modalPrice,
            validated.quantity || null,
            validated.source,
          ]
        );
        insertedCount++;
      }
    }

    return { insertedCount, updatedCount, rejectedCount };
  }

  /**
   * Synchronize mandi arrivals from CEDA Agmarknet API into PostgreSQL
   * Uses per-scope locking and 3-tier geographic strategy (District -> State -> National)
   */
  public async syncFromCedaApi(options?: {
    state?: string;
    district?: string;
    commodity?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<MandiSyncResult> {
    const commodityName = options?.commodity || 'Wheat';
    const stateName = options?.state || 'all';
    const districtName = options?.district || 'all';
    const scopeKey = `${commodityName.toLowerCase()}_${stateName.toLowerCase()}_${districtName.toLowerCase()}`;

    // 1. Check if a sync is already running for this exact scope (coalesce requests)
    if (this.activeSyncPromises.has(scopeKey)) {
      return this.activeSyncPromises.get(scopeKey)!;
    }

    // 2. Check cooldown: if this scope was synchronized within the last 15 minutes, do not hammer CEDA
    const lastAttempt = this.lastSyncTimeByScope.get(scopeKey) || 0;
    if (Date.now() - lastAttempt < this.SCOPE_COOLDOWN_MS) {
      return {
        startedAt: new Date(lastAttempt).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'success',
        source: 'CEDA Agmarknet (Cooldown Cache)',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        rejectedCount: 0,
      };
    }

    const syncPromise = this.executeSync(options, scopeKey);
    this.activeSyncPromises.set(scopeKey, syncPromise);

    try {
      return await syncPromise;
    } finally {
      this.activeSyncPromises.delete(scopeKey);
      this.lastSyncTimeByScope.set(scopeKey, Date.now());
    }
  }

  private async executeSync(
    options: {
      state?: string;
      district?: string;
      commodity?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    } | undefined,
    scopeKey: string
  ): Promise<MandiSyncResult> {
    const startedAt = new Date().toISOString();
    const syncId = `sync_${Date.now()}`;

    // Create sync log
    await db.query(
      `INSERT INTO mandi_sync_logs (id, started_at, status, source)
       VALUES ($1, $2, 'running', 'CEDA Agmarknet')`,
      [syncId, startedAt]
    );

    const apiKey = this.getApiKey();
    if (!apiKey) {
      const err = 'CEDA_API_KEY is not configured in backend environment variables.';
      const completedAt = new Date().toISOString();
      await db.query(
        `UPDATE mandi_sync_logs
         SET completed_at = $1, status = 'failed', error_message = $2
         WHERE id = $3`,
        [completedAt, err, syncId]
      );
      return {
        startedAt,
        completedAt,
        status: 'failed',
        source: 'CEDA Agmarknet',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        rejectedCount: 0,
        errorMessage: err,
      };
    }

    try {
      // 1. Resolve Commodity ID
      let commodityId = 1; // Default: Wheat
      if (options?.commodity) {
        const cLower = options.commodity.toLowerCase().trim();
        if (this.commodityNameMap.has(cLower)) {
          commodityId = this.commodityNameMap.get(cLower)!;
        } else {
          // Refresh commodities lookup
          try {
            await this.fetchCedaCommodities();
            if (this.commodityNameMap.has(cLower)) {
              commodityId = this.commodityNameMap.get(cLower)!;
            }
          } catch (e: any) {
            console.warn('[MandiSync] Commodities lookup notice:', e.message);
          }
        }
      }

      // 2. Refresh Geographies if needed
      if (this.districtIdMap.size < 30 || Date.now() - this.lastMetadataFetch >= this.METADATA_TTL_MS) {
        try {
          await this.fetchCedaGeographies(commodityId);
        } catch (e: any) {
          console.warn('[MandiSync] Geographies lookup notice:', e.message);
        }
      }

      // 3. Resolve State ID
      let stateId = 0;
      if (options?.state && options.state !== 'all') {
        const sLower = options.state.toLowerCase().trim();
        if (this.stateNameMap.has(sLower)) {
          stateId = this.stateNameMap.get(sLower)!;
        }
      }

      // 4. Resolve District ID
      let districtIds: number[] | undefined;
      let resolvedDistrictId: number | undefined;
      if (options?.district && options.district !== 'all') {
        const dLower = options.district.toLowerCase().trim();
        if (this.districtNameMap.has(dLower)) {
          resolvedDistrictId = this.districtNameMap.get(dLower)!;
          districtIds = [resolvedDistrictId];
        }
      }

      // Pre-fetch markets for the district if known
      if (stateId > 0 && resolvedDistrictId) {
        try {
          await this.fetchCedaMarkets(commodityId, stateId, resolvedDistrictId, 'price');
        } catch (mErr: any) {
          console.warn(`[MandiSync] Markets lookup notice for district ${resolvedDistrictId}:`, mErr.message);
        }
      }

      // 5. Date Window: Look back 30 days to capture real verified arrival bulletins
      const toDate = options?.toDate || new Date().toISOString().split('T')[0];
      const fromDate =
        options?.fromDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 6. Tiered Search Strategy against CEDA:
      // Tier 1: Try District if specified
      let priceRecords: any[] = [];
      if (stateId > 0 && districtIds && districtIds.length > 0) {
        try {
          priceRecords = await this.fetchCedaPrices({
            commodityId,
            stateId,
            districtIds,
            fromDate,
            toDate,
          });
        } catch (t1Err: any) {
          console.warn('[MandiSync] Tier 1 (District) fetch notice:', t1Err.message);
        }
      }

      // Tier 2: If 0 records from district, broaden to entire State in CEDA
      if (priceRecords.length === 0 && stateId > 0) {
        try {
          priceRecords = await this.fetchCedaPrices({
            commodityId,
            stateId,
            fromDate,
            toDate,
          });
        } catch (t2Err: any) {
          console.warn('[MandiSync] Tier 2 (State) fetch notice:', t2Err.message);
        }
      }

      // Tier 3: If 0 records from state, broaden to National in CEDA
      if (priceRecords.length === 0) {
        try {
          priceRecords = await this.fetchCedaPrices({
            commodityId,
            stateId: 0,
            fromDate,
            toDate,
          });
        } catch (t3Err: any) {
          console.warn('[MandiSync] Tier 3 (National) fetch notice:', t3Err.message);
        }
      }

      const fetchedCount = priceRecords.length;
      let insertedCount = 0;
      let updatedCount = 0;
      let rejectedCount = 0;

      // 7. Resolve and ingest records
      if (priceRecords.length > 0) {
        const formattedRecords: AgmarknetRecord[] = [];
        const stateNameResolved = this.stateIdMap.get(stateId) || (options?.state !== 'all' ? options?.state : undefined);
        const commodityNameResolved = this.commodityIdMap.get(commodityId) || options?.commodity || 'Wheat';

        for (const r of priceRecords) {
          const recCommodityId = r.commodity_id || commodityId;
          const recStateId = r.census_state_id || stateId;
          const recDistrictId = r.census_district_id || resolvedDistrictId;
          const recMarketId = r.market_id;

          // In-memory lookups (O(1))
          const marketName =
            this.marketIdMap.get(recMarketId) ||
            r.market_name ||
            (await this.resolveMarketName(recMarketId, recCommodityId, recStateId, recDistrictId));

          const stateName = this.stateIdMap.get(recStateId) || stateNameResolved;
          const districtName = recDistrictId ? this.districtIdMap.get(recDistrictId) : stateName;
          const cName = this.commodityIdMap.get(recCommodityId) || commodityNameResolved;

          if (!marketName || !stateName || !cName) {
            rejectedCount++;
            continue;
          }

          formattedRecords.push({
            arrival_date: r.date,
            state: stateName,
            census_state_id: recStateId,
            district: districtName || stateName,
            census_district_id: recDistrictId,
            market: marketName,
            market_name: marketName,
            market_id: recMarketId,
            commodity: cName,
            commodity_id: recCommodityId,
            variety: r.variety || 'Standard',
            grade: r.grade || 'FAQ',
            min_price: r.min_price,
            max_price: r.max_price,
            modal_price: r.modal_price,
          });
        }

        const ingestResult = await this.ingestRecords(formattedRecords);
        insertedCount = ingestResult.insertedCount;
        updatedCount = ingestResult.updatedCount;
        rejectedCount += ingestResult.rejectedCount;
      }

      const completedAt = new Date().toISOString();
      await db.query(
        `UPDATE mandi_sync_logs
         SET completed_at = $1, status = 'success', fetched_count = $2,
             inserted_count = $3, updated_count = $4, rejected_count = $5
         WHERE id = $6`,
        [completedAt, fetchedCount, insertedCount, updatedCount, rejectedCount, syncId]
      );

      return {
        startedAt,
        completedAt,
        status: 'success',
        source: 'CEDA Agmarknet',
        fetchedCount,
        insertedCount,
        updatedCount,
        rejectedCount,
      };
    } catch (err: any) {
      const completedAt = new Date().toISOString();
      await db.query(
        `UPDATE mandi_sync_logs
         SET completed_at = $1, status = 'failed', error_message = $2
         WHERE id = $3`,
        [completedAt, err.message, syncId]
      );
      return {
        startedAt,
        completedAt,
        status: 'failed',
        source: 'CEDA Agmarknet',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        rejectedCount: 0,
        errorMessage: err.message,
      };
    }
  }

  /**
   * Query price records from PostgreSQL with filtering & pagination
   */
  public async getPrices(filter: MandiFilterOptions): Promise<{
    records: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    metadata: {
      source: string;
      lastFetchedAt?: string;
      isStale: boolean;
      freshnessPolicy: string;
      cedaApiConfigured: boolean;
    };
  }> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filter.commodity) {
      where.push(`commodity ILIKE $${pIdx}`);
      params.push(`%${filter.commodity.trim()}%`);
      pIdx++;
    }
    if (filter.state && filter.state !== 'all') {
      where.push(`state ILIKE $${pIdx}`);
      params.push(`%${filter.state.trim()}%`);
      pIdx++;
    }
    if (filter.district && filter.district !== 'all') {
      where.push(`district ILIKE $${pIdx}`);
      params.push(`%${filter.district.trim()}%`);
      pIdx++;
    }
    if (filter.market) {
      where.push(`market_name ILIKE $${pIdx}`);
      params.push(`%${filter.market.trim()}%`);
      pIdx++;
    }
    if (filter.dateFrom) {
      where.push(`arrival_date >= $${pIdx}`);
      params.push(filter.dateFrom);
      pIdx++;
    }
    if (filter.dateTo) {
      where.push(`arrival_date <= $${pIdx}`);
      params.push(filter.dateTo);
      pIdx++;
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM market_prices ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const queryParams = [...params, limit, offset];
    const recordsRes = await db.query(
      `SELECT id, state, district, market_name as market, commodity, variety, grade,
              arrival_date, min_price, max_price, modal_price, quantity, source, fetched_at, updated_at
       FROM market_prices
       ${whereSql}
       ORDER BY arrival_date DESC, modal_price DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      queryParams
    );

    const latestSyncRes = await db.query(
      `SELECT completed_at, status FROM mandi_sync_logs WHERE status = 'success' ORDER BY completed_at DESC LIMIT 1`
    );
    const lastSyncTime = latestSyncRes.rows[0]?.completed_at;

    let isStale = false;
    if (lastSyncTime) {
      const ageHours = (Date.now() - new Date(lastSyncTime).getTime()) / (1000 * 60 * 60);
      isStale = ageHours > 24;
    } else {
      isStale = true;
    }

    return {
      records: recordsRes.rows.map(r => ({
        id: r.id,
        state: r.state || '',
        district: r.district || '',
        market: r.market || 'APMC Mandi',
        commodity: r.commodity || '',
        variety: r.variety || 'Standard',
        grade: r.grade || 'FAQ',
        arrivalDate: r.arrival_date ? new Date(r.arrival_date).toISOString().split('T')[0] : null,
        minPrice: Number(r.min_price),
        maxPrice: Number(r.max_price),
        modalPrice: Number(r.modal_price),
        quantity: r.quantity !== null && r.quantity !== undefined ? Number(r.quantity) : undefined,
        source: r.source || 'CEDA Agmarknet',
        fetchedAt: r.fetched_at || r.updated_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metadata: {
        source: 'CEDA Agmarknet (api.ceda.ashoka.edu.in)',
        lastFetchedAt: lastSyncTime,
        isStale,
        freshnessPolicy: 'Data older than 24 hours is flagged as stale. Real daily arrivals updated via CEDA Agmarknet.',
        cedaApiConfigured: this.isConfigured(),
      },
    };
  }

  /**
   * Retrieves sync logs for observability
   */
  public async getSyncStatus(): Promise<any> {
    const res = await db.query(
      `SELECT * FROM mandi_sync_logs ORDER BY started_at DESC LIMIT 10`
    );
    const countRes = await db.query('SELECT COUNT(*) as total FROM market_prices');
    const totalPrices = parseInt(countRes.rows[0]?.total || '0', 10);

    const lastSyncTime = res.rows[0]?.completed_at;
    let isStale = false;
    if (lastSyncTime) {
      const ageHours = (Date.now() - new Date(lastSyncTime).getTime()) / (1000 * 60 * 60);
      isStale = ageHours > 24;
    } else {
      isStale = true;
    }

    return {
      success: true,
      cedaApiConfigured: this.isConfigured(),
      totalStoredPriceRecords: totalPrices,
      totalRecords: totalPrices,
      stale: isStale,
      isStale,
      source: 'CEDA Agmarknet (api.ceda.ashoka.edu.in)',
      lastSyncTime,
      syncInProgress: this.activeSyncPromises.size > 0,
      history: res.rows.map(r => ({
        id: r.id,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        status: r.status,
        source: r.source,
        fetchedCount: r.fetched_count,
        insertedCount: r.inserted_count,
        updatedCount: r.updated_count,
        rejectedCount: r.rejected_count,
        errorMessage: r.error_message,
      })),
    };
  }

  /**
   * Transparent Net Return Calculator
   * Net Return = (Modal Price * Quantity) - Transport - Commission - Loading - Wastage
   */
  public calculateNetReturn(input: {
    modalPrice: number;
    quantityQuintals: number;
    distanceKm?: number;
    commissionPercent?: number;
    loadingPerQuintal?: number;
    wastagePercent?: number;
    manualTransportCost?: number;
  }): {
    grossValue: number;
    transportCost: number;
    commissionCost: number;
    loadingCost: number;
    wastageCost: number;
    netReturn: number;
    breakdown: {
      formula: string;
      units: string;
    };
  } {
    const qty = Math.max(0, Number(input.quantityQuintals) || 0);
    const price = Math.max(0, Number(input.modalPrice) || 0);
    const grossValue = Math.round(price * qty);

    let transportCost = 0;
    if (input.manualTransportCost !== undefined && input.manualTransportCost >= 0) {
      transportCost = Math.round(input.manualTransportCost);
    } else if (input.distanceKm !== undefined && input.distanceKm > 0) {
      const dist = Number(input.distanceKm);
      // Realistic freight logistics: base ₹300 + ₹25/km per 50 quintals
      transportCost = Math.max(300, Math.round(dist * 25 * (qty / 50)));
    } else {
      transportCost = 0;
    }

    const commissionRate = Math.max(0, Number(input.commissionPercent ?? 2.5));
    const commissionCost = Math.round((grossValue * commissionRate) / 100);
    const loadingRate = Math.max(0, Number(input.loadingPerQuintal ?? 5));
    const loadingCost = Math.round(loadingRate * qty);
    const wastageRate = Math.max(0, Number(input.wastagePercent ?? 1.0));
    const wastageCost = Math.round((grossValue * wastageRate) / 100);

    const totalDeductions = transportCost + commissionCost + loadingCost + wastageCost;
    const netReturn = Math.max(0, grossValue - totalDeductions);

    return {
      grossValue,
      transportCost,
      commissionCost,
      loadingCost,
      wastageCost,
      netReturn,
      breakdown: {
        formula: 'Net Return = Gross Revenue - (Transport + Commission [2.5%] + Loading [₹5/q] + Wastage [1%])',
        units: '₹ (INR)',
      },
    };
  }
}

export const mandiService = new MandiService();
