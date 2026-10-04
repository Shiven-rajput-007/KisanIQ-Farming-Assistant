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
 * to ingest, validate, deduplicate, and serve real agricultural market arrival bulletins.
 */
export class MandiService {
  private syncInProgress = false;
  private readonly DEFAULT_BASE_URL = 'https://api.ceda.ashoka.edu.in/v1';

  // Lookups cache for resolving CEDA IDs to human-readable names
  private commodityIdMap = new Map<number, string>();
  private commodityNameMap = new Map<string, number>();
  private stateIdMap = new Map<number, string>();
  private stateNameMap = new Map<string, number>();
  private districtIdMap = new Map<number, string>();
  private districtNameMap = new Map<string, number>();
  private marketIdMap = new Map<number, string>();

  constructor() {
    this.seedStandardLookups();
  }

  /**
   * Pre-populate standard Agmarknet census IDs for rapid resolution
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
    ];
    for (const [id, name] of standardCommodities) {
      this.commodityIdMap.set(id, name);
      this.commodityNameMap.set(name.toLowerCase(), id);
    }

    // Key agricultural states
    const standardStates: Array<[number, string]> = [
      [3, 'Punjab'],
      [6, 'Haryana'],
      [8, 'Rajasthan'],
      [9, 'Uttar Pradesh'],
      [23, 'Madhya Pradesh'],
      [24, 'Gujarat'],
      [27, 'Maharashtra'],
      [28, 'Andhra Pradesh'],
      [29, 'Karnataka'],
    ];
    for (const [id, name] of standardStates) {
      this.stateIdMap.set(id, name);
      this.stateNameMap.set(name.toLowerCase(), id);
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

    const variety = (raw.variety || 'Other').trim();
    const grade = (raw.grade || 'FAQ').trim();

    // Reject incomplete records
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
   * Fetch commodities list from CEDA
   * GET /agmarknet/commodities
   */
  public async fetchCedaCommodities(): Promise<CedaCommodity[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/commodities`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /commodities responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const commodities: CedaCommodity[] = json?.commodities || [];
    for (const c of commodities) {
      this.commodityIdMap.set(c.id, c.name);
      this.commodityNameMap.set(c.name.toLowerCase(), c.id);
    }
    return commodities;
  }

  /**
   * Fetch geographies (states and districts) from CEDA
   * GET /agmarknet/geographies
   */
  public async fetchCedaGeographies(commodityId?: number): Promise<CedaGeography[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('CEDA_API_KEY is not configured.');
    }

    let url = `${this.getBaseUrl()}/agmarknet/geographies`;
    if (commodityId) {
      url += `?commodity_id=${encodeURIComponent(commodityId)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

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
      throw new Error('CEDA_API_KEY is not configured.');
    }

    const url = `${this.getBaseUrl()}/agmarknet/markets`;
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
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /markets responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    const data: CedaMarket[] = json?.data || [];
    for (const m of data) {
      this.marketIdMap.set(m.market_id, m.market_name);
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
      throw new Error('CEDA_API_KEY is not configured.');
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /prices responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
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
      throw new Error('CEDA_API_KEY is not configured.');
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`CEDA Agmarknet API /quantities responded with HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();
    return json?.data || [];
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
   */
  public async syncFromCedaApi(options?: {
    state?: string;
    district?: string;
    commodity?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }): Promise<MandiSyncResult> {
    if (this.syncInProgress) {
      throw new Error('A mandi synchronization is already in progress. Please wait.');
    }

    this.syncInProgress = true;
    const startedAt = new Date().toISOString();
    const syncId = `sync_${Date.now()}`;

    // Create sync log
    await db.query(
      `INSERT INTO mandi_sync_logs (id, started_at, status, source)
       VALUES ($1, $2, 'running', 'CEDA Agmarknet')`,
      [syncId, startedAt]
    );

    let fetchedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;

    const apiKey = this.getApiKey();

    if (!apiKey) {
      const err = 'CEDA_API_KEY is not configured in backend environment variables. Register at https://api.ceda.ashoka.edu.in/documentation/ to obtain an API key.';
      const completedAt = new Date().toISOString();
      await db.query(
        `UPDATE mandi_sync_logs
         SET completed_at = $1, status = 'failed', error_message = $2
         WHERE id = $3`,
        [completedAt, err, syncId]
      );
      this.syncInProgress = false;
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
      console.log(`[MandiSync] Initiating synchronization from CEDA Agmarknet API (${this.getBaseUrl()})...`);

      // Determine date window (default: last 7 days)
      const toDate = options?.toDate || new Date().toISOString().split('T')[0];
      const fromDate =
        options?.fromDate ||
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Refresh commodity and geography lookups
      try {
        await this.fetchCedaCommodities();
        await this.fetchCedaGeographies();
      } catch (e: any) {
        console.warn('[MandiSync] Lookups refresh encountered notice:', e.message);
      }

      // Resolve Commodity ID
      let commodityId = 1; // Default: Wheat
      if (options?.commodity) {
        const cLower = options.commodity.toLowerCase().trim();
        if (this.commodityNameMap.has(cLower)) {
          commodityId = this.commodityNameMap.get(cLower)!;
        }
      }

      // Resolve State ID (0 for all-India if not specified, or state ID)
      let stateId = 0;
      if (options?.state) {
        const sLower = options.state.toLowerCase().trim();
        if (this.stateNameMap.has(sLower)) {
          stateId = this.stateNameMap.get(sLower)!;
        }
      }

      // Resolve District ID if specified
      let districtIds: number[] | undefined;
      if (options?.district) {
        const dLower = options.district.toLowerCase().trim();
        if (this.districtNameMap.has(dLower)) {
          districtIds = [this.districtNameMap.get(dLower)!];
        }
      }

      console.log(
        `[MandiSync] Querying CEDA /agmarknet/prices (commodity: ${commodityId}, state: ${stateId}, window: ${fromDate} to ${toDate})...`
      );

      const priceRecords = await this.fetchCedaPrices({
        commodityId,
        stateId,
        districtIds,
        fromDate,
        toDate,
      });

      fetchedCount = priceRecords.length;
      console.log(`[MandiSync] Fetched ${fetchedCount} price records from CEDA Agmarknet.`);

      // Optional quantities fetch
      let quantityRecords: any[] = [];
      try {
        quantityRecords = await this.fetchCedaQuantities({
          commodityId,
          stateId,
          districtIds,
          fromDate,
          toDate,
        });
      } catch (qErr: any) {
        console.warn('[MandiSync] Quantity records fetch notice:', qErr.message);
      }

      // Merge quantities by market_id + date where available
      const quantityMap = new Map<string, number>();
      for (const q of quantityRecords) {
        const key = `${q.market_id}_${q.date}`;
        quantityMap.set(key, Number(q.quantity) || 0);
      }

      // Map raw CEDA records to AgmarknetRecord format
      const formattedRecords: AgmarknetRecord[] = priceRecords.map((r: any) => {
        const qKey = `${r.market_id}_${r.date}`;
        return {
          arrival_date: r.date,
          commodity_id: r.commodity_id || commodityId,
          census_state_id: r.census_state_id || stateId,
          census_district_id: r.census_district_id,
          market_id: r.market_id,
          min_price: r.min_price,
          max_price: r.max_price,
          modal_price: r.modal_price,
          quantity: quantityMap.get(qKey),
        };
      });

      const ingestStats = await this.ingestRecords(formattedRecords);
      insertedCount = ingestStats.insertedCount;
      updatedCount = ingestStats.updatedCount;
      rejectedCount = ingestStats.rejectedCount;

      const completedAt = new Date().toISOString();
      await db.query(
        `UPDATE mandi_sync_logs
         SET completed_at = $1, status = 'success',
             fetched_count = $2, inserted_count = $3, updated_count = $4, rejected_count = $5
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
      console.error('[MandiSync] Synchronization error:', err.message);
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
        fetchedCount,
        insertedCount,
        updatedCount,
        rejectedCount,
        errorMessage: err.message,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Alias for backward compatibility if invoked by existing scripts
  public async syncFromGovApi(options?: any): Promise<MandiSyncResult> {
    return this.syncFromCedaApi(options);
  }

  /**
   * Retrieves verified APMC market prices with server-side filtering & pagination
   */
  public async getPrices(options: MandiFilterOptions): Promise<{
    records: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    metadata: {
      source: string;
      lastFetchedAt?: string;
      isStale: boolean;
      freshnessPolicy: string;
      cedaApiConfigured: boolean;
    };
  }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (options.state && options.state.trim() !== '' && options.state !== 'all') {
      whereClauses.push(`(state ILIKE $${pIdx} OR $${pIdx} = '')`);
      params.push(`%${options.state.trim()}%`);
      pIdx++;
    }
    if (options.district && options.district.trim() !== '' && options.district !== 'all') {
      whereClauses.push(`(district ILIKE $${pIdx} OR $${pIdx} = '')`);
      params.push(`%${options.district.trim()}%`);
      pIdx++;
    }
    if (options.market && options.market.trim() !== '' && options.market !== 'all') {
      whereClauses.push(`(market_name ILIKE $${pIdx} OR $${pIdx} = '')`);
      params.push(`%${options.market.trim()}%`);
      pIdx++;
    }
    if (options.commodity && options.commodity.trim() !== '' && options.commodity !== 'all') {
      whereClauses.push(`(commodity ILIKE $${pIdx} OR crop_name ILIKE $${pIdx})`);
      params.push(`%${options.commodity.trim()}%`);
      pIdx++;
    }
    if (options.variety && options.variety.trim() !== '' && options.variety !== 'all') {
      whereClauses.push(`(variety ILIKE $${pIdx} OR $${pIdx} = '')`);
      params.push(`%${options.variety.trim()}%`);
      pIdx++;
    }
    if (options.dateFrom) {
      whereClauses.push(`arrival_date >= $${pIdx}`);
      params.push(options.dateFrom);
      pIdx++;
    }
    if (options.dateTo) {
      whereClauses.push(`arrival_date <= $${pIdx}`);
      params.push(options.dateTo);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM market_prices ${whereSql}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    // Records query
    const recordsRes = await db.query(
      `SELECT id, state, district, COALESCE(market_name, 'APMC Mandi') as market,
              COALESCE(commodity, crop_name, 'Wheat') as commodity,
              COALESCE(variety, 'Standard') as variety,
              COALESCE(grade, 'FAQ') as grade,
              arrival_date,
              COALESCE(min_price, modal_price, price_per_quintal) as min_price,
              COALESCE(max_price, modal_price, price_per_quintal) as max_price,
              COALESCE(modal_price, price_per_quintal) as modal_price,
              quantity,
              source, fetched_at, updated_at
       FROM market_prices
       ${whereSql}
       ORDER BY arrival_date DESC NULLS LAST, fetched_at DESC NULLS LAST, id DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...params, limit, offset]
    );

    // Metadata & Freshness
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
        state: r.state || 'Madhya Pradesh',
        district: r.district || 'Gwalior',
        market: r.market,
        commodity: r.commodity,
        variety: r.variety,
        grade: r.grade,
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
      syncInProgress: this.syncInProgress,
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
    } else {
      const dist = Math.max(0, Number(input.distanceKm) || 0);
      // Realistic tractor-trolley freight: base ₹300 + ₹25 per km per 50 quintals
      transportCost = dist === 0 ? 0 : Math.max(300, Math.round(dist * 25 * (qty / 50)));
    }

    const commissionRate = Math.max(0, Number(input.commissionPercent ?? 2.5));
    const commissionCost = Math.round((grossValue * commissionRate) / 100);

    const loadingRate = Math.max(0, Number(input.loadingPerQuintal ?? 5)); // ₹5 per quintal
    const loadingCost = Math.round(loadingRate * qty);

    const wastageRate = Math.max(0, Number(input.wastagePercent ?? 1.0)); // 1% transit loss
    const wastageCost = Math.round((grossValue * wastageRate) / 100);

    const netReturn = Math.max(0, grossValue - transportCost - commissionCost - loadingCost - wastageCost);

    return {
      grossValue,
      transportCost,
      commissionCost,
      loadingCost,
      wastageCost,
      netReturn,
      breakdown: {
        formula: 'Net Return = Gross Value - (Transport + Commission + Loading + Wastage)',
        units: 'Values in INR (₹), Quantity in Quintals, Prices in ₹/Quintal',
      },
    };
  }
}

export const mandiService = new MandiService();
