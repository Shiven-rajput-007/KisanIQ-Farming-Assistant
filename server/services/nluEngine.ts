// KisanIQ Agricultural Natural Language Understanding (NLU) Engine
// Supports English, Hindi (Devanagari), and Hinglish (Latin-script Hindi)

export interface ParsedEntities {
  crop?: string;
  cropKey?: string;
  location?: string;
  state?: string;
  coordinates?: { lat: number; lon: number };
  quantity?: number;
  unit?: string;
  price?: number;
  timeframe?: 'today' | 'tomorrow' | 'forecast';
  variety?: string;
  grade?: string;
  soilParameter?: 'ph' | 'nitrogen' | 'phosphorus' | 'potassium' | 'organicCarbon' | 'ec' | 'moisture';
}

export type AssistantIntent =
  | 'WEATHER'
  | 'WEATHER_QUERY'
  | 'LOCATION_CHANGE'
  | 'USE_GPS_LOCATION'
  | 'MANDI_PRICE'
  | 'MARKET_PRICE'
  | 'MARKET_RECOMMENDATION'
  | 'SELLING_DECISION'
  | 'CROP_RECOMMENDATION'
  | 'IRRIGATION_ADVICE'
  | 'FERTILIZER_ADVICE'
  | 'DISEASE_PEST'
  | 'DISEASE_HELP'
  | 'SOIL_TEST'
  | 'SOIL_REPORT'
  | 'CROP_STATUS'
  | 'FARMER_PROFILE'
  | 'SELLER_SEARCH'
  | 'MY_LISTINGS'
  | 'CREATE_LISTING'
  | 'DELETE_LISTING'
  | 'MY_ORDERS'
  | 'LOGISTICS_TRACKING'
  | 'CROP_ROTATION'
  | 'GENERAL_AGRICULTURE'
  | 'GENERAL_AGRICULTURE_QUERY'
  | 'FOLLOW_UP_NEEDED'
  | 'GREETING'
  | 'UNKNOWN';

export interface NLUResult {
  intent: AssistantIntent;
  confidence: number;
  entities: ParsedEntities;
  detectedLanguage: 'mr' | 'hi' | 'en' | 'hinglish' | 'marathi_mixed';
  originalQuery: string;
  followUpQuestion?: string;
}

export interface ConversationContext {
  lastIntent?: AssistantIntent;
  lastCrop?: string;
  lastLocation?: string;
  lastCoordinates?: { lat: number; lon: number };
  lastTimeframe?: 'today' | 'tomorrow' | 'forecast';
  pendingAction?: any;
  updatedAt: number;
}

// 65+ Indian agricultural hubs with exact coordinates
export const INDIAN_AGRI_HUBS: Record<
  string,
  { state: string; lat: number; lon: number; aliases: string[] }
> = {
  gwalior: {
    state: 'Madhya Pradesh',
    lat: 26.2183,
    lon: 78.1828,
    aliases: ['gwalior', 'ग्वालियर', 'chambal', 'morar'],
  },
  indore: {
    state: 'Madhya Pradesh',
    lat: 22.7196,
    lon: 75.8577,
    aliases: ['indore', 'इंदौर', 'malwa', 'laxmibai nagar'],
  },
  bhopal: {
    state: 'Madhya Pradesh',
    lat: 23.2599,
    lon: 77.4126,
    aliases: ['bhopal', 'भोपाल', 'karond'],
  },
  ujjain: {
    state: 'Madhya Pradesh',
    lat: 23.1765,
    lon: 75.7885,
    aliases: ['ujjain', 'उज्जैन'],
  },
  jabalpur: {
    state: 'Madhya Pradesh',
    lat: 23.1815,
    lon: 79.9864,
    aliases: ['jabalpur', 'जबलपुर'],
  },
  kanpur: {
    state: 'Uttar Pradesh',
    lat: 26.4499,
    lon: 80.3319,
    aliases: ['kanpur', 'कानपुर'],
  },
  lucknow: {
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lon: 80.9462,
    aliases: ['lucknow', 'लखनऊ'],
  },
  varanasi: {
    state: 'Uttar Pradesh',
    lat: 25.3176,
    lon: 82.9739,
    aliases: ['varanasi', 'वाराणसी', 'banaras', 'kashi'],
  },
  agra: {
    state: 'Uttar Pradesh',
    lat: 27.1767,
    lon: 78.0081,
    aliases: ['agra', 'आगरा'],
  },
  meerut: {
    state: 'Uttar Pradesh',
    lat: 28.9845,
    lon: 77.7064,
    aliases: ['meerut', 'मेरठ'],
  },
  ludhiana: {
    state: 'Punjab',
    lat: 30.901,
    lon: 75.8573,
    aliases: ['ludhiana', 'लुधियाना'],
  },
  amritsar: {
    state: 'Punjab',
    lat: 31.634,
    lon: 74.8723,
    aliases: ['amritsar', 'अमृतसर'],
  },
  karnal: {
    state: 'Haryana',
    lat: 29.6857,
    lon: 76.9905,
    aliases: ['karnal', 'करनाल'],
  },
  hisar: {
    state: 'Haryana',
    lat: 29.1492,
    lon: 75.7217,
    aliases: ['hisar', 'हिसार'],
  },
  jaipur: {
    state: 'Rajasthan',
    lat: 26.9124,
    lon: 75.7873,
    aliases: ['jaipur', 'जयपुर'],
  },
  kota: {
    state: 'Rajasthan',
    lat: 25.2138,
    lon: 75.8648,
    aliases: ['kota', 'कोटा'],
  },
  nashik: {
    state: 'Maharashtra',
    lat: 19.9975,
    lon: 73.7898,
    aliases: ['nashik', 'नासिक', 'nasik'],
  },
  pune: {
    state: 'Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    aliases: ['pune', 'पुणे', 'poona'],
  },
  nagpur: {
    state: 'Maharashtra',
    lat: 21.1458,
    lon: 79.0882,
    aliases: ['nagpur', 'नागपुर', 'नागपूर'],
  },
  solapur: {
    state: 'Maharashtra',
    lat: 17.6599,
    lon: 75.9064,
    aliases: ['solapur', 'सोलापूर', 'sholapur'],
  },
  kolhapur: {
    state: 'Maharashtra',
    lat: 16.705,
    lon: 74.2433,
    aliases: ['kolhapur', 'कोल्हापूर'],
  },
  satara: {
    state: 'Maharashtra',
    lat: 17.6805,
    lon: 74.0183,
    aliases: ['satara', 'सातारा'],
  },
  sangli: {
    state: 'Maharashtra',
    lat: 16.8524,
    lon: 74.5815,
    aliases: ['sangli', 'सांगली'],
  },
  aurangabad: {
    state: 'Maharashtra',
    lat: 19.8762,
    lon: 75.3433,
    aliases: ['aurangabad', 'औरंगाबाद', 'chhatrapati sambhajinagar', 'संभाजीनगर', 'छत्रपती संभाजीनगर'],
  },
  amravati: {
    state: 'Maharashtra',
    lat: 20.9374,
    lon: 77.7796,
    aliases: ['amravati', 'अमरावती'],
  },
  akola: {
    state: 'Maharashtra',
    lat: 20.7002,
    lon: 77.0082,
    aliases: ['akola', 'अकोला'],
  },
  nanded: {
    state: 'Maharashtra',
    lat: 19.1383,
    lon: 77.321,
    aliases: ['nanded', 'नांदेड'],
  },
  latur: {
    state: 'Maharashtra',
    lat: 18.4088,
    lon: 76.5604,
    aliases: ['latur', 'लातूर'],
  },
  jalgaon: {
    state: 'Maharashtra',
    lat: 21.0077,
    lon: 75.5626,
    aliases: ['jalgaon', 'जळगाव'],
  },
  ahmednagar: {
    state: 'Maharashtra',
    lat: 19.0948,
    lon: 74.748,
    aliases: ['ahmednagar', 'अहमदनगर', 'ahilyanagar', 'अहिल्यानगर'],
  },
  patna: {
    state: 'Bihar',
    lat: 25.5941,
    lon: 85.1376,
    aliases: ['patna', 'पटना'],
  },
  ahmedabad: {
    state: 'Gujarat',
    lat: 23.0225,
    lon: 72.5714,
    aliases: ['ahmedabad', 'अहमदाबाद'],
  },
};

// Crop Synonyms Dictionary
export const CROP_SYNONYMS: Record<string, { standard: string; key: string; synonyms: string[] }> = {
  wheat: {
    standard: 'Wheat',
    key: 'wheat',
    synonyms: ['wheat', 'gehu', 'gehun', 'गेहूं', 'गेंहू', 'गेहूँ', 'गहू', 'गव्हाच्या', 'गव्हाला', 'गव्हासाठी', 'गव्हाचे', 'kanak'],
  },
  mustard: {
    standard: 'Mustard',
    key: 'mustard',
    synonyms: ['mustard', 'sarson', 'sarso', 'सरसों', 'राई', 'rai', 'मोहरी', 'मोहरीला', 'toria'],
  },
  soybean: {
    standard: 'Soybean',
    key: 'soybean',
    synonyms: ['soybean', 'soya', 'soyabean', 'सोयाबीन', 'सोयाबीनच्या', 'सोयाबीनला', 'सोयाबीनचे', 'सोया'],
  },
  rice: {
    standard: 'Rice',
    key: 'rice',
    synonyms: ['rice', 'paddy', 'chawal', 'dhan', 'चावल', 'धान', 'भात', 'तांदूळ', 'भाताला', 'basmati'],
  },
  potato: {
    standard: 'Potato',
    key: 'potato',
    synonyms: ['potato', 'aloo', 'alu', 'आलू', 'बटाटा', 'बटाट्याला', 'बटाट्याची'],
  },
  cotton: {
    standard: 'Cotton',
    key: 'cotton',
    synonyms: ['cotton', 'kapas', 'rui', 'कपास', 'रुई', 'कापूस', 'कापसाला', 'कापसाच्या'],
  },
  maize: {
    standard: 'Maize',
    key: 'maize',
    synonyms: ['maize', 'corn', 'makka', 'makai', 'मक्का', 'मकई', 'मका', 'मक्याला', 'bhutta'],
  },
  sugarcane: {
    standard: 'Sugarcane',
    key: 'sugarcane',
    synonyms: ['sugarcane', 'ganna', 'ईख', 'गन्ना', 'ऊस', 'उसाला', 'उसाच्या'],
  },
  onion: {
    standard: 'Onion',
    key: 'onion',
    synonyms: ['onion', 'pyaz', 'pyaaz', 'kanda', 'प्याज', 'कांदा', 'कांद्याला'],
  },
  tomato: {
    standard: 'Tomato',
    key: 'tomato',
    synonyms: ['tomato', 'tamatar', 'टमाटर', 'टोमॅटो', 'टोमॅटटोला'],
  },
  gram: {
    standard: 'Gram',
    key: 'gram',
    synonyms: ['gram', 'chana', 'चना', 'हरभरा', 'हरभऱ्याला', 'chickpea'],
  },
};

export class NLUEngine {
  private contextStore = new Map<string, ConversationContext>();

  getContext(sessionId: string): ConversationContext {
    const existing = this.contextStore.get(sessionId);
    if (existing && Date.now() - existing.updatedAt < 30 * 60 * 1000) {
      return existing;
    }
    const fresh: ConversationContext = { updatedAt: Date.now() };
    this.contextStore.set(sessionId, fresh);
    return fresh;
  }

  updateContext(sessionId: string, updates: Partial<ConversationContext>) {
    const current = this.getContext(sessionId);
    this.contextStore.set(sessionId, {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    });
  }

  detectLanguage(text: string): 'mr' | 'hi' | 'en' | 'hinglish' | 'marathi_mixed' {
    const lower = text.toLowerCase();

    // 1. Marathi specific markers (Devanagari & Latin)
    const marathiMarkers = [
      'आहे', 'का', 'कधी', 'कसं', 'कशी', 'द्यायचं', 'द्यावं', 'पाऊस', 'खत', 'माती',
      'मातीच्या', 'मातीचा', 'मातीतील', 'शेतात', 'शेताची', 'पिक', 'पिकाला', 'पिकासाठी',
      'बाजारभाव', 'विकायचं', 'विकावा', 'रोग', 'किती', 'सांगा', 'करावे', 'करावा',
      'नाही', 'शेतकरी', 'गव्हाच्या', 'गव्हाला', 'सोयाबीनच्या', 'अहवाल', 'नमुना', 'परीक्षण',
      'सल्ला', 'पाणी', 'पाहिजे', 'घ्यावे', 'कोणते', 'कोणतं'
    ];

    const marathiLatinMarkers = [
      'ahe', 'kadhi', 'kasa', 'kashi', 'dyaycha', 'dyava', 'paus', 'khat', 'mati',
      'shetat', 'shetachi', 'bajarbhav', 'vikava', 'karava', 'sanga', 'kiti', 'pahije',
      'pikala', 'pik', 'gahuvachya'
    ];

    const hasMarathiDevanagari = marathiMarkers.some((m) => text.includes(m));
    const hasMarathiLatin = marathiLatinMarkers.some((m) => lower.includes(m));

    if (hasMarathiDevanagari) return 'mr';
    if (hasMarathiLatin) return 'marathi_mixed';

    // 2. Hindi markers
    const hindiMarkers = [
      'है', 'क्या', 'होगी', 'बताओ', 'बारिश', 'सिंचाई', 'बेचें', 'चाहिए', 'फसल', 'कीट'
    ];
    const hindiLatinMarkers = [
      'kya', 'hai', 'kaise', 'kaun', 'mera', 'meri', 'mere', 'kahan', 'bhav',
      'batao', 'baarish', 'barish', 'paani', 'fasal', 'sinchai', 'mandi',
      'bechein', 'kharidna', 'rakho', 'karo', 'kar do', 'chahiye', 'hogi'
    ];

    if (hindiMarkers.some((m) => text.includes(m))) return 'hi';
    if (hindiLatinMarkers.some((m) => lower.includes(m))) return 'hinglish';

    // 3. Any Devanagari defaults to Marathi (Marathi-First system requirement)
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    if (hasDevanagari) return 'mr';

    return 'en';
  }

  extractEntities(text: string, context?: ConversationContext): ParsedEntities {
    const lower = text.toLowerCase();
    const entities: ParsedEntities = {};

    // 1. Crop Extraction
    for (const [_, cropData] of Object.entries(CROP_SYNONYMS)) {
      for (const syn of cropData.synonyms) {
        // Regex word boundary matching (or plain include for Devanagari)
        const regex = new RegExp(`(^|\\s|[,!?])${syn}($|\\s|[,!?])`, 'i');
        if (regex.test(lower) || lower.includes(syn)) {
          entities.crop = cropData.standard;
          entities.cropKey = cropData.key;
          break;
        }
      }
      if (entities.crop) break;
    }

    // Carry over crop from previous conversation turn if missing
    if (!entities.crop && context?.lastCrop) {
      entities.crop = context.lastCrop;
      entities.cropKey = context.lastCrop.toLowerCase();
    }

    // 2. Location Extraction
    for (const [key, hub] of Object.entries(INDIAN_AGRI_HUBS)) {
      for (const alias of hub.aliases) {
        const regex = new RegExp(`(^|\\s|[,!?])${alias}($|\\s|[,!?])`, 'i');
        if (regex.test(lower) || lower.includes(alias)) {
          // Capitalize standard district name
          entities.location = key.charAt(0).toUpperCase() + key.slice(1);
          entities.state = hub.state;
          entities.coordinates = { lat: hub.lat, lon: hub.lon };
          break;
        }
      }
      if (entities.location) break;
    }

    // Carry over location from context if missing
    if (!entities.location && context?.lastLocation) {
      entities.location = context.lastLocation;
      entities.coordinates = context.lastCoordinates;
    }

    // 3. Quantity & Unit Extraction
    // e.g. "2 quintal", "50 kg", "10 ton", "5 क्विंटल"
    const qtyMatch = lower.match(/(\d+(?:\.\d+)?)\s*(quintals?|quintal|q|क्विंटल|tons?|ton|टन|kilos?|kg|किलो|bori|boras?|बोरी)/i);
    if (qtyMatch) {
      entities.quantity = parseFloat(qtyMatch[1]);
      entities.unit = qtyMatch[2];
    } else {
      // Just a number followed by crop or listing context
      const bareNumMatch = lower.match(/(?:quantity|matra|मात्रा|approx)?\s*(\d+(?:\.\d+)?)\s*(?:quintal|q)?/);
      if (bareNumMatch && parseFloat(bareNumMatch[1]) > 0 && parseFloat(bareNumMatch[1]) < 1000) {
        // Only if context suggests a quantity
      }
    }

    // 4. Price Extraction
    // e.g. "₹2500", "2500 rupaye", "rate 2600", "price 2400"
    const priceMatch = lower.match(/(?:₹|rs\.?|inr|rupaye|rupees|रुपये|rate|bhav|price|दर|at)\s*[:=]?\s*(\d{3,6})/i) ||
      lower.match(/(\d{3,6})\s*(?:₹|rs\.?|inr|rupaye|rupees|रुपये|\/q|per quintal)/i);
    if (priceMatch) {
      entities.price = parseInt(priceMatch[1], 10);
    }

    // 5. Timeframe Extraction
    if (lower.includes('kal') || lower.includes('tomorrow') || lower.includes('कल')) {
      entities.timeframe = 'tomorrow';
    } else if (
      lower.includes('aaj') ||
      lower.includes('today') ||
      lower.includes('आज') ||
      lower.includes('abhi') ||
      lower.includes('now')
    ) {
      entities.timeframe = 'today';
    } else if (
      lower.includes('agale') ||
      lower.includes('next') ||
      lower.includes('forecast') ||
      lower.includes('hafta') ||
      lower.includes('week')
    ) {
      entities.timeframe = 'forecast';
    }

    // 6. Variety / Grade
    if (lower.includes('sharbati')) entities.variety = 'Sharbati HD-2967';
    if (lower.includes('grade a') || lower.includes('high quality') || lower.includes('उत्तम')) {
      entities.grade = 'Grade A';
    }

    // 7. Soil Parameter Extraction
    if (lower.includes('ph') || lower.includes('सामू') || lower.includes('सामु') || lower.includes('पीएच')) {
      entities.soilParameter = 'ph';
    } else if (lower.includes('nitrogen') || lower.includes('नायट्रोजन') || lower.includes('नत्र')) {
      entities.soilParameter = 'nitrogen';
    } else if (lower.includes('phosphorus') || lower.includes('फॉस्फरस') || lower.includes('स्फुरद')) {
      entities.soilParameter = 'phosphorus';
    } else if (lower.includes('potassium') || lower.includes('potash') || lower.includes('पोटॅश') || lower.includes('पालाश')) {
      entities.soilParameter = 'potassium';
    } else if (lower.includes('organic carbon') || lower.includes('सेंद्रिय कर्ब') || lower.includes('कार्बन') || lower.includes('organic')) {
      entities.soilParameter = 'organicCarbon';
    } else if (lower.includes('ec') || lower.includes('क्षारता') || lower.includes('conductivity')) {
      entities.soilParameter = 'ec';
    } else if (lower.includes('moisture') || lower.includes('ओलावा') || lower.includes('नमी')) {
      entities.soilParameter = 'moisture';
    }

    return entities;
  }

  classifyIntent(text: string, entities: ParsedEntities, context?: ConversationContext): { intent: AssistantIntent; confidence: number } {
    const lower = text.toLowerCase().trim();

    // 1. Greeting
    if (/^(namaste|namaskar|hello|hi|hey|pranam|नमस्ते|प्रणाम|ram ram|राम राम|नमस्कार|जय हरी)/i.test(lower) && lower.split(' ').length <= 4) {
      return { intent: 'GREETING', confidence: 0.95 };
    }

    // 2. Change Location Command
    if (
      (lower.includes('location') || lower.includes('स्थान') || lower.includes('district') || lower.includes('jila') || lower.includes('किला') || lower.includes('city') || lower.includes('जिल्हा')) &&
      (lower.includes('change') || lower.includes('badlo') || lower.includes('kar do') || lower.includes('karo') || lower.includes('set') || lower.includes('update') || lower.includes('बदलो') || lower.includes('बदला'))
    ) {
      return { intent: 'LOCATION_CHANGE', confidence: 0.95 };
    }
    if (lower.includes('use my current location') || lower.includes('meri current location') || lower.includes('gps location') || lower.includes('auto detect') || lower.includes('माझे चालू स्थान') || lower.includes('चालू स्थान')) {
      return { intent: 'USE_GPS_LOCATION', confidence: 0.95 };
    }

    // 3. Vague query requiring follow-up (No crop specified, asking general "what should I do?")
    const isVagueQuery =
      (lower.includes('काय करावं') ||
        lower.includes('काय करू') ||
        lower.includes('काय द्यावं') ||
        lower.includes('काय द्यावे') ||
        lower.includes('काय करावे') ||
        lower.includes('काय सल्ला') ||
        lower.includes('सल्ला हवा') ||
        lower.includes('kya karein') ||
        lower.includes('kya karun') ||
        lower.includes('what should i do') ||
        lower.includes('what to do')) &&
      !entities.crop &&
      !entities.soilParameter &&
      !lower.includes('खत') &&
      !lower.includes('पाणी') &&
      !lower.includes('रोग') &&
      !lower.includes('बाजारभाव') &&
      !lower.includes('मंडी') &&
      !lower.includes('माती');

    if (isVagueQuery) {
      return { intent: 'FOLLOW_UP_NEEDED', confidence: 0.95 };
    }

    // 4. Soil Report Queries (Direct questions about farmer's latest soil report: pH, N, P, K, deficiencies)
    const hasSoilReportQuery =
      lower.includes('माती परीक्षण अहवाल') ||
      lower.includes('मातीचा अहवाल') ||
      lower.includes('माती रिपोर्ट') ||
      lower.includes('मातीचा रिपोर्ट') ||
      lower.includes('सॉईल रिपोर्ट') ||
      lower.includes('soil report') ||
      lower.includes('soil test report') ||
      lower.includes('soil test result') ||
      lower.includes('मातीतील कमतरता') ||
      lower.includes('मातीत काय कमी') ||
      lower.includes('माती कशी आहे') ||
      lower.includes('मातीचे आरोग्य') ||
      lower.includes('जमिनीचे आरोग्य') ||
      (entities.soilParameter !== undefined &&
        (lower.includes('माती') ||
          lower.includes('मातीचा') ||
          lower.includes('मातीत') ||
          lower.includes('शेतातील') ||
          lower.includes('जमीन') ||
          lower.includes('जमिनीत') ||
          lower.includes('soil') ||
          lower.includes('किती आहे') ||
          lower.includes('सांगा') ||
          lower.includes('kitna hai')));

    if (hasSoilReportQuery) {
      return { intent: 'SOIL_REPORT', confidence: 0.96 };
    }

    // 5. Soil Testing Queries (How to test soil, book test, lab directory, collect sample)
    const hasSoilTestQuery =
      lower.includes('माती परीक्षण कसे करायचे') ||
      lower.includes('माती तपासणी कशी') ||
      lower.includes('माती परीक्षण करायचे') ||
      lower.includes('माती तपासणी') ||
      lower.includes('माती चाचणी') ||
      lower.includes('मातीचा नमुना') ||
      lower.includes('नमुना कसा घ्यावा') ||
      lower.includes('प्रयोगशाळा') ||
      lower.includes('प्रयोगशाळा दाखवा') ||
      lower.includes('लॅब दाखवा') ||
      lower.includes('soil test book') ||
      lower.includes('book soil test') ||
      lower.includes('how to test soil') ||
      lower.includes('soil testing lab');

    if (hasSoilTestQuery) {
      return { intent: 'SOIL_TEST', confidence: 0.95 };
    }

    // 6. Fertilizer Advice Queries
    const hasFertilizerQuery =
      lower.includes('खत') ||
      lower.includes('खताचा') ||
      lower.includes('खताचे') ||
      lower.includes('खते') ||
      lower.includes('युरिया') ||
      lower.includes('डीएपी') ||
      lower.includes('खतांचा सल्ला') ||
      lower.includes('fertilizer') ||
      lower.includes('urea') ||
      lower.includes('dap') ||
      lower.includes('खाद') ||
      lower.includes('उर्वरक');

    if (hasFertilizerQuery) {
      return { intent: 'FERTILIZER_ADVICE', confidence: 0.95 };
    }

    // 7. Create Listing (Farmer direct selling)
    if (
      (lower.includes('list') || lower.includes('listing') || lower.includes('लिस्ट')) &&
      (lower.includes('create') || lower.includes('banao') || lower.includes('kar do') || lower.includes('karo') || lower.includes('naya') || lower.includes('add') || entities.quantity || entities.price)
    ) {
      return { intent: 'CREATE_LISTING', confidence: 0.92 };
    }

    // 8. Delete Listing
    if (
      (lower.includes('listing') || lower.includes('लिस्ट')) &&
      (lower.includes('delete') || lower.includes('remove') || lower.includes('hatao') || lower.includes('hata do') || lower.includes('रद्द'))
    ) {
      return { intent: 'DELETE_LISTING', confidence: 0.95 };
    }

    // 9. Show My Listings
    if (
      (lower.includes('mera') || lower.includes('meri') || lower.includes('माझी') || lower.includes('my') || lower.includes('show')) &&
      (lower.includes('listing') || lower.includes('listings') || lower.includes('fasal list') || lower.includes('नोंदणी'))
    ) {
      return { intent: 'MY_LISTINGS', confidence: 0.9 };
    }

    // 10. Search Sellers (Buyer finding crops/farmers)
    if (
      (lower.includes('seller') || lower.includes('sellers') || lower.includes('bechne wale') || lower.includes('kisano') || lower.includes('farmers') || lower.includes('शेतकरी') || lower.includes('विक्रेते') || lower.includes('available')) &&
      (lower.includes('search') || lower.includes('dhundho') || lower.includes('dikhao') || lower.includes('near') || lower.includes('aas paas') || lower.includes('khojo') || lower.includes('शोधा') || lower.includes('दाखवा'))
    ) {
      return { intent: 'SELLER_SEARCH', confidence: 0.92 };
    }

    // 11. Orders & Status
    if (lower.includes('order') || lower.includes('orders') || lower.includes('ऑर्डर')) {
      if (lower.includes('status') || lower.includes('kahan pahuncha') || lower.includes('kahan hai') || lower.includes('tracking') || lower.includes('कुठे आहे') || lower.includes('स्थिती')) {
        return { intent: 'LOGISTICS_TRACKING', confidence: 0.95 };
      }
      return { intent: 'MY_ORDERS', confidence: 0.9 };
    }
    if (lower.includes('shipment') || lower.includes('delivery') || lower.includes('tracking') || lower.includes('गाड़ी') || lower.includes('ड्राइवर') || lower.includes('वाहतूक')) {
      return { intent: 'LOGISTICS_TRACKING', confidence: 0.92 };
    }

    // 12. Mandi / Market Price (Supports Marathi, Hindi, English)
    if (
      lower.includes('mandi') ||
      lower.includes('bhav') ||
      lower.includes('rate') ||
      lower.includes('price') ||
      lower.includes('मंडी') ||
      lower.includes('भाव') ||
      lower.includes('दर') ||
      lower.includes('बाजारभाव') ||
      lower.includes('दर काय') ||
      lower.includes('दर किती') ||
      lower.includes('बाजार भाव')
    ) {
      return { intent: 'MANDI_PRICE', confidence: 0.95 };
    }

    // 13. Selling Decision / Recommendation
    if (
      lower.includes('bechein') ||
      lower.includes('bechun') ||
      lower.includes('sell') ||
      lower.includes('kahan bechein') ||
      lower.includes('kab bechein') ||
      lower.includes('बेचें') ||
      lower.includes('विकायचं') ||
      lower.includes('विकावा') ||
      lower.includes('विकावे') ||
      lower.includes('कुठे विकू') ||
      lower.includes('कधी विकावं') ||
      lower.includes('विक्री')
    ) {
      return { intent: 'MARKET_RECOMMENDATION', confidence: 0.9 };
    }

    // 14. Weather / Rain
    if (
      lower.includes('baarish') ||
      lower.includes('barish') ||
      lower.includes('rain') ||
      lower.includes('mausam') ||
      lower.includes('weather') ||
      lower.includes('temperature') ||
      lower.includes('tapman') ||
      lower.includes('मौसम') ||
      lower.includes('बारिश') ||
      lower.includes('पाऊस') ||
      lower.includes('हवामान') ||
      lower.includes('तापमान') ||
      lower.includes('गारपीट') ||
      lower.includes('थंडी')
    ) {
      return { intent: 'WEATHER', confidence: 0.95 };
    }

    // 15. Water / Irrigation
    if (
      lower.includes('paani') ||
      lower.includes('pani') ||
      lower.includes('water') ||
      lower.includes('sinchai') ||
      lower.includes('irrigation') ||
      lower.includes('पानी') ||
      lower.includes('सिंचाई') ||
      lower.includes('पाणी') ||
      lower.includes('सिंचन') ||
      lower.includes('पाणी द्यायचं') ||
      lower.includes('पाणी देऊ का') ||
      lower.includes('पाणी कधी')
    ) {
      return { intent: 'IRRIGATION_ADVICE', confidence: 0.95 };
    }

    // 16. Disease / Pest / Crop Problem
    if (
      lower.includes('bimari') ||
      lower.includes('rog') ||
      lower.includes('disease') ||
      lower.includes('pest') ||
      lower.includes('keeda') ||
      lower.includes('kida') ||
      lower.includes('yellow rust') ||
      lower.includes('problem') ||
      lower.includes('बीमारी') ||
      lower.includes('कीट') ||
      lower.includes('धब्बे') ||
      lower.includes('रोग') ||
      lower.includes('कीड') ||
      lower.includes('मावा') ||
      lower.includes('तुडतुडे') ||
      lower.includes('अळी') ||
      lower.includes('पिवळे डाग') ||
      lower.includes('पाने पिवळी') ||
      lower.includes('फवारणी')
    ) {
      return { intent: 'DISEASE_PEST', confidence: 0.92 };
    }

    // 17. Crop Recommendation / Health
    if (
      (lower.includes('fasal') || lower.includes('crop') || lower.includes('khet') || lower.includes('फसल') || lower.includes('पीक') || lower.includes('पिकाची')) &&
      (lower.includes('kaisi') || lower.includes('kaisa') || lower.includes('health') || lower.includes('recommendation') || lower.includes('advisory') || lower.includes('kya karun') || lower.includes('कशी आहे') || lower.includes('स्थिती'))
    ) {
      return { intent: 'CROP_RECOMMENDATION', confidence: 0.9 };
    }

    // 18. Next Crop / Rotation
    if (
      lower.includes('agli fasal') ||
      lower.includes('next crop') ||
      lower.includes('rotation') ||
      lower.includes('kya lagayein') ||
      lower.includes('kya boyein') ||
      lower.includes('अगली फसल') ||
      lower.includes('पुढील पीक') ||
      lower.includes('पुढचे पीक') ||
      lower.includes('कोणते पीक घ्यावे')
    ) {
      return { intent: 'CROP_ROTATION', confidence: 0.92 };
    }

    // 19. Context fallback:
    // If turn is short like "Kanpur ka?" or "Aur Indore mein?" or "पुण्यामध्ये?"
    if (context?.lastIntent && (lower.endsWith('ka?') || lower.endsWith('mein?') || lower.endsWith('मध्ये?') || lower.includes('aur') || lower.includes('आणि') || lower.includes('and'))) {
      if (entities.location && (context.lastIntent === 'MANDI_PRICE' || context.lastIntent === 'MARKET_PRICE')) {
        return { intent: 'MANDI_PRICE', confidence: 0.85 };
      }
      if (entities.location && (context.lastIntent === 'WEATHER' || context.lastIntent === 'WEATHER_QUERY')) {
        return { intent: 'WEATHER', confidence: 0.85 };
      }
    }

    return { intent: 'GENERAL_AGRICULTURE', confidence: 0.6 };
  }

  analyze(text: string, sessionId: string = 'default'): NLUResult {
    const language = this.detectLanguage(text);
    const context = this.getContext(sessionId);
    const entities = this.extractEntities(text, context);
    const { intent, confidence } = this.classifyIntent(text, entities, context);

    let followUpQuestion: string | undefined;
    if (intent === 'FOLLOW_UP_NEEDED') {
      followUpQuestion =
        language === 'mr' || language === 'marathi_mixed'
          ? 'तुम्ही कोणते पीक घेतले आहे? गहू, सोयाबीन, कापूस की दुसरे पीक? कृपया पिकाचे नाव सांगा जेणेकरून मी अचूक सल्ला देऊ शकेन.'
          : language === 'hi' || language === 'hinglish'
          ? 'आपने कौन सी फसल लगाई है? गेहूं, सोयाबीन, कपास या कोई और फसल? कृपया फसल का नाम बताएं।'
          : 'Which crop are you growing? Wheat, soybean, cotton, or another crop? Please let me know so I can provide precise guidance.';
    }

    // Update conversation context
    this.updateContext(sessionId, {
      lastIntent: intent,
      lastCrop: entities.crop || context.lastCrop,
      lastLocation: entities.location || context.lastLocation,
      lastCoordinates: entities.coordinates || context.lastCoordinates,
      lastTimeframe: entities.timeframe || context.lastTimeframe,
    });

    return {
      intent,
      confidence,
      entities,
      detectedLanguage: language,
      originalQuery: text,
      followUpQuestion,
    };
  }
}

export const nluEngine = new NLUEngine();
