import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Heart, 
  Star, 
  Timer,
  Clock,
  KeyRound,
  MessageSquare,
  Mail,
  Navigation
} from 'lucide-react';
import { Order, User, DirectMessage } from '../types';
import { apiClient } from '../services/apiClient';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { formatCOP } from '../utils/formatCurrency';
import { HumanSupportChat } from './HumanSupportChat';
import { SuccessCelebrationModal } from './SuccessCelebrationModal';
import { RealtimeChatDrawer } from './RealtimeChatDrawer';

interface EscrowTrackerProps {
  orders: Order[];
  currentUser: User;
  onRefreshOrders: () => void;
  onSelectTab: (tab: any) => void;
  incomingMessages?: DirectMessage[];
}

export const EscrowTracker: React.FC<EscrowTrackerProps> = ({
  orders,
  currentUser,
  onRefreshOrders,
  onSelectTab,
  incomingMessages = [],
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>('');
  const [isOpeningDispute, setIsOpeningDispute] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [favoritePros, setFavoritePros] = useState<string[]>(['usr_pro_mario']);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [celebrationOrder, setCelebrationOrder] = useState<Order | null>(null);
  const [chatDrawerMode, setChatDrawerMode] = useState<'chat' | 'email' | null>(null);

  const activeOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4e9ad9', '#42b3b1', '#0b3658', '#688dac'],
    });
  };

  const handleClientReleaseFunds = async (orderId: string) => {
    setActionLoading(true);
    try {
      const released = await apiClient.releaseEscrowFunds(orderId, 'client');
      if (released.proId && !favoritePros.includes(released.proId)) {
        setFavoritePros(prev => [...prev, released.proId]);
      }
      setCelebrationOrder(released);
      triggerConfetti();
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAutoRelease24h = async (orderId: string) => {
    setActionLoading(true);
    try {
      const released = await apiClient.releaseEscrowFunds(orderId, 'auto_timer');
      if (released.proId && !favoritePros.includes(released.proId)) {
        setFavoritePros(prev => [...prev, released.proId]);
      }
      setCelebrationOrder(released);
      triggerConfetti();
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadInvoice = (order: Order) => {
    try {
      generateInvoicePdf(order);
      onRefreshOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (orderId: string, message: string) => {
    try {
      await apiClient.sendDisputeMessage(orderId, currentUser.id, currentUser.name, currentUser.role, message);
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveDispute = async (orderId: string, resolution: 'release_to_pro' | 'refund_client', notes: string) => {
    try {
      await apiClient.resolveDispute(orderId, resolution, notes);
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenDispute = async (orderId: string) => {
    if (!disputeReasonInput.trim()) {
      alert('Por favor indícanos qué problema ha ocurrido');
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.openDispute(orderId, disputeReasonInput);
      setIsOpeningDispute(false);
      setDisputeReasonInput('');
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (orderId: string) => {
    if (!reviewComment.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.submitReview(orderId, reviewRating, reviewComment);
      setReviewComment('');
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleFavorite = (proId: string) => {
    setFavoritePros(prev =>
      prev.includes(proId) ? prev.filter(id => id !== proId) : [...prev, proId]
    );
  };

  const getFriendlyStatus = (status: Order['escrowStatus']) => {
    switch (status) {
      case 'ESCROW_HELD':
        return (
          <span className="cord-badge">
            <Lock className="w-3.5 h-3.5" />
            Dinero Protegido en Custodia
          </span>
        );
      case 'COMPLETED_BY_PRO':
        return (
          <span className="cord-badge text-[#0b3658] bg-[#dde7ee]">
            <Timer className="w-3.5 h-3.5 text-[#4e9ad9] animate-pulse" />
            Finalizado (Esperando confirmación)
          </span>
        );
      case 'RELEASED':
        return (
          <span className="cord-badge text-[#42b3b1] bg-[#e6f1fa]">
            <Unlock className="w-3.5 h-3.5 text-[#42b3b1]" />
            Pago Liberado con Éxito
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="cord-badge text-[#0b3658] bg-[#dde7ee]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#4e9ad9]" />
            En Mediación Activa
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="cord-badge">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Reembolsado al Cliente
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Clear Explanation for Non-Technical Users */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#dde7ee] pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b3658] tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#4e9ad9]" />
            Bóveda de Pago Protegido (Escrow)
          </h2>
          <p className="text-sm text-[#486984] mt-0.5">
            Tu dinero nunca se entrega por adelantado. Permanece seguro hasta que confirmes que el trabajo quedó perfecto.
          </p>
        </div>

        {/* Clean order dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#486984]">Ver Encargo:</span>
          <select
            value={activeOrder?.id || ''}
            onChange={e => setSelectedOrderId(e.target.value)}
            className="bg-white border border-[#dde7ee] text-[#0b3658] text-xs font-semibold rounded-full px-4 py-2 shadow-sm focus:outline-none focus:border-[#4e9ad9]"
          >
            {orders.map(o => (
              <option key={o.id} value={o.id} className="bg-white text-[#0b3658]">
                Nº {o.id.slice(-6)} · {o.serviceTitle.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Order Card */}
      {activeOrder && (
        <div className="cord-card p-6 lg:p-8 space-y-6 bg-white border border-[#dde7ee]">
          {/* Summary Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#dde7ee]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-[#4e9ad9]">
                  ORDEN #{activeOrder.id.slice(-6).toUpperCase()}
                </span>
                <span>·</span>
                {getFriendlyStatus(activeOrder.escrowStatus)}
              </div>
              <h3 className="text-xl font-bold text-[#0b3658]">
                {activeOrder.serviceTitle}
              </h3>
              <p className="text-xs text-[#486984]">
                Cliente: <strong className="text-[#0b3658]">{activeOrder.clientName}</strong> · Profesional: <strong className="text-[#0b3658]">{activeOrder.proName} ({activeOrder.proTrade})</strong>
              </p>
            </div>

            {/* Money Box */}
            <div className="bg-[#e6f1fa] p-4 rounded-2xl border border-[#dde7ee] flex items-center gap-4 shrink-0 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-[#486984] uppercase tracking-wider block font-semibold">
                  Total Pagado (Protegido)
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#0b3658] font-mono tabular-nums">
                  {formatCOP(activeOrder.allInPrice)}
                </div>
                <div className="text-[10px] text-[#42b3b1] font-semibold">
                  ✓ Precio All-In cerrado
                </div>
              </div>
            </div>
          </div>

          {/* Simple Step Progression */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#688dac] uppercase tracking-wider">
              Estado de tu Trabajo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl border bg-white border-[#dde7ee] shadow-sm">
                <div className="font-bold flex items-center gap-1.5 text-[#0b3658]">
                  <CheckCircle2 className="w-4 h-4 text-[#4e9ad9]" />
                  <span>1. Pago Seguro</span>
                </div>
                <p className="text-xs text-[#486984] mt-1">
                  Tu dinero queda reservado en custodia sin transferirse.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl border bg-white border-[#dde7ee] shadow-sm">
                <div className="font-bold flex items-center gap-1.5 text-[#0b3658]">
                  <Clock className="w-4 h-4 text-[#4e9ad9]" />
                  <span>2. Visita Técnica</span>
                </div>
                <p className="text-xs text-[#486984] mt-1">
                  Fecha fijada para el {new Date(activeOrder.scheduledDate).toLocaleDateString()}.
                </p>
              </div>

              {/* Step 3 */}
              <div className={`p-4 rounded-2xl border shadow-sm ${
                activeOrder.escrowStatus === 'COMPLETED_BY_PRO'
                  ? 'bg-[#e6f1fa] border-[#4e9ad9]'
                  : 'bg-white border-[#dde7ee]'
              }`}>
                <div className="font-bold flex items-center gap-1.5 text-[#0b3658]">
                  <Timer className="w-4 h-4 text-[#4e9ad9]" />
                  <span>3. Verificación</span>
                </div>
                <p className="text-xs text-[#486984] mt-1">
                  Pruebas que la avería quedó solucionada.
                </p>
              </div>

              {/* Step 4 */}
              <div className={`p-4 rounded-2xl border shadow-sm ${
                activeOrder.escrowStatus === 'RELEASED'
                  ? 'bg-[#e6f1fa] border-[#42b3b1]'
                  : 'bg-white border-[#dde7ee]'
              }`}>
                <div className="font-bold flex items-center gap-1.5 text-[#0b3658]">
                  <Unlock className="w-4 h-4 text-[#42b3b1]" />
                  <span>4. Pago y Factura</span>
                </div>
                <p className="text-xs text-[#486984] mt-1">
                  Liberación al técnico y factura oficial con garantía.
                </p>
              </div>
            </div>
          </div>

          {/* Rappi-Style Arrival Verification Panel (Visible strictly to Client) */}
          {(activeOrder.escrowStatus === 'ESCROW_HELD' || activeOrder.arrivalVerified) && (
            <div
              className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                activeOrder.arrivalVerified
                  ? 'bg-[#e6f1fa]/50 border-[#42b3b1]/40'
                  : 'bg-[#f8fbfe] border-[#4e9ad9]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#0b3658]">
                  {activeOrder.arrivalVerified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#42b3b1]" />
                      <span>Llegada del Trabajador Verificada (Sistema Rappi)</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-[#4e9ad9]" />
                      <span>Esperando llegada de {activeOrder.proName}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#486984] max-w-xl leading-relaxed">
                  {activeOrder.arrivalVerified
                    ? `El trabajador registró tu código de seguridad correctamente${
                        activeOrder.arrivalVerifiedAt
                          ? ` el ${new Date(activeOrder.arrivalVerifiedAt).toLocaleString()}`
                          : ''
                      }. El servicio está en ejecución protegida.`
                    : 'Cuando el trabajador toque a tu puerta, entrégale este código de 4 dígitos para que lo registre en su aplicación y confirme su llegada.'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {!activeOrder.arrivalVerified && activeOrder.arrivalCode && (
                  <div className="px-5 py-3 rounded-2xl bg-[#0b3658] text-white text-center shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider text-[#e6f1fa]/80 font-bold flex items-center justify-center gap-1">
                      <KeyRound className="w-3 h-3 text-[#4e9ad9]" />
                      Código de Llegada
                    </span>
                    <div className="text-2xl font-black font-mono tracking-[0.28em] tabular-nums mt-0.5">
                      {activeOrder.arrivalCode}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChatDrawerMode('chat')}
                    className="cord-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#4e9ad9]" />
                    <span>Chat en vivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatDrawerMode('email')}
                    className="cord-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#4e9ad9]" />
                    <span>Enviar correo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Area conditioned by Escrow Status */}
          <div className="pt-2">
            {/* In Progress */}
            {activeOrder.escrowStatus === 'ESCROW_HELD' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
                <div>
                  <div className="text-sm font-bold text-[#0b3658]">
                    {activeOrder.arrivalVerified
                      ? 'El trabajador ya está en tu domicilio realizando el servicio'
                      : 'Fondos protegidos en custodia esperando la visita'}
                  </div>
                  <div className="text-xs text-[#486984]">
                    Cuando concluya el trabajo, el trabajador lo marcará como finalizado para que apruebes el pago.
                  </div>
                </div>
                <span className="px-4 py-2 rounded-full bg-white border border-[#dde7ee] text-xs font-bold text-[#0b3658] whitespace-nowrap">
                  {activeOrder.arrivalVerified ? 'Servicio en ejecución' : 'Pendiente código de llegada'}
                </span>
              </div>
            )}

            {/* Completed -> Client approves or reports issue */}
            {activeOrder.escrowStatus === 'COMPLETED_BY_PRO' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#e6f1fa] border border-[#4e9ad9] text-sm">
                  <div className="font-bold flex items-center gap-1.5 text-[#0b3658]">
                    <Timer className="w-4 h-4 text-[#4e9ad9]" />
                    <span>El técnico ha terminado. ¿Ha quedado todo correcto?</span>
                  </div>
                  <p className="mt-1 text-xs text-[#486984]">
                    Revisa que el aparato o la avería funcione bien. Si estás de acuerdo, pulsa "Aprobar y Entregar Pago". Si notas algún fallo, indícalo para que te ayudemos.
                  </p>
                </div>

                {!isOpeningDispute ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleClientReleaseFunds(activeOrder.id)}
                      disabled={actionLoading}
                      className="cord-btn-primary px-6 py-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{actionLoading ? 'Confirmando...' : 'Aprobar y Entregar Pago al Técnico'}</span>
                    </button>

                    <button
                      onClick={() => setIsOpeningDispute(true)}
                      className="cord-btn-secondary px-5 py-3 rounded-full text-xs sm:text-sm font-bold"
                    >
                      <span>No quedó bien / Necesito ayuda</span>
                    </button>

                    <button
                      onClick={() => handleTriggerAutoRelease24h(activeOrder.id)}
                      className="cord-btn-ghost px-4 py-2 rounded-full text-xs font-medium text-[#486984]"
                    >
                      Garantía de Plazo Cumplido (Liberación 24h)
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white border border-[#dde7ee] space-y-3 shadow-sm">
                    <div className="text-sm font-bold text-[#0b3658] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#4e9ad9]" />
                      <span>Solicitar Ayuda del Equipo Velo</span>
                    </div>
                    <p className="text-xs text-[#486984]">
                      Tu dinero se mantendrá 100% retenido y una persona del equipo se pondrá en contacto contigo para solucionarlo.
                    </p>
                    <textarea
                      rows={2}
                      value={disputeReasonInput}
                      onChange={e => setDisputeReasonInput(e.target.value)}
                      placeholder="Explícanos brevemente qué detalle no quedó resuelto..."
                      className="w-full rounded-2xl p-3 bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenDispute(activeOrder.id)}
                        disabled={actionLoading}
                        className="cord-btn-primary text-xs px-5 py-2 rounded-full"
                      >
                        Enviar a Mediación
                      </button>
                      <button
                        onClick={() => setIsOpeningDispute(false)}
                        className="cord-btn-ghost text-xs px-4 py-2"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Released -> Success message & official PDF invoice */}
            {activeOrder.escrowStatus === 'RELEASED' && (
              <div className="p-5 rounded-2xl bg-[#e6f1fa] border border-[#42b3b1]/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#0b3658]">
                      <CheckCircle2 className="w-5 h-5 text-[#42b3b1]" />
                      <span>¡Trabajo Completado y Pago Entregado con Éxito!</span>
                    </div>
                    <p className="text-xs text-[#486984]">
                      Gracias por confiar en Velo. Tu factura oficial con 6 meses de garantía ya está disponible.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadInvoice(activeOrder)}
                      className="cord-btn-primary px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-white" />
                      <span>Descargar Factura PDF</span>
                    </button>

                    <button
                      onClick={() => toggleFavorite(activeOrder.proId)}
                      className={`p-2.5 rounded-full border transition-all ${
                        favoritePros.includes(activeOrder.proId)
                          ? 'bg-[#4e9ad9] text-white border-[#4e9ad9]'
                          : 'bg-white text-[#486984] border-[#dde7ee] hover:border-[#4e9ad9]'
                      }`}
                      title={favoritePros.includes(activeOrder.proId) ? 'Técnico en favoritos' : 'Añadir a favoritos'}
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Review section if not reviewed */}
                {!activeOrder.clientReview ? (
                  <div className="pt-3 border-t border-[#dde7ee] space-y-3">
                    <span className="text-xs font-bold text-[#0b3658] block">
                      Valora tu experiencia con {activeOrder.proName}:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                        >
                          <Star className={`w-5 h-5 ${star <= reviewRating ? 'fill-[#4e9ad9] text-[#4e9ad9]' : 'text-[#dde7ee]'}`} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Escribe un comentario breve sobre la puntualidad y el resultado..."
                        className="flex-1 px-4 py-2 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                      />
                      <button
                        onClick={() => handleSubmitReview(activeOrder.id)}
                        disabled={!reviewComment.trim() || actionLoading}
                        className="cord-btn-primary text-xs px-4 py-2 rounded-full whitespace-nowrap"
                      >
                        Enviar Reseña
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-[#dde7ee] text-xs space-y-1">
                    <span className="font-semibold text-[#0b3658]">Tu reseña enviada:</span>
                    <div className="flex items-center gap-1 text-[#4e9ad9]">
                      {[...Array(activeOrder.clientReview.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#4e9ad9]" />
                      ))}
                    </div>
                    <p className="text-[#486984] italic">"{activeOrder.clientReview.comment}"</p>
                  </div>
                )}
              </div>
            )}

            {/* In Dispute */}
            {activeOrder.escrowStatus === 'DISPUTED' && (
              <HumanSupportChat
                order={activeOrder}
                currentUser={currentUser}
                onSendMessage={handleSendMessage}
                onResolveDispute={handleResolveDispute}
              />
            )}
          </div>
        </div>
      )}

      {/* Celebration Modal (Fase 5) */}
      {celebrationOrder && (
        <SuccessCelebrationModal
          isOpen={!!celebrationOrder}
          order={celebrationOrder}
          onClose={() => setCelebrationOrder(null)}
          onViewFavorites={() => {
            setCelebrationOrder(null);
            onSelectTab('favorites');
          }}
          onBookAgain={() => {
            setCelebrationOrder(null);
            onSelectTab('services');
          }}
        />
      )}

      {/* Real-time Chat & Email Drawer with assigned worker */}
      {activeOrder && chatDrawerMode && (
        <RealtimeChatDrawer
          isOpen={Boolean(chatDrawerMode)}
          onClose={() => setChatDrawerMode(null)}
          currentUser={currentUser}
          partner={{
            id: activeOrder.proId,
            name: activeOrder.proName,
            trade: activeOrder.proTrade,
          }}
          incomingMessages={incomingMessages}
          initialMode={chatDrawerMode}
        />
      )}
    </div>
  );
};
