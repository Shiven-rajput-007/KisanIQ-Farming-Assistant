import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatSuggestionChip } from '@/components/domain/chat-suggestion';
import { VoiceButton } from '@/components/domain/voice-button';
import { SectionHeader } from '@/components/ui/section-header';
import { assistantApi } from '@/api';
import type { ChatMessage } from '@/types';

const ASSISTANT_QUICK_QUESTIONS = [
  { id: 'q1', icon: '🌧️', key: 'quick_questions.rain_tomorrow' },
  { id: 'q2', icon: '💧', key: 'quick_questions.when_water' },
  { id: 'q3', icon: '🌾', key: 'quick_questions.crop_health' },
  { id: 'q4', icon: '🐛', key: 'quick_questions.crop_problem' },
  { id: 'q5', icon: '💰', key: 'quick_questions.when_sell' },
  { id: 'q6', icon: '🌱', key: 'quick_questions.next_crop' },
];

export default function AssistantPage() {
  const { t } = useTranslation('assistant');
  const location = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from backend on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await assistantApi.getHistory();
        if (res.messages && res.messages.length > 0) {
          setMessages(
            res.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.created_at,
            }))
          );
        }
      } catch (err) {
        console.warn('Could not load chat history:', err);
      }
    }
    loadHistory();
  }, []);

  // Handle passed initial query from navigation state
  useEffect(() => {
    const initialQuery = (location.state as any)?.initialQuery;
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (query?: string) => {
    const text = (query || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await assistantApi.chat(text);
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `${t('errors.network_error')} (${err.message})`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <h1 className="text-xl font-bold text-sand-900 flex items-center justify-center gap-2">
          <span>🤖</span> {t('title')}
        </h1>
        <p className="text-sm text-sand-600 mt-1">{t('subtitle')}</p>
      </div>

      {/* Voice Button */}
      <div className="flex justify-center">
        <VoiceButton />
      </div>

      {/* Quick Questions (shown when conversation is short) */}
      {messages.length < 3 && (
        <div>
          <SectionHeader title={t('title')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ASSISTANT_QUICK_QUESTIONS.map((item) => {
              const queryText = t(item.key);
              return (
                <ChatSuggestionChip
                  key={item.id}
                  suggestion={{
                    id: item.id,
                    icon: item.icon,
                    textKey: queryText,
                    query: queryText,
                  }}
                  onClick={(query) => handleSend(query)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="space-y-3 pb-24">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-agri-forest-800 text-white border-agri-forest-800 rounded-tr-none'
                  : 'bg-white border-sand-200 rounded-tl-none shadow-sm'
              }`}
            >
              <CardContent className="py-2.5 px-3.5">
                <p className={`text-sm whitespace-pre-line ${msg.role === 'user' ? 'text-white' : 'text-sand-900'}`}>
                  {msg.content}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-white border-sand-200 rounded-tl-none p-3 shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-agri-forest-800" />
              <span className="text-xs text-sand-600">{t('thinking')}</span>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="fixed bottom-16 md:bottom-4 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-20">
        <div className="flex gap-2 bg-white rounded-xl border border-sand-200 p-2 shadow-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('input_placeholder')}
            className="flex-1 px-3 py-2 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-sand-900"
            disabled={isLoading}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
