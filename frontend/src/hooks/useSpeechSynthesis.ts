import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeechSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, []);

  const cleanTextForSpeech = (raw: string): string => {
    return raw
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold asterisks
      .replace(/\*(.*?)\*/g, '$1')     // remove italics
      .replace(/•/g, ', ')             // bullet to comma pause
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // markdown link
      .replace(/[#_~`]/g, '')          // markdown symbols
      .replace(/\n+/g, '. ')           // linebreaks to period pause
      .trim();
  };

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!isSupported || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      const targetLang = options.lang || 'mr-IN';
      utterance.lang = targetLang;
      utterance.rate = options.rate || 0.95; // slightly slower for clarity
      utterance.pitch = options.pitch || 1.0;

      // Match best available voice
      if (voices.length > 0) {
        // 1. Exact locale match (e.g. mr-IN, hi-IN, en-IN)
        let matchedVoice = voices.find(
          (v) => v.lang.toLowerCase() === targetLang.toLowerCase()
        );
        // 2. Language prefix match (e.g. 'mr', 'hi', 'en')
        if (!matchedVoice) {
          const prefix = targetLang.split('-')[0].toLowerCase();
          matchedVoice = voices.find((v) =>
            v.lang.toLowerCase().startsWith(prefix)
          );
        }
        // 3. Indian regional fallback if Marathi voice is not installed in the browser/OS
        if (!matchedVoice && targetLang.startsWith('mr')) {
          matchedVoice = voices.find(
            (v) => v.lang.toLowerCase() === 'hi-in' || v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase() === 'en-in'
          );
        }
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, voices]
  );

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    voices,
  };
}
