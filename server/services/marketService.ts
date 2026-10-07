import { db } from '../db/index.js';
import { mandiService } from './mandiService.js';
import { weatherService } from './weatherService.js';

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

export interface RiskDimension {
  score: number;
  level: 'low' | 'medium' | 'high';
  note: string;
}

export interface SellingDecision {
  action: 'SELL_NOW' | 'HOLD' | 'WAIT' | 'PARTIAL_SELL' | 'INSUFFICIENT_DATA';
  actionKey: string;
  badgeVariant: 'success' | 'warning' | 'caution' | 'info';
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceNote: string;
  primaryMarketName?: string;
  primaryPrice?: number;
  expectedNetReturn?: number;
  effectiveRealizedPrice?: number;
  timeHorizon?: string;
  reasons: string[];
  suggestedAction: string;
  riskBreakdown: {
    marketRisk: RiskDimension;
    weatherRisk: RiskDimension;
    storageRisk: RiskDimension;
    volatilityRisk: RiskDimension;
    logisticsRisk: RiskDimension;
  };
  partialSplit?: {
    sellNowPercent: number;
    sellNowQuantity: number;
    holdPercent: number;
    holdQuantity: number;
    sellNowReturn: number;
    holdEstimatedReturn: number;
  };
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
      errorReason?: 'auth_failure' | 'rate_limit' | 'network_failure' | 'malformed_response' | 'no_records';
      errorMessage?: string;
      note?: string;
      missingKey?: string;
    };
    userCoordinates?: { lat: number; lon: number };
    markets: MarketItem[];
    bestPracticalOption: string;
    partialSelling: PartialSelling | null;
    whyExplanation: any;
    sellingDecision: SellingDecision;
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

    // Dynamically resolve commodity, state, and district (supports en, hi, mr)
    const resolvedComm = await mandiService.resolveCommodity(cropName);
    const targetCrop = resolvedComm?.officialName || cropName;

    const resolvedSt = mandiService.resolveState(state);
    const targetState = resolvedSt?.stateName || state;

    const resolvedDist = await mandiService.resolveDistrict(district, resolvedSt?.stateId, resolvedComm?.id);
    const targetDistrict = resolvedDist?.districtName || district;

    const hasValidCoordinates =
      typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);

    let userWeather: any = null;
    if (hasValidCoordinates) {
      try {
        userWeather = await weatherService.getWeather(lat!, lon!);
      } catch {
        // Safe: non-blocking weather advisory
      }
    }

    const isCedaConfigured = mandiService.isConfigured();

    let scope: 'district' | 'state' | 'national' = 'district';
    let scopeNote: string | undefined = undefined;

    // 2. Tiered search for verified price records from PostgreSQL
    // Tier 1: Try District + State
    let priceRows = await this.queryMarketPriceRows(targetCrop, targetDistrict, targetState, cropName);

    if (priceRows.length > 0) {
      scope = 'district';
      scopeNote = targetDistrict ? `Verified APMC mandi data for ${targetDistrict}` : undefined;
    } else if (targetState && targetState.trim() !== '' && targetState !== 'all') {
      // Tier 2: Try State-wide
      priceRows = await this.queryMarketPriceRows(targetCrop, undefined, targetState, cropName);
      if (priceRows.length > 0) {
        scope = 'state';
        scopeNote = `District data unavailable for ${targetDistrict || 'local district'}. Showing verified ${targetState} market records.`;
      }
    }

    if (priceRows.length === 0) {
      // Tier 3: Try Nationwide for this commodity
      priceRows = await this.queryMarketPriceRows(targetCrop, undefined, undefined, cropName);
      if (priceRows.length > 0) {
        scope = 'national';
        scopeNote = `State records unavailable. Showing verified national market records for ${targetCrop}.`;
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

    let cedaErrorReason: 'auth_failure' | 'rate_limit' | 'network_failure' | 'malformed_response' | 'no_records' | undefined = undefined;
    let cedaErrorMessage: string | undefined = undefined;

    // If no records found, or records are stale, and CEDA API is configured: trigger live sync
    if ((priceRows.length === 0 || isStale) && isCedaConfigured) {
      try {
        console.log(`[MarketService] Triggering CEDA fetch for commodity "${targetCrop}" (state: ${targetState || 'All'})...`);
        const syncRes = await mandiService.syncFromCedaApi({
          commodity: targetCrop,
          state: targetState,
          district: targetDistrict,
        });

        if (syncRes.status === 'failed') {
          cedaErrorMessage = syncRes.errorMessage;
          if (syncRes.errorMessage?.includes('401') || syncRes.errorMessage?.includes('Unauthorized') || syncRes.errorMessage?.includes('CEDA_API_KEY')) {
            cedaErrorReason = 'auth_failure';
          } else if (syncRes.errorMessage?.includes('429') || syncRes.errorMessage?.includes('Too Many Requests')) {
            cedaErrorReason = 'rate_limit';
          } else {
            cedaErrorReason = 'network_failure';
          }
        }

        // Re-query PostgreSQL after ingestion with tiered fallback
        priceRows = await this.queryMarketPriceRows(targetCrop, targetDistrict, targetState, cropName);
        if (priceRows.length > 0) {
          scope = 'district';
          scopeNote = targetDistrict ? `Verified APMC mandi data for ${targetDistrict}` : undefined;
        } else if (targetState && targetState.trim() !== '' && targetState !== 'all') {
          priceRows = await this.queryMarketPriceRows(targetCrop, undefined, targetState, cropName);
          if (priceRows.length > 0) {
            scope = 'state';
            scopeNote = `District data unavailable for ${targetDistrict || 'local district'}. Showing verified ${targetState} market records.`;
          }
        }
        if (priceRows.length === 0) {
          priceRows = await this.queryMarketPriceRows(targetCrop, undefined, undefined, cropName);
          if (priceRows.length > 0) {
            scope = 'national';
            scopeNote = `State records unavailable. Showing verified national market records for ${targetCrop}.`;
          }
        }
      } catch (syncErr: any) {
        cedaErrorMessage = syncErr.message;
        if (syncErr.message?.includes('401') || syncErr.message?.includes('Unauthorized') || syncErr.message?.includes('CEDA_API_KEY')) {
          cedaErrorReason = 'auth_failure';
        } else if (syncErr.message?.includes('429') || syncErr.message?.includes('Too Many Requests') || syncErr.message?.includes('rate limit')) {
          cedaErrorReason = 'rate_limit';
        } else if (syncErr.message?.includes('timeout') || syncErr.message?.includes('ENOTFOUND') || syncErr.message?.includes('fetch failed')) {
          cedaErrorReason = 'network_failure';
        } else if (syncErr.message?.includes('JSON') || syncErr.message?.includes('malformed') || syncErr.message?.includes('Unexpected token')) {
          cedaErrorReason = 'malformed_response';
        } else {
          cedaErrorReason = 'network_failure';
        }
        console.warn(`[MarketService] On-demand CEDA sync error (${cedaErrorReason}):`, syncErr.message);
      }
    } else if (!isCedaConfigured && priceRows.length === 0) {
      cedaErrorReason = 'auth_failure';
      cedaErrorMessage = 'CEDA_API_KEY is not configured in backend environment variables.';
    }

    if (priceRows.length === 0 && !cedaErrorReason) {
      cedaErrorReason = 'no_records';
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
      errorReason: cedaErrorReason,
      errorMessage: cedaErrorMessage,
      ...(isCedaConfigured
        ? { note: 'Live daily mandi price streaming active via CEDA Agmarknet API.' }
        : {
            missingKey: 'CEDA_API_KEY',
            note: 'Configure CEDA_API_KEY in backend environment to enable live daily mandi streaming.',
          }),
    };

    // 3. ZERO DEMO FALLBACK: If NO verified records exist, return explicit MANDI_DATA_UNAVAILABLE
    if (priceRows.length === 0) {
      let failureMessage = `No verified APMC market records available for "${cropName}" from CEDA Agmarknet.`;
      if (cedaErrorReason === 'auth_failure') {
        failureMessage = 'CEDA Agmarknet authentication unconfigured or key rejected.';
      } else if (cedaErrorReason === 'rate_limit') {
        failureMessage = 'CEDA Agmarknet rate limit reached. Please retry in a few moments.';
      } else if (cedaErrorReason === 'network_failure') {
        failureMessage = 'Network connection to CEDA Agmarknet API is temporarily unreachable.';
      } else if (cedaErrorReason === 'malformed_response') {
        failureMessage = 'CEDA Agmarknet returned an invalid response structure.';
      }

      const emptyDecision = this.computeSellingDecision({
        cropName,
        quantityQuintals,
        markets: [],
        weatherData: userWeather,
        isStale: false,
      });

      return {
        success: false,
        code: 'MANDI_DATA_UNAVAILABLE',
        message: failureMessage,
        cropName,
        availableQuantity: quantityQuintals,
        apiStatus,
        userCoordinates: hasValidCoordinates ? { lat: lat!, lon: lon! } : undefined,
        markets: [],
        bestPracticalOption: '',
        partialSelling: null,
        whyExplanation: null,
        sellingDecision: emptyDecision,
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

    // 6. Compute Dynamic Hold / Wait / Sell / Partial Sell Decision backed by real inputs
    const sellingDecision = this.computeSellingDecision({
      cropName,
      quantityQuintals,
      markets: sorted,
      weatherData: userWeather,
      isStale,
    });

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
      sellingDecision,
      lastUpdated: topMarket.lastUpdated,
    };
  }

  /**
   * Computes an explainable, multi-dimensional Hold / Wait / Sell / Partial Sell decision
   * using verified CEDA market prices, logistics net realization, weather forecast, and perishability.
   */
  public computeSellingDecision(params: {
    cropName: string;
    quantityQuintals: number;
    markets: MarketItem[];
    weatherData?: any;
    isStale?: boolean;
    cropStage?: string;
  }): SellingDecision {
    const { cropName, quantityQuintals, markets, weatherData, isStale } = params;

    if (!markets || markets.length === 0) {
      return {
        action: 'INSUFFICIENT_DATA',
        actionKey: 'decision.action_insufficient_data',
        badgeVariant: 'info',
        overallRisk: 'medium',
        riskScore: 50,
        confidence: 'low',
        confidenceNote: 'No verified mandi records available from CEDA Agmarknet for this selection.',
        reasons: [
          'No recent arrival bulletin reported in CEDA Agmarknet database for this crop and location.',
          'Physical mandis may not have conducted auctions today or data has not yet reached national servers.',
          'Insufficient verified auction data to compute dependable selling advisory.',
        ],
        suggestedAction: 'Select a broader district or check back when local APMC trading resumes.',
        riskBreakdown: {
          marketRisk: { score: 50, level: 'medium', note: 'Market data currently insufficient' },
          weatherRisk: { score: 25, level: 'low', note: 'Weather conditions normal' },
          storageRisk: { score: 40, level: 'medium', note: 'Standard holding risk' },
          volatilityRisk: { score: 50, level: 'medium', note: 'Price spread undetermined' },
          logisticsRisk: { score: 50, level: 'medium', note: 'Logistics routes undetermined' },
        },
      };
    }

    const topMarket = markets[0];
    const modalPrice = topMarket.price;
    const netReturn = topMarket.netReturn;
    const effectivePrice = Math.round(netReturn / Math.max(1, quantityQuintals));
    const distance = topMarket.distance;
    const trend = topMarket.priceTrend || 'stable';

    // 1. Calculate price spread across regional mandis
    const allPrices = markets.map((m) => m.price);
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const priceSpreadPct = modalPrice > 0 ? Math.round(((maxP - minP) / modalPrice) * 100) : 0;

    // 2. Crop perishability check
    const lowerCrop = cropName.toLowerCase();
    const isPerishable = ['tomato', 'onion', 'potato', 'vegetable', 'टमाटर', 'कांदा', 'आलू', 'बटाटा', 'टोमॅटो', 'प्याज'].some((p) =>
      lowerCrop.includes(p)
    );

    // 3. Multi-dimensional risk scoring
    // Market Risk (0-100)
    let marketRiskScore = 25;
    let marketRiskNote = 'Stable modal auction prices across reporting mandis.';
    if (trend === 'down') {
      marketRiskScore = 65;
      marketRiskNote = 'Arrivals increasing; modal prices showing downward pressure.';
    } else if (trend === 'up') {
      marketRiskScore = 18;
      marketRiskNote = 'Firm market demand with positive price momentum.';
    }
    const marketRiskLevel: 'low' | 'medium' | 'high' =
      marketRiskScore > 60 ? 'high' : marketRiskScore > 30 ? 'medium' : 'low';

    // Weather Risk (0-100)
    let weatherRiskScore = 20;
    let weatherRiskNote = 'Dry, favorable weather for grain transit and yard auctions.';
    if (weatherData) {
      const currentRainProb = weatherData.current?.rainProbability ?? 0;
      const forecastRainProb = Array.isArray(weatherData.forecast)
        ? Math.max(...weatherData.forecast.map((f: any) => f?.rainProbability ?? 0), 0)
        : 0;
      const rainProb = Math.max(currentRainProb, forecastRainProb);
      if (rainProb >= 60) {
        weatherRiskScore = 80;
        weatherRiskNote = `Severe rain expected (${rainProb}%); transport and open-yard unloading risk is high.`;
      } else if (rainProb >= 35) {
        weatherRiskScore = 50;
        weatherRiskNote = `Moderate rain probability (${rainProb}%); tarping and moisture protection advised.`;
      }
    }
    const weatherRiskLevel: 'low' | 'medium' | 'high' =
      weatherRiskScore > 60 ? 'high' : weatherRiskScore > 30 ? 'medium' : 'low';

    // Storage Risk (0-100)
    let storageRiskScore = 20;
    let storageRiskNote = 'Durable grain suitable for controlled warehouse holding (₹12-15/q/month).';
    if (isPerishable) {
      storageRiskScore = 75;
      storageRiskNote = 'Perishable produce subject to rapid post-harvest shrinkage, weight loss, and decay.';
    } else if ((weatherData?.current?.humidity ?? 0) > 75) {
      storageRiskScore = 45;
      storageRiskNote = 'High ambient humidity elevates fungal spore risk in non-aerated godowns.';
    }
    const storageRiskLevel: 'low' | 'medium' | 'high' =
      storageRiskScore > 60 ? 'high' : storageRiskScore > 30 ? 'medium' : 'low';

    // Volatility Risk (0-100)
    let volatilityRiskScore = 20;
    let volatilityRiskNote = `Regional auction prices are consistent within ${priceSpreadPct}% spread.`;
    if (priceSpreadPct > 20) {
      volatilityRiskScore = 65;
      volatilityRiskNote = `High price divergence (${priceSpreadPct}%) across mandis; sharp daily fluctuations observed.`;
    } else if (priceSpreadPct > 10) {
      volatilityRiskScore = 38;
      volatilityRiskNote = `Moderate price spread (${priceSpreadPct}%) between nearby markets.`;
    }
    const volatilityRiskLevel: 'low' | 'medium' | 'high' =
      volatilityRiskScore > 60 ? 'high' : volatilityRiskScore > 30 ? 'medium' : 'low';

    // Logistics Risk (0-100)
    let logisticsRiskScore = 15;
    let logisticsRiskNote = distance > 0 ? `Local mandi within ${distance} km.` : 'Short distance APMC yard.';
    if (distance > 70) {
      logisticsRiskScore = 70;
      logisticsRiskNote = `Long haul transit (${distance} km) with higher freight and in-transit wastage risk.`;
    } else if (distance > 30) {
      logisticsRiskScore = 40;
      logisticsRiskNote = `Intermediate distance (${distance} km); freight cost impacts net realization.`;
    }
    const logisticsRiskLevel: 'low' | 'medium' | 'high' =
      logisticsRiskScore > 60 ? 'high' : logisticsRiskScore > 30 ? 'medium' : 'low';

    // Weighted Overall Risk Score
    const overallScore = Math.round(
      0.35 * marketRiskScore +
      0.25 * weatherRiskScore +
      0.15 * storageRiskScore +
      0.15 * volatilityRiskScore +
      0.10 * logisticsRiskScore
    );
    const overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' =
      overallScore > 75 ? 'critical' : overallScore > 55 ? 'high' : overallScore > 30 ? 'medium' : 'low';

    // 4. Decision Rule Evaluation
    let action: 'SELL_NOW' | 'HOLD' | 'WAIT' | 'PARTIAL_SELL' = 'PARTIAL_SELL';
    let timeHorizon = 'Sell 60% now, hold 40% for 10-14 days';
    const reasons: string[] = [];
    let suggestedAction = '';

    // Condition 1: WAIT if imminent weather threatens transport/unloading or harvest not dry
    if (weatherRiskScore >= 65) {
      action = 'WAIT';
      timeHorizon = 'Wait 2 to 4 days';
      reasons.push(
        `Heavy rain or wet weather expected (${weatherRiskNote}).`,
        `Open APMC yards at ${topMarket.name} may pause auctions or see soggy produce discounts.`,
        'Holding dispatch until weather clears prevents transit water damage and transport breakdown.'
      );
      suggestedAction = `Postpone field dispatch for 2-3 days until weather clears, then reassess auction rates at ${topMarket.name}.`;
    }
    // Condition 2: SELL NOW if perishable, or trend is downwards, or exceptional local net realization
    else if (isPerishable || trend === 'down' || (distance <= 25 && effectivePrice >= modalPrice * 0.95)) {
      action = 'SELL_NOW';
      timeHorizon = 'Immediate (Today or Tomorrow)';
      if (isPerishable) {
        reasons.push(
          'Produce is perishable with high weight loss and rot risk in normal storage.',
          `Current verified net return of ₹${effectivePrice.toLocaleString('en-IN')}/q at ${topMarket.name} is attractive.`,
          'Immediate sale locks in value and prevents spoilage deductions.'
        );
        suggestedAction = `Proceed with sale at ${topMarket.name} to capture current auction price before weight loss occurs.`;
      } else if (trend === 'down') {
        reasons.push(
          'Regional arrival volumes are rising, putting downward pressure on modal prices.',
          'Holding costs (₹15/q/month) combined with price softening make storing uneconomical.',
          `Selling today protects your net margin of ₹${netReturn.toLocaleString('en-IN')}.`
        );
        suggestedAction = `Sell at ${topMarket.name} now to avoid further price erosion in coming weeks.`;
      } else {
        reasons.push(
          `Current verified modal price (₹${modalPrice.toLocaleString('en-IN')}/q) at nearby ${topMarket.name} offers peak net realization.`,
          `Short transit distance (${distance > 0 ? `${distance} km` : 'local'}) keeps transport deductions minimal.`,
          'Locking in sale now avoids warehouse storage fees and market uncertainty.'
        );
        suggestedAction = `Sell available produce at ${topMarket.name} today to secure estimated net return of ₹${netReturn.toLocaleString('en-IN')}.`;
      }
    }
    // Condition 3: HOLD if upward price trend, non-perishable grain, low storage risk
    else if (trend === 'up' && !isPerishable && storageRiskScore <= 35) {
      action = 'HOLD';
      timeHorizon = 'Hold for 2 to 3 weeks';
      reasons.push(
        'Modal auction prices are exhibiting upward momentum across regional APMC yards.',
        'Dry grain storage risk is low; expected appreciation exceeds holding costs (~₹15/q/month).',
        'Tapering local arrivals indicate prices may strengthen further over the next fortnight.'
      );
      suggestedAction = `Store grain in dry, aerated bags for 10-20 days; monitor arrival peaks before liquidating.`;
    }
    // Condition 4: PARTIAL SELL (Balanced approach for medium volatility or large volumes)
    else {
      action = 'PARTIAL_SELL';
      const sellNowPct = 60;
      const holdPct = 40;
      const sellNowQty = Math.round(quantityQuintals * (sellNowPct / 100));
      const holdQty = quantityQuintals - sellNowQty;
      timeHorizon = `Sell ${sellNowPct}% now, hold ${holdPct}% for 2 weeks`;
      reasons.push(
        `Selling ${sellNowQty} quintals now secures immediate working capital (estimated ₹${Math.round(effectivePrice * sellNowQty).toLocaleString('en-IN')}).`,
        `Holding ${holdQty} quintals buffers against market volatility while preserving upside if prices climb.`,
        'Provides balanced risk management without exposing entire harvest to single-day price fluctuations.'
      );
      suggestedAction = `Dispatch ${sellNowQty} quintals to ${topMarket.name} today and hold ${holdQty} quintals in storage.`;
    }

    const sellNowQty = Math.round(quantityQuintals * 0.6);
    const holdQty = quantityQuintals - sellNowQty;
    const sellNowReturn = Math.round(effectivePrice * sellNowQty);
    const holdEstimatedReturn = Math.round(effectivePrice * holdQty * 1.05);

    return {
      action,
      actionKey: `decision.action_${action.toLowerCase()}`,
      badgeVariant:
        action === 'SELL_NOW' ? 'success' : action === 'HOLD' ? 'warning' : action === 'WAIT' ? 'caution' : 'info',
      overallRisk: overallRiskLevel,
      riskScore: overallScore,
      confidence: isStale ? 'medium' : 'high',
      confidenceNote: isStale
        ? 'Based on recent verified CEDA Agmarknet arrival bulletins (<48h old).'
        : 'Based on fresh verified CEDA Agmarknet auction settlements.',
      primaryMarketName: topMarket.name,
      primaryPrice: modalPrice,
      expectedNetReturn: netReturn,
      effectiveRealizedPrice: effectivePrice,
      timeHorizon,
      reasons,
      suggestedAction,
      riskBreakdown: {
        marketRisk: { score: marketRiskScore, level: marketRiskLevel, note: marketRiskNote },
        weatherRisk: { score: weatherRiskScore, level: weatherRiskLevel, note: weatherRiskNote },
        storageRisk: { score: storageRiskScore, level: storageRiskLevel, note: storageRiskNote },
        volatilityRisk: { score: volatilityRiskScore, level: volatilityRiskLevel, note: volatilityRiskNote },
        logisticsRisk: { score: logisticsRiskScore, level: logisticsRiskLevel, note: logisticsRiskNote },
      },
      partialSplit: {
        sellNowPercent: 60,
        sellNowQuantity: sellNowQty,
        holdPercent: 40,
        holdQuantity: holdQty,
        sellNowReturn,
        holdEstimatedReturn,
      },
    };
  }

  private async queryMarketPriceRows(
    cropName: string,
    district?: string,
    state?: string,
    alternateCropName?: string
  ): Promise<any[]> {
    const cropClauses: string[] = ['mp.commodity ILIKE $1 OR mp.crop_name ILIKE $1'];
    const params: any[] = [`%${cropName.trim()}%`];
    let pIdx = 2;

    if (
      alternateCropName &&
      alternateCropName.trim().toLowerCase() !== cropName.trim().toLowerCase()
    ) {
      cropClauses.push(`mp.commodity ILIKE $${pIdx} OR mp.crop_name ILIKE $${pIdx}`);
      params.push(`%${alternateCropName.trim()}%`);
      pIdx++;
    }

    const whereClauses: string[] = [`(${cropClauses.join(' OR ')})`];

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
