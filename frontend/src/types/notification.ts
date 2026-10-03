export interface Notification {
  id: string;
  type: 'weather' | 'market' | 'crop' | 'system';
  severity: 'info' | 'warning' | 'critical';
  titleKey: string;
  descriptionKey: string;
  icon: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}
