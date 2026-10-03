import { api } from './client';
import type { Notification } from '@/types';

export const notificationApi = {
  getAll: () =>
    api.get<{ success: boolean; notifications: Notification[] }>('/notifications'),
  markAsRead: (id: string) =>
    api.put<{ success: boolean }>(`/notifications/${id}/read`),
  markAllAsRead: () =>
    api.put<{ success: boolean }>('/notifications/read-all'),
};
