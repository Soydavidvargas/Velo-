import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Download, 
  Star, 
  Send,
  Bell,
  CheckCircle2,
  XCircle,
  Timer,
  Clock,
  MapPin
} from 'lucide-react';
import { Order, User } from '../types';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';
import { EmptyState } from './EmptyState';

interface ProSaaSPanelProps {
  currentPro: User;
  orders: Order[];
  onRefreshOrders: () => void;
  onShowToast?: (title: string, message: string, type: 'info' | 'success' | 'alert' | 'push') => void;
}

export const ProSaaSPanel: React.FC<ProSaaSPanelProps> = ({
  currentPro,
  orders,
  onRefreshOrders,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'invoices' | 'reviews'>('agenda');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter orders related to this pro
  const proOrders = orders.filter(o => o.proId === currentPro.id);
  const pendingEscrow = proOrders
    .filter(o => o.escrowStatus === 'ESCROW_HELD' || o.escrowStatus === 'COMPLETED_BY_PRO')
    .reduce((sum, o) => sum + o.commission.proNetEarnings, 0);

  const availableBalance = proOrders
    .filter(o => o.escrowStatus === 'RELEASED')
    .reduce((sum, o) => sum + o.commission.proNetEarnings, 0);

  const repeatClientsCount = currentPro.repeatClientsCount || 12;

  // Pro accepts job (0 $ per lead)
  const handleAcceptOrder = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      await apiClient.acceptOrderByPro(orderId);
      if (onShowToast) {
        onShowToast(
          '¡Servicio Aceptado!',
          'Has confirmado la solicitud. 0 $ cobrados por presupuestar (0 pesos por lead).',
          'success'
        );
      }
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pro declines job without penalty
  const handleRejectOrder = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      const res = await apiClient.rejectOrderByPro(orderId, currentPro.id);
      if (onShowToast) {
        onShowToast(
          'Solicitud Declinada Sin Penalización',
          `El sistema ha reasignado el trabajo a ${res.newPro.name} sin afectar tu puntuación ni algoritmo.`,
          'info'
        );
      }
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pro marks as finished in app
  const handleMarkJobFinished = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      await apiClient.completeOrderByPro(orderId);
      if (onShowToast) {
        onShowToast(
          '¡Trabajo Marcado como Finalizado!',
          'El cliente ha sido notificado para validar y liberar los fondos a tu billetera.',
          'push'
        );
      }
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReply = async (orderId: string) => {
    const text = replyTextMap[orderId];
    if (!text || !text.trim()) return;

    setSubmittingReply(orderId);
    try {
      await apiClient.replyToReview(orderId, text);
      setReplyTextMap(prev => ({ ...prev, [orderId]: '' }));
      onRefreshOrders();
    } catch (err: any) {
      alert(`Error al enviar respuesta: ${err.message}`);
    } finally {
      setSubmittingReply(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Banner */}
      <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-2xl font-bold text-[#4e9ad9] shadow-inner">
            {currentPro.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0b3658] tracking-tight">
                {currentPro.name}
              </h2>
              <span className="text-[11px] font-bold text-[#42b3b1] bg-[#42b3b1]/15 border border-[#42b3b1]/30 px-2 py-0.5 rounded-full">
                ✓ Profesional Verificado
              </span>
            </div>
            <p className="text-xs text-[#486984] font-medium mt-0.5">
              {currentPro.trade} · {currentPro.city}
            </p>
            <div className="flex items-center gap-3 text-xs text-[#486984] mt-2">
              <span className="flex items-center gap-1 text-[#4e9ad9] font-bold">
                <Star className="w-3.5 h-3.5 fill-[#4e9ad9] text-[#4e9ad9]" />
                {currentPro.rating || 4.9}
              </span>
              <span className="text-[#dde7ee]">·</span>
              <span>{currentPro.completedJobsCount || 120} Trabajos realizados</span>
              <span className="text-[#dde7ee]">·</span>
              <span className="text-[#0b3658] font-semibold">
                {repeatClientsCount} Clientes habituales
              </span>
            </div>
          </div>
        </div>

        {/* Transfer Button */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => alert('Transferencia bancaria procesada. Llegará a tu cuenta en 24 horas laborables.')}
            className="cord-btn-primary px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Transferir Saldo a mi Banco</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm">
          <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-medium">
            Dinero Listo para Transferir
          </span>
          <div className="text-2xl lg:text-3xl font-black text-[#0b3658] font-mono mt-1 tabular-nums">
            {formatCOP(availableBalance)}
          </div>
          <span className="text-[11px] text-[#42b3b1] font-semibold mt-1 block">
            Aprobado y disponible inmediatamente
          </span>
        </div>

        <div className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm">
          <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-medium">
            Dinero en Trabajos en Curso
          </span>
          <div className="text-2xl lg:text-3xl font-black text-[#4e9ad9] font-mono mt-1 tabular-nums">
            {formatCOP(pendingEscrow)}
          </div>
          <span className="text-[11px] text-[#486984] mt-1 block">
            Garantizado y listo para entregarse al terminar
          </span>
        </div>

        <div className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm">
          <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-medium">
            Tarifa de Gestión Media
          </span>
          <div className="text-2xl lg:text-3xl font-black text-[#0b3658] font-mono mt-1 tabular-nums">
            {proOrders.length > 0
              ? (proOrders.reduce((sum, o) => sum + o.commission.effectiveRatePercent, 0) / proOrders.length).toFixed(1)
              : '12.0'}%
          </div>
          <span className="text-[11px] text-[#486984] mt-1 block">
            Baja hasta el 5% con clientes repetidos
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#dde7ee] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === 'agenda'
              ? 'bg-[#0b3658] text-white shadow-sm'
              : 'text-[#486984] hover:text-[#0b3658] bg-transparent'
          }`}
        >
          Mi Agenda de Visitas ({proOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === 'invoices'
              ? 'bg-[#0b3658] text-white shadow-sm'
              : 'text-[#486984] hover:text-[#0b3658] bg-transparent'
          }`}
        >
          Facturas Emitidas
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-full transition-all ${
            activeTab === 'reviews'
              ? 'bg-[#0b3658] text-white shadow-sm'
              : 'text-[#486984] hover:text-[#0b3658] bg-transparent'
          }`}
        >
          Opiniones de Clientes
        </button>
      </div>

      {/* Tab Content: Agenda */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {proOrders.length === 0 ? (
            <EmptyState
              type="pro_agenda"
              onAction={() => alert('¡Disponibilidad actualizada! Ahora apareces activo para solicitudes en tu zona.')}
              actionLabel="Activar mi Disponibilidad"
            />
          ) : (
            proOrders.map(order => {
              const isPendingAcceptance = order.proAccepted === false && order.escrowStatus === 'ESCROW_HELD';

              return (
                <div
                  key={order.id}
                  className={`cord-card rounded-2xl p-5 space-y-4 text-xs bg-white border ${
                    isPendingAcceptance ? 'border-[#4e9ad9] shadow-md ring-1 ring-[#4e9ad9]/30' : 'border-[#dde7ee]'
                  }`}
                >
                  {/* Incoming PUSH alert strip */}
                  {isPendingAcceptance && (
                    <div className="p-3.5 rounded-xl bg-[#e6f1fa] border border-[#dde7ee] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#4e9ad9] text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                          <Bell className="w-4 h-4 animate-bounce" />
                        </div>
                        <div>
                          <span className="font-bold text-[#0b3658] block text-xs">
                            ¡Nueva Solicitud Entrante en tu Zona! (0 $ por cotizar)
                          </span>
                          <span className="text-[11px] text-[#486984]">
                            Cliente con pago 100% garantizado en custodia preventiva.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          disabled={actionLoadingId === order.id}
                          className="cord-btn-primary px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aceptar Trabajo</span>
                        </button>

                        <button
                          onClick={() => handleRejectOrder(order.id)}
                          disabled={actionLoadingId === order.id}
                          className="cord-btn-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-[#486984] hover:text-[#0b3658]"
                          title="Se reasigna al siguiente técnico disponible sin penalizar tu cuenta ni algoritmo"
                        >
                          <XCircle className="w-3.5 h-3.5 text-[#688dac]" />
                          <span>Rechazar sin penalización</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Job Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[#486984] font-bold">
                        <span className="flex items-center gap-1 text-[#0b3658]">
                          <Clock className="w-3.5 h-3.5 text-[#4e9ad9]" />
                          {order.scheduledTimeSlot}
                        </span>
                        <span className="text-[#dde7ee]">·</span>
                        <span>{new Date(order.scheduledDate).toLocaleDateString()}</span>
                        <span className="text-[#dde7ee]">·</span>
                        <span className="text-[#4e9ad9]">Visita #{order.commission.transactionNumberWithPro} con este cliente</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#0b3658]">
                        {order.serviceTitle}
                      </h4>
                      <p className="text-[#486984]">
                        Cliente: <strong className="text-[#0b3658]">{order.clientName}</strong> ({order.clientPhone})
                      </p>
                      <p className="text-[#688dac] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#4e9ad9]" />
                        <span>{order.address}</span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-[#688dac] block font-medium">Ganancia Neta para ti</span>
                        <span className="text-lg font-black text-[#0b3658] font-mono tabular-nums">
                          {formatCOP(order.commission.proNetEarnings)}
                        </span>
                        <span className="text-[10px] text-[#486984] block">
                          Comisión Velo: {order.commission.effectiveRatePercent}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.escrowStatus === 'ESCROW_HELD' && (
                          <button
                            onClick={() => handleMarkJobFinished(order.id)}
                            disabled={actionLoadingId === order.id}
                            className="cord-btn-primary px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar Finalizado en mi App</span>
                          </button>
                        )}

                        {order.escrowStatus === 'COMPLETED_BY_PRO' && (
                          <span className="px-3 py-1.5 rounded-full bg-[#e6f1fa] border border-[#dde7ee] text-[#4e9ad9] text-[11px] font-bold flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5" />
                            <span>Esperando validación del cliente</span>
                          </span>
                        )}

                        {order.escrowStatus === 'RELEASED' && (
                          <span className="px-3 py-1.5 rounded-full bg-[#42b3b1]/15 border border-[#42b3b1]/30 text-[#42b3b1] text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cobrado en tu billetera</span>
                          </span>
                        )}

                        <button
                          onClick={() => generateInvoicePdf(order)}
                          className="cord-btn-secondary p-2.5 rounded-full text-[#0b3658] hover:text-[#4e9ad9]"
                          title="Descargar Factura Oficial"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Invoices */}
      {activeTab === 'invoices' && (
        <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0b3658]">
                Tus Facturas Oficiales
              </h3>
              <p className="text-xs text-[#486984]">
                Se generan automáticamente con desglose legal para tu gestoría o declaración.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#dde7ee] text-[#688dac] uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Nº Factura</th>
                  <th className="py-2.5 px-3 font-semibold">Cliente</th>
                  <th className="py-2.5 px-3 font-semibold">Servicio</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total Facturado</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Tu Ingreso</th>
                  <th className="py-2.5 px-3 font-semibold text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde7ee] text-[#0b3658] font-mono">
                {proOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#f8fbfe]">
                    <td className="py-3 px-3 text-[#4e9ad9] font-bold">
                      F-{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="py-3 px-3 font-sans text-[#0b3658]">
                      {order.clientName}
                    </td>
                    <td className="py-3 px-3 font-sans truncate max-w-[200px]">
                      {order.serviceTitle}
                    </td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums">
                      {formatCOP(order.allInPrice)}
                    </td>
                    <td className="py-3 px-3 text-right text-[#42b3b1] font-bold tabular-nums">
                      {formatCOP(order.commission.proNetEarnings)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => generateInvoicePdf(order)}
                        className="p-1.5 rounded-full bg-[#e6f1fa] border border-[#dde7ee] text-[#0b3658] hover:bg-[#dde7ee] inline-flex items-center gap-1 font-sans text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5 text-[#4e9ad9]" />
                        <span>Descargar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm text-xs text-[#0b3658]">
            <h3 className="text-sm font-bold text-[#0b3658] mb-1">
              Opiniones de tus Clientes
            </h3>
            <p className="text-[#486984]">
              Puedes responder amablemente a las reseñas para agradecer la confianza o aportar detalles.
            </p>
          </div>

          {proOrders.filter(o => o.clientReview).length === 0 ? (
            <div className="cord-card rounded-2xl p-8 bg-white border border-[#dde7ee] text-center text-xs text-[#688dac]">
              Aún no tienes valoraciones de clientes.
            </div>
          ) : (
            proOrders
              .filter(o => o.clientReview)
              .map(order => (
                <div key={order.id} className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#4e9ad9] fill-[#4e9ad9]" />
                      <span className="font-bold text-[#0b3658]">
                        {order.clientName} ({order.clientReview?.rating}/5)
                      </span>
                      <span className="text-[#dde7ee]">·</span>
                      <span className="text-[#486984]">{order.serviceTitle}</span>
                    </div>
                    <span className="text-[11px] text-[#688dac]">
                      {new Date(order.clientReview?.createdAt || '').toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-[#0b3658] italic bg-[#f8fbfe] p-3 rounded-xl border border-[#dde7ee]">
                    "{order.clientReview?.comment}"
                  </p>

                  {/* Reply */}
                  {order.clientReview?.proReply ? (
                    <div className="pl-4 border-l-2 border-[#4e9ad9] text-[#0b3658] space-y-1">
                      <span className="text-[11px] font-bold text-[#4e9ad9]">
                        Tu respuesta:
                      </span>
                      <p className="text-[#486984]">{order.clientReview.proReply}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-semibold text-[#486984]">
                        Responder a esta opinión:
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyTextMap[order.id] || ''}
                          onChange={e =>
                            setReplyTextMap({
                              ...replyTextMap,
                              [order.id]: e.target.value,
                            })
                          }
                          placeholder="Escribe un mensaje de agradecimiento..."
                          className="cord-input flex-1 rounded-full px-3 py-2 text-xs text-[#0b3658] placeholder-[#688dac]"
                        />
                        <button
                          onClick={() => handleSendReply(order.id)}
                          disabled={submittingReply === order.id}
                          className="cord-btn-primary px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Publicar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};
