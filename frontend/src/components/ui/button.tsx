import { type VariantProps, cva } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-forest-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none',
  {
    variants: {
      variant: {
        primary: 'bg-agri-forest-800 text-white hover:bg-agri-forest-700 shadow-sm',
        secondary: 'border-2 border-agri-forest-800 text-agri-forest-800 bg-white hover:bg-agri-forest-50',
        ghost: 'text-agri-forest-800 hover:bg-sand-100',
        destructive: 'bg-risk-red-500 text-white hover:bg-risk-red-600',
        gold: 'bg-agri-gold-500 text-white hover:bg-agri-gold-600 shadow-sm',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-base min-w-[48px]',
        lg: 'h-13 px-7 text-lg min-w-[48px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
