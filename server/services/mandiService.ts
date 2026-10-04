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

export interface ResolvedCommodity {
  id: number;
  officialName: string;
  displayName: string;
}

export interface ResolvedState {
  stateId: number;
  stateName: string;
}

export interface ResolvedDistrict {
  districtId: number;
  districtName: string;
}

/**
 * MandiService
 * Integrates directly with the CEDA Agmarknet API (api.ceda.ashoka.edu.in)
 * with dynamic multi-language commodity/geography resolution, 24-hour caching,
 * tiered geographic querying, on-demand synchronization, and transparent logistics.
 */
export class MandiService {
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
  private commodityAliasMap = new Map<string, number>();

  private stateIdMap = new Map<number, string>();
  private stateNameMap = new Map<string, number>();
  private stateAliasMap = new Map<string, number>();

  private districtIdMap = new Map<number, string>();
  private districtNameMap = new Map<string, number>();
  private districtAliasMap = new Map<string, number>();

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
   * Normalize search tokens (strips diacritics, lowercase, removes punctuation)
   */
  private normalizeToken(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Pre-populate standard Agmarknet census IDs for rapid initial resolution
   * across all 36 Indian States/UTs, major agricultural districts, and commodities.
   */
  private seedStandardLookups() {
    // 1. Standard CEDA Commodities
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
      [21, 'Ginger(Green)'],
      [22, 'Chilli Red'],
    ];

    for (const [id, name] of standardCommodities) {
      this.commodityIdMap.set(id, name);
      this.commodityNameMap.set(name.toLowerCase(), id);
      this.commodityNameMap.set(this.normalizeToken(name), id);
    }

    // Comprehensive Multi-Language Commodity Aliases (English, Hindi, Marathi, Transliterations)
    const commodityAliases: Record<string, number> = {
      // Wheat
      wheat: 1,
      gehu: 1,
      gehun: 1,
      gehoon: 1,
      gehum: 1,
      गेहूं: 1,
      गेहू: 1,
      गहू: 1,

      // Paddy / Rice
      paddy: 2,
      rice: 2,
      dhan: 2,
      chawal: 2,
      bhat: 2,
      tandul: 2,
      taandul: 2,
      धान: 2,
      चावल: 2,
      भात: 2,
      तांदूळ: 2,

      // Soybean
      soybean: 3,
      soyabean: 3,
      soya: 3,
      सोयाबीन: 3,
      सोयाबिन: 3,

      // Mustard
      mustard: 4,
      sarson: 4,
      sarso: 4,
      rai: 4,
      mohari: 4,
      मोहरी: 4,
      सरसों: 4,
      सरसो: 4,
      राई: 4,

      // Cotton
      cotton: 5,
      kapas: 5,
      kapaas: 5,
      kapus: 5,
      कापूस: 5,
      कपास: 5,

      // Maize
      maize: 6,
      makka: 6,
      makai: 6,
      corn: 6,
      मका: 6,
      मक्का: 6,
      मकई: 6,

      // Gram / Chana
      gram: 7,
      chana: 7,
      chhola: 7,
      chholla: 7,
      harbhara: 7,
      हरभरा: 7,
      चना: 7,
      छोला: 7,

      // Onion
      onion: 8,
      pyaz: 8,
      pyaaz: 8,
      kanda: 8,
      कांदा: 8,
      प्याज: 8,
      प्याज़: 8,

      // Potato
      potato: 9,
      aloo: 9,
      alu: 9,
      batata: 9,
      बटाटा: 9,
      आलू: 9,

      // Tomato
      tomato: 10,
      tamatar: 10,
      टोमॅटो: 10,
      टमाटर: 10,

      // Barley
      barley: 11,
      jau: 11,
      जौ: 11,

      // Bajra
      bajra: 12,
      bajri: 12,
      'pearl millet': 12,
      बाजरी: 12,
      बाजरा: 12,

      // Jowar
      jowar: 13,
      jowari: 13,
      sorghum: 13,
      ज्वारी: 13,
      ज्वार: 13,

      // Tur / Arhar
      tur: 14,
      toor: 14,
      arhar: 14,
      'red gram': 14,
      तुअर: 14,
      तूर: 14,
      अरहर: 14,

      // Moong
      moong: 15,
      mung: 15,
      'green gram': 15,
      मुग: 15,
      मूंग: 15,

      // Urad
      urad: 16,
      udad: 16,
      'black gram': 16,
      उडीद: 16,
      उड़द: 16,
      उडद: 16,

      // Groundnut
      groundnut: 17,
      peanut: 17,
      moongphali: 17,
      mungfali: 17,
      bhuimug: 17,
      भुईमूग: 17,
      मूंगफली: 17,

      // Sunflower
      sunflower: 18,
      surajmukhi: 18,
      suryaphul: 18,
      सूर्यफूल: 18,
      सूरजमुखी: 18,

      // Sugarcane
      sugarcane: 19,
      ganna: 19,
      us: 19,
      ऊस: 19,
      गन्ना: 19,

      // Garlic
      garlic: 20,
      lahsun: 20,
      lasun: 20,
      लसूण: 20,
      लहसुन: 20,

      // Ginger
      ginger: 21,
      adrak: 21,
      ale: 21,
      आले: 21,
      अदरक: 21,

      // Chilli
      chilli: 22,
      chili: 22,
      mirch: 22,
      mirchi: 22,
      मिरची: 22,
      मिर्च: 22,
    };

    for (const [alias, id] of Object.entries(commodityAliases)) {
      this.commodityAliasMap.set(alias.toLowerCase().trim(), id);
    }

    // 2. All 36 States/UTs of India (Census 2011 State IDs)
    const allIndianStates: Array<[number, string]> = [
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
      [11, 'Sikkim'],
      [12, 'Arunachal Pradesh'],
      [13, 'Nagaland'],
      [14, 'Manipur'],
      [15, 'Mizoram'],
      [16, 'Tripura'],
      [17, 'Meghalaya'],
      [18, 'Assam'],
      [19, 'West Bengal'],
      [20, 'Jharkhand'],
      [21, 'Odisha'],
      [22, 'Chhattisgarh'],
      [23, 'Madhya Pradesh'],
      [24, 'Gujarat'],
      [25, 'Daman and Diu'],
      [26, 'Dadra and Nagar Haveli'],
      [27, 'Maharashtra'],
      [28, 'Andhra Pradesh'],
      [29, 'Karnataka'],
      [30, 'Goa'],
      [31, 'Lakshadweep'],
      [32, 'Kerala'],
      [33, 'Tamil Nadu'],
      [34, 'Puducherry'],
      [35, 'Andaman and Nicobar Islands'],
      [36, 'Telangana'],
    ];

    for (const [id, name] of allIndianStates) {
      this.stateIdMap.set(id, name);
      this.stateNameMap.set(name.toLowerCase(), id);
      this.stateNameMap.set(this.normalizeToken(name), id);
    }

    // State Multi-Language Aliases (Hindi, Marathi, Abbreviations)
    const stateAliases: Record<string, number> = {
      'madhya pradesh': 23,
      'mp': 23,
      'm.p.': 23,
      'मध्य प्रदेश': 23,
      'मध्यप्रदेश': 23,

      'maharashtra': 27,
      'mh': 27,
      'महाराष्ट्र': 27,

      'uttar pradesh': 9,
      'up': 9,
      'u.p.': 9,
      'उत्तर प्रदेश': 9,
      'उत्तरप्रदेश': 9,

      'punjab': 3,
      'pb': 3,
      'पंजाब': 3,

      'haryana': 6,
      'hr': 6,
      'हरियाणा': 6,

      'rajasthan': 8,
      'rj': 8,
      'राजस्थान': 8,

      'gujarat': 24,
      'gj': 24,
      'गुजरात': 24,

      'bihar': 10,
      'br': 10,
      'बिहार': 10,

      'west bengal': 19,
      'wb': 19,
      'पश्चिम बंगाल': 19,
      'पश्चिम बंगाल (बंगाल)': 19,
      'बंगाल': 19,

      'karnataka': 29,
      'ka': 29,
      'कर्नाटक': 29,

      'telangana': 36,
      'ts': 36,
      'तेलंगाना': 36,

      'andhra pradesh': 28,
      'ap': 28,
      'आंध्र प्रदेश': 28,

      'tamil nadu': 33,
      'tn': 33,
      'तमिलनाडु': 33,
      'तमिळनाडू': 33,

      'kerala': 32,
      'kl': 32,
      'केरल': 32,
      'केरळ': 32,

      'odisha': 21,
      'orissa': 21,
      'ओडिशा': 21,
      'उड़ीसा': 21,

      'chhattisgarh': 22,
      'cg': 22,
      'छत्तीसगढ़': 22,

      'jharkhand': 20,
      'jh': 20,
      'झारखंड': 20,

      'uttarakhand': 5,
      'uk': 5,
      'उत्तराखंड': 5,

      'himachal pradesh': 2,
      'hp': 2,
      'हिमाचल प्रदेश': 2,

      'delhi': 7,
      'nct of delhi': 7,
      'दिल्ली': 7,
    };

    for (const [alias, id] of Object.entries(stateAliases)) {
      this.stateAliasMap.set(alias.toLowerCase().trim(), id);
      this.stateAliasMap.set(this.normalizeToken(alias), id);
    }

    // 3. Pre-seed common agricultural districts across India (Census 2011 District IDs)
    const standardDistricts: Array<[number, string]> = [
      // Madhya Pradesh
      [421, 'Gwalior'],
      [436, 'Indore'],
      [437, 'Bhopal'],
      [438, 'Sehore'],
      [439, 'Raisen'],
      [420, 'Morena'],
      [419, 'Bhind'],
      [422, 'Datia'],
      [423, 'Shivpuri'],
      [426, 'Ujjain'],
      [428, 'Dewas'],
      [441, 'Jabalpur'],
      [435, 'Hoshangabad'],
      [434, 'Harda'],
      [445, 'Chhindwara'],

      // Maharashtra
      [521, 'Pune'],
      [516, 'Nashik'],
      [505, 'Nagpur'],
      [517, 'Ahmednagar'],
      [518, 'Thane'],
      [522, 'Solapur'],
      [523, 'Satara'],
      [524, 'Kolhapur'],
      [525, 'Sangli'],
      [515, 'Aurangabad'],
      [513, 'Amravati'],
      [514, 'Yavatmal'],
      [511, 'Akola'],
      [512, 'Washim'],
      [510, 'Buldhana'],
      [519, 'Jalgaon'],
      [520, 'Dhule'],

      // Uttar Pradesh
      [141, 'Gautam Buddha Nagar'],
      [140, 'Ghaziabad'],
      [139, 'Meerut'],
      [138, 'Baghpat'],
      [137, 'Muzaffarnagar'],
      [136, 'Saharanpur'],
      [142, 'Bulandshahr'],
      [143, 'Aligarh'],
      [144, 'Mathura'],
      [145, 'Agra'],
      [157, 'Lucknow'],
      [164, 'Kanpur Nagar'],
      [193, 'Varanasi'],
      [178, 'Prayagraj'],
      [169, 'Bareilly'],
      [155, 'Lakhimpur Kheri'],
      [176, 'Barabanki'],
      [175, 'Ayodhya'],

      // Punjab
      [104, 'Ludhiana'],
      [103, 'Jalandhar'],
      [102, 'Amritsar'],
      [105, 'Patiala'],
      [106, 'Bathinda'],
      [107, 'Ferozepur'],
      [108, 'Sangrur'],

      // Haryana
      [71, 'Karnal'],
      [72, 'Panipat'],
      [73, 'Sonipat'],
      [74, 'Rohtak'],
      [75, 'Hisar'],
      [76, 'Sirsa'],
      [77, 'Ambala'],
      [78, 'Kurukshetra'],

      // Rajasthan
      [114, 'Jaipur'],
      [115, 'Jodhpur'],
      [116, 'Kota'],
      [117, 'Bikaner'],
      [118, 'Sri Ganganagar'],
      [119, 'Alwar'],
      [120, 'Bharatpur'],

      // Gujarat
      [474, 'Ahmedabad'],
      [475, 'Rajkot'],
      [476, 'Surat'],
      [477, 'Vadodara'],
      [478, 'Bhavnagar'],
      [479, 'Junagadh'],
      [480, 'Amreli'],
    ];

    for (const [id, name] of standardDistricts) {
      this.districtIdMap.set(id, name);
      this.districtNameMap.set(name.toLowerCase(), id);
      this.districtNameMap.set(this.normalizeToken(name), id);
    }

    // District Multi-Language Aliases (Hindi, Marathi, Common variations)
    const districtAliases: Record<string, number> = {
      // Hindi / Marathi spellings
      'ग्वालियर': 421,
      'इंदौर': 436,
      'भोपाल': 437,
      'उज्जैन': 426,
      'पुणे': 521,
      'नासिक': 516,
      'नाशिक': 516,
      'नागपुर': 505,
      'नागपूर': 505,
      'सातारा': 523,
      'सोलापूर': 522,
      'कोल्हापूर': 524,
      'सांगली': 525,
      'अहमदनगर': 517,
      'अहिल्यानगर': 517,
      'औरंगाबाद': 515,
      'संभाजीनगर': 515,
      'छत्रपती संभाजीनगर': 515,
      'मेरठ': 139,
      'आगरा': 145,
      'मथुरा': 144,
      'अलीगढ़': 143,
      'लखनऊ': 157,
      'कानपुर': 164,
      'वाराणसी': 193,
      'लुधियाना': 104,
      'अमृतसर': 102,
      'जयपुर': 114,
      'जोधपुर': 115,
      'कोटा': 116,
      'अहमदाबाद': 474,
      'राजकोट': 475,

      // Spelling variations
      'nasik': 516,
      'nashik': 516,
      'gautam budh nagar': 141,
      'gautam buddha nagar': 141,
      'gb nagar': 141,
      'g b nagar': 141,
      'noida': 141,
      'greater noida': 141,
      'bulandshahar': 142,
      'bulandshahr': 142,
      'kanpur': 164,
      'kanpur city': 164,
      'kanpur nagar': 164,
      'allahabad': 178,
      'prayagraj': 178,
      'faizabad': 175,
      'ayodhya': 175,
      'kheri': 155,
      'lakhimpur': 155,
      'lakhimpur kheri': 155,
      'ahilyanagar': 517,
      'ahmednagar': 517,
      'chhatrapati sambhajinagar': 515,
      'sambhajinagar': 515,
      'aurangabad': 515,
      'ganganagar': 118,
      'sri ganganagar': 118,
      'poona': 521,
      'pune': 521,
    };

    for (const [alias, id] of Object.entries(districtAliases)) {
      this.districtAliasMap.set(alias.toLowerCase().trim(), id);
      this.districtAliasMap.set(this.normalizeToken(alias), id);
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
    // If still missing, provide a clear APMC identifier instead of dropping valid real price data
    if (!marketName && raw.market_id) {
      marketName = `APMC Mandi (${district || state || 'Yard'} #${raw.market_id})`;
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
      this.commodityNameMap.set(this.normalizeToken(c.name), c.id);
    }
    this.lastMetadataFetch = Date.now();
    return commodities;
  }

  /**
   * Fetch geographies (states and districts) from CEDA with 24-hour cache
   * GET /agmarknet/geographies?commodity_id=<id>
   */
  public async fetchCedaGeographies(commodityId: number = 1): Promise<CedaGeography[]> {
    if (this.districtIdMap.size > 50 && Date.now() - this.lastMetadataFetch < this.METADATA_TTL_MS) {
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
      this.stateNameMap.set(this.normalizeToken(g.state_name), g.state_id);

      if (Array.isArray(g.districts)) {
        for (const d of g.districts) {
          this.districtIdMap.set(d.district_id, d.district_name);
          this.districtNameMap.set(d.district_name.toLowerCase(), d.district_id);
          this.districtNameMap.set(this.normalizeToken(d.district_name), d.district_id);
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
      this.marketNameMap.set(this.normalizeToken(m.market_name), m.market_id);
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
      signal: AbortSignal.timeout(15000),
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
      signal: AbortSignal.timeout(15000),
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
   * Resolve any commodity name/term (English, Hindi, Marathi) to official CEDA commodity ID and name.
   * Completely generic, never hardcodes or defaults to Wheat.
   */
  public async resolveCommodity(inputName?: string): Promise<ResolvedCommodity | null> {
    if (!inputName || typeof inputName !== 'string' || inputName.trim() === '') {
      return null;
    }

    const raw = inputName.trim();
    const lower = raw.toLowerCase();
    const normalized = this.normalizeToken(raw);

    // 1. Check alias dictionary (en, hi, mr, synonyms)
    if (this.commodityAliasMap.has(lower)) {
      const id = this.commodityAliasMap.get(lower)!;
      const officialName = this.commodityIdMap.get(id) || raw;
      return { id, officialName, displayName: officialName };
    }
    if (this.commodityAliasMap.has(normalized)) {
      const id = this.commodityAliasMap.get(normalized)!;
      const officialName = this.commodityIdMap.get(id) || raw;
      return { id, officialName, displayName: officialName };
    }

    // 2. Check direct CEDA name map
    if (this.commodityNameMap.has(lower)) {
      const id = this.commodityNameMap.get(lower)!;
      const officialName = this.commodityIdMap.get(id) || raw;
      return { id, officialName, displayName: officialName };
    }
    if (this.commodityNameMap.has(normalized)) {
      const id = this.commodityNameMap.get(normalized)!;
      const officialName = this.commodityIdMap.get(id) || raw;
      return { id, officialName, displayName: officialName };
    }

    // 3. Substring match against existing cache (e.g. "soybean" in "Soyabean")
    for (const [cNameLower, id] of this.commodityNameMap.entries()) {
      if (cNameLower.includes(lower) || lower.includes(cNameLower)) {
        const officialName = this.commodityIdMap.get(id) || raw;
        return { id, officialName, displayName: officialName };
      }
    }

    // 4. If not found in cache and CEDA is configured, refresh CEDA commodities list
    if (this.isConfigured()) {
      try {
        const commodities = await this.fetchCedaCommodities();
        // Exact match
        for (const c of commodities) {
          const cLower = c.name.toLowerCase();
          if (cLower === lower || this.normalizeToken(c.name) === normalized) {
            return { id: c.id, officialName: c.name, displayName: c.name };
          }
        }
        // Substring / word match
        for (const c of commodities) {
          const cLower = c.name.toLowerCase();
          if (cLower.includes(lower) || lower.includes(cLower)) {
            return { id: c.id, officialName: c.name, displayName: c.name };
          }
        }
      } catch (err: any) {
        console.warn('[MandiService] Live commodities fetch notice:', err.message);
      }
    }

    return null;
  }

  /**
   * Resolve any state name/abbreviation (English, Hindi, Marathi) to official Census 2011 State ID and name.
   */
  public resolveState(stateInput?: string): ResolvedState | null {
    if (!stateInput || typeof stateInput !== 'string' || stateInput.trim() === '' || stateInput === 'all') {
      return null;
    }

    const raw = stateInput.trim();
    const lower = raw.toLowerCase();
    const normalized = this.normalizeToken(raw);

    if (this.stateAliasMap.has(lower)) {
      const stateId = this.stateAliasMap.get(lower)!;
      return { stateId, stateName: this.stateIdMap.get(stateId) || raw };
    }
    if (this.stateAliasMap.has(normalized)) {
      const stateId = this.stateAliasMap.get(normalized)!;
      return { stateId, stateName: this.stateIdMap.get(stateId) || raw };
    }

    if (this.stateNameMap.has(lower)) {
      const stateId = this.stateNameMap.get(lower)!;
      return { stateId, stateName: this.stateIdMap.get(stateId) || raw };
    }
    if (this.stateNameMap.has(normalized)) {
      const stateId = this.stateNameMap.get(normalized)!;
      return { stateId, stateName: this.stateIdMap.get(stateId) || raw };
    }

    // Substring match
    for (const [sNameLower, id] of this.stateNameMap.entries()) {
      if (sNameLower.includes(lower) || lower.includes(sNameLower)) {
        return { stateId: id, stateName: this.stateIdMap.get(id) || raw };
      }
    }

    return null;
  }

  /**
   * Resolve any district name (English, Hindi, Marathi, spelling variants) to official Census 2011 District ID and name.
   */
  public async resolveDistrict(
    districtInput?: string,
    stateId?: number,
    commodityId?: number
  ): Promise<ResolvedDistrict | null> {
    if (!districtInput || typeof districtInput !== 'string' || districtInput.trim() === '' || districtInput === 'all') {
      return null;
    }

    const raw = districtInput.trim();
    const lower = raw.toLowerCase();
    const normalized = this.normalizeToken(raw);

    // Clean out noise words like "district", "dist", "zilla"
    const cleanLower = lower.replace(/\b(district|dist|zilla|zila|city|rural)\b/g, '').trim();
    const cleanNormalized = this.normalizeToken(cleanLower);

    // 1. Check alias dictionary
    if (this.districtAliasMap.has(cleanLower)) {
      const districtId = this.districtAliasMap.get(cleanLower)!;
      return { districtId, districtName: this.districtIdMap.get(districtId) || raw };
    }
    if (this.districtAliasMap.has(cleanNormalized)) {
      const districtId = this.districtAliasMap.get(cleanNormalized)!;
      return { districtId, districtName: this.districtIdMap.get(districtId) || raw };
    }

    // 2. Check direct district map
    if (this.districtNameMap.has(cleanLower)) {
      const districtId = this.districtNameMap.get(cleanLower)!;
      return { districtId, districtName: this.districtIdMap.get(districtId) || raw };
    }
    if (this.districtNameMap.has(cleanNormalized)) {
      const districtId = this.districtNameMap.get(cleanNormalized)!;
      return { districtId, districtName: this.districtIdMap.get(districtId) || raw };
    }

    // 3. Substring match in existing cache
    for (const [dNameLower, id] of this.districtNameMap.entries()) {
      if (dNameLower.includes(cleanNormalized) || cleanNormalized.includes(dNameLower)) {
        return { districtId: id, districtName: this.districtIdMap.get(id) || raw };
      }
    }

    // 4. If not found in cache and CEDA is configured, fetch geographies from CEDA
    if (this.isConfigured()) {
      try {
        const geographies = await this.fetchCedaGeographies(commodityId || 1);
        for (const g of geographies) {
          if (stateId && g.state_id !== stateId) continue;
          for (const d of g.districts || []) {
            const dNorm = this.normalizeToken(d.district_name);
            if (dNorm === cleanNormalized || dNorm.includes(cleanNormalized) || cleanNormalized.includes(dNorm)) {
              return { districtId: d.district_id, districtName: d.district_name };
            }
          }
        }
      } catch (err: any) {
        console.warn('[MandiService] Live geographies fetch notice:', err.message);
      }
    }

    return null;
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

    // If district and commodity are known, query CEDA /agmarknet/markets
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
    const commodityInput = options?.commodity || 'Wheat';
    const stateInput = options?.state || 'all';
    const districtInput = options?.district || 'all';
    const scopeKey = `${commodityInput.toLowerCase()}_${stateInput.toLowerCase()}_${districtInput.toLowerCase()}`;

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
      // 1. Resolve Commodity ID Dynamically
      const resolvedComm = await this.resolveCommodity(options?.commodity || 'Wheat');
      const commodityId = resolvedComm?.id || 1;
      const resolvedCommodityName = resolvedComm?.officialName || options?.commodity || 'Wheat';

      // 2. Resolve State ID Dynamically
      const resolvedSt = this.resolveState(options?.state);
      const stateId = resolvedSt?.stateId || 0;
      const resolvedStateName = resolvedSt?.stateName || (options?.state !== 'all' ? options?.state : undefined);

      // 3. Resolve District ID Dynamically
      const resolvedDist = await this.resolveDistrict(options?.district, stateId, commodityId);
      const districtId = resolvedDist?.districtId;
      const resolvedDistrictName = resolvedDist?.districtName || (options?.district !== 'all' ? options?.district : undefined);

      // 4. Pre-fetch geographies if district cache is empty
      if (this.districtIdMap.size < 30 || Date.now() - this.lastMetadataFetch >= this.METADATA_TTL_MS) {
        try {
          await this.fetchCedaGeographies(commodityId);
        } catch (e: any) {
          console.warn('[MandiSync] Geographies lookup notice:', e.message);
        }
      }

      // Pre-fetch markets for the district if both state and district are known
      if (stateId > 0 && districtId) {
        try {
          await this.fetchCedaMarkets(commodityId, stateId, districtId, 'price');
        } catch (mErr: any) {
          console.warn(`[MandiSync] Markets lookup notice for district ${districtId}:`, mErr.message);
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
      if (stateId > 0 && districtId) {
        try {
          priceRecords = await this.fetchCedaPrices({
            commodityId,
            stateId,
            districtIds: [districtId],
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

      // Tier 3: If 0 records from state, broaden to National in CEDA (state_id: 0)
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
        // Collect distinct (commId, sId, dId) tuples to pre-load market names
        const missingMarketTuples = new Set<string>();
        for (const r of priceRecords) {
          if (r.market_id && !this.marketIdMap.has(r.market_id)) {
            const sId = r.census_state_id || stateId;
            const dId = r.census_district_id || districtId;
            const cId = r.commodity_id || commodityId;
            if (sId > 0 && dId > 0) {
              missingMarketTuples.add(`${cId}_${sId}_${dId}`);
            }
          }
        }

        // Fetch markets in parallel for unknown districts
        const marketFetches = Array.from(missingMarketTuples).slice(0, 10).map(async (tuple) => {
          const [cId, sId, dId] = tuple.split('_').map(Number);
          try {
            await this.fetchCedaMarkets(cId, sId, dId, 'price');
          } catch {
            // ignore
          }
        });
        await Promise.allSettled(marketFetches);

        const formattedRecords: AgmarknetRecord[] = [];

        for (const r of priceRecords) {
          const recCommodityId = r.commodity_id || commodityId;
          const recStateId = r.census_state_id || stateId;
          const recDistrictId = r.census_district_id || districtId;
          const recMarketId = r.market_id;

          const stateName = this.stateIdMap.get(recStateId) || resolvedStateName || 'India';
          const districtName = recDistrictId
            ? (this.districtIdMap.get(recDistrictId) || resolvedDistrictName || stateName)
            : stateName;
          const cName = this.commodityIdMap.get(recCommodityId) || resolvedCommodityName;

          let marketName =
            this.marketIdMap.get(recMarketId) ||
            r.market_name ||
            (await this.resolveMarketName(recMarketId, recCommodityId, recStateId, recDistrictId));

          if (!marketName && recMarketId) {
            marketName = `APMC Mandi (${districtName} #${recMarketId})`;
          }

          if (!marketName || !stateName || !cName) {
            rejectedCount++;
            continue;
          }

          formattedRecords.push({
            arrival_date: r.date,
            state: stateName,
            census_state_id: recStateId,
            district: districtName,
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
   * Query price records from PostgreSQL with filtering, pagination, and dynamic CEDA on-demand sync.
   * If records are absent or stale in DB and CEDA is configured, triggers on-demand sync.
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

    // Resolve multi-language filter parameters (en, hi, mr) to standardized names
    let resolvedCommName: string | undefined = undefined;
    if (filter.commodity) {
      const r = await this.resolveCommodity(filter.commodity);
      resolvedCommName = r?.officialName || filter.commodity.trim();
    }

    let resolvedStateName: string | undefined = undefined;
    if (filter.state && filter.state !== 'all') {
      const r = this.resolveState(filter.state);
      resolvedStateName = r?.stateName || filter.state.trim();
    }

    let resolvedDistrictName: string | undefined = undefined;
    if (filter.district && filter.district !== 'all') {
      const r = await this.resolveDistrict(filter.district);
      resolvedDistrictName = r?.districtName || filter.district.trim();
    }

    const buildQuery = () => {
      const where: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (resolvedCommName || filter.commodity) {
        const c1 = resolvedCommName || filter.commodity!;
        const c2 = filter.commodity!;
        if (c1.toLowerCase() === c2.toLowerCase()) {
          where.push(`commodity ILIKE $${pIdx}`);
          params.push(`%${c1}%`);
          pIdx++;
        } else {
          where.push(`(commodity ILIKE $${pIdx} OR commodity ILIKE $${pIdx + 1})`);
          params.push(`%${c1}%`, `%${c2}%`);
          pIdx += 2;
        }
      }

      if (resolvedStateName || (filter.state && filter.state !== 'all')) {
        const s1 = resolvedStateName || filter.state!;
        where.push(`state ILIKE $${pIdx}`);
        params.push(`%${s1}%`);
        pIdx++;
      }

      if (resolvedDistrictName || (filter.district && filter.district !== 'all')) {
        const d1 = resolvedDistrictName || filter.district!;
        where.push(`district ILIKE $${pIdx}`);
        params.push(`%${d1}%`);
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
      return { whereSql, params, pIdx };
    };

    let { whereSql, params, pIdx } = buildQuery();

    let countRes = await db.query(
      `SELECT COUNT(*) as total FROM market_prices ${whereSql}`,
      params
    );
    let total = parseInt(countRes.rows[0]?.total || '0', 10);

    // On-demand sync: If 0 records exist or stale, and CEDA API is configured, trigger live sync
    if (total === 0 && this.isConfigured()) {
      try {
        console.log(`[MandiService] getPrices: Triggering on-demand CEDA fetch for commodity "${resolvedCommName || filter.commodity || 'Wheat'}"...`);
        await this.syncFromCedaApi({
          commodity: resolvedCommName || filter.commodity,
          state: resolvedStateName || filter.state,
          district: resolvedDistrictName || filter.district,
          fromDate: filter.dateFrom,
          toDate: filter.dateTo,
        });

        // Re-query database after ingestion
        const rebuild = buildQuery();
        whereSql = rebuild.whereSql;
        params = rebuild.params;
        pIdx = rebuild.pIdx;

        countRes = await db.query(
          `SELECT COUNT(*) as total FROM market_prices ${whereSql}`,
          params
        );
        total = parseInt(countRes.rows[0]?.total || '0', 10);
      } catch (err: any) {
        console.warn('[MandiService] On-demand sync notice:', err.message);
      }
    }

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
      records: recordsRes.rows.map((r) => ({
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
      history: res.rows.map((r) => ({
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
