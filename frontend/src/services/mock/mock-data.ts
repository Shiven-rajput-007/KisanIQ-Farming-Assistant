import type { WeatherData, WeatherForecast, FarmingImplication } from '@/types/weather';
import type { Crop, CropStageInfo, CropAction } from '@/types/crop';
import type { MarketData, MarketComparison, PartialSelling } from '@/types/market';
import type { Recommendation, WhyExplanation, Alert } from '@/types/recommendation';
import type { RiskAssessment } from '@/types/risk';
import type { Notification } from '@/types/notification';
import type { ChatSuggestion } from '@/types/chat';
import type { Farmer, FarmProfile } from '@/types/farmer';

// ===== FARMER =====

export const mockFarmer: Farmer = {
  id: 'f1',
  name: 'Ramesh',
  phone: '+91 98765 43210',
  location: {
    district: 'Gwalior',
    state: 'Madhya Pradesh',
    village: 'Morar',
    pincode: '474006',
  },
  preferredLanguage: 'hi',
  profileComplete: true,
  createdAt: '2024-06-01',
};

export const mockFarmProfile: FarmProfile = {
  id: 'fp1',
  farmerId: 'f1',
  totalArea: 5,
  fields: [
    { id: 'field1', name: 'Main Field', area: 3, cropId: 'crop1', soilType: 'alluvial', irrigationType: 'borewell' },
    { id: 'field2', name: 'Side Field', area: 2, cropId: 'crop1', soilType: 'alluvial', irrigationType: 'canal' },
  ],
  soilType: 'alluvial',
  irrigationSource: 'borewell',
  crops: ['crop1'],
};

// ===== WEATHER =====

export const mockWeather: WeatherData = {
  temperature: 32,
  feelsLike: 34,
  condition: 'clear',
  conditionKey: 'clear',
  humidity: 62,
  windSpeed: 12,
  rainProbability: 20,
  expectedRainfall: 0,
  uvIndex: 7,
  sunrise: '06:15',
  sunset: '18:32',
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

export const mockForecast: WeatherForecast[] = [
  {
    date: new Date().toISOString(),
    dayName: 'Today',
    high: 34,
    low: 22,
    condition: 'clear',
    conditionKey: 'clear',
    rainProbability: 20,
    humidity: 62,
    windSpeed: 12,
  },
  {
    date: new Date(Date.now() + 86400000).toISOString(),
    dayName: 'Tomorrow',
    high: 30,
    low: 21,
    condition: 'rain',
    conditionKey: 'rain',
    rainProbability: 80,
    expectedRainfall: 18,
    humidity: 78,
    windSpeed: 15,
  },
  {
    date: new Date(Date.now() + 172800000).toISOString(),
    dayName: 'Day 3',
    high: 28,
    low: 20,
    condition: 'partly_cloudy',
    conditionKey: 'partly_cloudy',
    rainProbability: 30,
    humidity: 70,
    windSpeed: 10,
  },
];

export const mockFarmingImplications: FarmingImplication[] = [
  {
    id: 'fi1',
    type: 'irrigation',
    icon: '💧',
    titleKey: 'Postpone',
    actionKey: 'Rain expected tomorrow — skip irrigation today.',
    severity: 'positive',
  },
  {
    id: 'fi2',
    type: 'disease',
    icon: '🐛',
    titleKey: 'Medium',
    actionKey: 'Humidity rising — monitor for leaf rust.',
    severity: 'warning',
  },
  {
    id: 'fi3',
    type: 'field',
    icon: '🌾',
    titleKey: 'Inspect',
    actionKey: 'Inspect field after rain.',
    severity: 'caution',
  },
];

// ===== CROPS =====

export const mockCrops: Crop[] = [
  {
    id: 'crop1',
    name: 'Wheat',
    nameKey: 'wheat',
    variety: 'HD-2967',
    fieldId: 'field1',
    sowingDate: '2024-11-15',
    expectedHarvestDate: '2025-03-20',
    currentStage: 'flowering',
    daysOld: 85,
    health: {
      overall: 'low',
      weatherRisk: 'low',
      diseaseRisk: 'medium',
      waterStatus: 'low',
    },
    area: 5,
    expectedYield: 100,
    icon: '🌾',
  },
];

export const mockCropStages: CropStageInfo[] = [
  { stage: 'land_preparation', nameKey: 'land_preparation', completed: true, active: false },
  { stage: 'sowing', nameKey: 'sowing', completed: true, active: false },
  { stage: 'germination', nameKey: 'germination', completed: true, active: false },
  { stage: 'vegetative', nameKey: 'vegetative', completed: true, active: false },
  { stage: 'flowering', nameKey: 'flowering', completed: false, active: true },
  { stage: 'grain_filling', nameKey: 'grain_filling', completed: false, active: false },
  { stage: 'harvest', nameKey: 'harvest', completed: false, active: false },
];

export const mockCropActions: CropAction[] = [
  {
    id: 'ca1',
    type: 'irrigation',
    titleKey: 'Water',
    descriptionKey: 'No irrigation needed today.',
    priority: 'high',
    icon: '💧',
  },
  {
    id: 'ca2',
    type: 'inspection',
    titleKey: 'Health',
    descriptionKey: 'Check leaves for rust spots.',
    priority: 'medium',
    icon: '🐛',
  },
  {
    id: 'ca3',
    type: 'general',
    titleKey: 'Weather',
    descriptionKey: 'Rain expected tomorrow.',
    priority: 'low',
    icon: '🌦️',
  },
];

// ===== RECOMMENDATIONS =====

export const mockRecommendations: Recommendation[] = [
  {
    id: 'r1',
    actionCode: 'NO_IRRIGATION',
    category: 'irrigation',
    icon: '💧',
    titleKey: 'no_irrigation',
    descriptionKey: 'Rain is expected and crop water requirement is low.',
    status: 'recommended',
    priority: 1,
    riskLevel: 'low',
    timing: 'today',
    whyExplanation: {
      summaryKey: 'Why skip irrigation?',
      dataPoints: [
        { icon: '🌧️', labelKey: 'Rain probability', value: 80, unit: '%' },
        { icon: '🌧️', labelKey: 'Expected rainfall', value: 18, unit: 'mm' },
        { icon: '🌾', labelKey: 'Crop', value: 'Wheat' },
        { icon: '💧', labelKey: 'Last irrigation', value: '2 days ago' },
      ],
      conclusionKey: 'Rain expected and current water requirement is low. Postponing irrigation is better today.',
    },
    isDemo: true,
  },
  {
    id: 'r2',
    actionCode: 'INSPECT_CROP',
    category: 'crop_health',
    icon: '🐛',
    titleKey: 'inspect_crop',
    descriptionKey: 'Check leaves for spots or unusual patterns.',
    status: 'consider',
    priority: 2,
    riskLevel: 'medium',
    timing: 'today',
    isDemo: true,
  },
  {
    id: 'r3',
    actionCode: 'COMPARE_MARKETS',
    category: 'market',
    icon: '💰',
    titleKey: 'compare_markets',
    descriptionKey: 'Today selling prices are favorable.',
    status: 'consider',
    priority: 3,
    riskLevel: 'low',
    timing: 'today',
    isDemo: true,
  },
];

export const mockWhyExplanation: WhyExplanation = {
  summaryKey: 'Why skip irrigation?',
  dataPoints: [
    { icon: '🌧️', labelKey: 'Rain probability', value: 80, unit: '%' },
    { icon: '🌧️', labelKey: 'Expected rainfall', value: 18, unit: 'mm' },
    { icon: '🌾', labelKey: 'Crop', value: 'Wheat' },
    { icon: '💧', labelKey: 'Last irrigation', value: '2 days ago' },
  ],
  conclusionKey: 'Rain expected and current water requirement is low. Postponing irrigation is better today.',
  advancedDetails: 'Model confidence: 0.83. Based on IMD forecast data + soil moisture sensor readings + crop growth model v2.1.',
};

export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    severity: 'medium',
    titleKey: 'DHYAAN DEIN',
    descriptionKey: 'Heavy rain expected tomorrow. Check crop and drainage area.',
    actionKey: 'details',
    icon: '⚠️',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'a2',
    severity: 'low',
    titleKey: 'Disease Advisory',
    descriptionKey: 'Humidity increasing — disease risk may rise.',
    actionKey: 'inspect',
    icon: '🐛',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

// ===== MARKET =====

const marketA: MarketData = {
  id: 'mA',
  name: 'Mandi A (Lashkar)',
  location: 'Gwalior',
  distance: 15,
  cropName: 'Wheat',
  price: 2500,
  priceChange: 2.1,
  priceTrend: 'up',
  transportCost: 1500,
  commission: 2.5,
  loadingCost: 500,
  expectedWastage: 1,
  netReturn: 238000,
  riskLevel: 'low',
  demand: 'high',
  isRecommended: true,
  recommendationRank: 1,
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

const marketB: MarketData = {
  id: 'mB',
  name: 'Mandi B (Morar)',
  location: 'Gwalior',
  distance: 45,
  cropName: 'Wheat',
  price: 2650,
  priceChange: 3.5,
  priceTrend: 'up',
  transportCost: 4000,
  commission: 3,
  loadingCost: 800,
  expectedWastage: 2.5,
  netReturn: 225000,
  riskLevel: 'high',
  demand: 'medium',
  isRecommended: false,
  recommendationRank: 3,
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

const marketC: MarketData = {
  id: 'mC',
  name: 'Mandi C (Dabra)',
  location: 'Datia',
  distance: 25,
  cropName: 'Wheat',
  price: 2400,
  priceTrend: 'stable',
  transportCost: 2000,
  commission: 2,
  loadingCost: 500,
  expectedWastage: 1.5,
  netReturn: 228000,
  riskLevel: 'low',
  demand: 'medium',
  isRecommended: false,
  recommendationRank: 2,
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

const marketD: MarketData = {
  id: 'mD',
  name: 'Local Trader',
  location: 'Village',
  distance: 2,
  cropName: 'Wheat',
  price: 2200,
  priceTrend: 'stable',
  transportCost: 200,
  commission: 0,
  netReturn: 218000,
  riskLevel: 'low',
  demand: 'low',
  isRecommended: false,
  recommendationRank: 4,
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

export const mockMarketComparison: MarketComparison = {
  cropName: 'Wheat',
  availableQuantity: 100,
  markets: [marketA, marketB, marketC, marketD],
  bestPracticalOption: 'mA',
  lastUpdated: new Date().toISOString(),
};

export const mockPartialSelling: PartialSelling = {
  sellNow: {
    quantity: 60,
    marketId: 'mA',
    marketName: 'Mandi A (Lashkar)',
    estimatedReturn: 142800,
    reason: 'Current price attractive and demand high.',
  },
  holdFor: {
    quantity: 40,
    reason: 'Price uncertainty high',
    expectedPriceRange: { min: 2400, max: 2800 },
    suggestedDuration: '2-3 weeks',
  },
};

export const mockMarketWhyExplanation: WhyExplanation = {
  summaryKey: 'Why Mandi A?',
  dataPoints: [
    { icon: '💰', labelKey: 'Price', value: '₹2,500/q' },
    { icon: '🚛', labelKey: 'Distance', value: 15, unit: 'km' },
    { icon: '📦', labelKey: 'Transport cost', value: '₹1,500' },
    { icon: '📊', labelKey: 'Commission', value: '2.5%' },
    { icon: '📈', labelKey: 'Demand', value: 'High' },
  ],
  conclusionKey: 'Best net return after all costs. Lowest risk with high demand.',
};

// ===== RISK =====

export const mockRiskAssessment: RiskAssessment = {
  overallRisk: 'low',
  riskScore: 18,
  categories: [
    { id: 'rc1', type: 'weather', nameKey: 'weather', icon: '🌦️', level: 'low', score: 15 },
    { id: 'rc2', type: 'crop_health', nameKey: 'crop_health', icon: '🐛', level: 'medium', score: 35 },
    { id: 'rc3', type: 'market', nameKey: 'market', icon: '💰', level: 'low', score: 12 },
    { id: 'rc4', type: 'water', nameKey: 'water', icon: '💧', level: 'low', score: 10 },
  ],
  alerts: [
    {
      id: 'ra1',
      categoryType: 'crop_health',
      severity: 'medium',
      titleKey: 'Disease Risk Rising',
      descriptionKey: 'Humidity increasing — leaf rust risk may rise.',
      actionKey: 'Inspect your crop.',
      icon: '🐛',
    },
  ],
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};

// ===== NOTIFICATIONS =====

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'weather',
    severity: 'warning',
    titleKey: 'Rain Alert',
    descriptionKey: 'Rain expected tomorrow (80% probability).',
    icon: '🌧️',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: false,
  },
  {
    id: 'n2',
    type: 'market',
    severity: 'info',
    titleKey: 'Market Update',
    descriptionKey: 'Wheat prices at Mandi A increased by ₹50.',
    icon: '💰',
    timestamp: new Date(Date.now() - 18000000).toISOString(),
    read: false,
  },
  {
    id: 'n3',
    type: 'crop',
    severity: 'info',
    titleKey: 'Crop Reminder',
    descriptionKey: 'Time to inspect wheat for early signs of rust.',
    icon: '🌾',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
];

// ===== CHAT SUGGESTIONS =====

export const mockChatSuggestions: ChatSuggestion[] = [
  { id: 'cs1', icon: '🌧️', textKey: 'Will it rain tomorrow?', query: 'Kal baarish hogi kya?' },
  { id: 'cs2', icon: '💧', textKey: 'When should I water?', query: 'Paani kab dena chahiye?' },
  { id: 'cs3', icon: '🌾', textKey: 'How is my crop?', query: 'Meri fasal kaisi hai?' },
  { id: 'cs4', icon: '🐛', textKey: 'My crop has a problem?', query: 'Fasal mein koi problem hai?' },
  { id: 'cs5', icon: '💰', textKey: 'When should I sell?', query: 'Fasal kab bechein?' },
  { id: 'cs6', icon: '🌱', textKey: 'What crop next?', query: 'Agli fasal kya lagayein?' },
];
