import { Cloud, IndianRupee, Wheat, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/date';
import type { Notification } from '@/types';

const ICON_MAP = {
  weather: Cloud,
  market: IndianRupee,
  crop: Wheat,
  system: Bell,
};

const SEVERITY_DOT = {
  info: 'bg-agri-forest-500',
  warning: 'bg-agri-gold-500',
  critical: 'bg-risk-red-500',
};

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  className?: string;
}

function NotificationItem({ notification, onClick, className }: NotificationItemProps) {
  const IconComp = ICON_MAP[notification.type] || Bell;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 text-left transition-colors rounded-xl',
        notification.read ? 'bg-white' : 'bg-agri-forest-50/50',
        'hover:bg-sand-50 active:scale-[0.99]',
        className
      )}
    >
      <div className="relative mt-0.5">
        <IconComp className="h-5 w-5 text-sand-600" />
        {!notification.read && (
          <div className={cn('absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full', SEVERITY_DOT[notification.severity])} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', notification.read ? 'text-sand-700' : 'text-sand-900 font-semibold')}>
          {notification.titleKey}
        </p>
        <p className="text-xs text-sand-500 mt-0.5 truncate">{notification.descriptionKey}</p>
      </div>
      <span className="text-[10px] text-sand-400 shrink-0 mt-0.5">
        {formatRelativeTime(notification.timestamp)}
      </span>
    </button>
  );
}

export { NotificationItem };
