import type { MandiProvider, MandiProviderQuery, MandiProviderResult, NormalizedMandiRecord } from './types.js';

export class DataGovAgmarknetProvider implements MandiProvider {
  public readonly name = 'AGMARKNET / data.gov.in' as const;
  private readonly RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
  private readonly BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  private readonly TIMEOUT_MS = 10000;

  /**
   * Sanitizes and extracts DATA_GOV_IN_API_KEY from process environment
   */
  public getApiKey(): string | undefined {
    const raw = process.env.DATA_GOV_IN_API_KEY;
    if (!raw) return undefined;
    const sanitized = raw.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
  }

  public isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Safely logs data.gov.in API requests without leaking credentials
   */
  private logRequest(info: {
    status: number;
    durationMs: number;
    count?: number;
    scope?: string;
    safeParams?: Record<string, any>;
    error?: string;
  }): void {
    const parts = [
      `[data.gov.in AGMARKNET] GET /resource/${this.RESOURCE_ID}`,
      `status=${info.status}`,
      `duration=${info.durationMs}ms`,
      info.count !== undefined ? `count=${info.count}` : null,
      info.scope ? `scope=${info.scope}` : null,
      info.safeParams ? `params=${JSON.stringify(info.safeParams)}` : null,
      info.error ? `error="${info.error}"` : null,
    ].filter(Boolean);

    console.log(parts.join(' '));
  }

  /**
   * Parses various Indian date string formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   * into a standardized ISO date string (YYYY-MM-DD).
   */
  public parseIndianDate(rawDate?: string): string | null {
    if (!rawDate || typeof rawDate !== 'string') return null;
    const trimmed = rawDate.trim();

    // Format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      return !isNaN(d.getTime()) ? trimmed : null;
    }

    // Format: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const iso = `${year}-${month}-${day}`;
      const d = new Date(iso);
      return !isNaN(d.getTime()) ? iso : null;
    }

    const fallbackDate = new Date(trimmed);
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate.toISOString().split('T')[0];
    }

    return null;
  }

  /**
   * Validates and normalizes raw data.gov.in records
   */
  public validateAndNormalize(raw: any): NormalizedMandiRecord | null {
    if (!raw || typeof raw !== 'object') return null;

    const state = String(raw.state || '').trim();
    const district = String(raw.district || '').trim();
    const marketName = String(raw.market || raw.market_name || '').trim();
    const commodity = String(raw.commodity || '').trim();
    const variety = String(raw.variety || 'Standard').trim();
    const grade = String(raw.grade || 'FAQ').trim();

    if (!state || !district || !marketName || !commodity) {
      return null;
    }

    const minPrice = parseFloat(String(raw.min_price || raw.minPrice || ''));
    const maxPrice = parseFloat(String(raw.max_price || raw.maxPrice || ''));
    const modalPrice = parseFloat(String(raw.modal_price || raw.modalPrice || ''));

    if (isNaN(minPrice) || isNaN(maxPrice) || isNaN(modalPrice)) return null;
    if (minPrice <= 0 || maxPrice <= 0 || modalPrice <= 0) return null;
    if (minPrice > maxPrice) return null;
    if (modalPrice < minPrice || modalPrice > maxPrice) return null;

    // Outlier sanity check: Mandi prices in India are per quintal (₹100 to ₹100,000)
    if (minPrice < 100 || maxPrice > 100000) return null;

    const arrivalDate = this.parseIndianDate(raw.arrival_date || raw.date || raw.arrivalDate) ||
      new Date().toISOString().split('T')[0];

    const quantityRaw = parseFloat(String(raw.arrival_quantity || raw.quantity || '0'));
    const quantity = !isNaN(quantityRaw) && quantityRaw > 0 ? quantityRaw : undefined;

    return {
      state,
      district,
      marketName,
      commodity,
      variety,
      grade,
      arrivalDate,
      minPrice,
      maxPrice,
      modalPrice,
      quantity,
      source: this.name,
    };
  }

  /**
   * Executes a single HTTP request to data.gov.in with timeout and error mapping
   */
  private async executeFetch(params: Record<string, string>): Promise<{
    status: number;
    data: any;
    durationMs: number;
    error?: string;
  }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { status: 401, data: null, durationMs: 0, error: 'DATA_GOV_IN_API_KEY not configured' };
    }

    const url = new URL(this.BASE_URL);
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('format', 'json');

    for (const [k, v] of Object.entries(params)) {
      if (v) {
        url.searchParams.set(k, v);
      }
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KisanIQ-Farming-Assistant/2.0',
        },
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;
      clearTimeout(timer);

      if (!response.ok) {
        let errBody = '';
        try {
          errBody = await response.text();
        } catch {}
        return {
          status: response.status,
          data: null,
          durationMs,
          error: `HTTP ${response.status} ${response.statusText}: ${errBody.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      return { status: response.status, data: json, durationMs };
    } catch (err: any) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return {
        status: isTimeout ? 408 : 500,
        data: null,
        durationMs,
        error: isTimeout ? 'Request timed out after 10000ms' : (err.message || 'Network fetch failed'),
      };
    }
  }

  /**
   * Fetches real mandi prices from data.gov.in using tiered multi-level queries
   * (District -> State fallback -> National fallback)
   */
  public async fetchPrices(query: MandiProviderQuery): Promise<MandiProviderResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        records: [],
        total: 0,
        error: 'DATA_GOV_IN_API_KEY is not configured in environment variables.',
        errorReason: 'auth_failure',
      };
    }

    const commodity = query.commodity?.trim();
    const state = query.state && query.state !== 'all' ? query.state.trim() : undefined;
    const district = query.district && query.district !== 'all' ? query.district.trim() : undefined;
    const limit = Math.max(1, Math.min(100, query.limit || 50));
    const offset = Math.max(0, query.offset || 0);

    const safeParams: Record<string, any> = {
      commodity,
      state,
      district,
      limit,
      offset,
    };

    // Tier 1: Query with district (if provided)
    if (district && state && commodity) {
      const params: Record<string, string> = {
        'filters[commodity]': commodity,
        'filters[state]': state,
        'filters[district]': district,
        limit: String(limit),
        offset: String(offset),
      };

      const res = await this.executeFetch(params);
      const rawRecords: any[] = res.data?.records || [];
      const normalized = rawRecords
        .map((r) => this.validateAndNormalize(r))
        .filter((r): r is NormalizedMandiRecord => r !== null);

      this.logRequest({
        status: res.status,
        durationMs: res.durationMs,
        count: normalized.length,
        scope: 'district',
        safeParams,
        error: res.error,
      });

      if (normalized.length > 0) {
        return {
          success: true,
          provider: this.name,
          records: normalized,
          total: parseInt(res.data?.total || String(normalized.length), 10),
          scope: 'district',
          scopeNote: `Verified AGMARKNET market rates for ${district}, ${state}`,
          durationMs: res.durationMs,
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          provider: this.name,
          records: [],
          total: 0,
          error: res.error,
          errorReason: 'auth_failure',
          durationMs: res.durationMs,
        };
      }
      if (res.status === 429) {
        return {
          success: false,
          provider: this.name,
          records: [],
          total: 0,
          error: res.error,
          errorReason: 'rate_limit',
          durationMs: res.durationMs,
        };
      }
    }

    // Tier 2: State-level query (if district had 0 records or no district specified)
    if (state && commodity) {
      const params: Record<string, string> = {
        'filters[commodity]': commodity,
        'filters[state]': state,
        limit: String(limit),
        offset: String(offset),
      };

      const res = await this.executeFetch(params);
      const rawRecords: any[] = res.data?.records || [];
      const normalized = rawRecords
        .map((r) => this.validateAndNormalize(r))
        .filter((r): r is NormalizedMandiRecord => r !== null);

      this.logRequest({
        status: res.status,
        durationMs: res.durationMs,
        count: normalized.length,
        scope: 'state',
        safeParams: { commodity, state, limit, offset },
        error: res.error,
      });

      if (normalized.length > 0) {
        return {
          success: true,
          provider: this.name,
          records: normalized,
          total: parseInt(res.data?.total || String(normalized.length), 10),
          scope: 'state',
          scopeNote: district
            ? `No arrivals reported specifically in ${district}; showing verified ${state} state mandis`
            : `Verified AGMARKNET market rates for ${state}`,
          durationMs: res.durationMs,
        };
      }
    }

    // Tier 3: National query (commodity only)
    if (commodity) {
      const params: Record<string, string> = {
        'filters[commodity]': commodity,
        limit: String(limit),
        offset: String(offset),
      };

      const res = await this.executeFetch(params);
      const rawRecords: any[] = res.data?.records || [];
      const normalized = rawRecords
        .map((r) => this.validateAndNormalize(r))
        .filter((r): r is NormalizedMandiRecord => r !== null);

      this.logRequest({
        status: res.status,
        durationMs: res.durationMs,
        count: normalized.length,
        scope: 'national',
        safeParams: { commodity, limit, offset },
        error: res.error,
      });

      if (normalized.length > 0) {
        return {
          success: true,
          provider: this.name,
          records: normalized,
          total: parseInt(res.data?.total || String(normalized.length), 10),
          scope: 'national',
          scopeNote: `Showing verified national market records for ${commodity}`,
          durationMs: res.durationMs,
        };
      }

      if (res.error) {
        return {
          success: false,
          provider: this.name,
          records: [],
          total: 0,
          error: res.error,
          errorReason: res.status === 408 ? 'network_failure' : 'no_records',
          durationMs: res.durationMs,
        };
      }
    }

    return {
      success: true,
      provider: this.name,
      records: [],
      total: 0,
      scope: 'national',
      errorReason: 'no_records',
    };
  }
}

export const dataGovAgmarknetProvider = new DataGovAgmarknetProvider();
