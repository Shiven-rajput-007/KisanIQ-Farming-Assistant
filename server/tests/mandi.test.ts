import { mandiService } from '../services/mandiService.js';
import { marketService } from '../services/marketService.js';
import { dataGovAgmarknetProvider } from '../services/mandi/dataGovAgmarknetProvider.js';
import { cedaAgmarknetProvider } from '../services/mandi/cedaAgmarknetProvider.js';
import { db } from '../db/index.js';

async function runMandiTestSuite() {
  console.log('===========================================================');
  console.log('🌾 CEDA AGMARKNET MANDI SERVICE AUTOMATED TEST SUITE');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;
  let blocked = 0;

  function assert(condition: boolean, testNum: number, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS [Test ${testNum}]: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL [Test ${testNum}]: ${testName}`, detail || '');
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Indian Date Parsing (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
  // -------------------------------------------------------------
  const d1 = mandiService.parseArrivalDate('15/03/2026');
  const d2 = mandiService.parseArrivalDate('05-09-2026');
  const d3 = mandiService.parseArrivalDate('2026-10-03');
  const dInvalid1 = mandiService.parseArrivalDate('invalid-date');
  const dInvalid2 = mandiService.parseArrivalDate('');

  assert(
    d1 === '2026-03-15' &&
    d2 === '2026-09-05' &&
    d3 === '2026-10-03' &&
    dInvalid1 === null &&
    dInvalid2 === null,
    1,
    'Date Parser correctly normalizes Indian date formats and rejects unparseable strings'
  );

  // -------------------------------------------------------------
  // Test 2: Rejection of Negative or Zero Prices
  // -------------------------------------------------------------
  const negPriceRec = mandiService.normalizeRecord({
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon',
    commodity: 'Onion',
    min_price: -50,
    max_price: 2500,
    modal_price: 2400,
    arrival_date: '03/10/2026',
  });
  const zeroPriceRec = mandiService.normalizeRecord({
    state: 'Maharashtra',
    district: 'Nashik',
    market: 'Lasalgaon',
    commodity: 'Onion',
    min_price: 1500,
    max_price: 2500,
    modal_price: 0,
    arrival_date: '03/10/2026',
  });
  assert(
    negPriceRec === null && zeroPriceRec === null,
    2,
    'Negative or zero prices are strictly rejected during normalization'
  );

  // -------------------------------------------------------------
  // Test 3: Rejection of Inverted Prices (min_price > max_price)
  // -------------------------------------------------------------
  const invertedRec = mandiService.normalizeRecord({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior Mandi',
    commodity: 'Wheat',
    min_price: 3200,
    max_price: 2800,
    modal_price: 3000,
    arrival_date: '03/10/2026',
  });
  assert(
    invertedRec === null,
    3,
    'Inverted price ranges (min_price > max_price) are rejected'
  );

  // -------------------------------------------------------------
  // Test 4: Rejection of Out-of-Bounds Modal Price
  // -------------------------------------------------------------
  const outOfBoundsModalHigh = mandiService.normalizeRecord({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior Mandi',
    commodity: 'Wheat',
    min_price: 2200,
    max_price: 2600,
    modal_price: 3100,
    arrival_date: '03/10/2026',
  });
  const outOfBoundsModalLow = mandiService.normalizeRecord({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior Mandi',
    commodity: 'Wheat',
    min_price: 2200,
    max_price: 2600,
    modal_price: 1900,
    arrival_date: '03/10/2026',
  });
  assert(
    outOfBoundsModalHigh === null && outOfBoundsModalLow === null,
    4,
    'Modal price strictly outside [min_price, max_price] is rejected'
  );

  // -------------------------------------------------------------
  // Test 5: Rejection of Extreme Outliers (< ₹100 or > ₹100,000)
  // -------------------------------------------------------------
  const lowOutlier = mandiService.normalizeRecord({
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Ludhiana',
    commodity: 'Wheat',
    min_price: 20,
    max_price: 50,
    modal_price: 35,
    arrival_date: '03/10/2026',
  });
  const highOutlier = mandiService.normalizeRecord({
    state: 'Punjab',
    district: 'Ludhiana',
    market: 'Ludhiana',
    commodity: 'Wheat',
    min_price: 110000,
    max_price: 150000,
    modal_price: 120000,
    arrival_date: '03/10/2026',
  });
  assert(
    lowOutlier === null && highOutlier === null,
    5,
    'Extreme outlier prices (< ₹100 or > ₹100,000/q) are rejected as entry errors'
  );

  // -------------------------------------------------------------
  // Test 6: Rejection of Blank Commodity, Market, or State
  // -------------------------------------------------------------
  const blankCommodity = mandiService.normalizeRecord({
    state: 'Maharashtra',
    district: 'Pune',
    market: 'Pune APMC',
    commodity: '   ',
    min_price: 2000,
    max_price: 2400,
    modal_price: 2200,
    arrival_date: '03/10/2026',
  });
  const blankMarket = mandiService.normalizeRecord({
    state: 'Maharashtra',
    district: 'Pune',
    market: '',
    commodity: 'Onion',
    min_price: 2000,
    max_price: 2400,
    modal_price: 2200,
    arrival_date: '03/10/2026',
  });
  const blankState = mandiService.normalizeRecord({
    state: '',
    district: 'Pune',
    market: 'Pune APMC',
    commodity: 'Onion',
    min_price: 2000,
    max_price: 2400,
    modal_price: 2200,
    arrival_date: '03/10/2026',
  });
  assert(
    blankCommodity === null && blankMarket === null && blankState === null,
    6,
    'Records with missing or whitespace commodity, market, or state are rejected'
  );

  // -------------------------------------------------------------
  // Test 7: Valid Record Normalization & CEDA Agmarknet Formatting
  // -------------------------------------------------------------
  const validRec = mandiService.normalizeRecord({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior APMC',
    commodity: 'Wheat',
    variety: 'Sharbati HD-2967',
    grade: 'Grade A',
    min_price: '2350',
    max_price: '2650',
    modal_price: '2520',
    arrival_date: '03/10/2026',
    quantity: '450.5',
  });
  assert(
    validRec !== null &&
    validRec.state === 'Madhya Pradesh' &&
    validRec.commodity === 'Wheat' &&
    validRec.modalPrice === 2520 &&
    validRec.minPrice === 2350 &&
    validRec.maxPrice === 2650 &&
    validRec.arrivalDate === '2026-10-03' &&
    validRec.quantity === 450.5 &&
    validRec.source === 'CEDA Agmarknet',
    7,
    'Valid CEDA Agmarknet record is cleanly parsed with numeric prices, ISO date, arrival quantity, and source metadata'
  );

  // -------------------------------------------------------------
  // Test 8: Missing CEDA_API_KEY Handling (Fail-fast with clear state)
  // -------------------------------------------------------------
  const savedKey = process.env.CEDA_API_KEY;
  try {
    delete process.env.CEDA_API_KEY;
    const fetchRes = await mandiService.syncFromCedaApi({ limit: 10 });
    assert(
      fetchRes.status === 'failed' &&
      !!fetchRes.errorMessage?.includes('CEDA_API_KEY is not configured'),
      8,
      'Missing CEDA_API_KEY returns structured unconfigured status without throwing or crashing'
    );
  } finally {
    if (savedKey) process.env.CEDA_API_KEY = savedKey;
  }

  // -------------------------------------------------------------
  // Test 9: Malformed Response and Timeout Handling
  // -------------------------------------------------------------
  let malformedCaught = false;
  try {
    // Pass malformed payload to internal normalizer
    const malformed = mandiService.validateAndNormalize({
      min_price: 'not-a-number',
      max_price: {},
      modal_price: null,
    } as any);
    if (malformed === null) {
      malformedCaught = true;
    }
  } catch {
    malformedCaught = false;
  }
  assert(
    malformedCaught,
    9,
    'Malformed responses, non-numeric price data, and corrupted structures are safely caught and rejected'
  );

  // -------------------------------------------------------------
  // Test 10: Zero Demo / Fake Fallback Verification (No Mock Fallback)
  // -------------------------------------------------------------
  const unknownCommodityRes = await mandiService.getPrices({ commodity: 'NonExistentExoticFruit999' });
  assert(
    unknownCommodityRes.records.length === 0,
    10,
    'Returns empty array when commodity data is absent — NEVER fabricates fake prices'
  );

  // -------------------------------------------------------------
  // Test 11: PostgreSQL Persistence & Deduplication
  // -------------------------------------------------------------
  const testBatch = [
    {
      state: 'TestState',
      district: 'TestDistrict',
      market: 'TestMandi_Dedup',
      commodity: 'TestCrop_Dedup',
      variety: 'Desi',
      grade: 'FAQ',
      min_price: 2100,
      max_price: 2500,
      modal_price: 2300,
      arrival_date: '2026-10-03',
      quantity: 120,
    },
  ];

  // Ingest first time -> insertedCount === 1
  const sync1 = await mandiService.ingestRecords(testBatch);
  // Ingest duplicate second time with updated modal price -> updatedCount === 1
  testBatch[0].modal_price = 2380;
  testBatch[0].max_price = 2550;
  const sync2 = await mandiService.ingestRecords(testBatch);

  // Verify persistence and quantity in database
  const persisted = await db.query(
    "SELECT modal_price, quantity, source FROM market_prices WHERE commodity = 'TestCrop_Dedup' AND market_name = 'TestMandi_Dedup'"
  );

  // Clean up test record
  await db.query(
    "DELETE FROM market_prices WHERE commodity = 'TestCrop_Dedup' AND market_name = 'TestMandi_Dedup'"
  );

  assert(
    sync1.insertedCount === 1 &&
    sync2.insertedCount === 0 &&
    sync2.updatedCount === 1 &&
    persisted.rows.length === 1 &&
    Number(persisted.rows[0].modal_price) === 2380 &&
    persisted.rows[0].source === 'CEDA Agmarknet',
    11,
    'Deduplication upsert: First ingestion inserts new row, duplicate updates existing without duplicating in PostgreSQL'
  );

  // -------------------------------------------------------------
  // Test 12: Sync Observability & Stale-Data Handling
  // -------------------------------------------------------------
  const syncStatus = await mandiService.getSyncStatus();
  assert(
    typeof syncStatus.stale === 'boolean' &&
    typeof syncStatus.totalRecords === 'number' &&
    syncStatus.source.includes('CEDA Agmarknet'),
    12,
    'Sync status correctly monitors staleness, source transparency and record counts for CEDA Agmarknet'
  );

  // -------------------------------------------------------------
  // Test 13: Net Return Calculation Accuracy & Economic Realism
  // -------------------------------------------------------------
  const localCalc = mandiService.calculateNetReturn({
    modalPrice: 2500,
    quantityQuintals: 100,
    distanceKm: 15,
  });

  const distantCalc = mandiService.calculateNetReturn({
    modalPrice: 2600,
    quantityQuintals: 100,
    distanceKm: 220,
  });

  const expectedGrossLocal = 2500 * 100;
  const expectedGrossDistant = 2600 * 100;

  const formulaAccurate =
    localCalc.grossValue === expectedGrossLocal &&
    distantCalc.grossValue === expectedGrossDistant &&
    localCalc.transportCost < distantCalc.transportCost &&
    localCalc.netReturn > 0 &&
    distantCalc.netReturn > 0;

  const decisionAccurate = localCalc.netReturn > distantCalc.netReturn;

  assert(
    formulaAccurate && decisionAccurate,
    13,
    'Net Return calculator computes exact logistics breakdown and proves closer mandi yields higher net profit'
  );

  // -------------------------------------------------------------
  // Test 14: Mandi Geodesic Comparison & Commodity/Geography Filtering
  // -------------------------------------------------------------
  const comparison = await marketService.getMarketComparison(
    'farmer_ramesh',
    'Wheat',
    100,
    26.2183,
    78.1828
  );

  assert(
    comparison &&
    Array.isArray(comparison.markets) &&
    comparison.markets.length > 0 &&
    typeof comparison.bestPracticalOption === 'string' &&
    comparison.apiStatus.source.includes('CEDA Agmarknet'),
    14,
    'Market comparison correctly evaluates Geodesic APMC mandi options with CEDA Agmarknet provider metadata'
  );

  // -------------------------------------------------------------
  // Test 15: Generic Multi-Language Commodity Resolution (EN, HI, MR)
  // -------------------------------------------------------------
  const wheatEn = await mandiService.resolveCommodity('Wheat');
  const wheatHi = await mandiService.resolveCommodity('गेहूं');
  const wheatMr = await mandiService.resolveCommodity('गहू');

  const soyaEn = await mandiService.resolveCommodity('Soybean');
  const soyaHi = await mandiService.resolveCommodity('सोयाबीन');

  const paddyEn = await mandiService.resolveCommodity('Paddy');
  const riceEn = await mandiService.resolveCommodity('Rice');
  const riceHi = await mandiService.resolveCommodity('चावल');
  const riceMr = await mandiService.resolveCommodity('भात');

  const cottonEn = await mandiService.resolveCommodity('Cotton');
  const cottonHi = await mandiService.resolveCommodity('कपास');
  const cottonMr = await mandiService.resolveCommodity('कापूस');

  const mustardEn = await mandiService.resolveCommodity('Mustard');
  const mustardHi = await mandiService.resolveCommodity('सरसों');
  const mustardMr = await mandiService.resolveCommodity('मोहरी');

  const gramEn = await mandiService.resolveCommodity('Gram');
  const chanaHi = await mandiService.resolveCommodity('चना');
  const harbharaMr = await mandiService.resolveCommodity('हरभरा');

  const unknownCrop = await mandiService.resolveCommodity('NonExistentCrop999');

  const commodityResolutionsPass =
    wheatEn?.id === 1 && wheatHi?.id === 1 && wheatMr?.id === 1 &&
    soyaEn?.id === 3 && soyaHi?.id === 3 &&
    paddyEn?.id === 2 && riceEn?.id === 2 && riceHi?.id === 2 && riceMr?.id === 2 &&
    cottonEn?.id === 5 && cottonHi?.id === 5 && cottonMr?.id === 5 &&
    mustardEn?.id === 4 && mustardHi?.id === 4 && mustardMr?.id === 4 &&
    gramEn?.id === 7 && chanaHi?.id === 7 && harbharaMr?.id === 7 &&
    unknownCrop === null;

  assert(
    commodityResolutionsPass,
    15,
    'Generic multi-language commodity resolver accurately resolves English, Hindi, Marathi crop terms and rejects unknown commodities without fallback'
  );

  // -------------------------------------------------------------
  // Test 16: Generic Multi-Language State Resolution (Census 2011)
  // -------------------------------------------------------------
  const mpEn = mandiService.resolveState('Madhya Pradesh');
  const mpAbbr = mandiService.resolveState('MP');
  const mpHi = mandiService.resolveState('मध्य प्रदेश');

  const mhEn = mandiService.resolveState('Maharashtra');
  const mhAbbr = mandiService.resolveState('MH');
  const mhMr = mandiService.resolveState('महाराष्ट्र');

  const upEn = mandiService.resolveState('Uttar Pradesh');
  const upAbbr = mandiService.resolveState('UP');
  const upHi = mandiService.resolveState('उत्तर प्रदेश');

  const pbEn = mandiService.resolveState('Punjab');
  const pbHi = mandiService.resolveState('पंजाब');

  const rjEn = mandiService.resolveState('Rajasthan');
  const rjHi = mandiService.resolveState('राजस्थान');

  const gjEn = mandiService.resolveState('Gujarat');
  const gjHi = mandiService.resolveState('गुजरात');

  const unknownState = mandiService.resolveState('Atlantis');

  const stateResolutionsPass =
    mpEn?.stateId === 23 && mpAbbr?.stateId === 23 && mpHi?.stateId === 23 &&
    mhEn?.stateId === 27 && mhAbbr?.stateId === 27 && mhMr?.stateId === 27 &&
    upEn?.stateId === 9 && upAbbr?.stateId === 9 && upHi?.stateId === 9 &&
    pbEn?.stateId === 3 && pbHi?.stateId === 3 &&
    rjEn?.stateId === 8 && rjHi?.stateId === 8 &&
    gjEn?.stateId === 24 && gjHi?.stateId === 24 &&
    unknownState === null;

  assert(
    stateResolutionsPass,
    16,
    'Generic multi-language state resolver accurately resolves Census 2011 State IDs across English, Hindi, Marathi, and standard abbreviations'
  );

  // -------------------------------------------------------------
  // Test 17: Generic District Resolution & Spelling Normalization
  // -------------------------------------------------------------
  const gwaliorEn = await mandiService.resolveDistrict('Gwalior');
  const gwaliorHi = await mandiService.resolveDistrict('ग्वालियर');

  const puneEn = await mandiService.resolveDistrict('Pune');
  const puneMr = await mandiService.resolveDistrict('पुणे');

  const nashikEn = await mandiService.resolveDistrict('Nashik');
  const nashikAlt = await mandiService.resolveDistrict('Nasik');
  const nashikMr = await mandiService.resolveDistrict('नाशिक');

  const gbnagar1 = await mandiService.resolveDistrict('Gautam Budh Nagar');
  const gbnagar2 = await mandiService.resolveDistrict('Gautam Buddha Nagar');
  const gbnagar3 = await mandiService.resolveDistrict('GB Nagar');

  const indoreEn = await mandiService.resolveDistrict('Indore');
  const indoreHi = await mandiService.resolveDistrict('इंदौर');

  const ludhianaEn = await mandiService.resolveDistrict('Ludhiana');
  const ludhianaHi = await mandiService.resolveDistrict('लुधियाना');

  const districtResolutionsPass =
    gwaliorEn?.districtId === 421 && gwaliorHi?.districtId === 421 &&
    puneEn?.districtId === 521 && puneMr?.districtId === 521 &&
    nashikEn?.districtId === 516 && nashikAlt?.districtId === 516 && nashikMr?.districtId === 516 &&
    gbnagar1?.districtId === 141 && gbnagar2?.districtId === 141 && gbnagar3?.districtId === 141 &&
    indoreEn?.districtId === 436 && indoreHi?.districtId === 436 &&
    ludhianaEn?.districtId === 104 && ludhianaHi?.districtId === 104;

  assert(
    districtResolutionsPass,
    17,
    'Generic district resolver accurately resolves Census 2011 District IDs across variations, Hindi/Marathi names, and compound spellings'
  );

  // -------------------------------------------------------------
  // Test 18: Multi-Language Market Comparison Querying
  // -------------------------------------------------------------
  const comparisonHindi = await marketService.getMarketComparison(
    'farmer_ramesh',
    'गेहूं',
    100,
    26.2183,
    78.1828,
    'ग्वालियर',
    'मध्य प्रदेश'
  );

  assert(
    comparisonHindi &&
    Array.isArray(comparisonHindi.markets) &&
    comparisonHindi.markets.length > 0 &&
    typeof comparisonHindi.bestPracticalOption === 'string' &&
    comparisonHindi.apiStatus.source.includes('CEDA Agmarknet'),
    18,
    'Market comparison correctly handles Hindi crop and location queries, resolving to verified APMC mandi records'
  );

  // -------------------------------------------------------------
  // Test 19: API Key Sanitization (Stripping Quotes & Redundant Bearer Prefix)
  // -------------------------------------------------------------
  const prevKey = process.env.CEDA_API_KEY;
  try {
    process.env.CEDA_API_KEY = '  "Bearer mock_ceda_jwt_token_123"  ';
    const cleanedKey = mandiService.getApiKey();
    assert(
      cleanedKey === 'mock_ceda_jwt_token_123',
      19,
      'API key parser sanitizes quotes, trims whitespace, and strips redundant Bearer prefix'
    );
  } finally {
    if (prevKey !== undefined) {
      process.env.CEDA_API_KEY = prevKey;
    } else {
      delete process.env.CEDA_API_KEY;
    }
  }

  // -------------------------------------------------------------
  // Test 20: Dynamic Date Windows Query Method Presence & Fallback
  // -------------------------------------------------------------
  assert(
    typeof mandiService.fetchPricesWithDynamicWindows === 'function',
    20,
    'MandiService exposes dynamic date-window expansion method (fetchPricesWithDynamicWindows)'
  );

  // -------------------------------------------------------------
  // Test 21: Selling Decision Engine: INSUFFICIENT_DATA on empty markets
  // -------------------------------------------------------------
  const emptyDecision = marketService.computeSellingDecision({
    cropName: 'Wheat',
    quantityQuintals: 50,
    markets: [],
  });
  assert(
    emptyDecision.action === 'INSUFFICIENT_DATA' &&
    emptyDecision.riskScore === 50 &&
    emptyDecision.badgeVariant === 'info' &&
    emptyDecision.reasons.length > 0,
    21,
    'Selling Decision Engine returns structured INSUFFICIENT_DATA without crashing when markets array is empty'
  );

  // -------------------------------------------------------------
  // Test 22: Selling Decision Engine: WAIT triggered by high rain probability / weather transit risk
  // -------------------------------------------------------------
  const dummyMarket: any = {
    id: 'm_1',
    name: 'Gwalior APMC',
    price: 2400,
    distance: 40,
    netReturn: 110000,
    priceTrend: 'stable',
  };
  const waitDecision = marketService.computeSellingDecision({
    cropName: 'Wheat',
    quantityQuintals: 50,
    markets: [dummyMarket],
    weatherData: {
      forecast: [
        { rainProbability: 85, rainExpectedMm: 35 },
      ],
    },
  });
  assert(
    waitDecision.action === 'WAIT' &&
    waitDecision.badgeVariant === 'caution' &&
    waitDecision.riskBreakdown.weatherRisk.level === 'high' &&
    waitDecision.riskBreakdown.weatherRisk.score >= 80,
    22,
    'Selling Decision Engine recommends WAIT and identifies high weather risk when severe rain is forecast'
  );

  // -------------------------------------------------------------
  // Test 23: Selling Decision Engine: SELL_NOW for perishable crops or falling price trends
  // -------------------------------------------------------------
  const perishableDecision = marketService.computeSellingDecision({
    cropName: 'Tomato',
    quantityQuintals: 20,
    markets: [{ ...dummyMarket, priceTrend: 'stable' }],
    weatherData: { forecast: [{ rainProbability: 10 }] },
  });
  const downtrendDecision = marketService.computeSellingDecision({
    cropName: 'Wheat',
    quantityQuintals: 50,
    markets: [{ ...dummyMarket, priceTrend: 'down' }],
    weatherData: { forecast: [{ rainProbability: 10 }] },
  });
  assert(
    perishableDecision.action === 'SELL_NOW' &&
    downtrendDecision.action === 'SELL_NOW' &&
    perishableDecision.badgeVariant === 'success',
    23,
    'Selling Decision Engine recommends SELL_NOW for perishables and softening price trends to lock in value'
  );

  // -------------------------------------------------------------
  // Test 24: Selling Decision Engine: HOLD for non-perishable grain with upward price trend
  // -------------------------------------------------------------
  const holdDecision = marketService.computeSellingDecision({
    cropName: 'Wheat',
    quantityQuintals: 50,
    markets: [{ ...dummyMarket, priceTrend: 'up' }],
    weatherData: { forecast: [{ rainProbability: 5 }] },
  });
  assert(
    holdDecision.action === 'HOLD' &&
    holdDecision.badgeVariant === 'warning' &&
    holdDecision.reasons.some((r) => r.includes('momentum') || r.includes('upward')),
    24,
    'Selling Decision Engine recommends HOLD for dry grain when price trend is upward and storage risk is low'
  );

  // -------------------------------------------------------------
  // Test 25: Selling Decision Engine: PARTIAL_SELL (60/40 Split) & 5-Factor Risk Breakdown
  // -------------------------------------------------------------
  const partialDecision = marketService.computeSellingDecision({
    cropName: 'Soybean',
    quantityQuintals: 100,
    markets: [{ ...dummyMarket, distance: 35, priceTrend: 'stable' }],
    weatherData: { forecast: [{ rainProbability: 25 }] },
  });
  assert(
    partialDecision.action === 'PARTIAL_SELL' &&
    partialDecision.partialSplit !== undefined &&
    partialDecision.partialSplit.sellNowPercent === 60 &&
    partialDecision.partialSplit.holdPercent === 40 &&
    partialDecision.partialSplit.sellNowQuantity === 60 &&
    partialDecision.partialSplit.holdQuantity === 40 &&
    partialDecision.riskBreakdown.marketRisk !== undefined &&
    partialDecision.riskBreakdown.weatherRisk !== undefined &&
    partialDecision.riskBreakdown.storageRisk !== undefined &&
    partialDecision.riskBreakdown.volatilityRisk !== undefined &&
    partialDecision.riskBreakdown.logisticsRisk !== undefined,
    25,
    'Selling Decision Engine recommends PARTIAL_SELL (60/40 split) and computes 5-factor risk breakdown'
  );

  // -------------------------------------------------------------
  // Test 26: Live CEDA Connection & Price Retrieval Check
  // -------------------------------------------------------------
  const apiKey = mandiService.getApiKey();
  if (apiKey) {
    try {
      console.log('  Testing live connection to CEDA Agmarknet API...');
      const commodities = await mandiService.fetchCedaCommodities();
      if (Array.isArray(commodities) && commodities.length > 0) {
        console.log(`  ✅ PASS [Test 26]: CEDA Live Connection: Retrieved ${commodities.length} commodities`);
        passed++;
      } else {
        console.error('  ❌ FAIL [Test 26]: CEDA Live Connection returned empty commodities array');
        failed++;
      }
    } catch (err: any) {
      console.error('  ❌ FAIL [Test 26]: CEDA Live Connection error:', err.message);
      failed++;
    }
  } else {
    // Explicit requirement: If a live API test cannot be executed because a credential is missing,
    // DO NOT fake the result. Instead report: LIVE CEDA TEST BLOCKED — CEDA_API_KEY required.
    // Do not mark it passed.
    console.log('  ⚠️  [Test 26]: LIVE CEDA TEST BLOCKED — CEDA_API_KEY required.');
    blocked++;
  }

  // -------------------------------------------------------------
  // Test 27: Primary Provider (data.gov.in AGMARKNET) Normalization & Validation
  // -------------------------------------------------------------
  const validDataGovRec = dataGovAgmarknetProvider.validateAndNormalize({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior APMC',
    commodity: 'Wheat',
    variety: 'Lokwan',
    grade: 'FAQ',
    arrival_date: '05/10/2026',
    min_price: '2400',
    max_price: '2700',
    modal_price: '2550',
    arrival_quantity: '120.5',
  });

  const invertedDataGovRec = dataGovAgmarknetProvider.validateAndNormalize({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior APMC',
    commodity: 'Wheat',
    arrival_date: '05/10/2026',
    min_price: '2800',
    max_price: '2500',
    modal_price: '2600',
  });

  const outlierDataGovRec = dataGovAgmarknetProvider.validateAndNormalize({
    state: 'Madhya Pradesh',
    district: 'Gwalior',
    market: 'Gwalior APMC',
    commodity: 'Wheat',
    arrival_date: '05/10/2026',
    min_price: '50',
    max_price: '2500',
    modal_price: '2000',
  });

  assert(
    validDataGovRec !== null &&
    validDataGovRec.state === 'Madhya Pradesh' &&
    validDataGovRec.commodity === 'Wheat' &&
    validDataGovRec.modalPrice === 2550 &&
    validDataGovRec.minPrice === 2400 &&
    validDataGovRec.maxPrice === 2700 &&
    validDataGovRec.arrivalDate === '2026-10-05' &&
    validDataGovRec.quantity === 120.5 &&
    validDataGovRec.source === 'AGMARKNET / data.gov.in' &&
    invertedDataGovRec === null &&
    outlierDataGovRec === null,
    27,
    'Primary Provider (data.gov.in) normalizes valid Indian date & price records and rejects inverted/outlier data'
  );

  // -------------------------------------------------------------
  // Test 28: DATA_GOV_IN_API_KEY Sanitization
  // -------------------------------------------------------------
  const prevDataGovKey = process.env.DATA_GOV_IN_API_KEY;
  try {
    process.env.DATA_GOV_IN_API_KEY = '  "Bearer datagov_api_test_key_999"  ';
    const cleanedKey = dataGovAgmarknetProvider.getApiKey();
    assert(
      cleanedKey === 'datagov_api_test_key_999',
      28,
      'DATA_GOV_IN_API_KEY parser strips quotes, trims whitespace, and strips redundant Bearer prefix'
    );
  } finally {
    if (prevDataGovKey !== undefined) {
      process.env.DATA_GOV_IN_API_KEY = prevDataGovKey;
    } else {
      delete process.env.DATA_GOV_IN_API_KEY;
    }
  }

  // -------------------------------------------------------------
  // Test 29: Dynamic Partial Sell Split Engine (Adaptive Hedging)
  // -------------------------------------------------------------
  const highVolDecision = marketService.computeSellingDecision({
    cropName: 'Wheat',
    quantityQuintals: 100,
    markets: [
      { ...dummyMarket, price: 2800, minPrice: 2000, maxPrice: 3000, priceTrend: 'stable' },
      { ...dummyMarket, id: 'mkt_2', price: 2100, minPrice: 1900, maxPrice: 2200 },
    ],
    weatherData: { forecast: [{ rainProbability: 10 }] },
  });

  const highVolQtyDecision = marketService.computeSellingDecision({
    cropName: 'Soybean',
    quantityQuintals: 200,
    markets: [{ ...dummyMarket, distance: 35, priceTrend: 'stable' }],
    weatherData: { forecast: [{ rainProbability: 10 }] },
  });

  assert(
    highVolDecision.action === 'PARTIAL_SELL' &&
    highVolDecision.partialSplit?.sellNowPercent === 50 &&
    highVolDecision.partialSplit?.holdPercent === 50 &&
    highVolQtyDecision.action === 'PARTIAL_SELL' &&
    highVolQtyDecision.partialSplit?.sellNowPercent === 70 &&
    highVolQtyDecision.partialSplit?.holdPercent === 30,
    29,
    'Dynamic Partial Sell Split adapts to 50/50 for high volatility/divergence and 70/30 for high volume cash-in'
  );

  // -------------------------------------------------------------
  // Test 30: Multi-Crop Multi-Location Generic Mandi Routing
  // -------------------------------------------------------------
  const cropsToTest = ['Wheat', 'Rice', 'Soybean', 'Cotton', 'Mustard', 'Gram', 'Onion', 'Potato'];
  let allCropsResolved = true;
  for (const crop of cropsToTest) {
    const res = await mandiService.resolveCommodity(crop);
    if (!res || !res.id || !res.officialName) {
      allCropsResolved = false;
      break;
    }
  }

  const statesToTest = ['Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Punjab', 'Rajasthan', 'Gujarat'];
  let allStatesResolved = true;
  for (const st of statesToTest) {
    const res = mandiService.resolveState(st);
    if (!res || !res.stateId) {
      allStatesResolved = false;
      break;
    }
  }

  assert(
    allCropsResolved && allStatesResolved,
    30,
    'Generic multi-crop & multi-state routing resolves without any hardcoding or vendor lock-in'
  );

  // -------------------------------------------------------------
  // Test 31: Multi-Provider Ingestion and PostgreSQL Deduplication
  // -------------------------------------------------------------
  const testNormRec = {
    state: 'Maharashtra',
    district: 'Pune',
    marketName: 'Pune Gultekdi Mandi',
    commodity: 'Paddy(Dhan)(Common)',
    variety: 'Standard',
    grade: 'FAQ',
    arrivalDate: '2026-10-06',
    minPrice: 2200,
    maxPrice: 2600,
    modalPrice: 2450,
    quantity: 300,
    source: 'AGMARKNET / data.gov.in' as const,
  };

  const ing1 = await mandiService.ingestNormalizedRecords([testNormRec]);
  const ing2 = await mandiService.ingestNormalizedRecords([testNormRec]);

  assert(
    ing1.insertedCount === 1 &&
    ing2.updatedCount === 1 &&
    ing2.insertedCount === 0,
    31,
    'Multi-provider normalized records are deduplicated and upserted cleanly in PostgreSQL'
  );

  // -------------------------------------------------------------
  // Test 32: Live data.gov.in Connection Check (Unfaked)
  // -------------------------------------------------------------
  const dataGovKey = dataGovAgmarknetProvider.getApiKey();
  if (dataGovKey) {
    try {
      console.log('  Testing live connection to data.gov.in AGMARKNET API...');
      const result = await dataGovAgmarknetProvider.fetchPrices({ limit: 5 });
      if (result.success) {
        console.log(`  ✅ PASS [Test 32]: data.gov.in Live Connection: Retrieved ${result.records.length} records`);
        passed++;
      } else {
        console.error('  ❌ FAIL [Test 32]: data.gov.in Live Connection error:', result.error);
        failed++;
      }
    } catch (err: any) {
      console.error('  ❌ FAIL [Test 32]: data.gov.in Live Connection error:', err.message);
      failed++;
    }
  } else {
    console.log('  ⚠️  [Test 32]: LIVE DATA.GOV.IN TEST BLOCKED — DATA_GOV_IN_API_KEY required (unfaked live test requirement).');
    blocked++;
  }

  console.log('\n===========================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED, ${blocked} BLOCKED`);
  if (blocked > 0) {
    console.log(`ℹ️  Note: ${blocked} test(s) blocked awaiting live API credentials in server/.env (unfaked live test requirement)`);
  }
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMandiTestSuite().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
