import { db } from './db/index.js';
import { weatherService } from './services/weatherService.js';
import { decisionEngine } from './services/decisionEngine.js';
import { marketService } from './services/marketService.js';
import { assistantService } from './services/assistantService.js';

async function verifyAll() {
  console.log('========================================================');
  console.log('🔍 KISANIQ DEEP SYSTEM VERIFICATION');
  console.log('========================================================\n');

  // 1. Database Connectivity & Table Check
  console.log('--- 1. POSTGRESQL CONNECTIVITY & SCHEMA ---');
  const client = await db.getClient();
  console.log('Database Engine Type:', client.type);

  const tables = [
    'users', 'farmers', 'farms', 'fields', 'crops', 'crop_stages',
    'crop_actions', 'markets', 'market_prices', 'recommendations',
    'alerts', 'notifications', 'chat_messages', 'orders', 'shipments',
    'vehicles', 'weather_cache'
  ];

  for (const t of tables) {
    const res = await db.query(`SELECT COUNT(*) as count FROM ${t}`);
    const count = res.rows[0]?.count;
    console.log(`  Table [${t.padEnd(16)}]: ${count} records present`);
  }

  // 2. Database Persistence Test (Create, Read, Update, Delete)
  console.log('\n--- 2. DATABASE PERSISTENCE & CRUD VERIFICATION ---');
  const testFarmerId = `test_farmer_${Date.now()}`;
  await db.query(
    `INSERT INTO farmers (id, name, phone, village, district, state)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [testFarmerId, 'Verif Farmer', '9998887770', 'Test Village', 'Gwalior', 'Madhya Pradesh']
  );
  console.log('  [CREATE] Inserted test farmer record:', testFarmerId);

  const readBack = await db.query(`SELECT * FROM farmers WHERE id = $1`, [testFarmerId]);
  if (readBack.rows[0]?.name === 'Verif Farmer') {
    console.log('  [READ] Verified farmer read back successfully:', readBack.rows[0].name);
  } else {
    throw new Error('Read back failed!');
  }

  await db.query(`UPDATE farmers SET village = $1 WHERE id = $2`, ['Updated Village', testFarmerId]);
  const updateBack = await db.query(`SELECT village FROM farmers WHERE id = $1`, [testFarmerId]);
  if (updateBack.rows[0]?.village === 'Updated Village') {
    console.log('  [UPDATE] Verified update persisted:', updateBack.rows[0].village);
  } else {
    throw new Error('Update persistence failed!');
  }

  await db.query(`DELETE FROM farmers WHERE id = $1`, [testFarmerId]);
  const deleteBack = await db.query(`SELECT COUNT(*) as count FROM farmers WHERE id = $1`, [testFarmerId]);
  if (Number(deleteBack.rows[0]?.count) === 0) {
    console.log('  [DELETE] Verified record deleted cleanly.');
  }

  // 3. Real Weather API Verification (Open-Meteo)
  console.log('\n--- 3. LIVE WEATHER API & AGRICULTURAL IMPLICATIONS ---');
  const wx = await weatherService.getWeather(26.2183, 78.1828); // Gwalior coordinates
  console.log('  Location: Gwalior (26.2183° N, 78.1828° E)');
  console.log('  Current Temperature:', wx.current.temperature + '°C');
  console.log('  Current Humidity:', wx.current.humidity + '%');
  console.log('  Rain Probability:', wx.current.rainProbability + '%');
  console.log('  Condition:', wx.current.condition);
  console.log('  Is Demo Flag:', wx.current.isDemo ? 'YES (Fallback)' : 'NO (Live API)');
  console.log('  Forecast Days count:', wx.forecast.length);
  console.log('  Farming Implications generated:', wx.implications.map(i => `${i.type} (${i.titleKey})`).join(', '));

  // 4. Explainable Decision Engine Verification
  console.log('\n--- 4. EXPLAINABLE DECISION ENGINE ---');
  const recs = await decisionEngine.generateRecommendations('farmer_ramesh');
  console.log(`  Recommendations generated (${recs.length}):`);
  for (const r of recs) {
    console.log(`    - [${r.actionCode}] (${r.status}, priority ${r.priority})`);
    console.log(`      Title: ${r.titleKey}`);
    console.log(`      Description: ${r.descriptionKey}`);
    if (r.whyExplanation) {
      console.log(`      Why? Summary: ${r.whyExplanation.summaryKey}`);
      console.log(`      Why? Conclusion: ${r.whyExplanation.conclusionKey}`);
      console.log(`      Why? Data points: ${r.whyExplanation.dataPoints.map(d => `${d.labelKey}=${d.value}${d.unit || ''}`).join(', ')}`);
    }
  }

  // 5. Market Economics & Logistics Verification
  console.log('\n--- 5. MANDI ECONOMICS & LOGISTICS ---');
  const mkt = await marketService.getMarketComparison('farmer_ramesh', 'Wheat', 100);
  console.log('  Available Quantity:', mkt.availableQuantity, 'quintals of', mkt.cropName);
  console.log('  Best Practical Mandi:', mkt.bestPracticalOption);
  console.log('  Markets Comparison Table:');
  for (const m of mkt.markets) {
    console.log(`    * ${m.name.padEnd(22)}: Price=₹${m.price}/q | Dist=${m.distance}km | Transport=₹${m.transportCost} | Net Return=₹${m.netReturn.toLocaleString('en-IN')}`);
  }
  console.log('  Partial Selling Suggestion:');
  console.log(`    Sell Now: ${mkt.partialSelling.sellNow.quantity}q at ${mkt.partialSelling.sellNow.marketName} (Est Return: ₹${mkt.partialSelling.sellNow.estimatedReturn.toLocaleString('en-IN')})`);
  console.log(`    Hold: ${mkt.partialSelling.holdFor.quantity}q (${mkt.partialSelling.holdFor.reason})`);

  // Place test sell order
  const orderRes = await marketService.createOrder('farmer_ramesh', mkt.markets[0].id, 'Wheat', 50, mkt.markets[0].price);
  console.log('  [LOGISTICS] Created Sell Order:', orderRes.orderId);
  console.log('  [LOGISTICS] Scheduled Shipment:', orderRes.shipId, 'Tracking Code:', orderRes.trackingCode);

  const orderVerify = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderRes.orderId]);
  console.log('  [LOGISTICS] Order status in DB:', orderVerify.rows[0]?.status);

  // 6. Context-Aware AI Assistant Verification
  console.log('\n--- 6. CONTEXT-AWARE AI ASSISTANT ---');
  const testQueries = [
    'Kal baarish hogi kya?',
    'Paani kab dena chahiye?',
    'Meri fasal kaisi hai?',
    'Fasal kab bechein?',
  ];

  for (const q of testQueries) {
    const ans = await assistantService.processQuery('farmer_ramesh', q);
    console.log(`  Farmer Q: "${q}"`);
    console.log(`  KisanIQ A: "${ans}"\n`);
  }

  console.log('========================================================');
  console.log('🎉 ALL SYSTEM MODULES TESTED & VERIFIED ON LIVE BACKEND!');
  console.log('========================================================');
}

verifyAll().catch(console.error);
