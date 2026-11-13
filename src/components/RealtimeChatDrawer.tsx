import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Mail,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { DirectMessage, User } from '../types';
import { apiClient } from '../services/apiClient';

interface RealtimeChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partner: {
    id: string;
    name: string;
    trade?: string;
    email?: string;
    city?: string;
  };
  incomingMessages?: DirectMessage[];
  initialMode?: 'chat' | 'email';
  onHireFromChat?: () => void;
}

export const RealtimeChatDrawer: React.FC<RealtimeChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  partner,
  incomingMessages = [],
  initialMode = 'chat',
  onHireFromChat,
}) => {
  const [mode, setMode] = useState<'chat' | 'email'>(initialMode);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const clientId = currentUser.role === 'client' ? currentUser.id : partner.id;
  const proId = currentUser.role === 'professional' ? currentUser.id : partner.id;
  const threadId = `${clientId}__${proId}`;

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, partner.id]);

  useEffect(() => {
    if (!isOpen || !partner.id) return;
    setLoading(true);
    apiClient
      .getMessages(currentUser.id, partner.id)
      .then(list => setMessages(list.filter(m => m.threadId === threadId)))
      .catch(err => console.error('Error loading messages:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentUser.id, partner.id, threadId]);

  // Merge live WebSocket incoming messages for this thread
  useEffect(() => {
    if (!incomingMessages.length) return;
    const relevant = incomingMessages.filter(m => m.threadId === threadId);
    if (!relevant.length) return;
    setMessages(prev => {
      const seen = new Set(prev.map(p => p.id));
      const added = relevant.filter(r => !seen.has(r.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, [incomingMessages, threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, mode]);

  if (!isOpen) return null;

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setSending(true);
    try {
      const sent = await apiClient.sendChatMessage({
        clientId,
        proId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        text: chatInput.trim(),
      });
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      setChatInput('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setSending(true);
    try {
      const res = await apiClient.sendEmailMessage({
        clientId,
        proId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setMessages(prev =>
        prev.some(m => m.id === res.message.id) ? prev : [...prev, res.message]
      );
      setEmailSentToast(`Correo enviado a ${partner.name}`);
      setEmailSubject('');
      setEmailBody('');
      setTimeout(() => setEmailSentToast(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0b3658]/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#dde7ee] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#dde7ee] flex items-center justify-between gap-3 bg-[#f8fbfe]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4e9ad9]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Canal Privado en Tiempo Real</span>
            </div>
            <h3 className="text-base font-extrabold text-[#0b3658] truncate">{partner.name}</h3>
            {partner.trade && (
              <p className="text-xs text-[#486984] truncate">{partner.trade}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#dde7ee] text-[#486984] hover:text-[#0b3658] flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher: Chat vs Email */}
        <div className="px-5 py-3 border-b border-[#dde7ee] flex items-center justify-between gap-2 bg-white">
          <div className="flex p-1 bg-[#e6f1fa] rounded-full flex-1">
            <button
              type="button"
              onClick={() => setMode('chat')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all ${
                mode === 'chat'
                  ? 'bg-white text-[#0b3658] shadow-sm'
                  : 'text-[#486984] hover:text-[#0b3658]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat Directo</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all ${
                mode === 'email'
                  ? 'bg-white text-[#0b3658] shadow-sm'
                  : 'text-[#486984] hover:text-[#0b3658]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Enviar Correo</span>
            </button>
          </div>

          {currentUser.role === 'client' && onHireFromChat && (
            <button
              type="button"
              onClick={onHireFromChat}
              className="cord-btn-primary px-3.5 py-2 text-xs font-bold whitespace-nowrap flex items-center gap-1"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Contratar</span>
            </button>
          )}
        </div>

        {/* Thread History */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#f8fbfe]">
          {loading ? (
            <div className="text-center text-xs text-[#688dac] py-10">
              Cargando conversación...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-xs text-[#688dac] py-10 bg-white rounded-2xl border border-[#dde7ee] p-6">
              Aún no hay mensajes con {partner.name}. Escribe para acordar detalles, horario o alcance del trabajo.
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs space-y-1 shadow-sm ${
                      isMine
                        ? 'bg-[#0b3658] text-white'
                        : 'bg-white text-[#0b3658] border border-[#dde7ee]'
                    }`}
                  >
                    {msg.type === 'email' && (
                      <div
                        className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pb-1 border-b ${
                          isMine ? 'border-white/20 text-[#e6f1fa]' : 'border-[#dde7ee] text-[#4e9ad9]'
                        }`}
                      >
                        <Mail className="w-3 h-3" />
                        <span>Correo: {msg.subject}</span>
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div
                      className={`text-[10px] font-mono ${
                        isMine ? 'text-white/70 text-right' : 'text-[#688dac]'
                      }`}
                    >
                      {msg.senderName.split(' ')[0]} ·{' '}
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        {mode === 'chat' ? (
          <form
            onSubmit={handleSendChat}
            className="p-4 border-t border-[#dde7ee] bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={`Mensaje en tiempo real para ${partner.name.split(' ')[0]}...`}
              className="flex-1 px-4 py-2.5 rounded-full bg-[#f8fbfe] border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
            />
            <button
              type="submit"
              disabled={sending || !chatInput.trim()}
              className="cord-btn-primary px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleSendEmail}
            className="p-4 border-t border-[#dde7ee] bg-white space-y-2.5 text-xs"
          >
            {emailSentToast && (
              <div className="p-2.5 rounded-xl bg-[#e6f1fa] border border-[#42b3b1]/40 text-[#0b3658] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#42b3b1]" />
                <span>{emailSentToast}</span>
              </div>
            )}
            <input
              type="text"
              required
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder="Asunto del correo (ej: Solicitud de cotización en Chapinero)"
              className="w-full px-3.5 py-2 rounded-xl bg-[#f8fbfe] border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
            />
            <textarea
              rows={3}
              required
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Escribe los detalles de lo que necesitas..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#f8fbfe] border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9] resize-none"
            />
            <button
              type="submit"
              disabled={sending || !emailSubject.trim() || !emailBody.trim()}
              className="cord-btn-primary w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{sending ? 'Enviando correo...' : 'Enviar Correo al Trabajador'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
