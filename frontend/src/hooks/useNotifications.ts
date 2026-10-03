import { useState, useEffect, useCallback } from 'react';
import { notificationApi } from '@/api';
import type { Notification } from '@/types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getNotifications();
      setNotifications(res.notifications || []);
      setIsFallback(false);
    } catch (err: any) {
      console.error('[useNotifications] API fetch failed:', err.message);
      setIsFallback(false);
      setError(err.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await notificationApi.markAsRead(id);
    } catch (e) {
      console.warn('Could not sync read status with backend:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, isLoading, error, isFallback, markAsRead, refetch: fetchNotifications };
}
