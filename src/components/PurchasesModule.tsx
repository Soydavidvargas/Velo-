import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Download,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  X,
  ShoppingBag,
  Check,
  Ban,
} from 'lucide-react';
import { PurchaseOrder, PurchasePriority, PurchaseStatus, User } from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';
import { generatePurchaseOrderPdf } from '../utils/pdfGenerator';

interface PurchasesModuleProps {
  currentUser: User;
  onShowToast?: (title: string, message: string, type: 'info' | 'success' | 'alert' | 'push') => void;
}

const COLOMBIAN_SUPPLIERS = [
  'Ferretería Industrial Bogotá S.A.S.',
  'Eléctricos & Breakers RETIE Ltda.',
  'Gasodomésticos del Valle S.A.',
  'Homecenter Constructor Colombia',
  'Cerraduras y Seguridad Antioquia',
  'Tuberías & Válvulas del Caribe S.A.',
];

const PRIORITY_LABELS: Record<PurchasePriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const STATUS_META: Record<
  PurchaseStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: 'Pendiente', colorClass: 'text-amber-700', icon: Clock },
  approved: { label: 'Aprobada', colorClass: 'text-[#4e9ad9]', icon: CheckCircle2 },
  delivered: { label: 'Entregada', colorClass: 'text-[#42b3b1]', icon: Truck },
  cancelled: { label: 'Cancelada', colorClass: 'text-rose-600', icon: AlertCircle },
};

export const PurchasesModule: React.FC<PurchasesModuleProps> = ({ currentUser, onShowToast }) => {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [supplier, setSupplier] = useState(COLOMBIAN_SUPPLIERS[0]);
  const [customSupplier, setCustomSupplier] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PurchasePriority>('medium');
  const [itemsCount, setItemsCount] = useState('2');
  const [budget, setBudget] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Custodia Velo / PSE');

  const fetchPurchases = async () => {
    try {
      const data = await apiClient.getPurchases();
      setPurchases(data);
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return purchases.filter(p => {
      const matchesSearch =
        !q ||
        p.supplier.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  const totalAmount = useMemo(
    () => purchases.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + p.amount, 0),
    [purchases]
  );

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedSupplier = supplier === 'custom' ? customSupplier.trim() : supplier;
    const numericAmount = Number(budget);
    if (!resolvedSupplier || !numericAmount || numericAmount <= 0) {
      onShowToast?.('Campos incompletos', 'Selecciona un proveedor válido e ingresa un presupuesto en COP.', 'alert');
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiClient.createPurchase({
        clientId: currentUser.id,
        clientName: currentUser.name,
        supplier: resolvedSupplier,
        deliveryDate,
        amount: numericAmount,
        items: Number(itemsCount) || 1,
        priority,
        description: description.trim() || 'Solicitud de insumos para servicio en el hogar',
        paymentMethod,
      });
      setPurchases(prev => [created, ...prev]);
      setIsCreateOpen(false);
      setBudget('');
      setDescription('');
      setCustomSupplier('');
      onShowToast?.('Orden de compra creada', `Se registró la orden ${created.id} por ${formatCOP(created.amount)}.`, 'success');
    } catch (err: any) {
      onShowToast?.('Error al crear orden', err.message, 'alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: PurchaseStatus) => {
    try {
      const updated = await apiClient.updatePurchase(id, { status });
      setPurchases(prev => prev.map(p => (p.id === id ? updated : p)));
      if (selectedPurchase?.id === id) setSelectedPurchase(updated);
      onShowToast?.('Estado actualizado', `La orden ${id} ahora está ${STATUS_META[status].label.toLowerCase()}.`, 'success');
    } catch (err: any) {
      onShowToast?.('Error', err.message, 'alert');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
      if (selectedPurchase?.id === id) setSelectedPurchase(null);
      onShowToast?.('Orden eliminada', `Se eliminó la orden de compra ${id}.`, 'info');
    } catch (err: any) {
      onShowToast?.('Error', err.message, 'alert');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID Orden', 'Proveedor', 'Fecha', 'Entrega', 'Items', 'Prioridad', 'Estado', 'Monto COP'];
    const rows = filteredPurchases.map(p => [
      p.id,
      `"${p.supplier.replace(/"/g, '""')}"`,
      p.date,
      p.deliveryDate,
      p.items,
      PRIORITY_LABELS[p.priority],
      STATUS_META[p.status].label,
      p.amount,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `velo_compras_clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Exportación lista', 'Se descargó el reporte CSV de compras.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cord-card p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4e9ad9]">
            <ShoppingBag className="w-4 h-4" />
            <span>Módulo para Clientes</span>
            <span className="text-[#dde7ee]">·</span>
            <span className="text-[#486984]">{currentUser.city || 'Colombia'}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0b3658] tracking-tight">
            Gestión de Compras
          </h1>
          <p className="text-sm text-[#486984]">
            Administra órdenes de compra de repuestos, insumos y solicitudes a proveedores verificados.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="cord-btn-primary px-5 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Orden de Compra</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Total Órdenes</span>
            <FileText className="w-4 h-4 text-[#4e9ad9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {purchases.length}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Registradas por el cliente</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Pendientes</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {purchases.filter(p => p.status === 'pending').length}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Por aprobar o despachar</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>En Tránsito / Aprobadas</span>
            <Truck className="w-4 h-4 text-[#42b3b1]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {purchases.filter(p => p.status === 'approved').length}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Despacho programado</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Monto Total Activo</span>
            <ShoppingBag className="w-4 h-4 text-[#4e9ad9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {formatCOP(totalAmount)}
          </div>
          <p className="text-xs text-[#688dac] mt-1">En Pesos Colombianos (COP)</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="cord-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0b3658]">Órdenes de Compra</h2>
            <p className="text-xs text-[#486984]">
              Seguimiento completo de pedidos a proveedores, fechas de entrega y estado de aprobación.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#688dac] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar proveedor o ID..."
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-[#dde7ee] bg-white text-xs text-[#0b3658] placeholder-[#688dac] focus:outline-none focus:border-[#4e9ad9]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#e6f1fa] rounded-xl border border-[#dde7ee]">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'approved', label: 'Aprobadas' },
                { id: 'delivered', label: 'Entregadas' },
                { id: 'cancelled', label: 'Canceladas' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-white text-[#0b3658] shadow-sm'
                      : 'text-[#486984] hover:text-[#0b3658]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCsv}
              className="cord-btn-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-[#4e9ad9]" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-[#dde7ee] rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fbfe] border-b border-[#dde7ee] text-[#486984] font-semibold">
                <th className="py-3 px-4">ID Orden</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Entrega</th>
                <th className="py-3 px-4">Prioridad</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde7ee] text-[#0b3658]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#486984]">
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center space-y-3">
                    <p className="text-sm font-semibold text-[#0b3658]">
                      No hay órdenes de compra que coincidan con tu búsqueda
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="cord-btn-secondary px-4 py-2 text-xs font-semibold"
                    >
                      Limpiar filtros
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(purchase => {
                  const meta = STATUS_META[purchase.status];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={purchase.id} className="hover:bg-[#f8fbfe] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#4e9ad9] whitespace-nowrap">
                        {purchase.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold max-w-[220px] truncate" title={purchase.supplier}>
                        {purchase.supplier}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-[#486984] whitespace-nowrap">
                        {new Date(purchase.date + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-right whitespace-nowrap">
                        {formatCOP(purchase.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-center text-[#486984]">
                        {purchase.items}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-[#486984] whitespace-nowrap">
                        {new Date(purchase.deliveryDate + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 text-[#486984] font-medium whitespace-nowrap">
                        {PRIORITY_LABELS[purchase.priority]}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${meta.colorClass}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedPurchase(purchase)}
                            title="Ver detalles"
                            className="p-1.5 rounded-lg text-[#486984] hover:text-[#0b3658] hover:bg-[#e6f1fa] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {purchase.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(purchase.id, 'approved')}
                              title="Aprobar orden"
                              className="p-1.5 rounded-lg text-[#4e9ad9] hover:bg-[#e6f1fa] transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {purchase.status === 'approved' && (
                            <button
                              onClick={() => handleStatusChange(purchase.id, 'delivered')}
                              title="Marcar como entregada"
                              className="p-1.5 rounded-lg text-[#42b3b1] hover:bg-[#e6f1fa] transition-colors"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => generatePurchaseOrderPdf(purchase)}
                            title="Descargar PDF"
                            className="p-1.5 rounded-lg text-[#486984] hover:text-[#0b3658] hover:bg-[#e6f1fa] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(purchase.id)}
                            title="Eliminar orden"
                            className="p-1.5 rounded-lg text-[#688dac] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#dde7ee] shadow-xl space-y-5 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-[#0b3658]">Crear Nueva Orden de Compra</h3>
              <p className="text-xs text-[#486984] mt-1">
                Registra un pedido de materiales o insumos con pago protegido en Colombia.
              </p>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Proveedor</label>
                  <select
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  >
                    {COLOMBIAN_SUPPLIERS.map(sup => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                    <option value="custom">Otro proveedor...</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Fecha de Entrega Estimada</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
              </div>

              {supplier === 'custom' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Nombre del Proveedor</label>
                  <input
                    type="text"
                    value={customSupplier}
                    onChange={e => setCustomSupplier(e.target.value)}
                    placeholder="Ej: Depósito San José S.A.S."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-[#0b3658] block">Descripción de insumos o solicitud</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe los materiales, repuestos o servicios a solicitar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Prioridad</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as PurchasePriority)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Cantidad Items</label>
                  <input
                    type="number"
                    min={1}
                    value={itemsCount}
                    onChange={e => setItemsCount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] font-mono focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Presupuesto (COP)</label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="250000"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] font-mono focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#0b3658] block">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                >
                  <option value="Custodia Velo / PSE">Custodia Velo / PSE</option>
                  <option value="Nequi / Daviplata">Nequi / Daviplata</option>
                  <option value="Tarjeta Crédito o Débito">Tarjeta Crédito o Débito</option>
                  <option value="Transferencia Bancolombia">Transferencia Bancolombia</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#dde7ee]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="cord-btn-secondary px-5 py-2.5 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cord-btn-primary px-6 py-2.5 text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Orden de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#dde7ee] shadow-xl space-y-5 relative">
            <button
              onClick={() => setSelectedPurchase(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-[#4e9ad9]">{selectedPurchase.id}</span>
              <h3 className="text-xl font-extrabold text-[#0b3658] mt-0.5">{selectedPurchase.supplier}</h3>
              <p className="text-xs text-[#486984] mt-1">
                Emitida el {selectedPurchase.date} · Entrega prevista: {selectedPurchase.deliveryDate}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#486984]">Monto Total:</span>
                <strong className="font-mono tabular-nums text-[#0b3658] text-sm">
                  {formatCOP(selectedPurchase.amount, true)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Cantidad de Items:</span>
                <strong className="font-mono tabular-nums text-[#0b3658]">{selectedPurchase.items}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Prioridad:</span>
                <strong className="text-[#0b3658]">{PRIORITY_LABELS[selectedPurchase.priority]}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Método de Pago:</span>
                <strong className="text-[#0b3658]">{selectedPurchase.paymentMethod || 'Custodia Velo'}</strong>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <span className="font-semibold text-[#0b3658]">Descripción:</span>
              <p className="text-[#486984] leading-relaxed">{selectedPurchase.description}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#dde7ee]">
              <div className="flex items-center gap-2">
                {selectedPurchase.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(selectedPurchase.id, 'approved')}
                    className="cord-btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                )}
                {selectedPurchase.status === 'approved' && (
                  <button
                    onClick={() => handleStatusChange(selectedPurchase.id, 'delivered')}
                    className="cord-btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Marcar Entregada</span>
                  </button>
                )}
                {(selectedPurchase.status === 'pending' || selectedPurchase.status === 'approved') && (
                  <button
                    onClick={() => handleStatusChange(selectedPurchase.id, 'cancelled')}
                    className="cord-btn-secondary px-4 py-2 text-xs font-semibold text-rose-600 inline-flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => generatePurchaseOrderPdf(selectedPurchase)}
                className="cord-btn-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#4e9ad9]" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
