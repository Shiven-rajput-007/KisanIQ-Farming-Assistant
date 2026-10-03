const API_BASE = 'http://localhost:8000/api';

async function runApiSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING KISANIQ END-TO-END API & DB TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail || '');
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST A: Real Farmer Registration & Profile Verification
    // -------------------------------------------------------------
    console.log('--- TEST A: Farmer Registration, Auth & Crops ---');
    const farmerPhone = `98930${Math.floor(10000 + Math.random() * 90000)}`;
    const regFarmerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Devendra Patel',
        phone: farmerPhone,
        email: `devendra_${farmerPhone}@example.com`,
        password: 'securefarmer123',
        confirmPassword: 'securefarmer123',
        role: 'farmer',
        address: 'Village Morar, Near Old Bridge',
        village: 'Morar',
        district: 'Gwalior',
        state: 'Madhya Pradesh',
        farmSize: 6.5,
        soilType: 'alluvial',
        irrigationSource: 'borewell',
        mainCrop: 'Wheat',
        latitude: 26.2183,
        longitude: 78.1828,
      }),
    });

    const regFarmerData: any = await regFarmerRes.json();
    assert(regFarmerRes.status === 201 && regFarmerData.success === true, 'Farmer registered with HTTP 201', regFarmerData);
    assert(!!regFarmerData.token, 'Registration returns valid JWT token');
    assert(regFarmerData.farmer?.name === 'Devendra Patel', 'Registered farmer name matches');

    // Test Farmer Login
    const loginFarmerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: farmerPhone, password: 'securefarmer123' }),
    });
    const loginFarmerData: any = await loginFarmerRes.json();
    assert(loginFarmerRes.status === 200 && !!loginFarmerData.token, 'Farmer can login with phone & password');
    const farmerToken = loginFarmerData.token;

    // Verify Session /auth/me
    const meFarmerRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const meFarmerData: any = await meFarmerRes.json();
    assert(meFarmerRes.status === 200 && meFarmerData.farmer?.name === 'Devendra Patel', 'Session /auth/me returns persisted farmer details');
    assert(meFarmerData.farmer?.location?.district === 'Gwalior', 'Farmer location persisted in database');

    // Test Dashboard for New Farmer (No Demo Ramesh!)
    const dashRes = await fetch(`${API_BASE}/dashboard?lat=26.2183&lon=78.1828`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const dashData: any = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success === true, 'Dashboard returns HTTP 200 for farmer');
    assert(dashData.farmer?.name === 'Devendra Patel', `Dashboard identifies logged-in farmer as "Devendra Patel" (Got: ${dashData.farmer?.name})`);

    // Add a Crop for Farmer
    const addCropRes = await fetch(`${API_BASE}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Mustard',
        variety: 'Pusa Bold',
        area: 2.5,
        sowingDate: '2025-10-15',
      }),
    });
    const addCropData: any = await addCropRes.json();
    assert(addCropRes.status === 201 && addCropData.success === true, 'Farmer can add a new crop');

    // Query crops list
    const getCropsRes = await fetch(`${API_BASE}/crops`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const getCropsData: any = await getCropsRes.json();
    assert(getCropsRes.status === 200 && getCropsData.crops.some((c: any) => c.name === 'Mustard'), 'New crop persisted in database and returned in /crops');

    // -------------------------------------------------------------
    // TEST B: Buyer Registration, Marketplace & Direct Trade Flow
    // -------------------------------------------------------------
    console.log('\n--- TEST B: Buyer Registration & Direct Trade Flow ---');
    const buyerPhone = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const regBuyerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vikram Sharma',
        companyName: 'Malwa Agro Trading Corp',
        buyerType: 'Food Processor',
        phone: buyerPhone,
        email: `vikram_${buyerPhone}@malwaagro.com`,
        password: 'securebuyer123',
        confirmPassword: 'securebuyer123',
        role: 'buyer',
        address: 'Sector 3, Sanwer Road Industrial Area',
        city: 'Indore',
        district: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452015',
        latitude: 22.7196,
        longitude: 75.8577,
        purchaseInterests: 'Wheat, Mustard, Soybean',
      }),
    });

    const regBuyerData: any = await regBuyerRes.json();
    assert(regBuyerRes.status === 201 && regBuyerData.success === true, 'Buyer registered with HTTP 201', regBuyerData);
    assert(regBuyerData.role === 'buyer', 'Buyer role returned correctly');

    // Buyer Login
    const loginBuyerRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: buyerPhone, password: 'securebuyer123' }),
    });
    const loginBuyerData: any = await loginBuyerRes.json();
    assert(loginBuyerRes.status === 200 && loginBuyerData.role === 'buyer', 'Buyer logged in successfully');
    const buyerToken = loginBuyerData.token;

    // Buyer /auth/me
    const meBuyerRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const meBuyerData: any = await meBuyerRes.json();
    assert(meBuyerRes.status === 200 && meBuyerData.user?.role === 'buyer', 'Buyer session authenticated with persisted role');

    // Farmer creates a marketplace crop listing
    const createListingRes = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        cropName: 'Wheat',
        variety: 'Sharbati HD-2967',
        quantityQuintals: 40,
        pricePerQuintal: 2650,
        qualityGrade: 'Grade A',
        description: 'Naturally dried golden wheat from Chambal basin, moisture 11%',
      }),
    });
    const createListingData: any = await createListingRes.json();
    assert(createListingRes.status === 201 && createListingData.success === true, 'Farmer created direct marketplace listing');
    const listingId = createListingData.listing?.id;

    // Buyer browses marketplace
    const getListingsRes = await fetch(`${API_BASE}/listings`);
    const getListingsData: any = await getListingsRes.json();
    assert(getListingsRes.status === 200 && Array.isArray(getListingsData.listings), 'Buyer can browse public crop listings');
    const foundListing = getListingsData.listings.find((l: any) => l.id === listingId);
    assert(!!foundListing && foundListing.pricePerQuintal === 2650, 'Newly published listing visible in marketplace');

    // Buyer places an order for 25 quintals
    const placeOrderRes = await fetch(`${API_BASE}/marketplace/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({
        listingId,
        quantityQuintals: 25,
        deliveryAddress: 'Malwa Agro Mill, Plot 44, Sanwer Road Industrial Area, Indore',
        buyerName: 'Vikram Sharma',
        buyerPhone,
      }),
    });
    const placeOrderData: any = await placeOrderRes.json();
    assert(placeOrderRes.status === 201 && placeOrderData.success === true, 'Buyer placed order for 25 quintals');
    const orderId = placeOrderData.order?.id;
    assert(!!placeOrderData.order?.trackingCode, 'Order generated farm-gate transport tracking code');

    // Buyer views their orders
    const getBuyerOrdersRes = await fetch(`${API_BASE}/marketplace/orders/buyer`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const getBuyerOrdersData: any = await getBuyerOrdersRes.json();
    assert(getBuyerOrdersRes.status === 200 && getBuyerOrdersData.orders.some((o: any) => o.id === orderId), 'Order persisted and returned in buyer orders list');

    // Farmer views incoming orders and updates status to 'confirmed'
    const updateOrderRes = await fetch(`${API_BASE}/marketplace/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    const updateOrderData: any = await updateOrderRes.json();
    assert(updateOrderRes.status === 200 && updateOrderData.success === true, 'Farmer accepted order; status updated to "confirmed"');

    // -------------------------------------------------------------
    // TEST C & D: Location & Geodesic Distance / Mandi Ranking
    // -------------------------------------------------------------
    console.log('\n--- TEST C & D: Coordinates, Distance & Mandi Rankings ---');

    // 1. From Gwalior (26.2183, 78.1828)
    const gwaliorMandiRes = await fetch(`${API_BASE}/market/comparison?crop=Wheat&quantity=100&lat=26.2183&lon=78.1828&district=Gwalior&state=Madhya+Pradesh`);
    const gwaliorMandiData: any = await gwaliorMandiRes.json();
    assert(gwaliorMandiRes.status === 200 && gwaliorMandiData.success === true, 'Fetched Mandi comparison from Gwalior');
    const topGwaliorMarket = gwaliorMandiData.markets[0];
    assert(topGwaliorMarket.name.includes('Morar') || topGwaliorMarket.district === 'Gwalior', `Top market from Gwalior is local Morar Mandi (Got: ${topGwaliorMarket.name}, Distance: ${topGwaliorMarket.distance} km)`);
    assert(topGwaliorMarket.distance < 20, `Gwalior distance is geodesic local (${topGwaliorMarket.distance} km)`);

    // 2. From Indore (22.7196, 75.8577)
    const indoreMandiRes = await fetch(`${API_BASE}/market/comparison?crop=Wheat&quantity=100&lat=22.7196&lon=75.8577&district=Indore&state=Madhya+Pradesh`);
    const indoreMandiData: any = await indoreMandiRes.json();
    assert(indoreMandiRes.status === 200 && indoreMandiData.success === true, 'Fetched Mandi comparison from Indore');
    const topIndoreMarket = indoreMandiData.markets[0];
    assert(topIndoreMarket.name.includes('Laxmibai') || topIndoreMarket.district === 'Indore', `Top market from Indore is Laxmibai Nagar Mandi (Got: ${topIndoreMarket.name}, Distance: ${topIndoreMarket.distance} km)`);
    assert(topIndoreMarket.distance < 20, `Indore distance is geodesic local (${topIndoreMarket.distance} km)`);

    // 3. From Bhopal (23.2599, 77.4126)
    const bhopalMandiRes = await fetch(`${API_BASE}/market/comparison?crop=Wheat&quantity=100&lat=23.2599&lon=77.4126&district=Bhopal&state=Madhya+Pradesh`);
    const bhopalMandiData: any = await bhopalMandiRes.json();
    const topBhopalMarket = bhopalMandiData.markets[0];
    assert(topBhopalMarket.name.includes('Karond') || topBhopalMarket.district === 'Bhopal', `Top market from Bhopal is Karond Mandi (Got: ${topBhopalMarket.name}, Distance: ${topBhopalMarket.distance} km)`);

    // Dynamic Weather for Gwalior vs Indore
    const weatherGwaliorRes = await fetch(`${API_BASE}/weather/current?lat=26.2183&lon=78.1828`);
    const weatherGwaliorData: any = await weatherGwaliorRes.json();
    assert(weatherGwaliorRes.status === 200 && weatherGwaliorData.success === true, 'Weather returned for Gwalior coordinates');

    const weatherIndoreRes = await fetch(`${API_BASE}/weather/current?lat=22.7196&lon=75.8577`);
    const weatherIndoreData: any = await weatherIndoreRes.json();
    assert(weatherIndoreRes.status === 200 && weatherIndoreData.success === true, 'Weather returned for Indore coordinates');

    // -------------------------------------------------------------
    // TEST F: Mandi Benchmark & Real Economics
    // -------------------------------------------------------------
    console.log('\n--- TEST F: Agmarknet APMC Verification & Real Economics ---');
    assert(!!gwaliorMandiData.apiStatus, 'Market comparison returns Agmarknet API status');
    assert(topGwaliorMarket.netReturn > 0, `Market computes realistic net return (₹${topGwaliorMarket.netReturn})`);
    assert(topGwaliorMarket.transportCost > 0, `Market computes realistic freight cost (₹${topGwaliorMarket.transportCost})`);
    assert(topGwaliorMarket.price > 0, `Market provides Agmarknet modal price (₹${topGwaliorMarket.price}/q)`);

    console.log('\n====================================================');
    console.log(`📊 API TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}

runApiSuite();
