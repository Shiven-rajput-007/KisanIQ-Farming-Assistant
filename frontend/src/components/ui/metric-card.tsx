import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MetricCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  className?: string;
}

function MetricCard({ icon, label, value, unit, subtext, className }: MetricCardProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5 text-sand-600">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xl font-bold text-sand-900">{value}</span>
        {unit && <span className="text-sm text-sand-600">{unit}</span>}
      </div>
      {subtext && <span className="text-xs text-sand-500">{subtext}</span>}
    </div>
  );
}

export { MetricCard };
