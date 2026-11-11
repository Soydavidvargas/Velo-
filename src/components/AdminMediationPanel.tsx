import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';
import { Order } from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';

interface AdminMediationPanelProps {
  orders: Order[];
  onRefreshOrders: () => void;
}

export const AdminMediationPanel: React.FC<AdminMediationPanelProps> = ({
  orders,
  onRefreshOrders,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getPlatformStats().then(setStats).catch(console.error);
  }, [orders]);

  const disputedOrders = orders.filter(o => o.escrowStatus === 'DISPUTED');
  const allOrders = orders;

  const handleResolve = async (orderId: string, resolution: 'release_to_pro' | 'refund_client') => {
    const notes = resolutionNotes[orderId] || 'Solución acordada con el cliente y el profesional.';
    setResolvingId(orderId);
    try {
      await apiClient.resolveDispute(orderId, resolution, notes);
      onRefreshOrders();
    } catch (err: any) {
      alert(`Error al gestionar el caso: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Center Header */}
      <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#4e9ad9] uppercase tracking-wider">
              <Scale className="w-4 h-4 text-[#4e9ad9]" />
              <span>Centro de Ayuda y Mediación</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0b3658] tracking-tight mt-1">
              Atención y Garantía de Satisfacción
            </h2>
            <p className="text-xs text-[#486984]">
              Supervisión de la calidad del servicio, protección del dinero y resolución de dudas en menos de 12 horas.
            </p>
          </div>

          <button
            onClick={() => {
              onRefreshOrders();
              apiClient.getPlatformStats().then(setStats);
            }}
            className="cord-btn-secondary px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 self-start"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* 5 Simple Everyday Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {/* 1 */}
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <span className="text-[10px] text-[#688dac] block font-medium uppercase">
              Clientes que Repiten
            </span>
            <div className="text-xl font-black text-[#0b3658] font-mono mt-0.5 tabular-nums">
              {stats?.repeatOrderSharePercent || 48}%
            </div>
            <span className="text-[9px] text-[#42b3b1] font-semibold">Alta satisfacción</span>
          </div>

          {/* 2 */}
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <span className="text-[10px] text-[#688dac] block font-medium uppercase">
              Fidelidad Media
            </span>
            <div className="text-xl font-black text-[#4e9ad9] font-mono mt-0.5 tabular-nums">
              4.6 visitas
            </div>
            <span className="text-[9px] text-[#486984]">Por cada cliente</span>
          </div>

          {/* 3 */}
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <span className="text-[10px] text-[#688dac] block font-medium uppercase">
              Comisión Promedio
            </span>
            <div className="text-xl font-black text-[#0b3658] font-mono mt-0.5 tabular-nums">
              {stats?.effectiveTakeRate || 11.2}%
            </div>
            <span className="text-[9px] text-[#486984]">Baja progresiva</span>
          </div>

          {/* 4 */}
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <span className="text-[10px] text-[#688dac] block font-medium uppercase">
              Dinero en Trabajos Activos
            </span>
            <div className="text-xl font-black text-[#4e9ad9] font-mono mt-0.5 tabular-nums">
              {formatCOP(stats?.activeEscrowHeld || 350000)}
            </div>
            <span className="text-[9px] text-[#42b3b1] font-semibold">Fondos en custodia</span>
          </div>

          {/* 5 */}
          <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
            <span className="text-[10px] text-[#688dac] block font-medium uppercase">
              Sobrecostes al Cobrar
            </span>
            <div className="text-xl font-black text-[#42b3b1] font-mono mt-0.5 tabular-nums">
              {formatCOP(0)}
            </div>
            <span className="text-[9px] text-[#42b3b1] font-semibold">Sin sorpresas</span>
          </div>
        </div>
      </div>

      {/* Cases needing assistance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0b3658] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#4e9ad9]" />
            <span>Casos que Requieren Apoyo ({disputedOrders.length})</span>
          </h3>
          <span className="text-xs text-[#486984]">
            Fondos protegidos sin riesgo para nadie
          </span>
        </div>

        {disputedOrders.length === 0 ? (
          <div className="cord-card rounded-2xl p-8 bg-white border border-[#dde7ee] text-center text-xs text-[#42b3b1] font-semibold">
            ✓ Todos los trabajos están transcurriendo con total normalidad.
          </div>
        ) : (
          disputedOrders.map(order => (
            <div
              key={order.id}
              className="cord-card rounded-3xl p-6 bg-white border border-[#4e9ad9] space-y-4 text-xs shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#dde7ee]">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[#4e9ad9] font-bold">
                    <span>CASO #{order.id.slice(-6).toUpperCase()}</span>
                    <span className="text-[#dde7ee]">·</span>
                    <span className="text-[#0b3658]">{order.serviceTitle}</span>
                  </div>
                  <p className="text-[#486984] mt-0.5">
                    Cliente: <strong className="text-[#0b3658]">{order.clientName}</strong> · Técnico: <strong className="text-[#0b3658]">{order.proName}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#688dac] block font-medium">Importe Protegido</span>
                  <span className="text-lg font-black text-[#0b3658] font-mono tabular-nums">
                    {formatCOP(order.allInPrice)}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div className="p-4 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-1">
                <span className="text-[11px] font-bold text-[#4e9ad9]">Detalle indicado por el cliente:</span>
                <p className="text-[#0b3658] italic">"{order.disputeReason}"</p>
              </div>

              {/* Friendly notes */}
              <div className="space-y-2">
                <label className="block text-[#0b3658] font-semibold">
                  Solución o acuerdo alcanzado con las partes:
                </label>
                <input
                  type="text"
                  value={resolutionNotes[order.id] || ''}
                  onChange={e =>
                    setResolutionNotes({
                      ...resolutionNotes,
                      [order.id]: e.target.value,
                    })
                  }
                  placeholder="Ej: El profesional acudirá a revisar la junta sin coste adicional..."
                  className="cord-input w-full rounded-full px-4 py-2 text-xs text-[#0b3658]"
                />
              </div>

              {/* Resolution Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleResolve(order.id, 'release_to_pro')}
                  disabled={resolvingId === order.id}
                  className="cord-btn-primary px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar entrega del pago al técnico</span>
                </button>

                <button
                  onClick={() => handleResolve(order.id, 'refund_client')}
                  disabled={resolvingId === order.id}
                  className="cord-btn-secondary text-xs px-4 py-2 rounded-full flex items-center gap-1.5 font-bold text-[#0b3658]"
                >
                  <XCircle className="w-4 h-4 text-[#4e9ad9]" />
                  <span>Aprobar reembolso al cliente</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clean History List */}
      <div className="cord-card rounded-3xl p-6 lg:p-8 bg-white border border-[#dde7ee] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#0b3658]">
          Historial Reciente de Servicios Realizados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#dde7ee] text-[#688dac] uppercase tracking-wider">
                <th className="py-2.5 px-3">Encargo</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Profesional</th>
                <th className="py-2.5 px-3 text-right">Precio All-In</th>
                <th className="py-2.5 px-3 text-right">Comisión</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde7ee] text-[#0b3658] font-mono">
              {allOrders.map(o => (
                <tr key={o.id} className="hover:bg-[#f8fbfe]">
                  <td className="py-3 px-3 font-bold text-[#4e9ad9]">
                    #{o.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 px-3 font-sans text-[#0b3658]">
                    {o.clientName.split(' ')[0]}
                  </td>
                  <td className="py-3 px-3 font-sans text-[#486984]">
                    {o.proName.split(' ')[0]}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-[#0b3658] tabular-nums">
                    {formatCOP(o.allInPrice)}
                  </td>
                  <td className="py-3 px-3 text-right text-[#486984] tabular-nums">
                    {o.commission.effectiveRatePercent}%
                  </td>
                  <td className="py-3 px-3 text-center font-sans text-[11px]">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                      o.escrowStatus === 'RELEASED'
                        ? 'bg-[#42b3b1]/15 text-[#42b3b1] border border-[#42b3b1]/30'
                        : o.escrowStatus === 'DISPUTED'
                        ? 'bg-[#e6f1fa] text-[#4e9ad9] border border-[#dde7ee]'
                        : 'bg-[#e6f1fa] text-[#0b3658] border border-[#dde7ee]'
                    }`}>
                      {o.escrowStatus === 'RELEASED' ? 'Entregado' : o.escrowStatus === 'DISPUTED' ? 'En Revisión' : 'En Curso'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
