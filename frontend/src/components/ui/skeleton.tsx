import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'pulse' | 'shimmer';
}

function Skeleton({ className, variant = 'shimmer', ...props }: SkeletonProps) {
  if (variant === 'pulse') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn(
          'rounded-lg bg-sand-200 animate-pulse motion-reduce:animate-none',
          className
        )}
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-lg bg-sand-200 motion-reduce:animate-none',
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent"
        aria-hidden="true"
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export { Skeleton };
