import React, { useState } from 'react';
import { ShieldAlert, Send, Lock, CheckCircle2, XCircle, Wrench, AlertTriangle } from 'lucide-react';
import { Order, DisputeMessage, User } from '../types';
import { formatCOP } from '../utils/formatCurrency';

interface HumanSupportChatProps {
  order: Order;
  currentUser: User;
  onSendMessage: (orderId: string, message: string) => void;
  onResolveDispute: (orderId: string, resolution: 'release_to_pro' | 'refund_client', notes: string) => void;
  onClose?: () => void;
}

export const HumanSupportChat: React.FC<HumanSupportChatProps> = ({
  order,
  currentUser,
  onSendMessage,
  onResolveDispute,
}) => {
  const [inputText, setInputText] = useState('');

  // Default seeded messages if none exist
  const messages: DisputeMessage[] = order.disputeMessages && order.disputeMessages.length > 0
    ? order.disputeMessages
    : [
        {
          id: 'msg_1',
          orderId: order.id,
          senderId: 'sys',
          senderName: 'Sistema de Seguridad Velo',
          senderRole: 'system',
          message: `Mediación iniciada. Los fondos de ${formatCOP(order.allInPrice)} han quedado bloqueados en custodia preventiva. Ninguna de las partes perderá su dinero mientras el caso se evalúa.`,
          timestamp: '10:14',
        },
        {
          id: 'msg_2',
          orderId: order.id,
          senderId: order.clientId,
          senderName: order.clientName,
          senderRole: 'client',
          message: order.disputeReason || 'He notado que la reparación no quedó del todo estanca y sigue goteando un poco.',
          timestamp: '10:15',
        },
        {
          id: 'msg_3',
          orderId: order.id,
          senderId: 'usr_admin_velo',
          senderName: 'Valeria Serna (Mediadora Humana Velo)',
          senderRole: 'admin',
          message: 'Hola a ambos. Soy Valeria del equipo humano de mediación de Velo (sin bots). Estoy revisando el caso y la descripción técnica. Mario, ¿podrías acudir a realizar una revisión sin coste para el cliente, o prefieren que procedamos con el reembolso?',
          timestamp: '10:18',
        },
      ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(order.id, inputText.trim());
    setInputText('');
  };

  return (
    <div className="cord-card rounded-3xl p-5 lg:p-7 bg-white border border-[#dde7ee] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#dde7ee]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9]">
            <ShieldAlert className="w-5 h-5 text-[#4e9ad9]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0b3658]">
                Sala de Mediación con Soporte Humano
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f1fa] text-[#4e9ad9] border border-[#dde7ee]">
                Sin Chatbots
              </span>
            </div>
            <p className="text-xs text-[#486984]">
              Caso #{order.id.slice(-6).toUpperCase()} · Mediadora Asignada: <strong className="text-[#0b3658]">Valeria Serna (Equipo Velo)</strong>
            </p>
          </div>
        </div>

        {/* Locked Escrow badge */}
        <div className="flex items-center gap-2 bg-[#e6f1fa] px-3.5 py-2 rounded-2xl border border-[#dde7ee]">
          <Lock className="w-4 h-4 text-[#4e9ad9]" />
          <div>
            <span className="text-[10px] text-[#486984] block font-medium">Fondos Bloqueados</span>
            <span className="text-sm font-black text-[#0b3658] font-mono tabular-nums">
              {formatCOP(order.allInPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-3 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] text-xs text-[#0b3658] flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[#4e9ad9] shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-[#486984]">
          Tu dinero está 100% a salvo en la custodia de Velo. Conversa directamente con el profesional y con nuestra mediadora humana para alcanzar una solución justa en menos de 12 horas.
        </div>
      </div>

      {/* Message Chat Feed */}
      <div className="h-64 overflow-y-auto space-y-3 p-3 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee]">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.id;
          const isAdmin = msg.senderRole === 'admin';
          const isSystem = msg.senderRole === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center my-2">
                <span className="inline-block text-[10px] font-mono bg-white text-[#486984] px-3 py-1 rounded-full border border-[#dde7ee]">
                  🔒 {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-xs space-y-1`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${isAdmin ? 'text-[#4e9ad9]' : 'text-[#0b3658]'}`}>
                  {msg.senderName} {isAdmin && '(Soporte Oficial)'}
                </span>
                <span className="text-[9px] text-[#688dac]">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-md p-3 rounded-2xl leading-relaxed text-xs ${
                  isAdmin
                    ? 'bg-[#e6f1fa] text-[#0b3658] border border-[#dde7ee]'
                    : isMe
                    ? 'bg-[#4e9ad9] text-white font-medium shadow-sm'
                    : 'bg-white text-[#0b3658] border border-[#dde7ee] shadow-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input row */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Escribe un mensaje para el técnico y la mediadora..."
          className="cord-input flex-1 rounded-full px-4 py-2.5 text-xs text-[#0b3658] placeholder-[#688dac]"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="cord-btn-primary px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar</span>
        </button>
      </form>

      {/* Mediation Settlement Actions */}
      <div className="pt-2 border-t border-[#dde7ee]">
        <span className="text-[11px] font-bold text-[#0b3658] block mb-2">
          Resoluciones disponibles para este caso:
        </span>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSendMessage(order.id, 'Propongo que el profesional acuda nuevamente mañana sin coste para revisar el ajuste final.')}
            className="p-2.5 rounded-full bg-white border border-[#dde7ee] hover:border-[#4e9ad9] text-[#0b3658] hover:text-[#4e9ad9] flex items-center gap-1.5 transition-colors font-medium shadow-sm"
          >
            <Wrench className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Proponer Visita de Repaso</span>
          </button>

          <button
            type="button"
            onClick={() => onResolveDispute(order.id, 'release_to_pro', 'Acuerdo amistoso: el cliente valida que el trabajo quedó resuelto tras la revisión.')}
            className="p-2.5 rounded-full bg-[#42b3b1]/15 border border-[#42b3b1]/30 hover:bg-[#42b3b1]/25 text-[#42b3b1] flex items-center gap-1.5 font-bold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#42b3b1]" />
            <span>Liberar Pago al Técnico</span>
          </button>

          <button
            type="button"
            onClick={() => onResolveDispute(order.id, 'refund_client', 'Reembolso total acordado por la mediación humana debido a imposibilidad de ejecución.')}
            className="p-2.5 rounded-full bg-[#e6f1fa] border border-[#dde7ee] hover:bg-[#dde7ee] text-[#0b3658] flex items-center gap-1.5 font-bold transition-colors"
          >
            <XCircle className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Aprobar Reembolso al Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
