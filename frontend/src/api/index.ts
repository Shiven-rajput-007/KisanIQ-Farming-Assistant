import { api } from './client';
import type {
  WeatherData,
  WeatherForecast,
  FarmingImplication,
  Crop,
  CropStageInfo,
  CropAction,
  MarketData,
  PartialSelling,
  Recommendation,
  RiskAssessment,
  Notification,
  ChatMessage,
  Farmer,
  FarmProfile,
} from '@/types';

// ===== AUTH =====
export interface LoginResponse {
  success: boolean;
  token: string;
  farmer: Farmer;
}

export const authApi = {
  login: (phone: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { phone, password }),
  register: (data: any) =>
    api.post<LoginResponse>('/auth/register', data),
  getMe: () =>
    api.get<{ success: boolean; farmer: Farmer }>('/auth/me'),
};

// ===== DASHBOARD =====
export interface DashboardResponse {
  success: boolean;
  farmer: { id: string; name: string; location: string };
  weather: WeatherData;
  forecast: WeatherForecast[];
  farmingImplications: FarmingImplication[];
  recommendations: Recommendation[];
  alerts: any[];
  bestMarket: MarketData;
  crops: Crop[];
  lastUpdated: string;
}

export const dashboardApi = {
  getDashboard: (params?: { lat?: number; lon?: number; district?: string; state?: string }) => {
    const sp = new URLSearchParams();
    if (params?.lat !== undefined) sp.append('lat', params.lat.toString());
    if (params?.lon !== undefined) sp.append('lon', params.lon.toString());
    if (params?.district) sp.append('district', params.district);
    if (params?.state) sp.append('state', params.state);
    const qs = sp.toString();
    return api.get<DashboardResponse>(`/dashboard${qs ? `?${qs}` : ''}`);
  },
};

// ===== WEATHER =====
export interface WeatherResponse {
  success: boolean;
  current: WeatherData;
  forecast: WeatherForecast[];
  implications: FarmingImplication[];
}

export const weatherApi = {
  getWeather: (lat?: number, lon?: number) => {
    const sp = new URLSearchParams();
    if (lat !== undefined) sp.append('lat', lat.toString());
    if (lon !== undefined) sp.append('lon', lon.toString());
    const qs = sp.toString();
    return api.get<WeatherResponse>(`/weather/current${qs ? `?${qs}` : ''}`);
  },
};

// ===== CROPS =====
export interface CropsResponse {
  success: boolean;
  crops: Crop[];
  stages: CropStageInfo[];
  actions: CropAction[];
}

export const cropApi = {
  getCrops: () => api.get<CropsResponse>('/crops'),
  getCropById: (id: string) =>
    api.get<{ success: boolean; crop: Crop; stages: CropStageInfo[]; actions: CropAction[] }>(`/crops/${id}`),
  createCrop: (data: any) => api.post<{ success: boolean; cropId: string }>('/crops', data),
};

// ===== MARKET =====
export interface MarketComparisonResponse {
  success: boolean;
  cropName: string;
  availableQuantity: number;
  apiStatus?: {
    configured: boolean;
    source: string;
    isLive: boolean;
    note?: string;
    missingKey?: string;
    isStale?: boolean;
  };
  userCoordinates?: { lat: number; lon: number };
  markets: MarketData[];
  bestPracticalOption: string;
  partialSelling: PartialSelling;
  whyExplanation: any;
  lastUpdated: string;
}

export const marketApi = {
  getComparison: (
    crop: string = 'Wheat',
    quantity: number = 100,
    lat?: number,
    lon?: number,
    district?: string,
    state?: string
  ) => {
    const sp = new URLSearchParams({
      crop,
      quantity: quantity.toString(),
    });
    if (lat !== undefined) sp.append('lat', lat.toString());
    if (lon !== undefined) sp.append('lon', lon.toString());
    if (district) sp.append('district', district);
    if (state) sp.append('state', state);
    return api.get<MarketComparisonResponse>(`/market/comparison?${sp.toString()}`);
  },
  createOrder: (data: { marketId: string; cropName: string; quantity: number; agreedPrice: number }) =>
    api.post<{ success: boolean; order: any }>('/market/orders', data),
};

// ===== RECOMMENDATIONS =====
export const recommendationApi = {
  getDaily: (lat?: number, lon?: number) => {
    const sp = new URLSearchParams();
    if (lat !== undefined) sp.append('lat', lat.toString());
    if (lon !== undefined) sp.append('lon', lon.toString());
    const qs = sp.toString();
    return api.get<{ success: boolean; recommendations: Recommendation[] }>(`/recommendations/daily${qs ? `?${qs}` : ''}`);
  },
  completeAction: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/recommendations/${id}/complete`),
};

// ===== RISK =====
export const riskApi = {
  getAssessment: (lat?: number, lon?: number) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.set('lat', lat.toString());
    if (lon !== undefined && lon !== null) params.set('lon', lon.toString());
    const query = params.toString();
    return api.get<{ success: boolean; assessment: RiskAssessment }>(query ? `/risk/assessment?${query}` : '/risk/assessment');
  },
};

// ===== ASSISTANT =====
export interface AssistantChatContext {
  activeLocation?: {
    district?: string;
    state?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  language?: string;
  previousIntent?: string;
}

export interface AssistantActionProposal {
  type: string;
  requiresConfirmation: boolean;
  payload: any;
  summary: string;
}

export interface AssistantChatResponse {
  success: boolean;
  reply: string;
  intent?: string;
  entities?: Record<string, any>;
  action?: AssistantActionProposal;
  detectedLanguage?: string;
}

export const assistantApi = {
  chat: (query: string, context?: AssistantChatContext) =>
    api.post<AssistantChatResponse>('/assistant/chat', { query, context }),
  confirmAction: (actionType: string, payload: any) =>
    api.post<{ success: boolean; message: string; result?: any }>('/assistant/action/confirm', { actionType, payload }),
  getHistory: () =>
    api.get<{ success: boolean; messages: ChatMessage[] }>('/assistant/history'),
};

// ===== NOTIFICATIONS =====
export const notificationApi = {
  getNotifications: () =>
    api.get<{ success: boolean; notifications: Notification[] }>('/notifications'),
  markAsRead: (id: string) =>
    api.put<{ success: boolean; message: string }>(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put<{ success: boolean; message: string }>('/notifications/read-all'),
};

// ===== FARMER & PROFILE =====
export const farmerApi = {
  getProfile: () =>
    api.get<{ success: boolean; farmer: Farmer; farmProfile: FarmProfile }>('/farmer/profile'),
  updateProfile: (data: any) =>
    api.put<{ success: boolean; message: string }>('/farmer/profile', data),
  updateLocation: (data: { latitude?: number; longitude?: number; village?: string; district?: string; state?: string; pincode?: string }) =>
    api.put<{ success: boolean; message: string; location: any }>('/farmer/location', data),
  saveOnboarding: (data: any) =>
    api.post<{ success: boolean; message: string }>('/farmer/onboarding', data),
};

// ===== ORDERS & LOGISTICS =====
export const orderApi = {
  getOrders: () =>
    api.get<{ success: boolean; orders: any[] }>('/orders'),
  updateShipmentStatus: (id: string, status: string) =>
    api.put<{ success: boolean; message: string }>(`/orders/shipments/${id}/status`, { status }),
};

// ===== CROP LISTINGS (MARKETPLACE) =====
export interface CropListing {
  id: string;
  farmerId?: string;
  farmerName?: string;
  farmerPhone?: string;
  farmerLocation?: string;
  cropName: string;
  variety?: string;
  quantity: number;
  pricePerQuintal: number;
  qualityGrade: string;
  harvestDate?: string;
  availableFrom?: string;
  location?: string;
  description?: string;
  status: 'active' | 'sold' | 'cancelled';
  createdAt?: string;
}

export interface MarketplaceOrder {
  id: string;
  listingId?: string;
  cropName: string;
  quantity: number;
  pricePerQuintal: number;
  totalAmount: number;
  deliveryAddress: string;
  farmerName?: string;
  farmerPhone?: string;
  farmerLocation?: string;
  buyerName?: string;
  buyerPhone?: string;
  status: 'placed' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
  paymentStatus?: string;
  trackingCode?: string;
  notes?: string;
  createdAt?: string;
}

export const listingsApi = {
  getListings: (filters?: { crop?: string; grade?: string; state?: string; minPrice?: number; maxPrice?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.crop) params.append('crop', filters.crop);
    if (filters?.grade) params.append('grade', filters.grade);
    if (filters?.state) params.append('state', filters.state);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return api.get<{ success: boolean; count: number; listings: CropListing[] }>(`/listings${queryString ? `?${queryString}` : ''}`);
  },
  getFarmerListings: () =>
    api.get<{ success: boolean; listings: CropListing[]; incomingOrders: MarketplaceOrder[] }>('/listings/farmer/me'),
  createListing: (data: {
    cropName: string;
    variety?: string;
    quantityQuintals: number;
    pricePerQuintal: number;
    qualityGrade?: string;
    harvestDate?: string;
    location?: string;
    description?: string;
  }) =>
    api.post<{ success: boolean; message: string; listing: CropListing }>('/listings', data),
  updateListing: (id: string, data: any) =>
    api.put<{ success: boolean; message: string }>(`/listings/${id}`, data),
  deleteListing: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/listings/${id}`),
};

// ===== BUYER MARKETPLACE ORDERS =====
export const marketplaceApi = {
  placeOrder: (data: {
    listingId: string;
    quantityQuintals: number;
    deliveryAddress: string;
    buyerName?: string;
    buyerPhone?: string;
    notes?: string;
  }) =>
    api.post<{ success: boolean; message: string; order: MarketplaceOrder }>('/marketplace/orders', data),
  getBuyerOrders: () =>
    api.get<{ success: boolean; orders: MarketplaceOrder[] }>('/marketplace/orders/buyer'),
  updateOrderStatus: (id: string, status: string) =>
    api.put<{ success: boolean; message: string }>(`/marketplace/orders/${id}/status`, { status }),
  getBuyerProfile: () =>
    api.get<{ success: boolean; buyer: any }>('/marketplace/profile'),
};

// ===== SOIL TESTING & INTELLIGENCE =====
export interface Laboratory {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode?: string;
  phone?: string;
  email?: string;
  accreditation?: string;
  operatingStatus: string;
  turnaroundDays: number;
  supportedTests: string[];
  isDemo: boolean;
}

export interface SoilTestRequest {
  id: string;
  farmerId: string;
  farmId?: string;
  fieldId?: string;
  cropName: string;
  labId: string;
  labName?: string;
  sampleId: string;
  sampleCollectionDate: string;
  testTypes: string[];
  testingMode: 'LAB_TEST' | 'MANUAL_KIT' | 'IOT_SENSOR';
  status:
    | 'REQUESTED'
    | 'SAMPLE_PENDING'
    | 'SAMPLE_SUBMITTED'
    | 'RECEIVED_BY_LAB'
    | 'TESTING'
    | 'REPORT_READY'
    | 'COMPLETED';
  trackingNotes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SoilIndicatorEvaluation {
  parameter: string;
  value: number;
  unit: string;
  status: 'LOW' | 'OPTIMAL' | 'HIGH';
  statusMr: string;
  idealRange: string;
  interpretationMr: string;
}

export interface SoilReport {
  id: string;
  requestId?: string;
  farmerId: string;
  fieldId?: string;
  labId?: string;
  labName?: string;
  testDate: string;
  cropName: string;
  ph: number;
  ec: number;
  organicCarbon: number;
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  moisturePct?: number;
  overallHealth: string;
  deficiencies?: string[];
  recommendations?: string;
  pdfUrl?: string;
  isDemo: boolean;
  evaluation?: {
    overallRating: string;
    overallRatingMr: string;
    indicators: SoilIndicatorEvaluation[];
    recommendationsMr: string[];
    deficienciesMr: string[];
  };
  createdAt: string;
}

export const soilApi = {
  getLabs: () =>
    api.get<{ success: boolean; laboratories: Laboratory[] }>('/soil/labs'),
  getRequests: (farmerId?: string) =>
    api.get<{ success: boolean; requests: SoilTestRequest[] }>(
      `/soil/requests${farmerId ? `?farmerId=${farmerId}` : ''}`
    ),
  createRequest: (data: {
    labId: string;
    cropName: string;
    testTypes: string[];
    testingMode?: string;
    trackingNotes?: string;
    farmerId?: string;
    fieldId?: string;
  }) =>
    api.post<{ success: boolean; message: string; request: SoilTestRequest }>('/soil/requests', data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put<{ success: boolean; message: string; request: SoilTestRequest }>(
      `/soil/requests/${id}/status`,
      { status, notes }
    ),
  getLatestReport: (farmerId?: string) =>
    api.get<{ success: boolean; report: SoilReport | null }>(
      farmerId ? `/soil/reports/latest/${farmerId}` : `/soil/reports/latest`
    ),
  getReportsHistory: (farmerId?: string) =>
    api.get<{ success: boolean; reports: SoilReport[] }>(
      farmerId ? `/soil/reports/history/${farmerId}` : `/soil/reports/history`
    ),
  getSensorReading: (fieldId: string = 'field_1') =>
    api.get<{ success: boolean; reading: any }>(`/soil/sensors/latest/${fieldId}`),
};

