import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSectionProps {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

function ExpandableSection({ trigger, children, defaultOpen = false, className }: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (isOpen) {
          setHeight(entry.contentRect.height);
        }
      }
    });
    resizeObserver.observe(contentRef.current);
    return () => resizeObserver.disconnect();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHeight(contentRef.current?.scrollHeight ?? 0);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className={cn('', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-agri-forest-800 font-medium text-sm hover:text-agri-forest-500 transition-colors min-h-[44px] active:scale-[0.97]"
        aria-expanded={isOpen}
      >
        {trigger}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height: height ?? 'auto' }}
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  );
}

export { ExpandableSection };
