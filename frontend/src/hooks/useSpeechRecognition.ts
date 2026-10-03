import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onnomatch: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionInstance;
    };
  }
}

export interface UseSpeechRecognitionOptions {
  onFinalTranscript?: (transcript: string) => void;
  defaultLanguage?: 'mr-IN' | 'hi-IN' | 'en-IN';
}

export function useSpeechRecognition({
  onFinalTranscript,
  defaultLanguage = 'mr-IN',
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onFinalCallbackRef = useRef(onFinalTranscript);
  onFinalCallbackRef.current = onFinalTranscript;

  useEffect(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionClass);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop error:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (lang?: string) => {
      setError(null);
      setInterimTranscript('');

      const SpeechRecognitionClass =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setError('speech_not_supported');
        return;
      }

      // If already running, stop previous instance cleanly
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = lang || defaultLanguage;

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          let finalUtterance = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalUtterance += result[0].transcript;
            } else {
              currentInterim += result[0].transcript;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalUtterance) {
            const cleaned = finalUtterance.trim();
            setTranscript(cleaned);
            setInterimTranscript('');
            if (onFinalCallbackRef.current) {
              onFinalCallbackRef.current(cleaned);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('[WebSpeech API] error:', event.error);
          if (event.error === 'not-allowed') {
            setError('mic_permission_denied');
          } else if (event.error === 'no-speech') {
            setError('no_speech_detected');
          } else if (event.error === 'network') {
            setError('network_error');
          } else {
            setError(event.error);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('[WebSpeech API] start failed:', err);
        setError(err?.message || 'failed_to_start');
        setIsListening(false);
      }
    },
    [defaultLanguage]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
