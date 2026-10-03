import { api } from './client';
import type { Farmer, FarmProfile } from '@/types';

export const farmerApi = {
  getProfile: () =>
    api.get<{ success: boolean; farmer: Farmer; profile: FarmProfile }>('/farmer/profile'),
  updateProfile: (data: Partial<FarmProfile & { name: string; phone: string }>) =>
    api.put<{ success: boolean; farmer: Farmer; profile: FarmProfile }>('/farmer/profile', data),
  submitOnboarding: (data: any) =>
    api.post<{ success: boolean; farmer: Farmer; profile: FarmProfile }>('/farmer/onboarding', data),
};
