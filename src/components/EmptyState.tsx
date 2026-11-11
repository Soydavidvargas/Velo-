import React from 'react';
import { Calendar, Briefcase, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface EmptyStateProps {
  type: 'pro_agenda' | 'client_orders';
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onAction,
  actionLabel,
}) => {
  if (type === 'pro_agenda') {
    return (
      <div className="cord-card rounded-3xl p-8 lg:p-12 text-center space-y-5 bg-white border border-[#dde7ee] shadow-sm relative overflow-hidden">
        {/* Soft subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#e6f1fa] rounded-full blur-3xl pointer-events-none" />

        {/* Visual Illustration Container */}
        <div className="relative z-10 w-20 h-20 mx-auto rounded-3xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm transform hover:scale-105 transition-transform duration-300">
          <Calendar className="w-10 h-10 text-[#4e9ad9]" strokeWidth={1.8} />
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-lg bg-[#42b3b1] flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="relative z-10 space-y-2 max-w-md mx-auto">
          <h3 className="text-lg lg:text-xl font-extrabold text-[#0b3658] tracking-tight">
            ¡Tu agenda está lista para recibir solicitudes!
          </h3>
          <p className="text-xs text-[#486984] leading-relaxed">
            Aún no tienes visitas programadas. Completa tus zonas habituales y activa tu disponibilidad para empezar a recibir avisos de clientes sin pagar por presupuestar.
          </p>
        </div>

        {/* 3 Quick tips */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <CheckCircle2 className="w-4 h-4 text-[#4e9ad9] mb-1" />
            <div className="font-bold text-[#0b3658]">0 $ por Lead</div>
            <div className="text-[10px] text-[#486984] mt-0.5">Nunca pagas por cotizar</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <CheckCircle2 className="w-4 h-4 text-[#42b3b1] mb-1" />
            <div className="font-bold text-[#0b3658]">Cobro Seguro</div>
            <div className="text-[10px] text-[#486984] mt-0.5">Fondos en custodia</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <CheckCircle2 className="w-4 h-4 text-[#4e9ad9] mb-1" />
            <div className="font-bold text-[#0b3658]">Comisión al 5%</div>
            <div className="text-[10px] text-[#486984] mt-0.5">Con clientes habituales</div>
          </div>
        </div>

        {onAction && (
          <div className="relative z-10 pt-2">
            <button
              onClick={onAction}
              className="cord-btn-primary px-6 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel || 'Activar mi Disponibilidad'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Client Orders Empty State
  return (
    <div className="cord-card rounded-3xl p-8 lg:p-12 text-center space-y-4 bg-white border border-[#dde7ee] shadow-sm">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9]">
        <Briefcase className="w-10 h-10" />
      </div>
      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-bold text-[#0b3658]">
          No tienes encargos activos en este momento
        </h3>
        <p className="text-xs text-[#486984]">
          Busca un servicio del hogar en el catálogo oficial o describe tu avería para contar con la protección de custodia Velo.
        </p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="cord-btn-primary px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2"
        >
          <span>{actionLabel || 'Explorar Servicios'}</span>
        </button>
      )}
    </div>
  );
};
