import dotenv from 'dotenv';
import { mandiService } from '../services/mandiService.js';

dotenv.config();

async function runLiveCedaVerification() {
  console.log('============================================================');
  console.log('🔍 CEDA AGMARKNET LIVE API DIAGNOSTIC VERIFICATION');
  console.log('============================================================');

  const apiKey = process.env.CEDA_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.log('\nLIVE CEDA TEST BLOCKED — production CEDA_API_KEY required');
    console.log('CEDA_API_KEY is not configured in the local development environment.');
    console.log('CEDA_API_KEY is configured in the production Render deployment.');
    console.log('To run this test locally, set CEDA_API_KEY in server/.env.');
    console.log('\n--- CEDA DIAGNOSTIC SUMMARY ---');
    console.log('CEDA API Key: NO (configured on Render)');
    console.log('CEDA Auth: BLOCKED');
    console.log('Commodities: BLOCKED');
    console.log('Geographies: BLOCKED');
    console.log('Markets: BLOCKED');
    console.log('Prices: BLOCKED');
    console.log('============================================================\n');
    return;
  }

  console.log('✅ CEDA_API_KEY detected in environment.');
  const baseUrl = mandiService.getBaseUrl();
  console.log(`📡 Connecting to CEDA Agmarknet endpoint: ${baseUrl}`);

  let commoditiesStatus = 'FAIL';
  let geographiesStatus = 'FAIL';
  let marketsStatus = 'FAIL';
  let pricesStatus = 'FAIL';

  try {
    // 1. Test GET /agmarknet/commodities
    console.log('\n[1/5] Fetching commodities (GET /agmarknet/commodities)...');
    const commodities = await mandiService.fetchCedaCommodities();
    console.log(`✅ Received ${commodities.length} commodities from CEDA.`);
    const sampleCommodity = commodities.find(c => c.name.toLowerCase().includes('wheat')) || commodities[0];
    console.log(`   Sample: ID ${sampleCommodity?.id} -> ${sampleCommodity?.name}`);
    commoditiesStatus = 'PASS';

    // 2. Test GET /agmarknet/geographies
    console.log('\n[2/5] Fetching geographies (GET /agmarknet/geographies)...');
    const geographies = await mandiService.fetchCedaGeographies(sampleCommodity?.id || 1);
    console.log(`✅ Received ${geographies.length} state geographies from CEDA.`);
    const sampleState = geographies.find(g => g.state_name.toLowerCase().includes('uttar pradesh')) || geographies[0];
    console.log(`   Sample State: ID ${sampleState?.state_id} -> ${sampleState?.state_name} (${sampleState?.districts?.length || 0} districts)`);
    geographiesStatus = 'PASS';

    const sampleDistrict = sampleState?.districts?.[0];
    console.log(`   Sample District: ID ${sampleDistrict?.district_id} -> ${sampleDistrict?.district_name}`);

    // 3. Test POST /agmarknet/markets
    console.log('\n[3/5] Fetching markets (POST /agmarknet/markets)...');
    let markets: any[] = [];
    if (sampleCommodity && sampleState && sampleDistrict) {
      markets = await mandiService.fetchCedaMarkets(sampleCommodity.id, sampleState.state_id, sampleDistrict.district_id, 'price');
      console.log(`✅ Received ${markets.length} markets for district "${sampleDistrict.district_name}".`);
      if (markets.length > 0) {
        console.log(`   Sample Market: ID ${markets[0].market_id} -> ${markets[0].market_name}`);
      }
      marketsStatus = 'PASS';
    }

    // 4. Test POST /agmarknet/prices
    console.log('\n[4/5] Fetching prices (POST /agmarknet/prices)...');
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prices = await mandiService.fetchCedaPrices({
      commodityId: sampleCommodity?.id || 1,
      stateId: sampleState?.state_id || 9,
      fromDate,
      toDate,
    });
    console.log(`✅ Received ${prices.length} price records from CEDA.`);
    pricesStatus = 'PASS';

    // 5. Test Normalization without fake substitutions
    console.log('\n[5/5] Normalizing live CEDA price records...');
    if (prices.length > 0) {
      const sampleRaw = prices[0];
      const marketName = await mandiService.resolveMarketName(
        sampleRaw.market_id,
        sampleRaw.commodity_id || sampleCommodity?.id,
        sampleRaw.census_state_id || sampleState?.state_id,
        sampleRaw.census_district_id
      );
      const stateName = await mandiService.resolveStateName(sampleRaw.census_state_id || sampleState?.state_id);
      const districtName = sampleRaw.census_district_id
        ? await mandiService.resolveDistrictName(sampleRaw.census_district_id, sampleRaw.commodity_id)
        : stateName;
      const commodityName = await mandiService.resolveCommodityName(sampleRaw.commodity_id || sampleCommodity?.id);

      const normalized = mandiService.validateAndNormalize({
        arrival_date: sampleRaw.date,
        state: stateName || undefined,
        district: districtName || undefined,
        market_name: marketName || undefined,
        commodity: commodityName || undefined,
        min_price: sampleRaw.min_price,
        max_price: sampleRaw.max_price,
        modal_price: sampleRaw.modal_price,
      });

      if (normalized) {
        console.log('✅ Normalized live record successfully:');
        console.log(`   Commodity: ${normalized.commodity}`);
        console.log(`   Market: ${normalized.marketName}, ${normalized.district}, ${normalized.state}`);
        console.log(`   Modal Price: ₹${normalized.modalPrice}/q (Min: ₹${normalized.minPrice}, Max: ₹${normalized.maxPrice})`);
        console.log(`   Arrival Date: ${normalized.arrivalDate}`);
        console.log(`   Source: ${normalized.source}`);
      } else {
        console.warn('⚠️ Record normalization returned null (validation rejected incomplete record).');
      }
    }

    console.log('\n--- CEDA DIAGNOSTIC SUMMARY ---');
    console.log('CEDA API Key: YES');
    console.log('CEDA Auth: PASS');
    console.log(`Commodities: ${commoditiesStatus}`);
    console.log(`Geographies: ${geographiesStatus}`);
    console.log(`Markets: ${marketsStatus}`);
    console.log(`Prices: ${pricesStatus}`);
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ CEDA API Verification Error:', err.message);
    console.log('\n--- CEDA DIAGNOSTIC SUMMARY ---');
    console.log('CEDA API Key: YES');
    console.log('CEDA Auth: FAIL');
    console.log(`Commodities: ${commoditiesStatus}`);
    console.log(`Geographies: ${geographiesStatus}`);
    console.log(`Markets: ${marketsStatus}`);
    console.log(`Prices: ${pricesStatus}`);
    console.log('============================================================\n');
  }
}

runLiveCedaVerification();
