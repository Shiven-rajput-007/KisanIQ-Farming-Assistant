export interface WeatherData {
  temperature: number;
  feelsLike?: number;
  condition: WeatherCondition;
  conditionKey: string; // i18n key
  humidity: number;
  windSpeed: number; // km/h
  rainProbability: number; // percentage
  expectedRainfall?: number; // mm
  uvIndex?: number;
  sunrise?: string;
  sunset?: string;
  lastUpdated: string;
  isDemo?: boolean;
}

export type WeatherCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'fog'
  | 'haze'
  | 'hot'
  | 'cold';

export interface WeatherForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  condition: WeatherCondition;
  conditionKey: string;
  rainProbability: number;
  expectedRainfall?: number;
  humidity: number;
  windSpeed: number;
}

export interface FarmingImplication {
  id: string;
  type: 'irrigation' | 'disease' | 'field' | 'harvest' | 'sowing' | 'general';
  icon: string;
  titleKey: string;
  actionKey: string;
  severity: 'positive' | 'warning' | 'caution';
}
