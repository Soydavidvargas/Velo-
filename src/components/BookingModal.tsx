import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  UserCheck 
} from 'lucide-react';
import { ServiceItem, User, CommissionBreakdown, WorkerAd } from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  currentUser: User;
  pros: User[];
  onOrderCreated: (newOrder: any) => void;
  initialNotes?: string;
  initialProId?: string;
  selectedAd?: WorkerAd | null;
  onTriggerPaymentRetryFlow?: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  service,
  currentUser,
  pros,
  onOrderCreated,
  initialNotes = '',
  initialProId,
  selectedAd = null,
  onTriggerPaymentRetryFlow,
}) => {
  const [selectedProId, setSelectedProId] = useState<string>(initialProId || pros[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState<string>('2026-11-12');
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState<string>('10:00 AM - 12:00 PM');
  const [address, setAddress] = useState<string>(currentUser.city || 'Calle 67 # 7-35, Apto 402, Chapinero, Bogotá');
  const [notes, setNotes] = useState<string>(initialNotes);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [quoteInfo, setQuoteInfo] = useState<{ transactionNumber: number; breakdown: CommissionBreakdown } | null>(null);

  useEffect(() => {
    if (initialProId) {
      setSelectedProId(initialProId);
    } else if (!selectedProId && pros[0]?.id) {
      setSelectedProId(pros[0].id);
    }
  }, [initialProId, pros]);

  useEffect(() => {
    setNotes(initialNotes || '');
  }, [initialNotes]);

  useEffect(() => {
    if (!service) return;
    apiClient.getQuote(currentUser.id, selectedProId, service.basePrice)
      .then(res => setQuoteInfo(res))
      .catch(err => console.error('Quote error:', err));
  }, [service, selectedProId, currentUser.id]);

  if (!isOpen || !service) return null;

  const selectedPro = pros.find(p => p.id === selectedProId) || pros[0];

  const handleConfirmEscrow = async () => {
    setSubmitting(true);
    try {
      const order = await apiClient.createOrder({
        clientId: currentUser.id,
        proId: selectedProId,
        serviceId: service.id,
        workerAdId: selectedAd?.id,
        customTitle: selectedAd?.title || service.title,
        customPrice: selectedAd?.priceFrom || service.basePrice,
        category: selectedAd?.category || service.category,
        scheduledDate: new Date(scheduledDate).toISOString(),
        scheduledTimeSlot,
        address,
        notes,
      });
      onOrderCreated(order);
      onClose();
    } catch (err: any) {
      alert(`Error al formalizar custodia: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 max-w-xl w-full my-8 relative border border-[#dde7ee] shadow-[0px_16px_48px_0px_rgba(11,54,88,0.16)] animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm">
            <Lock className="w-5 h-5 text-[#4e9ad9]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#0b3658] tracking-tight">
              Depósito en Custodia Segura
            </h2>
            <p className="text-xs text-[#486984]">
              Bóveda de Pago Protegido Velo Colombia · Fondos retenidos hasta tu visto bueno
            </p>
          </div>
        </div>

        {/* Selected Service Details */}
        <div className="p-4 rounded-2xl bg-[#e6f1fa]/60 border border-[#dde7ee] mb-4">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="cord-badge text-[10px] mb-1">
                {service.categoryLabel}
              </span>
              <h3 className="text-base font-bold text-[#0b3658] mt-1">
                {service.title}
              </h3>
              <p className="text-xs text-[#486984] mt-1">
                {service.description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-extrabold text-[#0b3658] font-mono tabular-nums">
                {formatCOP(service.basePrice)}
              </span>
              <span className="text-[10px] text-[#42b3b1] block font-semibold">✓ Tarifa All-In en COP</span>
            </div>
          </div>
        </div>

        {/* Pro Selector */}
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#0b3658] font-bold mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#4e9ad9]" />
              Profesional Asignado en Colombia:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {pros.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProId(p.id)}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    selectedProId === p.id
                      ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] shadow-sm font-semibold'
                      : 'bg-white border-[#dde7ee] text-[#486984] hover:border-[#4e9ad9]'
                  }`}
                >
                  <div className="font-bold text-[#0b3658] truncate">{p.name}</div>
                  <div className="text-[10px] text-[#486984] truncate">{p.trade}</div>
                  <div className="text-[10px] text-[#4e9ad9] mt-1 font-semibold">★ {p.rating}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Descuento por Fidelidad Transparency Card */}
          {quoteInfo && (
            <div className="p-4 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0b3658] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  Transparencia Total de Tarifas (Reverse Take Rate)
                </span>
                <span className="text-[#4e9ad9] font-bold font-mono">
                  Servicio #{quoteInfo.transactionNumber} con {selectedPro?.name.split(' ')[0]}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#dde7ee]">
                <div className="bg-white p-2 rounded-xl border border-[#dde7ee]">
                  <div className="text-[10px] text-[#486984]">Gestión Velo</div>
                  <div className="text-xs font-bold text-[#4e9ad9] font-mono">
                    {quoteInfo.breakdown.effectiveRatePercent}%
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#dde7ee]">
                  <div className="text-[10px] text-[#486984]">Ingreso Neto Técnico</div>
                  <div className="text-xs font-bold text-[#0b3658] font-mono">
                    {formatCOP(quoteInfo.breakdown.proNetEarnings)}
                  </div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-[#dde7ee]">
                  <div className="text-[10px] text-[#486984]">Ahorro Fidelidad</div>
                  <div className="text-xs font-bold text-[#42b3b1] font-mono">
                    +{quoteInfo.breakdown.discountPercent}%
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#486984] italic">
                A diferencia de otras plataformas, la comisión disminuye con cada trabajo repetido entre ambos en Colombia.
              </p>
            </div>
          )}

          {/* Date, Time, Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#0b3658] font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#4e9ad9]" />
                Fecha de Visita:
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
              />
            </div>
            <div>
              <label className="block text-[#0b3658] font-bold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#4e9ad9]" />
                Jornada / Franja Horaria:
              </label>
              <select
                value={scheduledTimeSlot}
                onChange={e => setScheduledTimeSlot(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
              >
                <option value="08:00 AM - 10:00 AM">08:00 AM - 10:00 AM (Mañana)</option>
                <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM (Mediodía)</option>
                <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM (Tarde)</option>
                <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM (Final de tarde)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#0b3658] font-bold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#4e9ad9]" />
              Dirección en Colombia:
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Ej: Calle 67 # 7-35, Apto 402, Chapinero, Bogotá"
              className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[#0b3658] font-bold mb-1">
              Indicaciones adicionales para el profesional:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Tocar el citófono 402 en portería o llamar al celular al llegar..."
              className="w-full rounded-2xl p-3 bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm resize-none"
            />
          </div>
        </div>

        {/* Security Assurance */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-start gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-[#4e9ad9] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0b3658] block">Garantía de Pago Protegido Velo Colombia:</span>
            <span className="text-[#486984]">
              Los fondos quedan retenidos en custodia fiduciaria. El técnico no recibe el dinero hasta que tú valides el trabajo en la app. Aceptamos PSE, Nequi, Daviplata y tarjetas bancarias sin sobrecostos.
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#dde7ee]">
          <div>
            {onTriggerPaymentRetryFlow && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerPaymentRetryFlow();
                }}
                className="text-[11px] text-[#4e9ad9] hover:text-[#0b3658] underline font-medium"
              >
                ¿Fallo en PSE o tarjeta? Ver flujo de reintento protegido (10 min)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cord-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmEscrow}
              disabled={submitting || !address.trim()}
              className="cord-btn-primary px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-white" />
              <span>
                {submitting ? 'Procesando Custodia...' : `Bloquear ${formatCOP(service.basePrice)} en Custodia`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
