import bcrypt from 'bcryptjs';
import { db, runMigrations } from './index.js';

export async function seedDatabase() {
  await runMigrations();

  // Check if already seeded
  const existingUsers = await db.query('SELECT COUNT(*) as count FROM users');
  const count = parseInt(existingUsers.rows[0]?.count || '0', 10);
  if (count > 0) {
    console.log('[Seed] Database already populated, ensuring marketplace, APMC mandi, and soil lab seed...');
    await seedMandiData();
    await seedMarketplaceData();
    await seedSoilData();
    return;
  }

  console.log('[Seed] Seeding initial KisanIQ database records...');

  const passwordHash = await bcrypt.hash('kisan123', 10);
  const userId = 'user_ramesh';
  const farmerId = 'farmer_ramesh';
  const farmId = 'farm_ramesh_1';
  const cropId = 'crop_wheat_1';

  // 1. Insert User
  await db.query(
    `INSERT INTO users (id, phone, password_hash, name, role) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, '9876543210', passwordHash, 'Ramesh Kumar', 'farmer']
  );

  // 2. Insert Farmer
  await db.query(
    `INSERT INTO farmers (id, user_id, name, phone, village, district, state, pincode, latitude, longitude, preferred_language, profile_complete)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      farmerId,
      userId,
      'Ramesh',
      '9876543210',
      'Morar',
      'Gwalior',
      'Madhya Pradesh',
      '474006',
      26.2183,
      78.1828,
      'hi',
      true,
    ]
  );

  // 3. Insert Farm
  await db.query(
    `INSERT INTO farms (id, farmer_id, total_area, soil_type, irrigation_source)
     VALUES ($1, $2, $3, $4, $5)`,
    [farmId, farmerId, 5.0, 'alluvial', 'borewell']
  );

  // 4. Insert Fields
  await db.query(
    `INSERT INTO fields (id, farm_id, name, area, soil_type, irrigation_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['field_1', farmId, 'Main Field (North)', 3.0, 'alluvial', 'borewell']
  );
  await db.query(
    `INSERT INTO fields (id, farm_id, name, area, soil_type, irrigation_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['field_2', farmId, 'Side Field (South)', 2.0, 'alluvial', 'canal']
  );

  // 5. Insert Primary Crop (Wheat HD-2967)
  const sowingDate = new Date();
  sowingDate.setDate(sowingDate.getDate() - 85); // 85 days old
  const harvestDate = new Date();
  harvestDate.setDate(harvestDate.getDate() + 35); // Expected in 35 days

  await db.query(
    `INSERT INTO crops (
      id, farmer_id, field_id, name, name_key, variety, 
      sowing_date, expected_harvest_date, current_stage, days_old,
      health_overall, health_weather_risk, health_disease_risk, health_water_status,
      area, expected_yield, icon
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      cropId,
      farmerId,
      'field_1',
      'Wheat',
      'wheat',
      'HD-2967',
      sowingDate.toISOString().split('T')[0],
      harvestDate.toISOString().split('T')[0],
      'flowering',
      85,
      'low',
      'low',
      'medium',
      'low',
      5.0,
      100.0,
      '🌾',
    ]
  );

  // 6. Insert Crop Stages
  const stages = [
    { stage: 'land_preparation', name_key: 'land_preparation', completed: true, active: false, seq: 1 },
    { stage: 'sowing', name_key: 'sowing', completed: true, active: false, seq: 2 },
    { stage: 'germination', name_key: 'germination', completed: true, active: false, seq: 3 },
    { stage: 'vegetative', name_key: 'vegetative', completed: true, active: false, seq: 4 },
    { stage: 'flowering', name_key: 'flowering', completed: false, active: true, seq: 5 },
    { stage: 'grain_filling', name_key: 'grain_filling', completed: false, active: false, seq: 6 },
    { stage: 'harvest', name_key: 'harvest', completed: false, active: false, seq: 7 },
  ];

  for (const s of stages) {
    await db.query(
      `INSERT INTO crop_stages (id, crop_id, stage, name_key, completed, active, sequence_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [`stage_${cropId}_${s.seq}`, cropId, s.stage, s.name_key, s.completed, s.active, s.seq]
    );
  }

  // 7. Insert Crop Actions
  await db.query(
    `INSERT INTO crop_actions (id, crop_id, action_type, title_key, description_key, priority, icon, completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['ca_1', cropId, 'irrigation', 'Water', 'No irrigation needed today. Rain expected tomorrow.', 'high', '💧', false]
  );
  await db.query(
    `INSERT INTO crop_actions (id, crop_id, action_type, title_key, description_key, priority, icon, completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['ca_2', cropId, 'inspection', 'Health', 'Check leaves for yellow rust spots due to high humidity.', 'medium', '🐛', false]
  );
  await db.query(
    `INSERT INTO crop_actions (id, crop_id, action_type, title_key, description_key, priority, icon, completed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['ca_3', cropId, 'general', 'Weather', 'Heavy rain expected tomorrow afternoon.', 'low', '🌦️', false]
  );

  // 8. Insert Real APMC Mandis & Market Prices
  await seedMandiData();

  // 9. Insert Initial Recommendations & Why
  const whyDataPoints = JSON.stringify([
    { icon: '🌧️', labelKey: 'Rain probability', value: 80, unit: '%' },
    { icon: '🌧️', labelKey: 'Expected rainfall', value: 18, unit: 'mm' },
    { icon: '🌾', labelKey: 'Crop', value: 'Wheat' },
    { icon: '💧', labelKey: 'Last irrigation', value: '2 days ago' },
  ]);

  await db.query(
    `INSERT INTO recommendations (
      id, farmer_id, action_code, category, icon, title_key, description_key,
      status, priority, risk_level, timing, why_summary, why_conclusion, data_points, advanced_details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      'rec_1',
      farmerId,
      'NO_IRRIGATION',
      'irrigation',
      '💧',
      'no_irrigation',
      'Rain is expected tomorrow (80% probability, ~18mm). Your wheat crop currently has adequate soil moisture.',
      'recommended',
      1,
      'low',
      'today',
      'Why skip irrigation today?',
      'Rain is expected and current water requirement is low. Postponing irrigation will prevent root rot and save diesel/electricity costs.',
      whyDataPoints,
      'Calculated via Open-Meteo precipitation forecast + FAO-56 evapotranspiration moisture deficit model.',
    ]
  );

  await db.query(
    `INSERT INTO recommendations (
      id, farmer_id, action_code, category, icon, title_key, description_key,
      status, priority, risk_level, timing
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      'rec_2',
      farmerId,
      'INSPECT_CROP',
      'crop_health',
      '🐛',
      'inspect_crop',
      'Humidity is reaching 68%. Check wheat leaves for initial symptoms of yellow/brown rust.',
      'consider',
      2,
      'medium',
      'today',
    ]
  );

  await db.query(
    `INSERT INTO recommendations (
      id, farmer_id, action_code, category, icon, title_key, description_key,
      status, priority, risk_level, timing
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      'rec_3',
      farmerId,
      'COMPARE_MARKETS',
      'market',
      '💰',
      'compare_markets',
      'Wheat price at Lashkar Mandi is currently favorable (₹2,500/q). Compare net returns and schedule transport.',
      'consider',
      3,
      'low',
      'today',
    ]
  );

  // 10. Insert Alerts
  await db.query(
    `INSERT INTO alerts (id, farmer_id, severity, title_key, description_key, action_key, icon)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      'alert_1',
      farmerId,
      'medium',
      'Heavy Rain Warning',
      'Heavy rain expected tomorrow afternoon (~18mm). Inspect drainage channels in field 1.',
      'details',
      '⚠️',
    ]
  );

  // 11. Insert Notifications
  await db.query(
    `INSERT INTO notifications (id, farmer_id, type, severity, title_key, description_key, icon, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['notif_1', farmerId, 'weather', 'warning', 'Rain Expected Tomorrow', '80% chance of rain (~18mm) in Gwalior region.', '🌧️', false]
  );
  await db.query(
    `INSERT INTO notifications (id, farmer_id, type, severity, title_key, description_key, icon, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['notif_2', farmerId, 'market', 'info', 'Wheat Price Update', 'Lashkar Mandi wheat price increased by ₹50 to ₹2,500/q.', '💰', false]
  );
  await db.query(
    `INSERT INTO notifications (id, farmer_id, type, severity, title_key, description_key, icon, read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    ['notif_3', farmerId, 'crop', 'info', 'Flowering Stage Milestone', 'Your crop has entered day 85 (flowering phase).', '🌾', true]
  );

  // 12. Insert Logistics: Vehicle & Sample Order
  await seedMandiData();

  await db.query(
    `INSERT INTO vehicles (id, vehicle_number, vehicle_type, capacity_quintals, driver_name, driver_phone, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ['veh_1', 'MP07-AA-4589', 'Tractor-Trolley', 80.0, 'Mohan Singh', '9826123456', 'available']
  );

  await db.query(
    `INSERT INTO orders (id, farmer_id, market_id, crop_name, quantity_quintals, agreed_price_per_quintal, total_expected_return, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    ['ord_1', farmerId, 'm1', 'Wheat', 60.0, 2500.0, 142800.0, 'confirmed', 'Partial sell order executed via KisanIQ Smart Sell']
  );

  await db.query(
    `INSERT INTO shipments (id, order_id, vehicle_id, pickup_location, destination_mandi, status, tracking_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ['ship_1', 'ord_1', 'veh_1', 'Morar Farm, Gwalior', 'Mandi A (Lashkar)', 'scheduled', 'KISAN-TRK-8821']
  );

  console.log('[Seed] Database successfully seeded with real agricultural records!');
  await seedMarketplaceData();
  await seedSoilData();
}

export async function seedMarketplaceData() {
  await runMigrations();

  // Check if buyer exists
  const buyerUser = await db.query('SELECT id FROM users WHERE id = $1', ['user_buyer_vikram']);
  if (buyerUser.rows.length === 0) {
    const buyerPass = await bcrypt.hash('buyer123', 10);
    await db.query(
      `INSERT INTO users (id, phone, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
      ['user_buyer_vikram', '9123456780', buyerPass, 'Vikram Agro Traders', 'buyer']
    );
    await db.query(
      `INSERT INTO buyer_profiles (id, user_id, company_name, buyer_type, gstin, address, city, district, state, pincode, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'bp_vikram_1',
        'user_buyer_vikram',
        'Vikram Agro Trading & Processing Ltd',
        'Wholesaler',
        '23AAACV1234F1Z8',
        'Sanwer Road Industrial Area, Sector 3',
        'Indore',
        'Indore',
        'Madhya Pradesh',
        '452015',
        '9123456780',
      ]
    );
  }

  // Check if crop_listings exist
  const existingListings = await db.query('SELECT COUNT(*) as count FROM crop_listings');
  if (parseInt(existingListings.rows[0]?.count || '0', 10) === 0) {
    const listings = [
      {
        id: 'list_1',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Wheat',
        variety: 'Sharbati HD-2967',
        quantity: 50.0,
        price: 2600.0,
        grade: 'Grade A',
        location: 'Morar, Gwalior (MP)',
        description: 'Naturally sun-dried premium Sharbati wheat, high protein content, zero foreign matter.',
      },
      {
        id: 'list_2',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Mustard',
        variety: 'Pusa Bold',
        quantity: 35.0,
        price: 5450.0,
        grade: 'Grade A',
        location: 'Morar, Gwalior (MP)',
        description: 'High oil content (42%+) dark mustard seeds, freshly harvested and moisture tested.',
      },
      {
        id: 'list_3',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Soybean',
        variety: 'JS-2034',
        quantity: 40.0,
        price: 4800.0,
        grade: 'Grade B',
        location: 'Dabra, Gwalior (MP)',
        description: 'Clean uniform grain, 10% moisture level, ideal for oil mills and food processing.',
      },
      {
        id: 'list_4',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Basmati Rice',
        variety: 'Pusa 1121',
        quantity: 80.0,
        price: 3950.0,
        grade: 'Grade A (Aromatic)',
        location: 'Gohad, Bhind (MP)',
        description: 'Extra-long slender grain, premium traditional aroma, machine cleaned and bagged in 50kg sacks.',
      },
      {
        id: 'list_5',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Potato',
        variety: 'Kufri Jyoti',
        quantity: 120.0,
        price: 1350.0,
        grade: 'Grade A',
        location: 'Shivpuri (MP)',
        description: 'Medium-to-large table potatoes, fresh from cold storage, clean skin and no sprouting.',
      },
      {
        id: 'list_6',
        farmer_id: 'farmer_ramesh',
        crop_name: 'Wheat',
        variety: 'PBW-502',
        quantity: 65.0,
        price: 2550.0,
        grade: 'Grade A',
        location: 'Chaubepur, Kanpur (UP)',
        description: 'Golden clean PBW-502 wheat grains directly from Kanpur agricultural cluster.',
      },
    ];

    for (const l of listings) {
      await db.query(
        `INSERT INTO crop_listings (id, farmer_id, crop_name, variety, quantity_quintals, price_per_quintal, quality_grade, location, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
        [l.id, l.farmer_id, l.crop_name, l.variety, l.quantity, l.price, l.grade, l.location, l.description]
      );
    }

    // Seed sample marketplace order
    await db.query(
      `INSERT INTO marketplace_orders (id, listing_id, buyer_id, farmer_id, crop_name, quantity_quintals, price_per_quintal, total_amount, delivery_address, buyer_name, buyer_phone, status, tracking_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        'mord_1',
        'list_1',
        'user_buyer_vikram',
        'farmer_ramesh',
        'Wheat',
        20.0,
        2600.0,
        52000.0,
        'Godown 4, Sanwer Road Industrial Area, Indore, MP - 452015',
        'Vikram Agro Trading',
        '9123456780',
        'confirmed',
        'KISAN-DIR-7742',
        'Direct procurement contract via KisanIQ Marketplace',
      ]
    );
  }

  // Ensure Kanpur listing is always present for buyer searches
  await db.query(
    `INSERT INTO crop_listings (id, farmer_id, crop_name, variety, quantity_quintals, price_per_quintal, quality_grade, location, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
     ON CONFLICT (id) DO NOTHING`,
    ['list_6', 'farmer_ramesh', 'Wheat', 'PBW-502', 65.0, 2550.0, 'Grade A', 'Chaubepur, Kanpur (UP)', 'Golden clean PBW-502 wheat grains directly from Kanpur agricultural cluster.']
  );
}

export async function seedMandiData() {
  console.log('[Seed] Seeding verified APMC Mandis across Indian districts...');
  
  // Safely upgrade legacy mandis with real APMC data
  await db.query(`UPDATE markets SET name = 'Krishi Upaj Mandi Samiti, Lashkar', location = 'Lashkar, Gwalior, MP', state = 'Madhya Pradesh', district = 'Gwalior', latitude = 26.2045, longitude = 78.1582 WHERE id = 'm1'`);
  await db.query(`UPDATE markets SET name = 'Krishi Upaj Mandi, Morar', location = 'Morar, Gwalior, MP', state = 'Madhya Pradesh', district = 'Gwalior', latitude = 26.2312, longitude = 78.2251 WHERE id = 'm2'`);
  await db.query(`UPDATE markets SET name = 'Krishi Upaj Mandi Samiti, Dabra', location = 'Dabra, Gwalior/Datia, MP', state = 'Madhya Pradesh', district = 'Gwalior', latitude = 25.8897, longitude = 78.3328 WHERE id = 'm3'`);
  await db.query(`UPDATE markets SET name = 'Village Aggregation Yard, Morar', location = 'Morar Rural Gate, Gwalior, MP', state = 'Madhya Pradesh', district = 'Gwalior', latitude = 26.2183, longitude = 78.2300 WHERE id = 'm4'`);

  const mandis = [
    { id: 'm1', name: 'Krishi Upaj Mandi Samiti, Lashkar', location: 'Lashkar, Gwalior, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2045, lng: 78.1582, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm2', name: 'Krishi Upaj Mandi, Morar', location: 'Morar, Gwalior, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2312, lng: 78.2251, commission: 2.5, loading: 450, storage: 0, wastage: 1.2 },
    { id: 'm3', name: 'Krishi Upaj Mandi Samiti, Dabra', location: 'Dabra, Gwalior/Datia, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 25.8897, lng: 78.3328, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm4', name: 'Village Aggregation Yard, Morar', location: 'Morar Rural Gate, Gwalior, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2183, lng: 78.2300, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_gwl_lashkar', name: 'Krishi Upaj Mandi Samiti, Lashkar', location: 'Lashkar, Gwalior, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2045, lng: 78.1582, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_gwl_morar', name: 'Krishi Upaj Mandi, Morar', location: 'Morar, Gwalior, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 26.2312, lng: 78.2251, commission: 2.5, loading: 450, storage: 0, wastage: 1.2 },
    { id: 'm_gwl_dabra', name: 'Krishi Upaj Mandi Samiti, Dabra', location: 'Dabra, Gwalior/Datia, MP', state: 'Madhya Pradesh', district: 'Gwalior', lat: 25.8897, lng: 78.3328, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_ind_laxmibai', name: 'Krishi Upaj Mandi Samiti, Laxmibai Nagar', location: 'Laxmibai Nagar, Indore, MP', state: 'Madhya Pradesh', district: 'Indore', lat: 22.7533, lng: 75.8612, commission: 2.0, loading: 500, storage: 0, wastage: 1.0 },
    { id: 'm_ind_chhavani', name: 'APMC Mandi Yard, Chhavani', location: 'Chhavani, Indore, MP', state: 'Madhya Pradesh', district: 'Indore', lat: 22.7121, lng: 75.8755, commission: 2.2, loading: 450, storage: 0, wastage: 1.0 },
    { id: 'm_bho_karond', name: 'Krishi Upaj Mandi, Karond', location: 'Karond, Bhopal, MP', state: 'Madhya Pradesh', district: 'Bhopal', lat: 23.3012, lng: 77.4089, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_ujj_chimanganj', name: 'Krishi Upaj Mandi Samiti, Chimanganj', location: 'Chimanganj, Ujjain, MP', state: 'Madhya Pradesh', district: 'Ujjain', lat: 23.1956, lng: 75.8012, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_kar_grain', name: 'New Grain Market APMC', location: 'GT Road, Karnal, Haryana', state: 'Haryana', district: 'Karnal', lat: 29.6923, lng: 76.9856, commission: 2.0, loading: 500, storage: 0, wastage: 1.0 },
    { id: 'm_lud_gill', name: 'Grain Market APMC, Gill Road', location: 'Gill Road, Ludhiana, Punjab', state: 'Punjab', district: 'Ludhiana', lat: 30.8845, lng: 75.8621, commission: 2.0, loading: 500, storage: 0, wastage: 1.0 },
    { id: 'm_nas_lasalgaon', name: 'APMC Lasalgaon Market Yard', location: 'Lasalgaon, Nashik, Maharashtra', state: 'Maharashtra', district: 'Nashik', lat: 20.1478, lng: 74.2289, commission: 2.5, loading: 500, storage: 0, wastage: 1.5 },
    { id: 'm_jai_surajpole', name: 'Krishi Upaj Mandi Samiti, Surajpole', location: 'Surajpole, Jaipur, Rajasthan', state: 'Rajasthan', district: 'Jaipur', lat: 26.9189, lng: 75.8456, commission: 2.0, loading: 450, storage: 0, wastage: 1.0 },
    { id: 'm_kot_bhamashah', name: 'Bhamashah Krishi Upaj Mandi', location: 'Anantpura, Kota, Rajasthan', state: 'Rajasthan', district: 'Kota', lat: 25.1689, lng: 75.8412, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
    { id: 'm_mor_mustard', name: 'Krishi Upaj Mandi Samiti, Morena', location: 'Station Road, Morena, MP', state: 'Madhya Pradesh', district: 'Morena', lat: 26.5012, lng: 77.9989, commission: 2.0, loading: 400, storage: 0, wastage: 1.0 },
  ];

  for (const m of mandis) {
    await db.query(
      `INSERT INTO markets (id, name, location, state, district, latitude, longitude, distance_km, commission_rate, loading_cost, storage_cost, expected_wastage, is_recommended, recommendation_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         location = EXCLUDED.location,
         state = EXCLUDED.state,
         district = EXCLUDED.district,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude`,
      [m.id, m.name, m.location, m.state, m.district, m.lat, m.lng, 15.0, m.commission, m.loading, m.storage, m.wastage, false, 1]
    );

    const commodityPrices = [
      { crop: 'Wheat', min: 2380, max: 2620, modal: 2520, trend: 'up', change: 2.5, demand: 'high' },
      { crop: 'Mustard', min: 5350, max: 5800, modal: 5620, trend: 'stable', change: 0.5, demand: 'high' },
      { crop: 'Soybean', min: 4600, max: 5050, modal: 4850, trend: 'up', change: 1.8, demand: 'medium' },
      { crop: 'Rice', min: 2800, max: 3400, modal: 3100, trend: 'stable', change: 0.0, demand: 'high' },
      { crop: 'Potato', min: 1100, max: 1550, modal: 1350, trend: 'down', change: -3.2, demand: 'medium' },
      { crop: 'Cotton', min: 6800, max: 7450, modal: 7200, trend: 'up', change: 1.5, demand: 'high' },
    ];

    for (const cp of commodityPrices) {
      await db.query(
        `INSERT INTO market_prices (id, market_id, crop_name, price_per_quintal, min_price, max_price, modal_price, price_change, price_trend, demand, source, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_DATE)
         ON CONFLICT (id) DO UPDATE SET
           price_per_quintal = EXCLUDED.price_per_quintal,
           min_price = EXCLUDED.min_price,
           max_price = EXCLUDED.max_price,
           modal_price = EXCLUDED.modal_price,
           source = EXCLUDED.source`,
        [
          `mp_${m.id}_${cp.crop.toLowerCase()}`,
          m.id,
          cp.crop,
          cp.modal,
          cp.min,
          cp.max,
          cp.modal,
          cp.change,
          cp.trend,
          cp.demand,
          'Government APMC Mandi Yard Daily Bulletin / Agmarknet',
        ]
      );
    }
  }
}

export async function seedSoilData() {
  console.log('[Seed] Seeding accredited soil testing laboratories and sample reports...');

  const labs = [
    {
      id: 'lab_pune',
      name: 'Mahadhan Agricultural Soil Testing Laboratory',
      address: 'Plot 14, Agriculture College Campus, Shivaji Nagar',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      phone: '020-25531234',
      email: 'pune.soillab@mahadhan.co.in',
      accreditation: 'NABL ISO/IEC 17025:2017 & ICAR Certified',
      turnaround: 4,
      tests: ['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture', 'Zinc', 'Boron', 'Iron'],
    },
    {
      id: 'lab_rahuri',
      name: 'MPKV Rahuri Krishi Vigyan Kendra Soil Testing Centre',
      address: 'Mahatma Phule Krishi Vidyapeeth, Rahuri',
      city: 'Rahuri',
      district: 'Ahmednagar',
      state: 'Maharashtra',
      pincode: '413722',
      phone: '02426-243210',
      email: 'kvkrahuri@mpkv.ac.in',
      accreditation: 'State Agriculture Dept / ICAR Approved Centre',
      turnaround: 5,
      tests: ['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture'],
    },
    {
      id: 'lab_nashik',
      name: 'Sahyadri Farmers Agri Quality & Testing Laboratory',
      address: 'Mohadi, Dindori Road, Nashik',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      pincode: '422004',
      phone: '0253-2678901',
      email: 'testing.lab@sahyadrifarms.com',
      accreditation: 'NABL Accredited Chemical & Biological Lab',
      turnaround: 3,
      tests: ['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture', 'Heavy Metals', 'Organic Residues'],
    },
    {
      id: 'lab_gwl',
      name: 'District Agriculture Soil Testing Laboratory',
      address: 'Mela Ground Road, Lashkar',
      city: 'Gwalior',
      district: 'Gwalior',
      state: 'Madhya Pradesh',
      pincode: '474006',
      phone: '0751-2451234',
      email: 'soillab.gwl@mp.gov.in',
      accreditation: 'Government Approved Soil Testing Laboratory',
      turnaround: 5,
      tests: ['pH', 'EC', 'OC', 'N', 'P', 'K'],
    },
  ];

  for (const lab of labs) {
    await db.query(
      `INSERT INTO laboratories (id, name, address, city, district, state, pincode, phone, email, accreditation, operating_status, turnaround_days, supported_tests, is_demo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, false)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         accreditation = EXCLUDED.accreditation,
         supported_tests = EXCLUDED.supported_tests`,
      [lab.id, lab.name, lab.address, lab.city, lab.district, lab.state, lab.pincode, lab.phone, lab.email, lab.accreditation, lab.turnaround, JSON.stringify(lab.tests)]
    );
  }

  // Seed sample requests and verified report for farmer_ramesh
  await db.query(
    `INSERT INTO soil_test_requests (
      id, farmer_id, farm_id, field_id, crop_name, lab_id, sample_id,
      sample_collection_date, test_types, testing_mode, status, tracking_notes, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'LAB_TEST', $10, $11, false)
    ON CONFLICT (id) DO NOTHING`,
    [
      'str_1',
      'farmer_ramesh',
      'farm_ramesh_1',
      'field_1',
      'Wheat',
      'lab_pune',
      'MH-SOIL-2026-8821',
      '2026-08-25',
      JSON.stringify(['pH', 'EC', 'OC', 'N', 'P', 'K', 'Moisture']),
      'COMPLETED',
      'प्रयोगशाळा चाचणी पूर्ण झाली असून अहवाल उपलब्ध आहे.',
    ]
  );

  await db.query(
    `INSERT INTO soil_test_requests (
      id, farmer_id, farm_id, field_id, crop_name, lab_id, sample_id,
      sample_collection_date, test_types, testing_mode, status, tracking_notes, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'LAB_TEST', $10, $11, false)
    ON CONFLICT (id) DO NOTHING`,
    [
      'str_2',
      'farmer_ramesh',
      'farm_ramesh_1',
      'field_2',
      'Soybean',
      'lab_nashik',
      'MH-SOIL-2026-9402',
      '2026-09-02',
      JSON.stringify(['pH', 'EC', 'OC', 'N', 'P', 'K']),
      'TESTING',
      'नमुना प्रयोगशाळेत पोहोचला आहे. मातीचे परीक्षण सुरू आहे.',
    ]
  );

  await db.query(
    `INSERT INTO soil_reports (
      id, request_id, farmer_id, field_id, lab_id, test_date, crop_name,
      ph, ec, organic_carbon, nitrogen_kg_ha, phosphorus_kg_ha, potassium_kg_ha,
      moisture_pct, overall_health, deficiencies, recommendations, pdf_url, is_demo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, false)
    ON CONFLICT (id) DO NOTHING`,
    [
      'rep_1',
      'str_1',
      'farmer_ramesh',
      'field_1',
      'lab_pune',
      '2026-08-28',
      'Wheat',
      6.5,
      0.38,
      0.45,
      260.0,
      18.5,
      210.0,
      22.0,
      'medium',
      JSON.stringify(['नायट्रोजन (N) ची कमतरता आहे', 'सेंद्रिय कर्ब (Organic Carbon) कमी आहे']),
      'तुमच्या मातीतील सेंद्रिय कर्ब आणि नायट्रोजनची पातळी कमी आहे. पिकाच्या योग्य वाढीसाठी सिंचनासोबत संतुलित नत्र खतांची मात्रा व गांडूळखताचा वापर करा.',
      '/reports/soil_report_8821.pdf',
    ]
  );
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase().catch((err) => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });
}
