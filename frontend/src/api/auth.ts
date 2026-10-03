import { api } from './client';
import type { Farmer } from '@/types';

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
