import { api } from './client';

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
  testingMode: string;
  status: string;
  trackingNotes?: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SoilParameterEvaluation {
  key: string;
  name: string;
  nameMr: string;
  value: number;
  unit: string;
  level: 'low' | 'optimal' | 'high';
  ratingTextMr: string;
  ratingTextEn: string;
  explanationMr: string;
  explanationEn: string;
}

export interface SoilReport {
  id: string;
  requestId?: string;
  farmerId: string;
  fieldId?: string;
  labId: string;
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
    overallHealth: string;
    overallTextMr: string;
    overallTextEn: string;
    parameters: SoilParameterEvaluation[];
    deficienciesMr: string[];
    deficienciesEn: string[];
    recommendationsMr: string[];
    recommendationsEn: string[];
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
  getLatestReport: (farmerId: string = 'farmer_ramesh') =>
    api.get<{ success: boolean; report: SoilReport | null }>(`/soil/reports/latest/${farmerId}`),
  getReportsHistory: (farmerId: string = 'farmer_ramesh') =>
    api.get<{ success: boolean; reports: SoilReport[] }>(`/soil/reports/history/${farmerId}`),
  getSensorReading: (fieldId: string = 'field_1') =>
    api.get<{ success: boolean; reading: any; sensor?: any }>(`/soil/sensors/latest/${fieldId}`),
};
