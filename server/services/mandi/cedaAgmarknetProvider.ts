import type { MandiProvider, MandiProviderQuery, MandiProviderResult, NormalizedMandiRecord } from './types.js';

export class CedaAgmarknetProvider implements MandiProvider {
  public readonly name = 'CEDA Agmarknet' as const;
  private readonly DEFAULT_BASE_URL = 'https://api.ceda.ashoka.edu.in/v1';
  private readonly TIMEOUT_MS = 12000;

  public getApiKey(): string | undefined {
    const raw = process.env.CEDA_API_KEY;
    if (!raw) return undefined;
    const sanitized = raw.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
    return sanitized.length > 0 ? sanitized : undefined;
  }

  public isConfigured(): boolean {
    return !!this.getApiKey();
  }

  private getBaseUrl(): string {
    const raw = process.env.CEDA_BASE_URL || this.DEFAULT_BASE_URL;
    return raw.replace(/\/+$/, '');
  }

  /**
   * Safely logs CEDA external API requests without leaking API keys
   */
  private logRequest(endpoint: string, status: number, durationMs: number, count?: number, error?: string): void {
    const parts = [
      `[CEDA Agmarknet Provider] POST ${endpoint}`,
      `status=${status}`,
      `duration=${durationMs}ms`,
      count !== undefined ? `count=${count}` : null,
      error ? `error="${error}"` : null,
    ].filter(Boolean);

    console.log(parts.join(' '));
  }

  /**
   * Parses Indian date string formats into standard YYYY-MM-DD
   */
  public parseDate(rawDate?: string): string | null {
    if (!rawDate || typeof rawDate !== 'string') return null;
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      return !isNaN(d.getTime()) ? trimmed : null;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      const iso = `${year}-${month}-${day}`;
      const d = new Date(iso);
      return !isNaN(d.getTime()) ? iso : null;
    }
    const d = new Date(trimmed);
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null;
  }

  /**
   * Validates and normalizes raw CEDA price records
   */
  public validateAndNormalize(raw: any, context?: { commodity?: string; state?: string; district?: string }): NormalizedMandiRecord | null {
    if (!raw || typeof raw !== 'object') return null;

    const state = String(raw.state || raw.state_name || context?.state || '').trim();
    const district = String(raw.district || raw.district_name || context?.district || '').trim();
    const marketName = String(raw.market_name || raw.market || raw.name || '').trim();
    const commodity = String(raw.commodity || raw.commodity_name || context?.commodity || '').trim();
    const variety = String(raw.variety || 'Standard').trim();
    const grade = String(raw.grade || 'FAQ').trim();

    if (!marketName || !commodity) {
      return null;
    }

    const minPrice = parseFloat(String(raw.min_price ?? raw.minPrice ?? ''));
    const maxPrice = parseFloat(String(raw.max_price ?? raw.maxPrice ?? ''));
    const modalPrice = parseFloat(String(raw.modal_price ?? raw.modalPrice ?? ''));

    if (isNaN(minPrice) || isNaN(maxPrice) || isNaN(modalPrice)) return null;
    if (minPrice <= 0 || maxPrice <= 0 || modalPrice <= 0) return null;
    if (minPrice > maxPrice) return null;
    if (modalPrice < minPrice || modalPrice > maxPrice) return null;
    if (minPrice < 100 || maxPrice > 100000) return null;

    const arrivalDate = this.parseDate(raw.arrival_date || raw.date || raw.price_date) ||
      new Date().toISOString().split('T')[0];

    const quantityRaw = parseFloat(String(raw.arrival_quantity || raw.quantity || '0'));
    const quantity = !isNaN(quantityRaw) && quantityRaw > 0 ? quantityRaw : undefined;

    return {
      state: state || 'India',
      district: district || 'All Districts',
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
   * Fetches real mandi prices from CEDA Agmarknet API
   */
  public async fetchPrices(query: MandiProviderQuery): Promise<MandiProviderResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        records: [],
        total: 0,
        error: 'CEDA_API_KEY is not configured in backend environment variables.',
        errorReason: 'auth_failure',
      };
    }

    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/agmarknet/prices`;

    // Calculate dynamic date windows: 7, 14, 30 days
    const now = new Date();
    const toDateStr = query.toDate || now.toISOString().split('T')[0];

    const windows = [7, 14, 30];
    const startTime = Date.now();

    for (const days of windows) {
      const fromDateObj = new Date(now);
      fromDateObj.setDate(now.getDate() - days);
      const fromDateStr = query.fromDate || fromDateObj.toISOString().split('T')[0];

      const bodyPayload: Record<string, any> = {
        from_date: fromDateStr,
        to_date: toDateStr,
      };

      // In CEDA: commodity_id is an integer if resolved, or commodity string
      const commId = query.commodity ? parseInt(query.commodity, 10) : NaN;
      if (!isNaN(commId)) {
        bodyPayload.commodity_id = commId;
      }

      const stateId = query.state ? parseInt(query.state, 10) : NaN;
      if (!isNaN(stateId)) {
        bodyPayload.state_id = stateId;
      }

      const districtId = query.district ? parseInt(query.district, 10) : NaN;
      if (!isNaN(districtId)) {
        bodyPayload.district_id = [districtId];
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });

        clearTimeout(timer);
        const durationMs = Date.now() - startTime;

        if (!response.ok) {
          let errText = '';
          try { errText = await response.text(); } catch {}
          this.logRequest(endpoint, response.status, durationMs, 0, errText.slice(0, 100));

          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              provider: this.name,
              records: [],
              total: 0,
              error: `HTTP ${response.status} Authentication Failure`,
              errorReason: 'auth_failure',
              durationMs,
            };
          }
          if (response.status === 429) {
            return {
              success: false,
              provider: this.name,
              records: [],
              total: 0,
              error: 'HTTP 429 Too Many Requests',
              errorReason: 'rate_limit',
              durationMs,
            };
          }
          continue;
        }

        const json: any = await response.json();
        const rawRecords: any[] = Array.isArray(json.prices)
          ? json.prices
          : Array.isArray(json.records)
          ? json.records
          : Array.isArray(json)
          ? json
          : [];

        const normalized = rawRecords
          .map((r) => this.validateAndNormalize(r, {
            commodity: typeof query.commodity === 'string' && isNaN(commId) ? query.commodity : undefined,
            state: typeof query.state === 'string' && isNaN(stateId) ? query.state : undefined,
            district: typeof query.district === 'string' && isNaN(districtId) ? query.district : undefined,
          }))
          .filter((r): r is NormalizedMandiRecord => r !== null);

        this.logRequest(endpoint, response.status, durationMs, normalized.length);

        if (normalized.length > 0) {
          return {
            success: true,
            provider: this.name,
            records: normalized,
            total: normalized.length,
            durationMs,
          };
        }
      } catch (err: any) {
        clearTimeout(timer);
        const durationMs = Date.now() - startTime;
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        this.logRequest(endpoint, isTimeout ? 408 : 500, durationMs, 0, err.message);

        return {
          success: false,
          provider: this.name,
          records: [],
          total: 0,
          error: isTimeout ? 'CEDA request timed out' : err.message,
          errorReason: isTimeout ? 'network_failure' : 'network_failure',
          durationMs,
        };
      }
    }

    return {
      success: true,
      provider: this.name,
      records: [],
      total: 0,
      errorReason: 'no_records',
    };
  }
}

export const cedaAgmarknetProvider = new CedaAgmarknetProvider();
