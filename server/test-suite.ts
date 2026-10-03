const BASE_URL = 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting KisanIQ Full-Stack End-to-End Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function assert(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${name}`);
        failed++;
      }
    } catch (e: any) {
      console.error(`  ❌ ERROR: ${name} ->`, e.message);
      failed++;
    }
  }

  // 1. Health Endpoint
  await assert('GET /api/health returns database status and uptime', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data: any = await res.json();
    return res.status === 200 && data.status === 'ok' && data.databaseConnected === true;
  });

  // 2. Weather Endpoint
  await assert('GET /api/weather/current returns live temperature, humidity and farming implications', async () => {
    const res = await fetch(`${BASE_URL}/weather/current`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      typeof data.current?.temperature === 'number' &&
      Array.isArray(data.implications) &&
      data.implications.length > 0
    );
  });

  // 3. Dashboard Endpoint
  await assert('GET /api/dashboard returns aggregated daily briefing for farmer', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      data.farmer?.name === 'Ramesh' &&
      Array.isArray(data.recommendations) &&
      data.recommendations.length > 0 &&
      data.bestMarket?.name !== undefined
    );
  });

  // 4. Decision Engine
  await assert('GET /api/recommendations/daily produces explainable actions with data points', async () => {
    const res = await fetch(`${BASE_URL}/recommendations/daily`);
    const data: any = await res.json();
    const primaryRec = data.recommendations?.[0];
    return (
      res.status === 200 &&
      data.success === true &&
      primaryRec &&
      primaryRec.whyExplanation?.dataPoints?.length > 0
    );
  });

  // 5. Complete Action
  await assert('POST /api/recommendations/:id/complete updates action status in DB', async () => {
    const res = await fetch(`${BASE_URL}/recommendations/rec_irr_1/complete`, { method: 'POST' });
    const data: any = await res.json();
    return res.status === 200 && data.success === true;
  });

  // 6. Market Comparison
  await assert('GET /api/market/comparison computes net returns and partial selling advice', async () => {
    const res = await fetch(`${BASE_URL}/market/comparison?crop=Wheat&quantity=100`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      data.markets.length >= 4 &&
      data.partialSelling?.sellNow?.quantity > 0 &&
      data.partialSelling?.holdFor?.quantity > 0
    );
  });

  // 7. Create Sell Order & Shipment (Logistics workflow)
  let createdOrderId = '';
  await assert('POST /api/market/orders creates real order and schedules shipment', async () => {
    const res = await fetch(`${BASE_URL}/market/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketId: 'm1',
        cropName: 'Wheat',
        quantity: 60,
        agreedPrice: 2500,
      }),
    });
    const data: any = await res.json();
    createdOrderId = data.order?.orderId;
    return res.status === 201 && data.success === true && data.order?.trackingCode !== undefined;
  });

  // 8. Order Tracking & Logistics
  await assert('GET /api/orders retrieves active shipments and vehicle assignment', async () => {
    const res = await fetch(`${BASE_URL}/orders`);
    const data: any = await res.json();
    return res.status === 200 && data.success === true && Array.isArray(data.orders) && data.orders.length > 0;
  });

  // 9. Crops CRUD
  await assert('GET /api/crops returns farmer crops, growth stage timeline, and health', async () => {
    const res = await fetch(`${BASE_URL}/crops`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      data.crops[0]?.name === 'Wheat' &&
      data.stages.length === 7
    );
  });

  // 10. Risk Assessment
  await assert('GET /api/risk/assessment calculates dynamic risk scores across categories', async () => {
    const res = await fetch(`${BASE_URL}/risk/assessment`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      typeof data.assessment.riskScore === 'number' &&
      data.assessment.categories.length === 4
    );
  });

  // 11. Assistant Intelligent Reasoning
  await assert('POST /api/assistant/chat answers context-aware agricultural questions', async () => {
    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Paani kab dena chahiye?' }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true && data.reply.length > 20;
  });

  // 12. Notifications
  await assert('GET /api/notifications returns list of alerts and updates', async () => {
    const res = await fetch(`${BASE_URL}/notifications`);
    const data: any = await res.json();
    return res.status === 200 && data.success === true && Array.isArray(data.notifications);
  });

  // 13. Auth (Register & Login)
  const testPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  await assert('POST /api/auth/register creates new farmer and returns JWT token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Suresh Patel',
        phone: testPhone,
        password: 'password123',
        district: 'Indore',
        state: 'Madhya Pradesh',
      }),
    });
    const data: any = await res.json();
    return res.status === 201 && data.success === true && !!data.token && data.farmer.name === 'Suresh Patel';
  });

  await assert('POST /api/auth/login authenticates with valid credentials and returns JWT', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        password: 'password123',
      }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true && !!data.token;
  });

  console.log(`\n====================================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`====================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
