import { useState, useEffect, useCallback } from 'react';
import { orderApi } from '@/api';

export function useOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await orderApi.getOrders();
      setOrders(res.orders || []);
    } catch (err: any) {
      console.warn('[useOrders] Failed to load orders from backend:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
