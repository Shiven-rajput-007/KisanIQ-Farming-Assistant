import { useTranslation } from 'react-i18next';
import { CheckCheck } from 'lucide-react';
import { NotificationItem } from '@/components/domain/notification-item';
import { EmptyState } from '@/components/ui/empty-state';
import { DemoBanner } from '@/components/ui/demo-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationApi } from '@/api';

export default function NotificationsPage() {
  const { t } = useTranslation('notifications');
  const { notifications, isLoading, isFallback, markAsRead, refetch } = useNotifications();

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      refetch();
    } catch (e) {
      console.warn('Could not mark all as read:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isFallback && <DemoBanner className="mb-2" />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-sand-900">{t('title')}</h1>
        {notifications.some(n => !n.read) && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs">
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🔔</span>}
          title={t('empty')}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div key={notification.id} onClick={() => markAsRead(notification.id)}>
              <NotificationItem notification={notification} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
