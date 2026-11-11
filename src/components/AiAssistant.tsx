import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { AiRecommendation, ServiceItem } from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';

interface AiAssistantProps {
  services: ServiceItem[];
  onSelectServiceAndBook: (service: ServiceItem, initialNotes?: string) => void;
  onManualCategorySelect: (category: string) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  services,
  onSelectServiceAndBook,
  onManualCategorySelect,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const samplePrompts = [
    'El lavaplatos gotea agua por debajo hacia el suelo',
    'La luz salta cada vez que enciendo el horno y la lavadora',
    'El aire acondicionado echa aire pero no enfría la habitación',
    'Necesito cambiar el grifo de la cocina por uno nuevo',
  ];

  const handleAnalyze = async (queryText?: string) => {
    const textToAnalyze = queryText || promptInput;
    if (!textToAnalyze.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setStreamingText('');
    setRecommendation(null);
    setErrorMessage(null);

    // Timeout safety net (10 seconds)
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      // Connect to token-by-token streaming endpoint
      const response = await fetch(`/api/ai/recommend-stream?q=${encodeURIComponent(textToAnalyze)}`, {
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming not available, using direct fallback');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let finalData: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.replace('data: ', ''));
              if (payload.token) {
                accumulatedText += payload.token;
                setStreamingText(accumulatedText);
              }
              if (payload.fullData) {
                finalData = payload.fullData;
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      clearTimeout(timeoutId);

      if (finalData) {
        setRecommendation(finalData);
      } else {
        // Fallback to standard recommendation call if stream completed without final payload
        const rec = await apiClient.getAiRecommendation(textToAnalyze);
        setRecommendation(rec);
      }
    } catch {
      clearTimeout(timeoutId);
      // Graceful offline heuristic fallback
      try {
        const rec = await apiClient.getAiRecommendation(textToAnalyze);
        setRecommendation(rec);
      } catch {
        setErrorMessage('Puedes elegir directamente tu tipo de servicio si lo prefieres.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMatchingService = (category: string) => {
    return services.find(s => s.category === category) || services[0];
  };

  return (
    <div className="cord-card p-6 lg:p-8 relative overflow-hidden bg-white border border-[#dde7ee] shadow-[0px_12px_48px_0px_rgba(11,54,88,0.06)]">
      {/* Soft Ambient Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e6f1fa] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#e6f1fa] rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="relative z-10 space-y-4">
        {/* Header: Friendly & Human */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] shadow-sm shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0b3658] tracking-tight">
              ¿Qué necesitas reparar o instalar hoy?
            </h2>
            <p className="text-xs sm:text-sm text-[#486984]">
              Cuéntanos con tus propias palabras qué ocurre en tu casa y te mostraremos la solución y el precio justo.
            </p>
          </div>
        </div>

        {/* Input area */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              placeholder="Ej: Tengo una fuga bajo el fregadero o se apaga la calefacción..."
              className="w-full rounded-full px-5 py-3.5 bg-white border border-[#dde7ee] text-sm text-[#0b3658] placeholder-[#486984] focus:outline-none focus:border-[#4e9ad9] shadow-sm transition-all"
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !promptInput.trim()}
            className="cord-btn-primary px-6 py-3.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analizando...</span>
              </>
            ) : (
              <>
                <span>Consultar Solución</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Questions */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-xs font-semibold text-[#486984]">Ejemplos habituales:</span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPromptInput(p);
                handleAnalyze(p);
              }}
              className="text-left text-xs text-[#0b3658] bg-[#e6f1fa] hover:bg-[#dde7ee] border border-[#dde7ee] hover:border-[#4e9ad9] px-3.5 py-1.5 rounded-full transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Live Token-by-Token Streaming Display */}
        {loading && (
          <div className="mt-4 rounded-2xl p-5 border border-[#dde7ee] bg-[#e6f1fa]/60 space-y-3">
            <div className="flex items-center gap-2 text-xs text-[#4e9ad9]">
              <Sparkles className="w-4 h-4 text-[#4e9ad9] animate-pulse" />
              <span className="font-bold">Diagnóstico en tiempo real...</span>
            </div>
            
            {streamingText ? (
              <p className="text-sm text-[#0b3658] leading-relaxed font-sans border-l-2 border-[#4e9ad9] pl-3 py-1 bg-white/80 rounded-r-xl">
                {streamingText}
                <span className="inline-block w-1.5 h-4 ml-1 bg-[#4e9ad9] animate-pulse align-middle" />
              </p>
            ) : (
              <div className="space-y-2">
                <div className="h-4 w-48 rounded-md skeleton-shimmer" />
                <div className="h-4 w-full rounded-md skeleton-shimmer" />
              </div>
            )}
          </div>
        )}

        {/* Friendly Error Note */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[#e6f1fa] border border-[#4e9ad9] text-xs text-[#0b3658] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#4e9ad9] shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <select
              onChange={(e) => {
                onManualCategorySelect(e.target.value);
                setErrorMessage(null);
              }}
              className="bg-white text-xs font-semibold border border-[#dde7ee] rounded-xl px-3 py-1.5 text-[#0b3658]"
              defaultValue=""
            >
              <option value="" disabled>Elegir especialidad...</option>
              <option value="plumbing">Fontanería</option>
              <option value="electricity">Electricidad</option>
              <option value="climatization">Climatización</option>
            </select>
          </div>
        )}

        {/* Result Card: Clear & Straightforward */}
        {recommendation && !loading && (
          <div className="mt-4 rounded-2xl p-6 border border-[#dde7ee] bg-white space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dde7ee]">
              <div>
                <span className="cord-badge mb-1">
                  Trabajo Recomendado
                </span>
                <h3 className="text-lg font-bold text-[#0b3658] mt-1">
                  {recommendation.suggestedServiceTitle}
                </h3>
                <p className="text-sm text-[#486984] mt-1 max-w-xl">
                  {recommendation.diagnosticSummary}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-[#e6f1fa] px-4 py-2.5 rounded-2xl border border-[#dde7ee] text-right">
                  <span className="text-[10px] text-[#486984] block font-semibold uppercase tracking-wider">Precio Orientativo</span>
                  <span className="text-base font-extrabold text-[#0b3658] font-mono tabular-nums">
                    {formatCOP(recommendation.estimatedPriceRange.min)} - {formatCOP(recommendation.estimatedPriceRange.max)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    const matchedService = getMatchingService(recommendation.detectedCategory);
                    onSelectServiceAndBook(matchedService, promptInput);
                  }}
                  className="cord-btn-primary px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                >
                  <span>Reservar con Pago Seguro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Helpful Questions for the Visit */}
            {recommendation.suggestedQuestions && recommendation.suggestedQuestions.length > 0 && (
              <div className="text-xs space-y-2">
                <span className="text-xs font-bold text-[#0b3658] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#4e9ad9]" />
                  Consejos para cuando llegue el técnico:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendation.suggestedQuestions.map((q, idx) => (
                    <div key={idx} className="bg-[#e6f1fa] p-3 rounded-xl border border-[#dde7ee] text-[#0b3658] font-medium">
                      • {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
