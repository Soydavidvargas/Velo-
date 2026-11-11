import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Heart, TrendingDown, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Order } from '../types';

interface SuccessCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onViewFavorites?: () => void;
  onBookAgain?: () => void;
}

export const SuccessCelebrationModal: React.FC<SuccessCelebrationModalProps> = ({
  isOpen,
  onClose,
  order,
  onViewFavorites,
  onBookAgain,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#4e9ad9', '#42b3b1', '#0b3658', '#688dac', '#ffffff'],
      });
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const nextVisitNumber = order.commission.transactionNumberWithPro + 1;
  const nextDiscountPercent = nextVisitNumber === 2 ? 6 : nextVisitNumber === 3 ? 8 : 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/60 backdrop-blur-sm overflow-y-auto">
      <div className="cord-card rounded-3xl p-6 lg:p-8 max-w-lg w-full relative bg-white border border-[#dde7ee] shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#486984] hover:text-[#0b3658] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trophy Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-md mb-4 transform hover:scale-105 transition-transform">
          <Award className="w-10 h-10 text-[#4e9ad9]" strokeWidth={2.2} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#42b3b1]/15 border border-[#42b3b1]/30 text-xs font-bold text-[#42b3b1] mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#42b3b1]" />
          <span>¡Servicio Finalizado y Pago Liberado!</span>
        </div>

        <h2 className="text-2xl font-black text-[#0b3658] tracking-tight">
          ¡Transacción Exitosa con {order.proName}!
        </h2>

        <p className="text-xs text-[#486984] mt-2 max-w-sm mx-auto leading-relaxed">
          Los fondos han sido transferidos al profesional tras tu validación. El trabajo queda garantizado por 6 meses con factura oficial.
        </p>

        {/* Bucle de Retención (Reverse Take Rate Retention Loop) */}
        <div className="mt-6 p-4 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4e9ad9]">
            <TrendingDown className="w-4 h-4 text-[#4e9ad9]" />
            <span>Beneficio por Fidelidad Activado (Reverse Take Rate)</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#dde7ee]">
            <p className="text-xs text-[#0b3658] font-medium leading-relaxed">
              "Si vuelves a contratar a <strong className="text-[#4e9ad9]">{order.proName}</strong> en el futuro, ¡ahorrarás un <strong className="text-[#42b3b1]">{nextDiscountPercent}%</strong> gracias a nuestra comisión reducida por fidelidad!"
            </p>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="flex items-center gap-1.5 text-[#486984] font-semibold">
              <Heart className="w-4 h-4 fill-[#4e9ad9] text-[#4e9ad9]" />
              <span>Añadido automáticamente a tus <strong>Técnicos Favoritos</strong></span>
            </span>
            <span className="text-[10px] text-[#0b3658] font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-[#dde7ee]">
              Visita #{nextVisitNumber} con tarifa reducida
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onViewFavorites) onViewFavorites();
            }}
            className="cord-btn-secondary w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Heart className="w-4 h-4 text-[#4e9ad9]" />
            <span>Ver Mis Favoritos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onBookAgain) onBookAgain();
            }}
            className="cord-btn-primary w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <span>Explorar Más Servicios</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
