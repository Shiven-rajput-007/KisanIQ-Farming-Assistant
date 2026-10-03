import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

function ProgressIndicator({ currentStep, totalSteps, className }: ProgressIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 rounded-full flex-1 transition-colors duration-300',
            i < currentStep
              ? 'bg-agri-forest-800'
              : i === currentStep
              ? 'bg-agri-forest-500'
              : 'bg-sand-200'
          )}
        />
      ))}
    </div>
  );
}

export { ProgressIndicator };
