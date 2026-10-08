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
  source: 'AGMARKNET / data.gov.in' | 'CEDA Agmarknet';
}

export interface MandiProviderQuery {
  commodity?: string;
  state?: string;
  district?: string;
  market?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface MandiProviderResult {
  success: boolean;
  provider: 'AGMARKNET / data.gov.in' | 'CEDA Agmarknet';
  records: NormalizedMandiRecord[];
  total: number;
  scope?: 'district' | 'state' | 'national';
  scopeNote?: string;
  error?: string;
  errorReason?: 'auth_failure' | 'rate_limit' | 'network_failure' | 'malformed_response' | 'no_records';
  durationMs?: number;
}

export interface MandiProvider {
  readonly name: 'AGMARKNET / data.gov.in' | 'CEDA Agmarknet';
  isConfigured(): boolean;
  getApiKey(): string | undefined;
  fetchPrices(query: MandiProviderQuery): Promise<MandiProviderResult>;
}
