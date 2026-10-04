-- KisanIQ PostgreSQL Database Schema
-- Production-ready schema supporting real agricultural workflows

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    village VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'hi',
    profile_complete BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    total_area NUMERIC(6,2),
    soil_type VARCHAR(50),
    irrigation_source VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fields (
    id TEXT PRIMARY KEY,
    farm_id TEXT REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    area NUMERIC(6,2) NOT NULL DEFAULT 3.0,
    soil_type VARCHAR(50) DEFAULT 'alluvial',
    irrigation_type VARCHAR(50) DEFAULT 'borewell',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crops (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    field_id TEXT REFERENCES fields(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Wheat',
    name_key VARCHAR(50) NOT NULL DEFAULT 'wheat',
    variety VARCHAR(100) DEFAULT 'HD-2967',
    sowing_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'flowering',
    days_old INT NOT NULL DEFAULT 85,
    health_overall VARCHAR(20) NOT NULL DEFAULT 'low',
    health_weather_risk VARCHAR(20) NOT NULL DEFAULT 'low',
    health_disease_risk VARCHAR(20) NOT NULL DEFAULT 'medium',
    health_water_status VARCHAR(20) NOT NULL DEFAULT 'low',
    area NUMERIC(6,2) NOT NULL DEFAULT 5.0,
    expected_yield NUMERIC(8,2) DEFAULT 100.0,
    icon VARCHAR(10) NOT NULL DEFAULT '🌾',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_stages (
    id TEXT PRIMARY KEY,
    crop_id TEXT REFERENCES crops(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    name_key VARCHAR(50) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    sequence_order INT NOT NULL
);

CREATE TABLE IF NOT EXISTS crop_actions (
    id TEXT PRIMARY KEY,
    crop_id TEXT REFERENCES crops(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    title_key VARCHAR(100) NOT NULL,
    description_key TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    icon VARCHAR(10) NOT NULL DEFAULT '💧',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    distance_km NUMERIC(6,2) NOT NULL DEFAULT 15.0,
    commission_rate NUMERIC(4,2) NOT NULL DEFAULT 2.5,
    loading_cost NUMERIC(8,2) NOT NULL DEFAULT 500.0,
    storage_cost NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    expected_wastage NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation_rank INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_prices (
    id TEXT PRIMARY KEY,
    market_id TEXT REFERENCES markets(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL DEFAULT 'Wheat',
    price_per_quintal NUMERIC(8,2) NOT NULL,
    min_price NUMERIC(8,2),
    max_price NUMERIC(8,2),
    modal_price NUMERIC(8,2),
    price_change NUMERIC(4,2) DEFAULT 0.0,
    price_trend VARCHAR(20) NOT NULL DEFAULT 'stable',
    demand VARCHAR(20) NOT NULL DEFAULT 'medium',
    source VARCHAR(100) DEFAULT 'Agmarknet / APMC Yard',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendations (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    action_code VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '💧',
    title_key VARCHAR(100) NOT NULL,
    description_key TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'recommended',
    priority INT NOT NULL DEFAULT 1,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
    timing VARCHAR(50) DEFAULT 'today',
    why_summary TEXT,
    why_conclusion TEXT,
    data_points JSONB DEFAULT '[]',
    advanced_details TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    title_key VARCHAR(100) NOT NULL,
    description_key TEXT NOT NULL,
    action_key VARCHAR(50) DEFAULT 'details',
    icon VARCHAR(10) NOT NULL DEFAULT '⚠️',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    title_key VARCHAR(100) NOT NULL,
    description_key TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL DEFAULT '🔔',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    action_url VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    vehicle_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'Tractor-Trolley',
    capacity_quintals NUMERIC(6,2) NOT NULL DEFAULT 80.0,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    market_id TEXT REFERENCES markets(id) ON DELETE RESTRICT,
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals NUMERIC(8,2) NOT NULL,
    agreed_price_per_quintal NUMERIC(8,2) NOT NULL,
    total_expected_return NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    pickup_location VARCHAR(255) NOT NULL,
    destination_mandi VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    estimated_delivery TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    tracking_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weather_cache (
    id TEXT PRIMARY KEY,
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    current_json JSONB NOT NULL,
    forecast_json JSONB NOT NULL,
    implications_json JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(150),
    buyer_type VARCHAR(50) DEFAULT 'Trader',
    gstin VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100) DEFAULT 'Indore',
    state VARCHAR(100) DEFAULT 'Madhya Pradesh',
    pincode VARCHAR(10),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crop_listings (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity_quintals NUMERIC(8,2) NOT NULL,
    price_per_quintal NUMERIC(8,2) NOT NULL,
    quality_grade VARCHAR(50) DEFAULT 'Grade A',
    harvest_date DATE,
    available_from DATE DEFAULT CURRENT_DATE,
    location VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES crop_listings(id) ON DELETE SET NULL,
    buyer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals NUMERIC(8,2) NOT NULL,
    price_per_quintal NUMERIC(8,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    delivery_address TEXT NOT NULL,
    buyer_name VARCHAR(100),
    buyer_phone VARCHAR(20),
    status VARCHAR(30) DEFAULT 'placed',
    payment_method VARCHAR(50) DEFAULT 'Pay on Delivery / Escrow',
    payment_status VARCHAR(30) DEFAULT 'pending',
    tracking_code VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON farmers(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_farmer_id ON crops(farmer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_farmer_id ON recommendations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_farmer_id ON notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_farmer_id ON chat_messages(farmer_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_market_id ON market_prices(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_user_id ON buyer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_listings_farmer_id ON crop_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer_id ON marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_farmer_id ON marketplace_orders(farmer_id);

-- Column extensions for comprehensive registration and real mandi attributes
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS purchase_interests TEXT;
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE buyer_profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS min_price NUMERIC(8,2);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS max_price NUMERIC(8,2);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS modal_price NUMERIC(8,2);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'Agmarknet / APMC Yard';

-- ============================================================
-- SOIL TESTING & LABORATORY WORKFLOW TABLES
-- ============================================================

-- 1. Accredited Laboratories Directory
CREATE TABLE IF NOT EXISTS laboratories (
    id TEXT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pincode VARCHAR(10),
    phone VARCHAR(50),
    email VARCHAR(100),
    accreditation VARCHAR(200),
    operating_status VARCHAR(50) NOT NULL DEFAULT 'active',
    turnaround_days INT NOT NULL DEFAULT 5,
    supported_tests JSONB NOT NULL DEFAULT '["pH", "EC", "OC", "N", "P", "K", "Moisture"]'::jsonb,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Soil Test Requests
CREATE TABLE IF NOT EXISTS soil_test_requests (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    farm_id TEXT REFERENCES farms(id) ON DELETE SET NULL,
    field_id TEXT REFERENCES fields(id) ON DELETE SET NULL,
    crop_name VARCHAR(100) NOT NULL,
    lab_id TEXT REFERENCES laboratories(id) ON DELETE RESTRICT,
    sample_id VARCHAR(50) UNIQUE NOT NULL,
    sample_collection_date DATE NOT NULL,
    test_types JSONB NOT NULL,
    testing_mode VARCHAR(20) NOT NULL DEFAULT 'LAB_TEST', -- LAB_TEST | MANUAL_KIT | IOT_SENSOR
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, SAMPLE_PENDING, SAMPLE_SUBMITTED, RECEIVED_BY_LAB, TESTING, REPORT_READY, COMPLETED
    tracking_notes TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Soil Test Reports
CREATE TABLE IF NOT EXISTS soil_reports (
    id TEXT PRIMARY KEY,
    request_id TEXT REFERENCES soil_test_requests(id) ON DELETE CASCADE,
    farmer_id TEXT REFERENCES farmers(id) ON DELETE CASCADE,
    field_id TEXT REFERENCES fields(id) ON DELETE SET NULL,
    lab_id TEXT REFERENCES laboratories(id) ON DELETE RESTRICT,
    test_date DATE NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    ph NUMERIC(4,2) NOT NULL,
    ec NUMERIC(5,3) NOT NULL, -- dS/m
    organic_carbon NUMERIC(4,2) NOT NULL, -- %
    nitrogen_kg_ha NUMERIC(6,2) NOT NULL, -- kg/ha
    phosphorus_kg_ha NUMERIC(6,2) NOT NULL, -- kg/ha
    potassium_kg_ha NUMERIC(6,2) NOT NULL, -- kg/ha
    moisture_pct NUMERIC(4,1), -- %
    overall_health VARCHAR(50) NOT NULL DEFAULT 'optimal',
    deficiencies JSONB,
    recommendations TEXT,
    pdf_url TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Soil IoT Sensor Readings (Prepped for future sensor integration)
CREATE TABLE IF NOT EXISTS soil_sensor_readings (
    id TEXT PRIMARY KEY,
    field_id TEXT REFERENCES fields(id) ON DELETE CASCADE,
    sensor_id VARCHAR(50) NOT NULL,
    moisture_pct NUMERIC(4,1) NOT NULL,
    temperature_celsius NUMERIC(4,1) NOT NULL,
    ph NUMERIC(4,2),
    ec NUMERIC(5,3),
    nitrogen_ppm NUMERIC(6,2),
    is_demo BOOLEAN NOT NULL DEFAULT TRUE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Soil Module Indexes
CREATE INDEX IF NOT EXISTS idx_soil_test_requests_farmer_id ON soil_test_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_soil_reports_farmer_id ON soil_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_soil_reports_field_id ON soil_reports(field_id);
CREATE INDEX IF NOT EXISTS idx_soil_sensor_readings_field_id ON soil_sensor_readings(field_id);

-- Mandi CEDA Agmarknet Ingestion Enhancements
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS market_name VARCHAR(150);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS commodity VARCHAR(100);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS variety VARCHAR(100);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS grade VARCHAR(50);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS arrival_date DATE;
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_market_prices_state ON market_prices(state);
CREATE INDEX IF NOT EXISTS idx_market_prices_district ON market_prices(district);
CREATE INDEX IF NOT EXISTS idx_market_prices_market_name ON market_prices(market_name);
CREATE INDEX IF NOT EXISTS idx_market_prices_commodity ON market_prices(commodity);
CREATE INDEX IF NOT EXISTS idx_market_prices_variety ON market_prices(variety);
CREATE INDEX IF NOT EXISTS idx_market_prices_arrival_date ON market_prices(arrival_date);

CREATE TABLE IF NOT EXISTS mandi_sync_logs (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    source VARCHAR(100) NOT NULL DEFAULT 'CEDA Agmarknet',
    fetched_count INT DEFAULT 0,
    inserted_count INT DEFAULT 0,
    updated_count INT DEFAULT 0,
    rejected_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mandi_sync_logs_started_at ON mandi_sync_logs(started_at DESC);

