import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

function SectionHeader({ title, icon, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-sand-900">{title}</h2>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-sm font-medium text-agri-forest-800 hover:text-agri-forest-500 transition-colors min-h-[44px] active:scale-[0.97]"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { SectionHeader };
