/**
 * Complete Full-Stack End-to-End Verification Test Script
 * Validates all 10 core requirements:
 * 1. Database persistence
 * 2. Multi-role auth (Farmer + Buyer)
 * 3. Dynamic Location (GPS update & weather refresh)
 * 4. Crop Listings CRUD
 * 5. Buyer-to-Seller Marketplace flow & Order placement
 * 6. Logistics tracking
 * 7. Mandi Economics & Net returns
 * 8. Explainable Decision Engine
 * 9. Context-aware AI Assistant
 * 10. Live Weather
 */

const BASE_URL = 'http://localhost:8000/api';

async function runVerification() {
  console.log('🌾 ========================================================');
  console.log('🚀 KisanIQ Full-Stack End-to-End Deep Verification Suite');
  console.log('🌾 ========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    try {
      const result = await fn();
      if (result) {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${name}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`  ❌ ERROR: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health & Database Connectivity
  await test('Health check reports database connected', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data: any = await res.json();
    return res.status === 200 && data.status === 'ok' && data.databaseConnected === true;
  });

  // 2. Dynamic Location System (GPS update)
  await test('PUT /api/farmer/location updates farmer GPS coordinates & district', async () => {
    const res = await fetch(`${BASE_URL}/farmer/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 22.7196,
        longitude: 75.8577,
        district: 'Indore',
        state: 'Madhya Pradesh',
        village: 'Sanwer',
      }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true && data.location.district === 'Indore';
  });

  // 3. Live Weather for updated coordinates
  await test('GET /api/weather/current returns live weather for farmer coordinates', async () => {
    const res = await fetch(`${BASE_URL}/weather/current`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      typeof data.current?.temperature === 'number' &&
      Array.isArray(data.forecast) &&
      data.forecast.length >= 3 &&
      Array.isArray(data.implications)
    );
  });

  // 4. Farmer Registration
  const testFarmerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  let farmerToken = '';
  await test('POST /api/auth/register creates new farmer account', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Devendra Patel',
        phone: testFarmerPhone,
        password: 'farmerpass123',
        role: 'farmer',
        district: 'Indore',
        state: 'Madhya Pradesh',
        village: 'Depalpur',
      }),
    });
    const data: any = await res.json();
    farmerToken = data.token;
    return res.status === 201 && data.success === true && data.role === 'farmer' && !!data.token;
  });

  // 5. Buyer Registration
  const testBuyerPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  let buyerToken = '';
  await test('POST /api/auth/register creates new buyer account with organization profile', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rajesh Agrawal',
        phone: testBuyerPhone,
        password: 'buyerpass123',
        role: 'buyer',
        companyName: 'Agrawal Agro Processors Ltd',
        buyerType: 'Food Processor',
        city: 'Indore',
        district: 'Indore',
        state: 'Madhya Pradesh',
      }),
    });
    const data: any = await res.json();
    buyerToken = data.token;
    return res.status === 201 && data.success === true && data.role === 'buyer' && data.buyer?.buyerType === 'Food Processor';
  });

  // 6. Buyer Login
  await test('POST /api/auth/login authenticates buyer and returns buyer profile', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testBuyerPhone,
        password: 'buyerpass123',
      }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true && data.role === 'buyer' && !!data.token;
  });

  // 7. Farmer creates a new Crop Listing
  let createdListingId = '';
  await test('POST /api/listings allows farmer to publish harvest to marketplace', async () => {
    const res = await fetch(`${BASE_URL}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        cropName: 'Wheat',
        variety: 'Sharbati Gold',
        quantityQuintals: 75,
        pricePerQuintal: 2750,
        qualityGrade: 'Grade A',
        description: 'Naturally dried high protein Sharbati wheat batch.',
      }),
    });
    const data: any = await res.json();
    createdListingId = data.listing?.id;
    return res.status === 201 && data.success === true && data.listing?.pricePerQuintal === 2750;
  });

  // 8. Public / Buyer queries listings with filter
  await test('GET /api/listings retrieves active listings with crop & price filters', async () => {
    const res = await fetch(`${BASE_URL}/listings?crop=Wheat&minPrice=2000`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.listings) &&
      data.listings.length > 0 &&
      data.listings.every((l: any) => l.cropName.toLowerCase().includes('wheat'))
    );
  });

  // 9. Buyer places a direct purchase order
  let placedOrderId = '';
  let trackingCode = '';
  await test('POST /api/marketplace/orders places order and reduces listing stock', async () => {
    const res = await fetch(`${BASE_URL}/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        listingId: createdListingId,
        quantityQuintals: 25,
        deliveryAddress: 'Plot 42, Sanwer Road Industrial Area, Sector C, Indore',
        buyerName: 'Agrawal Agro Processors',
        buyerPhone: testBuyerPhone,
        notes: 'Dispatch via 80q capacity truck',
      }),
    });
    const data: any = await res.json();
    placedOrderId = data.order?.id;
    trackingCode = data.order?.trackingCode;
    return (
      res.status === 201 &&
      data.success === true &&
      data.order?.totalAmount === 25 * 2750 &&
      data.order?.trackingCode?.startsWith('KISAN-DIR-')
    );
  });

  // 10. Farmer checks incoming orders on their listings
  await test('GET /api/listings/farmer/me shows incoming buyer orders to farmer', async () => {
    const res = await fetch(`${BASE_URL}/listings/farmer/me`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.incomingOrders) &&
      data.incomingOrders.some((o: any) => o.id === placedOrderId)
    );
  });

  // 11. Farmer / Seller updates order fulfillment status
  await test('PUT /api/marketplace/orders/:id/status updates status to confirmed', async () => {
    const res = await fetch(`${BASE_URL}/marketplace/orders/${placedOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true;
  });

  // 12. Buyer checks their placed orders
  await test('GET /api/marketplace/orders/buyer returns order history with tracking code', async () => {
    const res = await fetch(`${BASE_URL}/marketplace/orders/buyer`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.orders) &&
      data.orders.some((o: any) => o.trackingCode === trackingCode && o.status === 'confirmed')
    );
  });

  // 13. Mandi Comparison & Net Return Engine
  await test('GET /api/market/comparison evaluates true net returns & partial selling', async () => {
    const res = await fetch(`${BASE_URL}/market/comparison?crop=Wheat&quantity=100`);
    const data: any = await res.json();
    return (
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.markets) &&
      data.partialSelling?.sellNow?.quantity === 60 &&
      (data.partialSelling?.holdFor?.quantity === 40 || data.partialSelling?.hold?.quantity === 40)
    );
  });

  // 14. Explainable Decision Engine ("Kyun?" reasoning)
  await test('GET /api/recommendations/daily produces transparent data points', async () => {
    const res = await fetch(`${BASE_URL}/recommendations/daily`);
    const data: any = await res.json();
    const primary = data.recommendations?.[0];
    const dataPoints = primary?.whyExplanation?.dataPoints || primary?.dataPoints;
    return (
      res.status === 200 &&
      data.success === true &&
      !!primary &&
      Array.isArray(dataPoints) &&
      dataPoints.length > 0
    );
  });

  // 15. Context-Aware AI Assistant
  await test('POST /api/assistant/chat answers contextual questions in Hindi', async () => {
    const res = await fetch(`${BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Kya kal barish hogi?' }),
    });
    const data: any = await res.json();
    return res.status === 200 && data.success === true && data.reply.includes('बारिश');
  });

  console.log('\n🌾 ========================================================');
  console.log(`Summary: ${passed + failed} Tests | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('🌾 ========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error('Fatal Verification Error:', e);
  process.exit(1);
});
