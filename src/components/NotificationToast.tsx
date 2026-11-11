import React from 'react';
import { Bell, CheckCircle2, AlertCircle, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { ToastNotification } from '../types';

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
  // Critical error modal
  criticalError: { title: string; message: string; onRetry?: () => void } | null;
  onDismissCriticalError: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
  criticalError,
  onDismissCriticalError,
}) => {
  return (
    <>
      {/* 1. Top Toasts Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {notifications.map(n => (
          <div
            key={n.id}
            className="pointer-events-auto rounded-2xl p-3.5 shadow-xl border border-[#dde7ee] transition-all animate-in slide-in-from-top-3 duration-300 flex items-start gap-3 bg-white text-[#0b3658]"
            style={{
              boxShadow: '0 8px 30px rgba(11, 54, 88, 0.12)',
            }}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                n.type === 'success'
                  ? 'bg-[#42b3b1]/15 text-[#42b3b1]'
                  : 'bg-[#e6f1fa] text-[#4e9ad9]'
              }`}
            >
              {n.type === 'push' ? (
                <Bell className="w-4 h-4 animate-bounce" />
              ) : n.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-[#0b3658] truncate">
                  {n.title}
                </span>
                <span className="text-[10px] text-[#486984] font-mono shrink-0">
                  {n.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-[#486984] mt-0.5 leading-snug">
                {n.message}
              </p>
            </div>

            <button
              onClick={() => onDismiss(n.id)}
              className="text-[#688dac] hover:text-[#0b3658] p-1 rounded-lg transition-colors shrink-0"
              title="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 2. Modal for Critical Errors */}
      {criticalError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/60 backdrop-blur-sm">
          <div className="cord-card rounded-3xl p-6 lg:p-8 max-w-md w-full relative bg-white border border-[#dde7ee] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] mb-4">
              <ShieldAlert className="w-7 h-7 text-[#4e9ad9]" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-[#0b3658]">
                {criticalError.title}
              </h3>
              <p className="text-xs text-[#486984] leading-relaxed">
                {criticalError.message}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              {criticalError.onRetry && (
                <button
                  type="button"
                  onClick={criticalError.onRetry}
                  className="cord-btn-primary w-full py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reintentar Operación</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDismissCriticalError}
                className="cord-btn-secondary w-full py-2.5 rounded-full text-xs font-bold"
              >
                Cerrar Aviso
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
