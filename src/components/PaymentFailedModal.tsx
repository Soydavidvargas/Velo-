import React, { useState, useEffect } from 'react';
import { AlertCircle, CreditCard, Clock, ArrowRight, ShieldCheck, Smartphone, RefreshCw, X } from 'lucide-react';
import { ServiceItem } from '../types';
import { formatCOP } from '../utils/formatCurrency';

interface PaymentFailedModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onRetrySuccess: (methodChosen: string) => void;
}

export const PaymentFailedModal: React.FC<PaymentFailedModalProps> = ({
  isOpen,
  onClose,
  service,
  onRetrySuccess,
}) => {
  // 10 minutes = 600 seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'bizum' | 'transfer'>('bizum');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(600);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = (secondsRemaining / 600) * 100;

  const handleRetry = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onRetrySuccess(selectedMethod);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 max-w-lg w-full relative border border-[#dde7ee] shadow-[0px_16px_48px_0px_rgba(11,54,88,0.16)] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0b3658] tracking-tight">
            Pago No Autorizado
          </h2>
          <p className="text-xs sm:text-sm text-[#486984] max-w-sm mx-auto">
            La entidad emisora no pudo autorizar la operación. Tu reserva se mantendrá guardada durante 10 minutos.
          </p>
        </div>

        {/* 10-Minute Hold Timer Banner */}
        <div className="p-4 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#0b3658]">
              <Clock className="w-4 h-4 text-[#4e9ad9]" />
              <span>Tiempo de Reserva Garantizado:</span>
            </span>
            <span className="font-mono text-base font-black text-[#0b3658] tabular-nums">
              {formattedTime}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-white overflow-hidden border border-[#dde7ee]">
            <div
              className="h-full bg-[#4e9ad9] transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-[#486984]">
            <span>Estado: Pendiente de Confirmación</span>
            <span className="font-semibold text-[#0b3658]">{service?.title || 'Servicio'} · {formatCOP(service?.basePrice || 0)}</span>
          </div>
        </div>

        {/* Alternative Payment Methods */}
        <div className="space-y-3 mb-6">
          <span className="text-xs font-bold text-[#0b3658] block">
            Selecciona un método alternativo para formalizar la custodia:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Bizum */}
            <button
              type="button"
              onClick={() => setSelectedMethod('bizum')}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                selectedMethod === 'bizum'
                  ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] shadow-sm font-bold'
                  : 'bg-white border-[#dde7ee] text-[#486984] hover:border-[#4e9ad9]'
              }`}
            >
              <Smartphone className="w-4 h-4 text-[#4e9ad9] mb-1.5" />
              <div className="font-bold text-[#0b3658]">Bizum / Móvil</div>
              <div className="text-[10px] text-[#486984] mt-0.5">Confirmación en 1-clic</div>
            </button>

            {/* Another Card */}
            <button
              type="button"
              onClick={() => setSelectedMethod('card')}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                selectedMethod === 'card'
                  ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] shadow-sm font-bold'
                  : 'bg-white border-[#dde7ee] text-[#486984] hover:border-[#4e9ad9]'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#4e9ad9] mb-1.5" />
              <div className="font-bold text-[#0b3658]">Otra Tarjeta</div>
              <div className="text-[10px] text-[#486984] mt-0.5">Visa o Mastercard</div>
            </button>

            {/* SEPA Transfer */}
            <button
              type="button"
              onClick={() => setSelectedMethod('transfer')}
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                selectedMethod === 'transfer'
                  ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] shadow-sm font-bold'
                  : 'bg-white border-[#dde7ee] text-[#486984] hover:border-[#4e9ad9]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#42b3b1] mb-1.5" />
              <div className="font-bold text-[#0b3658]">Transferencia</div>
              <div className="text-[10px] text-[#486984] mt-0.5">Custodia Bancaria</div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            disabled={submitting || secondsRemaining <= 0}
            className="cord-btn-primary w-full py-3 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>
              {submitting
                ? 'Validando con el nuevo método...'
                : `Reintentar Pago Seguro (${formatCOP(service?.basePrice || 0)} en Custodia)`}
            </span>
          </button>

          <p className="text-center text-xs text-[#486984]">
            El dinero se mantendrá retenido en custodia segura hasta que el profesional termine el trabajo a tu satisfacción.
          </p>
        </div>
      </div>
    </div>
  );
};
