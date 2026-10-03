import { db } from '../db/index.js';

export interface AgmarknetRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  grade?: string;
  arrival_date?: string;
  min_price?: string | number;
  max_price?: string | number;
  modal_price?: string | number;
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
  source: string;
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

export class MandiService {
  private syncInProgress = false;
  private readonly RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
  private readonly BASE_URL = 'https://api.data.gov.in/resource';

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
   * Validates and normalizes raw record from data.gov.in
   */
  public validateAndNormalize(raw: AgmarknetRecord): NormalizedMandiRecord | null {
    if (!raw) return null;

    const state = (raw.state || '').trim();
    const district = (raw.district || '').trim();
    const marketName = (raw.market || '').trim();
    const commodity = (raw.commodity || '').trim();
    const variety = (raw.variety || 'Other').trim();
    const grade = (raw.grade || 'FAQ').trim();

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

    const parsedDate = this.parseArrivalDate(raw.arrival_date);
    if (!parsedDate && raw.arrival_date) {
      return null; // Reject invalid date format if provided
    }
    const arrivalDate = parsedDate || new Date().toISOString().split('T')[0];

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
      source: 'Government of India / AGMARKNET',
    };
  }

  public normalizeRecord(raw: AgmarknetRecord): NormalizedMandiRecord | null {
    return this.validateAndNormalize(raw);
  }

  /**
   * Ingest, validate, and upsert a batch of Agmarknet records into PostgreSQL
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
      // Deduplication based on state, district, marketName, commodity, variety, arrivalDate
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
               grade = $5, state = $6, district = $7, source = $8, fetched_at = NOW(), updated_at = NOW()
           WHERE id = $9`,
          [
            validated.minPrice,
            validated.maxPrice,
            validated.modalPrice,
            validated.modalPrice,
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
            source, fetched_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW())`,
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
            validated.source,
          ]
        );
        insertedCount++;
      }
    }

    return { insertedCount, updatedCount, rejectedCount };
  }

  /**
   * Synchronize mandi arrivals from data.gov.in API into PostgreSQL
   */
  public async syncFromGovApi(options?: {
    state?: string;
    commodity?: string;
    limit?: number;
    offset?: number;
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
       VALUES ($1, $2, 'running', 'data.gov.in / AGMARKNET')`,
      [syncId, startedAt]
    );

    let fetchedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;

    const apiKey = process.env.DATA_GOV_IN_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      const err = 'DATA_GOV_IN_API_KEY is not configured in backend environment variables.';
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
        source: 'data.gov.in / AGMARKNET',
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        rejectedCount: 0,
        errorMessage: err,
      };
    }

    try {
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      let apiUrl = `${this.BASE_URL}/${this.RESOURCE_ID}?api-key=${encodeURIComponent(apiKey)}&format=json&offset=${offset}&limit=${limit}`;
      if (options?.state && options.state.trim()) {
        apiUrl += `&filters[state]=${encodeURIComponent(options.state.trim())}`;
      }
      if (options?.commodity && options.commodity.trim()) {
        apiUrl += `&filters[commodity]=${encodeURIComponent(options.commodity.trim())}`;
      }

      console.log(`[MandiSync] Querying data.gov.in API (offset: ${offset}, limit: ${limit})...`);
      const response = await fetch(apiUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`data.gov.in API responded with HTTP ${response.status}: ${response.statusText}`);
      }

      const json: any = await response.json();
      const records: AgmarknetRecord[] = json?.records || [];
      fetchedCount = records.length;
      console.log(`[MandiSync] Fetched ${fetchedCount} records from AGMARKNET resource.`);

      const ingestStats = await this.ingestRecords(records);
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
        source: 'data.gov.in / AGMARKNET',
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
        source: 'data.gov.in / AGMARKNET',
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
      govApiConfigured: boolean;
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

    const apiKey = process.env.DATA_GOV_IN_API_KEY;
    const govApiConfigured = Boolean(apiKey && apiKey.trim() !== '');

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
        source: r.source || 'Government of India / AGMARKNET',
        fetchedAt: r.fetched_at || r.updated_at,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metadata: {
        source: 'Government of India / AGMARKNET (api.data.gov.in)',
        lastFetchedAt: lastSyncTime,
        isStale,
        freshnessPolicy: 'Data older than 24 hours is flagged as stale. Real daily arrivals updated via Agmarknet.',
        govApiConfigured,
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

    const apiKey = process.env.DATA_GOV_IN_API_KEY;

    return {
      success: true,
      govApiConfigured: Boolean(apiKey && apiKey.trim() !== ''),
      totalStoredPriceRecords: totalPrices,
      totalRecords: totalPrices,
      stale: isStale,
      isStale,
      source: 'Government of India / AGMARKNET (api.data.gov.in)',
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
