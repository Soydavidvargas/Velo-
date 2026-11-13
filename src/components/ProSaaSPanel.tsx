import React, { useState, useEffect, useMemo } from 'react';
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
  MapPin,
  KeyRound,
  Megaphone,
  MessageSquare,
  Mail,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { Order, User, WorkerAd, DirectMessage, ServiceCategory } from '../types';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';
import { EmptyState } from './EmptyState';
import { SalesModule } from './SalesModule';
import { RealtimeChatDrawer } from './RealtimeChatDrawer';

interface ProSaaSPanelProps {
  currentPro: User;
  orders: Order[];
  pros?: User[];
  onRefreshOrders: () => void;
  onShowToast?: (title: string, message: string, type: 'info' | 'success' | 'alert' | 'push') => void;
  initialSubTab?: 'agenda' | 'ads' | 'messages' | 'sales' | 'invoices' | 'reviews';
  incomingMessages?: DirectMessage[];
}

export const ProSaaSPanel: React.FC<ProSaaSPanelProps> = ({
  currentPro,
  orders,
  pros = [],
  onRefreshOrders,
  onShowToast,
  initialSubTab = 'agenda',
  incomingMessages = [],
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'ads' | 'messages' | 'sales' | 'invoices' | 'reviews'>(initialSubTab);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Rappi-style arrival verification code input map
  const [arrivalCodeMap, setArrivalCodeMap] = useState<Record<string, string>>({});
  const [arrivalErrorMap, setArrivalErrorMap] = useState<Record<string, string>>({});

  // Worker Ads state
  const [myAds, setMyAds] = useState<WorkerAd[]>([]);
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adCategory, setAdCategory] = useState<ServiceCategory>('plumbing');
  const [adPrice, setAdPrice] = useState('95000');
  const [adCity, setAdCity] = useState((currentPro.city || 'Bogotá').split('(')[0].trim());
  const [creatingAd, setCreatingAd] = useState(false);

  // Messages / Inbox state
  const [messagesList, setMessagesList] = useState<DirectMessage[]>([]);
  const [chatPartner, setChatPartner] = useState<{ id: string; name: string; mode: 'chat' | 'email' } | null>(null);

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    apiClient
      .getWorkerAds({ proId: currentPro.id, includeInactive: true })
      .then(list => setMyAds(list))
      .catch(err => console.error('Error loading worker ads:', err));

    apiClient
      .getMessages(currentPro.id)
      .then(list => setMessagesList(list))
      .catch(err => console.error('Error loading pro messages:', err));
  }, [currentPro.id]);

  // Merge incoming live WebSocket messages
  useEffect(() => {
    if (!incomingMessages.length) return;
    setMessagesList(prev => {
      const seen = new Set(prev.map(m => m.id));
      const additions = incomingMessages.filter(
        m => !seen.has(m.id) && (m.proId === currentPro.id || m.clientId === currentPro.id)
      );
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [incomingMessages, currentPro.id]);

  // Filter orders related strictly to this worker
  const proOrders = orders.filter(o => o.proId === currentPro.id);
  const pendingEscrow = proOrders
    .filter(o => o.escrowStatus === 'ESCROW_HELD' || o.escrowStatus === 'COMPLETED_BY_PRO')
    .reduce((sum, o) => sum + o.commission.proNetEarnings, 0);

  const availableBalance = proOrders
    .filter(o => o.escrowStatus === 'RELEASED')
    .reduce((sum, o) => sum + o.commission.proNetEarnings, 0);

  const repeatClientsCount = currentPro.repeatClientsCount || 0;

  // Group threads for Inbox tab
  const inboxThreads = useMemo(() => {
    const map = new Map<string, { clientId: string; clientName: string; messages: DirectMessage[] }>();
    for (const msg of messagesList) {
      if (msg.proId !== currentPro.id) continue;
      if (!map.has(msg.clientId)) {
        map.set(msg.clientId, {
          clientId: msg.clientId,
          clientName: msg.clientName || 'Cliente Velo',
          messages: [],
        });
      }
      map.get(msg.clientId)!.messages.push(msg);
    }
    return Array.from(map.values()).sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1]?.timestamp || '';
      const lastB = b.messages[b.messages.length - 1]?.timestamp || '';
      return lastB.localeCompare(lastA);
    });
  }, [messagesList, currentPro.id]);

  // Verify Rappi Arrival PIN
  const handleVerifyArrival = async (orderId: string) => {
    const code = (arrivalCodeMap[orderId] || '').trim();
    if (!code) {
      setArrivalErrorMap(prev => ({
        ...prev,
        [orderId]: 'Ingresa el código de 4 dígitos que te entregó el cliente.',
      }));
      return;
    }
    setActionLoadingId(orderId);
    setArrivalErrorMap(prev => ({ ...prev, [orderId]: '' }));
    try {
      await apiClient.verifyArrivalCode(orderId, code, currentPro.id);
      onShowToast?.(
        'Llegada Verificada (Sistema Rappi)',
        'Has confirmado tu llegada al domicilio. Ya puedes ejecutar el servicio y marcarlo como finalizado.',
        'success'
      );
      setArrivalCodeMap(prev => ({ ...prev, [orderId]: '' }));
      onRefreshOrders();
    } catch (err: any) {
      setArrivalErrorMap(prev => ({ ...prev, [orderId]: err.message }));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pro accepts job (0 $ per lead)
  const handleAcceptOrder = async (orderId: string) => {
    setActionLoadingId(orderId);
    try {
      await apiClient.acceptOrderByPro(orderId);
      onShowToast?.(
        '¡Servicio Aceptado!',
        'Has confirmado la solicitud. 0 $ cobrados por cotizar.',
        'success'
      );
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
      onShowToast?.(
        'Solicitud Declinada Sin Penalización',
        `El sistema ha reasignado el trabajo a ${res.newPro.name} sin afectar tu puntuación.`,
        'info'
      );
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
      onShowToast?.(
        '¡Trabajo Marcado como Finalizado!',
        'El cliente ha sido notificado para validar y liberar los fondos a tu billetera.',
        'push'
      );
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

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adPrice) return;
    setCreatingAd(true);
    try {
      const created = await apiClient.createWorkerAd({
        proId: currentPro.id,
        title: adTitle.trim(),
        description: adDescription.trim() || `Servicio garantizado por ${currentPro.name} con custodia Velo.`,
        category: adCategory,
        priceFrom: Number(adPrice) || 95000,
        city: adCity,
      });
      setMyAds(prev => [created, ...prev]);
      setAdTitle('');
      setAdDescription('');
      onShowToast?.(
        'Anuncio Publicado',
        'Tu servicio ya aparece visible para clientes en el buscador.',
        'success'
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingAd(false);
    }
  };

  const handleToggleAdActive = async (ad: WorkerAd) => {
    try {
      const updated = await apiClient.updateWorkerAd(ad.id, { active: !ad.active });
      setMyAds(prev => prev.map(item => (item.id === ad.id ? updated : item)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Banner */}
      <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-2xl font-bold text-[#4e9ad9] shadow-inner shrink-0">
            {currentPro.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-[#0b3658] tracking-tight">
                {currentPro.name}
              </h2>
              {currentPro.verifiedIdentity ? (
                <span className="text-[11px] font-bold text-[#42b3b1] bg-[#42b3b1]/15 border border-[#42b3b1]/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cédula y Rostro Verificados
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#486984] bg-[#e6f1fa] border border-[#dde7ee] px-2.5 py-0.5 rounded-full">
                  Cuenta en Modo Prueba (Verificación omitida)
                </span>
              )}
            </div>
            <p className="text-xs text-[#486984] font-medium mt-0.5">
              {currentPro.trade} · {currentPro.city}
              {currentPro.cedula ? ` · C.C. ${currentPro.cedula}` : ''}
            </p>
            <div className="flex items-center gap-3 text-xs text-[#486984] mt-2">
              <span className="flex items-center gap-1 text-[#4e9ad9] font-bold">
                <Star className="w-3.5 h-3.5 fill-[#4e9ad9] text-[#4e9ad9]" />
                {currentPro.rating || 5.0}
              </span>
              <span className="text-[#dde7ee]">·</span>
              <span>{currentPro.completedJobsCount || 0} Trabajos realizados</span>
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
            onClick={() =>
              onShowToast?.(
                'Transferencia Iniciada',
                'Tu saldo disponible ha sido programado para transferencia bancaria en 24h hábiles.',
                'success'
              )
            }
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
            Dinero en Contratos en Curso
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
              : '15.0'}%
          </div>
          <span className="text-[11px] text-[#486984] mt-1 block">
            Baja hasta el 5% con clientes repetidos
          </span>
        </div>
      </div>

      {/* Sub-Tabs strictly for Worker Role */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#dde7ee] pb-2 text-xs font-semibold">
        {[
          { id: 'agenda', label: `Mi Agenda y Contratos (${proOrders.length})` },
          { id: 'ads', label: `Mis Anuncios (${myAds.length})` },
          { id: 'messages', label: `Mensajes (${inboxThreads.length})` },
          { id: 'sales', label: 'Gestión de Ventas' },
          { id: 'invoices', label: 'Facturas Emitidas' },
          { id: 'reviews', label: 'Opiniones de Clientes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#0b3658] text-white shadow-sm'
                : 'text-[#486984] hover:text-[#0b3658] bg-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Agenda + Rappi Arrival Verification */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {proOrders.length === 0 ? (
            <EmptyState
              type="pro_agenda"
              onAction={() => setActiveTab('ads')}
              actionLabel="Publicar un Anuncio para Recibir Contratos"
            />
          ) : (
            proOrders.map(order => {
              const isPendingAcceptance = order.proAccepted === false && order.escrowStatus === 'ESCROW_HELD';
              const needsArrivalVerification = order.escrowStatus === 'ESCROW_HELD' && !order.arrivalVerified;

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
                          <Bell className="w-4 h-4" />
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
                          <span>Aceptar Contrato</span>
                        </button>

                        <button
                          onClick={() => handleRejectOrder(order.id)}
                          disabled={actionLoadingId === order.id}
                          className="cord-btn-secondary px-3 py-1.5 rounded-full text-xs font-semibold text-[#486984] hover:text-[#0b3658]"
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
                        <span className="text-[#4e9ad9]">Visita #{order.commission.transactionNumberWithPro}</span>
                      </div>
                      <h4 className="text-sm font-bold text-[#0b3658]">{order.serviceTitle}</h4>
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

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setChatPartner({ id: order.clientId, name: order.clientName, mode: 'chat' })
                          }
                          className="cord-btn-secondary px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#4e9ad9]" />
                          <span>Chat</span>
                        </button>

                        {order.escrowStatus === 'ESCROW_HELD' && order.arrivalVerified && (
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

                  {/* Rappi-style Arrival Verification Box for Worker */}
                  {needsArrivalVerification && (
                    <div className="p-4 rounded-xl bg-[#f8fbfe] border border-[#4e9ad9]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[#0b3658] flex items-center gap-1.5">
                          <KeyRound className="w-4 h-4 text-[#4e9ad9]" />
                          <span>Verificar Llegada en Domicilio (Código Rappi del Cliente)</span>
                        </div>
                        <p className="text-[11px] text-[#486984]">
                          Al llegar donde {order.clientName}, pídele su código secreto de 4 dígitos y regístralo aquí para iniciar.
                        </p>
                        {arrivalErrorMap[order.id] && (
                          <p className="text-[11px] text-red-600 font-semibold pt-1">
                            {arrivalErrorMap[order.id]}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="text"
                          maxLength={6}
                          value={arrivalCodeMap[order.id] || ''}
                          onChange={e =>
                            setArrivalCodeMap(prev => ({ ...prev, [order.id]: e.target.value }))
                          }
                          placeholder="Ej: 4829"
                          className="w-28 px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-center font-mono font-bold text-sm text-[#0b3658] focus:outline-none focus:border-[#4e9ad9] tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyArrival(order.id)}
                          disabled={actionLoadingId === order.id}
                          className="cord-btn-primary px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                        >
                          {actionLoadingId === order.id ? 'Verificando...' : 'Confirmar Llegada'}
                        </button>
                      </div>
                    </div>
                  )}

                  {order.escrowStatus === 'ESCROW_HELD' && order.arrivalVerified && (
                    <div className="px-3.5 py-2 rounded-xl bg-[#42b3b1]/10 border border-[#42b3b1]/30 text-[#0b3658] font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#42b3b1]" />
                      <span>
                        Llegada verificada con el código del cliente
                        {order.arrivalVerifiedAt
                          ? ` (${new Date(order.arrivalVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                          : ''}
                        . Ya puedes finalizar el trabajo al concluir.
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Mis Anuncios */}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Publish Ad Form */}
          <form
            onSubmit={handleCreateAd}
            className="lg:col-span-5 cord-card p-6 bg-white border border-[#dde7ee] space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 border-b border-[#dde7ee] pb-3">
              <Megaphone className="w-4 h-4 text-[#4e9ad9]" />
              <h3 className="text-sm font-extrabold text-[#0b3658]">Publicar Nuevo Anuncio</h3>
            </div>

            <div>
              <label className="block font-bold text-[#0b3658] mb-1">Título del Anuncio *</label>
              <input
                type="text"
                required
                value={adTitle}
                onChange={e => setAdTitle(e.target.value)}
                placeholder="Ej: Destape de cañerías e instalación de grifería el mismo día"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-[#0b3658] mb-1">Categoría</label>
                <select
                  value={adCategory}
                  onChange={e => setAdCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658]"
                >
                  <option value="plumbing">Plomería</option>
                  <option value="electricity">Electricidad</option>
                  <option value="climatization">Gas & Clima</option>
                  <option value="locksmith">Cerrajería</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#0b3658] mb-1">Ciudad</label>
                <input
                  type="text"
                  value={adCity}
                  onChange={e => setAdCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0b3658] mb-1">Precio Base All-In (COP) *</label>
              <input
                type="number"
                required
                min={30000}
                value={adPrice}
                onChange={e => setAdPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs font-mono text-[#0b3658]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#0b3658] mb-1">Descripción de tu Servicio</label>
              <textarea
                rows={3}
                value={adDescription}
                onChange={e => setAdDescription(e.target.value)}
                placeholder="Explica qué incluye la visita, tu experiencia y zonas que cubres..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creatingAd}
              className="cord-btn-primary w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{creatingAd ? 'Publicando...' : 'Publicar Anuncio en Marketplace'}</span>
            </button>
          </form>

          {/* List of Worker's Own Ads */}
          <div className="lg:col-span-7 space-y-3">
            {myAds.length === 0 ? (
              <div className="cord-card p-8 text-center text-xs text-[#688dac] bg-white border border-[#dde7ee]">
                Aún no tienes anuncios publicados. Crea tu primer anuncio para que los clientes puedan encontrarte.
              </div>
            ) : (
              myAds.map(ad => (
                <div
                  key={ad.id}
                  className="cord-card p-5 bg-white border border-[#dde7ee] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#e6f1fa] text-[#0b3658] font-bold">
                        {ad.categoryLabel}
                      </span>
                      <span className="text-[#486984]">{ad.city}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${
                          ad.active ? 'bg-[#42b3b1]/15 text-[#42b3b1]' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {ad.active ? 'Visible para clientes' : 'Pausado'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#0b3658]">{ad.title}</h4>
                    <p className="text-[#486984]">{ad.description}</p>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                    <span className="text-base font-black text-[#0b3658] font-mono tabular-nums">
                      {formatCOP(ad.priceFrom)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleAdActive(ad)}
                      className="cord-btn-secondary px-3 py-1.5 text-[11px] font-bold"
                    >
                      {ad.active ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Mensajes con Clientes (Real-time Chat & Emails) */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {inboxThreads.length === 0 ? (
            <div className="cord-card p-10 text-center text-xs text-[#688dac] bg-white border border-[#dde7ee]">
              No tienes mensajes o correos de clientes todavía. Cuando un cliente te escriba desde tu perfil o anuncio, aparecerá aquí al instante.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inboxThreads.map(thread => {
                const last = thread.messages[thread.messages.length - 1];
                return (
                  <div
                    key={thread.clientId}
                    className="cord-card p-5 bg-white border border-[#dde7ee] flex flex-col justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-[#0b3658]">
                          {thread.clientName}
                        </span>
                        <span className="text-[10px] font-mono text-[#688dac]">
                          {new Date(last.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {last.type === 'email' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e6f1fa] text-[#4e9ad9] text-[10px] font-bold">
                          <Mail className="w-3 h-3" />
                          Correo: {last.subject}
                        </span>
                      )}
                      <p className="text-[#486984] line-clamp-2">{last.text}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#dde7ee]">
                      <button
                        type="button"
                        onClick={() =>
                          setChatPartner({ id: thread.clientId, name: thread.clientName, mode: 'chat' })
                        }
                        className="cord-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Responder en Tiempo Real</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setChatPartner({ id: thread.clientId, name: thread.clientName, mode: 'email' })
                        }
                        className="cord-btn-secondary px-3 py-2 text-xs font-bold flex items-center gap-1"
                      >
                        <Mail className="w-3.5 h-3.5 text-[#4e9ad9]" />
                        <span>Correo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Invoices */}
      {activeTab === 'invoices' && (
        <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0b3658]">Tus Facturas Oficiales</h3>
            <p className="text-xs text-[#486984]">
              Se generan automáticamente con desglose legal para tu declaración.
            </p>
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
                    <td className="py-3 px-3 font-sans text-[#0b3658]">{order.clientName}</td>
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
            <h3 className="text-sm font-bold text-[#0b3658] mb-1">Opiniones de tus Clientes</h3>
            <p className="text-[#486984]">
              Responde amablemente a las reseñas para agradecer la confianza.
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
                <div
                  key={order.id}
                  className="cord-card rounded-2xl p-5 bg-white border border-[#dde7ee] shadow-sm text-xs space-y-3"
                >
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

                  {order.clientReview?.proReply ? (
                    <div className="pl-4 border-l-2 border-[#4e9ad9] text-[#0b3658] space-y-1">
                      <span className="text-[11px] font-bold text-[#4e9ad9]">Tu respuesta:</span>
                      <p className="text-[#486984]">{order.clientReview.proReply}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
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

      {/* Tab Content: Gestión de Ventas (Trabajadores) */}
      {activeTab === 'sales' && (
        <SalesModule
          currentUser={currentPro}
          pros={pros.length > 0 ? pros : [currentPro]}
          onShowToast={onShowToast}
        />
      )}

      {/* Live Chat & Email Drawer with Clients */}
      {chatPartner && (
        <RealtimeChatDrawer
          isOpen={Boolean(chatPartner)}
          onClose={() => setChatPartner(null)}
          currentUser={currentPro}
          partner={{
            id: chatPartner.id,
            name: chatPartner.name,
          }}
          incomingMessages={incomingMessages}
          initialMode={chatPartner.mode}
        />
      )}
    </div>
  );
};
