export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

export interface ChatSuggestion {
  id: string;
  icon: string;
  textKey: string;
  query: string;
}
