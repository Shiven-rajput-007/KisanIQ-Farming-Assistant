import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-agri-leaf-100 text-agri-leaf-700 border border-agri-leaf-300',
        warning: 'bg-agri-gold-100 text-agri-gold-700 border border-agri-gold-300',
        danger: 'bg-risk-red-100 text-risk-red-600 border border-risk-red-500/30',
        caution: 'bg-risk-amber-100 text-risk-amber-600 border border-risk-amber-500/30',
        info: 'bg-agri-forest-100 text-agri-forest-700 border border-agri-forest-200',
        neutral: 'bg-sand-100 text-sand-600 border border-sand-200',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
