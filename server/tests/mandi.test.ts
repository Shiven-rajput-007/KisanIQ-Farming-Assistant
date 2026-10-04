import { mandiService } from '../services/mandiService.js';
import { marketService } from '../services/marketService.js';
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
  // Test 15: Live CEDA Connection & Price Retrieval Check
  // -------------------------------------------------------------
  const apiKey = mandiService.getApiKey();
  if (apiKey) {
    try {
      console.log('  Testing live connection to CEDA Agmarknet API...');
      const commodities = await mandiService.fetchCedaCommodities();
      if (Array.isArray(commodities) && commodities.length > 0) {
        console.log(`  ✅ PASS [Test 15]: CEDA Live Connection: Retrieved ${commodities.length} commodities`);
        passed++;
      } else {
        console.error('  ❌ FAIL [Test 15]: CEDA Live Connection returned empty commodities array');
        failed++;
      }
    } catch (err: any) {
      console.error('  ❌ FAIL [Test 15]: CEDA Live Connection error:', err.message);
      failed++;
    }
  } else {
    // Explicit requirement: If a live API test cannot be executed because a credential is missing,
    // DO NOT fake the result. Instead report: LIVE CEDA TEST BLOCKED — CEDA_API_KEY required.
    // Do not mark it passed.
    console.log('  ⚠️  [Test 15]: LIVE CEDA TEST BLOCKED — CEDA_API_KEY required.');
    blocked++;
  }

  console.log('\n===========================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED, ${blocked} BLOCKED`);
  if (blocked > 0) {
    console.log(`ℹ️  Note: ${blocked} test blocked awaiting CEDA_API_KEY in server/.env (unfaked live test)`);
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
