import { cn } from '@/lib/utils';
import type { ChatSuggestion as ChatSuggestionType } from '@/types';

interface ChatSuggestionProps {
  suggestion: ChatSuggestionType;
  onClick?: (query: string) => void;
  className?: string;
}

function ChatSuggestionChip({ suggestion, onClick, className }: ChatSuggestionProps) {
  return (
    <button
      onClick={() => onClick?.(suggestion.query)}
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-xl border border-sand-200 bg-white',
        'hover:bg-sand-50 hover:border-agri-forest-200 transition-all text-left',
        'active:scale-[0.97] min-h-[48px]',
        className
      )}
    >
      <span className="text-lg shrink-0">{suggestion.icon}</span>
      <span className="text-sm font-medium text-sand-900">{suggestion.textKey}</span>
    </button>
  );
}

export { ChatSuggestionChip };
