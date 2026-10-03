import { api } from './client';
import type { Recommendation, RiskAssessment } from '@/types';

export const recommendationApi = {
  getDaily: () =>
    api.get<{ success: boolean; recommendations: Recommendation[] }>('/recommendations/daily'),
  getById: (id: string) =>
    api.get<{ success: boolean; recommendation: Recommendation }>(`/recommendations/${id}`),
  completeAction: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/recommendations/${id}/complete`),
};

export const riskApi = {
  getAssessment: () =>
    api.get<{ success: boolean; assessment: RiskAssessment }>('/risk/assessment'),
};
