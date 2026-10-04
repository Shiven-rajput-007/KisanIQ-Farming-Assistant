import { db } from '../db/index.js';
import { mandiService } from './mandiService.js';

export interface MarketItem {
  id: string;
  name: string;
  location: string;
  district?: string;
  state?: string;
  distance: number;
  cropName: string;
  price: number; // Modal price
  minPrice: number;
  maxPrice: number;
  priceChange: number;
  priceTrend: 'up' | 'down' | 'stable';
  transportCost: number;
  commission: number;
  loadingCost: number;
  storageCost: number;
  expectedWastage: number;
  netReturn: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  demand: 'high' | 'medium' | 'low';
  isRecommended: boolean;
  recommendationRank: number;
  source: string;
  arrivalDate?: string;
  lastUpdated: string;
  isDemo?: boolean;
}

export interface PartialSelling {
  sellNow: {
    quantity: number;
    marketId: string;
    marketName: string;
    estimatedReturn: number;
    reason: string;
  };
  holdFor: {
    quantity: number;
    reason: string;
    expectedPriceRange?: { min: number; max: number };
    suggestedDuration?: string;
  };
}

/**
 * Calculates geodesic distance between two points using Haversine formula
 */
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class MarketService {
  /**
   * Fetches comparative market options backed by real CEDA Agmarknet data and transparent logistics.
   * Zero synthetic fallback prices.
   */
  async getMarketComparison(
    farmerId?: string,
    cropName: string = 'Wheat',
    quantityQuintals: number = 100,
    userLat?: number,
    userLon?: number,
    userDistrict?: string,
    userState?: string
  ): Promise<{
    success: boolean;
    code?: string;
    message?: string;
    cropName: string;
    availableQuantity: number;
    apiStatus: {
      configured: boolean;
      source: string;
      isLive: boolean;
      isStale: boolean;
      scope?: 'district' | 'state' | 'national';
      scopeNote?: string;
      note?: string;
      missingKey?: string;
    };
    userCoordinates?: { lat: number; lon: number };
    markets: MarketItem[];
    bestPracticalOption: string;
    partialSelling: PartialSelling | null;
    whyExplanation: any;
    lastUpdated: string;
  }> {
    // 1. Resolve active user coordinates from parameter or authenticated farmer profile
    let lat = userLat;
    let lon = userLon;
    let district = userDistrict;
    let state = userState;

    if ((lat === undefined || lon === undefined || !district || !state) && farmerId) {
      try {
        const farmerRes = await db.query(
          'SELECT latitude, longitude, district, state FROM farmers WHERE id = $1 OR user_id = $1',
          [farmerId]
        );
        if (farmerRes.rows.length > 0) {
          const row = farmerRes.rows[0];
          if (lat === undefined && row.latitude !== null && row.latitude !== undefined) {
            lat = Number(row.latitude);
          }
          if (lon === undefined && row.longitude !== null && row.longitude !== undefined) {
            lon = Number(row.longitude);
          }
          if (!district && row.district) {
            district = row.district;
          }
          if (!state && row.state) {
            state = row.state;
          }
        }
      } catch (dbErr) {
        console.warn('[MarketService] Farmer profile lookup notice:', dbErr);
      }
    }

    const hasValidCoordinates =
      typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);

    const isCedaConfigured = mandiService.isConfigured();

    let scope: 'district' | 'state' | 'national' = 'district';
    let scopeNote: string | undefined = undefined;

    // 2. Tiered search for verified price records from PostgreSQL
    // Tier 1: Try District + State
    let priceRows = await this.queryMarketPriceRows(cropName, district, state);

    if (priceRows.length > 0) {
      scope = 'district';
      scopeNote = district ? `Verified APMC mandi data for ${district}` : undefined;
    } else if (state && state.trim() !== '' && state !== 'all') {
      // Tier 2: Try State-wide
      priceRows = await this.queryMarketPriceRows(cropName, undefined, state);
      if (priceRows.length > 0) {
        scope = 'state';
        scopeNote = `District data unavailable for ${district || 'local district'}. Showing verified ${state} market records.`;
      }
    }

    if (priceRows.length === 0) {
      // Tier 3: Try Nationwide for this commodity
      priceRows = await this.queryMarketPriceRows(cropName, undefined, undefined);
      if (priceRows.length > 0) {
        scope = 'national';
        scopeNote = `State records unavailable. Showing verified national market records for ${cropName}.`;
      }
    }

    // Check data freshness (considered fresh if fetched within 24 hours)
    let isStale = false;
    if (priceRows.length > 0) {
      const mostRecentFetched = priceRows[0].fetched_at || priceRows[0].created_at;
      if (mostRecentFetched) {
        const ageHours = (Date.now() - new Date(mostRecentFetched).getTime()) / (1000 * 60 * 60);
        isStale = ageHours > 24;
      }
    }

    // If no records found, or records are stale, and CEDA API is configured: trigger live sync
    if ((priceRows.length === 0 || isStale) && isCedaConfigured) {
      try {
        console.log(`[MarketService] Triggering CEDA fetch for commodity "${cropName}" (state: ${state || 'All'})...`);
        await mandiService.syncFromCedaApi({
          commodity: cropName,
          state,
          district,
        });
        // Re-query PostgreSQL after ingestion with tiered fallback
        priceRows = await this.queryMarketPriceRows(cropName, district, state);
        if (priceRows.length > 0) {
          scope = 'district';
          scopeNote = district ? `Verified APMC mandi data for ${district}` : undefined;
        } else if (state && state.trim() !== '' && state !== 'all') {
          priceRows = await this.queryMarketPriceRows(cropName, undefined, state);
          if (priceRows.length > 0) {
            scope = 'state';
            scopeNote = `District data unavailable for ${district || 'local district'}. Showing verified ${state} market records.`;
          }
        }
        if (priceRows.length === 0) {
          priceRows = await this.queryMarketPriceRows(cropName, undefined, undefined);
          if (priceRows.length > 0) {
            scope = 'national';
            scopeNote = `State records unavailable. Showing verified national market records for ${cropName}.`;
          }
        }
      } catch (syncErr: any) {
        console.warn('[MarketService] On-demand CEDA sync notice:', syncErr.message);
      }
    }

    const apiStatus = {
      configured: isCedaConfigured,
      source: isCedaConfigured
        ? 'CEDA Agmarknet (api.ceda.ashoka.edu.in)'
        : 'CEDA Agmarknet Agricultural-Market Records (Database Cache)',
      isLive: isCedaConfigured,
      isStale,
      scope,
      scopeNote,
      ...(isCedaConfigured
        ? { note: 'Live daily mandi price streaming active via CEDA Agmarknet API.' }
        : {
            missingKey: 'CEDA_API_KEY',
            note: 'Configure CEDA_API_KEY in backend environment to enable live daily mandi streaming.',
          }),
    };

    // 3. ZERO DEMO FALLBACK: If NO verified records exist, return explicit MANDI_DATA_UNAVAILABLE
    if (priceRows.length === 0) {
      return {
        success: false,
        code: 'MANDI_DATA_UNAVAILABLE',
        message: `No verified APMC market records available for "${cropName}" from CEDA Agmarknet.`,
        cropName,
        availableQuantity: quantityQuintals,
        apiStatus,
        userCoordinates: hasValidCoordinates ? { lat: lat!, lon: lon! } : undefined,
        markets: [],
        bestPracticalOption: '',
        partialSelling: null,
        whyExplanation: null,
        lastUpdated: '',
      };
    }

    // 4. Calculate Net Realized Return for each verified mandi record
    const calculatedMarkets: MarketItem[] = priceRows.map((row: any) => {
      const modalPrice = Number(row.modal_price || row.price_per_quintal);
      const minPrice = Number(row.min_price || modalPrice);
      const maxPrice = Number(row.max_price || modalPrice);

      // Distance calculation: only calculate if verified coordinates exist for both farmer and market
      let calculatedDistance = 0;
      const mandiLat = row.market_lat !== null && row.market_lat !== undefined ? Number(row.market_lat) : NaN;
      const mandiLon = row.market_lon !== null && row.market_lon !== undefined ? Number(row.market_lon) : NaN;

      if (hasValidCoordinates && !isNaN(mandiLat) && !isNaN(mandiLon)) {
        calculatedDistance = calculateHaversineDistanceKm(lat!, lon!, mandiLat, mandiLon);
      }

      const commissionRate = Number(row.commission_rate || 2.5); // standard 2.5% APMC commission
      const loadingPerQuintal = Number(row.loading_cost || 5); // ₹5/quintal
      const wastageRate = Number(row.expected_wastage || 1.0); // 1% loss

      // Freight logistics: base ₹300 + ₹25/km per 50 quintals if distance > 0
      const transport = calculatedDistance > 0
        ? Math.max(300, Math.round(calculatedDistance * 25 * (quantityQuintals / 50)))
        : 0;

      const grossRevenue = modalPrice * quantityQuintals;
      const commissionAmount = Math.round((grossRevenue * commissionRate) / 100);
      const loadingAmount = Math.round(loadingPerQuintal * quantityQuintals);
      const wastageAmount = Math.round((grossRevenue * wastageRate) / 100);
      const netReturn = Math.max(0, grossRevenue - (transport + commissionAmount + loadingAmount + wastageAmount));

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (calculatedDistance > 80 || row.price_trend === 'down') {
        riskLevel = 'high';
      } else if (calculatedDistance > 30) {
        riskLevel = 'medium';
      }

      const arrivalDateStr = row.arrival_date
        ? new Date(row.arrival_date).toISOString().split('T')[0]
        : undefined;

      return {
        id: row.id,
        name: row.market_name || row.name || 'APMC Mandi',
        location: row.location || `${row.district || ''}, ${row.state || ''}`.replace(/^, |, $/g, ''),
        district: row.district,
        state: row.state,
        distance: calculatedDistance,
        cropName: row.commodity || row.crop_name || cropName,
        price: modalPrice,
        minPrice,
        maxPrice,
        priceChange: Number(row.price_change || 0),
        priceTrend: row.price_trend || 'stable',
        transportCost: transport,
        commission: commissionRate,
        loadingCost: loadingAmount,
        storageCost: Number(row.storage_cost || 0),
        expectedWastage: wastageRate,
        netReturn,
        riskLevel,
        demand: row.demand || 'medium',
        isRecommended: false,
        recommendationRank: 0,
        source: row.source || 'CEDA Agmarknet',
        arrivalDate: arrivalDateStr,
        lastUpdated: row.fetched_at ? new Date(row.fetched_at).toISOString() : new Date().toISOString(),
        isDemo: false,
      };
    });

    // 5. Rank mandis strictly by Net Realized Return (after logistics deductions!)
    const sorted = [...calculatedMarkets].sort((a, b) => b.netReturn - a.netReturn);
    sorted.forEach((m, idx) => {
      m.recommendationRank = idx + 1;
      m.isRecommended = idx === 0;
    });

    const topMarket = sorted[0];
    const bestPracticalOption = topMarket.id;

    // 6. Strategic 60/40 Partial Selling recommendation based on actual top market
    const sellQty = Math.round(quantityQuintals * 0.6);
    const holdQty = quantityQuintals - sellQty;
    const estReturn = Math.round((topMarket.netReturn / (quantityQuintals || 1)) * sellQty);

    const partialSelling: PartialSelling = {
      sellNow: {
        quantity: sellQty,
        marketId: topMarket.id,
        marketName: topMarket.name,
        estimatedReturn: estReturn,
        reason: `Current verified modal price (₹${topMarket.price.toLocaleString('en-IN')}/q) at ${topMarket.name}${topMarket.distance > 0 ? ` (${topMarket.distance} km)` : ''} yields highest net return after transport and mandi deductions.`,
      },
      holdFor: {
        quantity: holdQty,
        reason: 'Holding 40% buffers against local mandi arrival volatility.',
        expectedPriceRange: {
          min: topMarket.price,
          max: Math.round(topMarket.price * 1.08),
        },
        suggestedDuration: '1-2 weeks',
      },
    };

    const whyExplanation = {
      summaryKey: `Why ${topMarket.name}?`,
      dataPoints: [
        { icon: '💰', labelKey: 'Modal Price', value: `₹${topMarket.price.toLocaleString('en-IN')}/q` },
        ...(topMarket.distance > 0
          ? [
              { icon: '🚛', labelKey: 'Distance', value: topMarket.distance, unit: 'km' },
              { icon: '📦', labelKey: 'Transport Cost', value: `₹${topMarket.transportCost.toLocaleString('en-IN')}` },
            ]
          : []),
        { icon: '📊', labelKey: 'Commission Cess', value: `${topMarket.commission}%` },
        { icon: '📈', labelKey: 'Market Demand', value: String(topMarket.demand).toUpperCase() },
        { icon: '📅', labelKey: 'Arrival Date', value: topMarket.arrivalDate || 'Recent' },
      ],
      conclusionKey: `Yields highest estimated net return of ₹${topMarket.netReturn.toLocaleString('en-IN')} among all verified mandi records for this commodity.`,
      advancedDetails: 'Estimated Net Return = Gross Value - (Transport + Commission + Loading + Wastage). Assumptions: Transport ₹25/km per 50q (min ₹300), APMC Commission 2.5%, Loading ₹5/q, Expected Wastage 1.0%. Sourced from CEDA Agmarknet.',
    };

    return {
      success: true,
      cropName,
      availableQuantity: quantityQuintals,
      apiStatus,
      userCoordinates: hasValidCoordinates ? { lat: lat!, lon: lon! } : undefined,
      markets: sorted.slice(0, 10), // Top 10 verified mandis
      bestPracticalOption,
      partialSelling,
      whyExplanation,
      lastUpdated: topMarket.lastUpdated,
    };
  }

  private async queryMarketPriceRows(cropName: string, district?: string, state?: string): Promise<any[]> {
    const whereClauses: string[] = ['(mp.commodity ILIKE $1 OR mp.crop_name ILIKE $1)'];
    const params: any[] = [`%${cropName.trim()}%`];
    let pIdx = 2;

    if (district && district.trim() !== '' && district !== 'all') {
      const cleanDistrict = district.trim().replace(/buddha/i, 'bud%').replace(/budh/i, 'bud%');
      whereClauses.push(`(mp.district ILIKE $${pIdx} OR m.district ILIKE $${pIdx})`);
      params.push(`%${cleanDistrict}%`);
      pIdx++;
    }
    if (state && state.trim() !== '' && state !== 'all') {
      whereClauses.push(`(mp.state ILIKE $${pIdx} OR m.state ILIKE $${pIdx})`);
      params.push(`%${state.trim()}%`);
      pIdx++;
    }

    const sql = `
      SELECT mp.*, m.name as market_table_name, m.location,
             m.latitude as market_lat, m.longitude as market_lon,
             m.commission_rate, m.loading_cost, m.expected_wastage, m.storage_cost
      FROM market_prices mp
      LEFT JOIN markets m ON (m.name ILIKE mp.market_name OR mp.market_id = m.id)
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY mp.arrival_date DESC NULLS LAST, mp.fetched_at DESC NULLS LAST, mp.modal_price DESC
      LIMIT 20
    `;

    try {
      const res = await db.query(sql, params);
      return res.rows;
    } catch (e: any) {
      console.warn('[MarketService] Query market price rows notice:', e.message);
      return [];
    }
  }

  async createOrder(farmerId: string, marketId: string, cropName: string, quantity: number, agreedPrice: number) {
    const totalReturn = Math.round(quantity * agreedPrice);
    const orderId = `ord_${Date.now()}`;

    // 1. Resolve market record to satisfy FK constraint on orders(market_id)
    let resolvedMarketId = marketId;
    let mRes = await db.query('SELECT id, name, district, state FROM markets WHERE id = $1', [marketId]);
    let market = mRes.rows[0];

    if (!market) {
      // Check if marketId was a market_prices.id or name
      const mpRes = await db.query(
        'SELECT market_id, market_name, district, state FROM market_prices WHERE id = $1 OR market_name ILIKE $1 LIMIT 1',
        [marketId]
      );
      if (mpRes.rows.length > 0) {
        const mpRow = mpRes.rows[0];
        if (mpRow.market_id) {
          const directM = await db.query('SELECT id, name, district, state FROM markets WHERE id = $1', [mpRow.market_id]);
          if (directM.rows.length > 0) {
            market = directM.rows[0];
            resolvedMarketId = market.id;
          }
        }
        if (!market && mpRow.market_name) {
          const nameM = await db.query('SELECT id, name, district, state FROM markets WHERE name ILIKE $1 LIMIT 1', [mpRow.market_name]);
          if (nameM.rows.length > 0) {
            market = nameM.rows[0];
            resolvedMarketId = market.id;
          } else {
            // Insert verified market entry into markets table
            resolvedMarketId = `mkt_${Date.now()}`;
            await db.query(
              `INSERT INTO markets (id, name, district, state, location)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (id) DO NOTHING`,
              [resolvedMarketId, mpRow.market_name, mpRow.district || 'District', mpRow.state || 'State', 'APMC Mandi Yard']
            );
            market = { name: mpRow.market_name };
          }
        }
      }
    }

    if (!market) {
      // Fallback: create entry with provided ID to guarantee valid FK
      await db.query(
        `INSERT INTO markets (id, name, district, state, location)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [resolvedMarketId, 'APMC Mandi', 'Local', 'State', 'APMC Yard']
      );
      market = { name: 'APMC Mandi' };
    }

    await db.query(
      `INSERT INTO orders (id, farmer_id, market_id, crop_name, quantity_quintals, agreed_price_per_quintal, total_expected_return, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [orderId, farmerId, resolvedMarketId, cropName, quantity, agreedPrice, totalReturn, 'confirmed', `Dispatched to ${market.name}`]
    );

    // Auto-schedule shipment with tracking code
    const shipId = `ship_${Date.now()}`;
    const trackingCode = `KISAN-LOG-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.query(
      `INSERT INTO shipments (id, order_id, pickup_location, destination_mandi, status, tracking_code)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [shipId, orderId, 'Farmer Field / Farm Gate', market.name, 'scheduled', trackingCode]
    );

    return { orderId, shipId, trackingCode, status: 'confirmed', totalReturn, destination: market.name };
  }
}

export const marketService = new MarketService();
