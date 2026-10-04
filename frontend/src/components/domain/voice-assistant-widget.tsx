import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { assistantApi } from '@/api';
import { useActiveLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';

export type AssistantState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ERROR';

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: string;
  action?: any;
  timestamp: string;
}

export function VoiceAssistantWidget() {
  const { t, i18n } = useTranslation('assistant');
  const { location } = useActiveLocation();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [voiceLang, setVoiceLang] = useState<'mr-IN' | 'hi-IN' | 'en-IN'>('mr-IN');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis();

  // Sync voice language with i18n language
  useEffect(() => {
    const currentLang = i18n.language || 'mr';
    if (currentLang === 'hi') {
      setVoiceLang('hi-IN');
    } else if (currentLang === 'en') {
      setVoiceLang('en-IN');
    } else {
      setVoiceLang('mr-IN');
    }
  }, [i18n.language]);

  // Sync speaking state
  useEffect(() => {
    if (!isSpeaking && assistantState === 'SPEAKING') {
      setAssistantState('IDLE');
    }
  }, [isSpeaking, assistantState]);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition({
    defaultLanguage: voiceLang,
    onFinalTranscript: (finalText) => {
      if (finalText.trim()) {
        handleUserQuery(finalText.trim());
      }
    },
  });

  // Keep assistantState in sync with SpeechRecognition
  useEffect(() => {
    if (isListening) {
      setAssistantState('LISTENING');
    } else if (assistantState === 'LISTENING') {
      // Stopped listening without speech
      if (!transcript) {
        setAssistantState('IDLE');
      }
    }
  }, [isListening]);

  useEffect(() => {
    if (speechError) {
      setAssistantState('ERROR');
      if (speechError === 'mic_permission_denied') {
        setErrorMessage(
          voiceLang === 'mr-IN'
            ? 'मायक्रोफोन परवानगी नाकारली गेली आहे. कृपया ब्राउझरमध्ये परवानगी द्या.'
            : 'Microphone permission denied.'
        );
      } else if (speechError === 'no_speech_detected') {
        setErrorMessage(
          voiceLang === 'mr-IN'
            ? 'काहीही ऐकू आले नाही. कृपया पुन्हा बोला.'
            : 'No speech heard. Please tap again.'
        );
      } else {
        setErrorMessage(speechError);
      }
    }
  }, [speechError, voiceLang]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, interimTranscript, assistantState]);

  const toggleListen = () => {
    if (assistantState === 'LISTENING') {
      stopListening();
      setAssistantState('IDLE');
    } else {
      stopSpeaking();
      resetTranscript();
      setErrorMessage(null);
      setAssistantState('LISTENING');
      startListening(voiceLang);
    }
  };

  const handleUserQuery = async (queryText: string) => {
    stopListening();
    stopSpeaking();
    setErrorMessage(null);
    setAssistantState('PROCESSING');

    // Add user message to history
    const userEntry: ChatEntry = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatHistory((prev) => [...prev, userEntry]);
    setInputText('');

    try {
      const res = await assistantApi.chat(queryText, {
        activeLocation: {
          district: location.district,
          state: location.state,
          latitude: location.latitude ?? undefined,
          longitude: location.longitude ?? undefined,
        },
        language: voiceLang.split('-')[0],
      });

      const assistantEntry: ChatEntry = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        intent: res.intent,
        action: res.action,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, assistantEntry]);

      if (res.action && res.action.requiresConfirmation) {
        setPendingAction(res.action);
      }

      // Auto-speak response
      if (autoSpeak && res.reply) {
        setAssistantState('SPEAKING');
        speak(res.reply, { lang: voiceLang });
      } else {
        setAssistantState('IDLE');
      }
    } catch (err: any) {
      console.error('Assistant error:', err);
      setAssistantState('ERROR');
      setErrorMessage(
        voiceLang === 'mr-IN'
          ? `माहिती मिळवताना त्रुटी आली (${err.message || 'सर्व्हर एरर'}).`
          : `Error contacting assistant: ${err.message}`
      );
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setAssistantState('PROCESSING');
    try {
      const res = await assistantApi.confirmAction(pendingAction.type, pendingAction.payload);
      setActionSuccess(res.message || 'कृती यशस्वीरित्या पूर्ण झाली!');
      setPendingAction(null);
      setAssistantState('IDLE');

      // Add assistant confirmation message
      const asstMsg: ChatEntry = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: res.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, asstMsg]);
      if (autoSpeak) {
        speak(res.message, { lang: voiceLang });
      }
    } catch (err: any) {
      setErrorMessage(`Action failed: ${err.message}`);
      setAssistantState('ERROR');
    }
  };

  const quickQuestionsMr = [
    'माझ्या मातीचा pH किती आहे?',
    'शेतात नायट्रोजन किती आहे?',
    'माती परीक्षण कसे करायचे?',
    'कोणतं खत टाकावं?',
    'उद्या पाऊस पडेल का?',
    'गव्हाचा बाजारभाव काय आहे?',
    'माल कुठे विकू?',
  ];

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Visible on all pages) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            toggleListen();
          }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 border-2 border-emerald-400 group"
          aria-label="कृषी सहाय्यक आवाज सुरू करा"
        >
          <div className="relative">
            <span className="text-xl">🎙️</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
            </span>
          </div>
          <span className="font-semibold text-sm md:text-base tracking-wide">
            कृषी सहाय्यक
          </span>
        </button>
      )}

      {/* 2. SLIDE-OVER ASSISTANT PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div
            className={`w-full ${
              isExpanded ? 'md:w-3/4 max-w-4xl' : 'md:w-[440px]'
            } bg-white h-full shadow-2xl flex flex-col transition-all duration-300 ease-in-out border-l border-sand-300`}
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-800 to-emerald-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1 bg-white/10 rounded-full">🎙️</span>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    KisanIQ कृषी सहाय्यक
                  </h2>
                  <p className="text-xs text-emerald-200">
                    मराठी व्हॉईस असिस्टंट (Voice Intelligence)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Language pill toggle */}
                <button
                  onClick={() =>
                    setVoiceLang((prev) =>
                      prev === 'mr-IN' ? 'hi-IN' : prev === 'hi-IN' ? 'en-IN' : 'mr-IN'
                    )
                  }
                  className="text-xs px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-950 text-emerald-200 rounded-lg border border-emerald-500/40 transition"
                  title="भाषा बदला (Change Voice Language)"
                >
                  {voiceLang === 'mr-IN'
                    ? 'मराठी'
                    : voiceLang === 'hi-IN'
                    ? 'हिन्दी'
                    : 'English'}
                </button>

                {/* Auto speak toggle */}
                <button
                  onClick={() => {
                    if (isSpeaking) stopSpeaking();
                    setAutoSpeak(!autoSpeak);
                  }}
                  className={`p-1.5 rounded-lg transition ${
                    autoSpeak
                      ? 'bg-emerald-600/60 text-white'
                      : 'bg-emerald-950 text-emerald-400 opacity-60'
                  }`}
                  title={autoSpeak ? 'आवाज सुरू आहे (Mute)' : 'आवाज बंद आहे (Unmute)'}
                >
                  {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>

                {/* Maximize toggle on desktop */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hidden md:block p-1.5 hover:bg-white/10 rounded-lg text-emerald-100"
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    stopListening();
                    stopSpeaking();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* State Indicator Banner */}
            <div
              className={`px-4 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
                assistantState === 'LISTENING'
                  ? 'bg-amber-100 text-amber-900 border-b border-amber-200'
                  : assistantState === 'PROCESSING'
                  ? 'bg-blue-100 text-blue-900 border-b border-blue-200'
                  : assistantState === 'SPEAKING'
                  ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-200'
                  : assistantState === 'ERROR'
                  ? 'bg-red-100 text-red-900 border-b border-red-200'
                  : 'bg-sand-100 text-sand-700 border-b border-sand-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {assistantState === 'LISTENING' && (
                  <>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                    <span>मायक्रोफोन चालू आहे... स्पष्ट बोला (Listening)</span>
                  </>
                )}
                {assistantState === 'PROCESSING' && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700" />
                    <span>किसानIQ उत्तर तयार करत आहे... (Processing)</span>
                  </>
                )}
                {assistantState === 'SPEAKING' && (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-emerald-700 animate-pulse" />
                    <span>उत्तर ऐकवत आहे... (Speaking)</span>
                  </>
                )}
                {assistantState === 'ERROR' && (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-red-700" />
                    <span>{errorMessage || 'त्रुटी आढळली'}</span>
                  </>
                )}
                {assistantState === 'IDLE' && (
                  <span>स्थिती: तयार (बोलण्यासाठी खालील माईक दाबा)</span>
                )}
              </div>

              {assistantState === 'SPEAKING' && (
                <button
                  onClick={stopSpeaking}
                  className="underline text-[11px] font-semibold text-emerald-800"
                >
                  थांबवा
                </button>
              )}
              {assistantState === 'ERROR' && (
                <button
                  onClick={toggleListen}
                  className="underline text-[11px] font-semibold text-red-800 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> पुन्हा करा
                </button>
              )}
            </div>

            {/* Chat Body */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-sand-50/70"
            >
              {/* Welcome message */}
              {chatHistory.length === 0 && (
                <div className="bg-white rounded-xl p-4 border border-sand-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>नमस्कार शेतकरी बंधू!</span>
                  </div>
                  <p className="text-xs text-sand-700 leading-relaxed">
                    मी KisanIQ कृषी सहाय्यक आहे. तुम्ही हवामान, माती परीक्षण (pH, नत्र, खते),
                    बाजारभाव आणि पीक रोगांबद्दल थेट <strong>मराठीत बोलून</strong> विचारू शकता.
                  </p>

                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-sand-500 mb-2 uppercase tracking-wider">
                      उदाहरणासाठी खालील प्रश्न विचारा:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quickQuestionsMr.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUserQuery(q)}
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-left transition active:scale-95"
                        >
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Message List */}
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-800 text-white rounded-tr-none'
                        : 'bg-white text-sand-900 border border-sand-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Speaker replay button on assistant message */}
                    {msg.role === 'assistant' && (
                      <div className="mt-2 pt-1 border-t border-sand-100 flex items-center justify-between text-[11px] text-sand-500">
                        <span>{msg.timestamp}</span>
                        <button
                          onClick={() => speak(msg.text, { lang: voiceLang })}
                          className="flex items-center gap-1 hover:text-emerald-700 transition"
                          title="पुन्हा ऐका"
                        >
                          <Volume2 className="h-3.5 w-3.5" /> ऐका
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Interim Real-time Speech Transcript */}
              {interimTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-tr-none px-4 py-2 bg-emerald-600/80 text-white text-sm italic animate-pulse">
                    {interimTranscript}...
                  </div>
                </div>
              )}

              {/* Processing Animation */}
              {assistantState === 'PROCESSING' && (
                <div className="flex justify-start">
                  <div className="bg-white border border-sand-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2 text-xs text-sand-600">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                    <span>उत्तर शोधत आहे...</span>
                  </div>
                </div>
              )}

              {/* Action Confirmation Card */}
              {pendingAction && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 shadow-md space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-700" />
                    <span>कृती पुष्टीकरण (Action Confirmation)</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {pendingAction.summary || 'ही कृती पूर्ण करावी का?'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConfirmAction}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition"
                    >
                      होय, पूर्ण करा
                    </button>
                    <button
                      onClick={() => setPendingAction(null)}
                      className="px-3 py-1.5 bg-white border border-sand-300 text-sand-700 hover:bg-sand-50 rounded-lg text-xs font-medium transition"
                    >
                      रद्द करा
                    </button>
                  </div>
                </div>
              )}

              {actionSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{actionSuccess}</span>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-3.5 bg-white border-t border-sand-200 space-y-2.5">
              {/* Big Pulsing Mic Area */}
              <div className="flex items-center justify-center">
                <button
                  onClick={toggleListen}
                  className={`relative p-4 rounded-full transition-all duration-300 shadow-lg ${
                    assistantState === 'LISTENING'
                      ? 'bg-red-600 text-white ring-8 ring-red-200 animate-pulse scale-105'
                      : assistantState === 'PROCESSING'
                      ? 'bg-blue-600 text-white animate-spin'
                      : assistantState === 'SPEAKING'
                      ? 'bg-amber-600 text-white ring-4 ring-amber-200'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:scale-105'
                  }`}
                  title={
                    assistantState === 'LISTENING'
                      ? 'बोलणे थांबवा'
                      : 'मराठीत बोलण्यासाठी दाबा'
                  }
                >
                  {assistantState === 'LISTENING' ? (
                    <Mic className="h-7 w-7" />
                  ) : assistantState === 'SPEAKING' ? (
                    <Volume2 className="h-7 w-7" />
                  ) : (
                    <Mic className="h-7 w-7" />
                  )}
                </button>
              </div>
              <p className="text-center text-[11px] text-sand-500 font-medium">
                {assistantState === 'LISTENING'
                  ? '🔴 ऐकत आहे... (थांबवण्यासाठी पुन्हा दाबा)'
                  : assistantState === 'SPEAKING'
                  ? '🔊 उत्तर बोलत आहे'
                  : '🎙️ बोलण्यासाठी वरील बटण दाबा'}
              </p>

              {/* Text input fallback */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputText.trim()) handleUserQuery(inputText);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="किंवा प्रश्न येथे मराठीत टाइप करा..."
                  className="flex-1 px-3.5 py-2 text-sm border border-sand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-sand-50 text-sand-900"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || assistantState === 'PROCESSING'}
                  className="p-2.5 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-40 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
