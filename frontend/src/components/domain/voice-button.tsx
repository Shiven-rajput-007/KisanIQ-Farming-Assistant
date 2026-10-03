import { Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface VoiceButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

function VoiceButton({ disabled = false, onClick, className }: VoiceButtonProps) {
  const { t } = useTranslation('assistant');

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
        disabled
          ? 'bg-sand-100 text-sand-400 cursor-not-allowed'
          : 'bg-agri-forest-800 text-white hover:bg-agri-forest-700 active:scale-[0.95] shadow-md hover:shadow-lg',
        className
      )}
    >
      <Mic className="h-8 w-8 text-emerald-300" />
      <span className="text-sm font-semibold">
        {t('voice_button')}
      </span>
      <span className="text-[11px] text-emerald-200">
        मराठी व्हॉईस इनपुट
      </span>
    </button>
  );
}

export { VoiceButton };
