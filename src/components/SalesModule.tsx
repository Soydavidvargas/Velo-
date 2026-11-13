import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  X,
  Briefcase,
  CreditCard,
} from 'lucide-react';
import {
  SaleOrder,
  SalePaymentStatus,
  SalePaymentTerms,
  SaleStatus,
  User,
} from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';
import { generateSaleOrderPdf } from '../utils/pdfGenerator';

interface SalesModuleProps {
  currentUser: User;
  pros: User[];
  onShowToast?: (title: string, message: string, type: 'info' | 'success' | 'alert' | 'push') => void;
}

const COLOMBIAN_CUSTOMERS = [
  'Carlos Méndez (Chapinero Alto)',
  'Conjunto Residencial Los Rosales',
  'Restaurante La Macarena S.A.S.',
  'Oficinas El Poblado Tower',
  'Clínica Odontológica Ciudad Jardín',
  'Edificio Parque 93 Propiedad Horizontal',
];

const SALE_STATUS_META: Record<
  SaleStatus,
  { label: string; colorClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: 'Pendiente', colorClass: 'text-amber-700', icon: Clock },
  completed: { label: 'Completada', colorClass: 'text-[#42b3b1]', icon: CheckCircle2 },
  shipped: { label: 'Enviada', colorClass: 'text-[#4e9ad9]', icon: Send },
  cancelled: { label: 'Cancelada', colorClass: 'text-rose-600', icon: XCircle },
};

const PAYMENT_STATUS_META: Record<SalePaymentStatus, { label: string; colorClass: string }> = {
  paid: { label: 'Pagado', colorClass: 'text-[#42b3b1]' },
  pending: { label: 'Pendiente', colorClass: 'text-amber-700' },
  partial: { label: 'Parcial', colorClass: 'text-[#4e9ad9]' },
  overdue: { label: 'Vencido', colorClass: 'text-rose-600' },
  refunded: { label: 'Reembolsado', colorClass: 'text-[#688dac]' },
};

const PAYMENT_TERMS_LABELS: Record<SalePaymentTerms, string> = {
  immediate: 'Inmediato',
  net15: 'Neto 15 días',
  net30: 'Neto 30 días',
  net60: 'Neto 60 días',
};

export const SalesModule: React.FC<SalesModuleProps> = ({ currentUser, pros, onShowToast }) => {
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [customer, setCustomer] = useState(COLOMBIAN_CUSTOMERS[0]);
  const [customCustomer, setCustomCustomer] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState('');
  const [itemsCount, setItemsCount] = useState('1');
  const [paymentTerms, setPaymentTerms] = useState<SalePaymentTerms>('immediate');
  const [salesRep, setSalesRep] = useState(
    currentUser.role === 'professional' ? currentUser.name : pros[0]?.name || 'Mario Restrepo'
  );
  const [description, setDescription] = useState('');

  const fetchSales = async () => {
    try {
      const data = await apiClient.getSales();
      setSales(data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sales.filter(s => {
      const matchesSearch =
        !q ||
        s.customer.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.salesRep.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sales, searchTerm, statusFilter]);

  const totalSalesAmount = useMemo(
    () => sales.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.amount, 0),
    [sales]
  );

  const paidAmount = useMemo(
    () => sales.filter(s => s.paymentStatus === 'paid').reduce((sum, s) => sum + s.amount, 0),
    [sales]
  );

  const pendingCollection = useMemo(
    () =>
      sales
        .filter(s => s.status !== 'cancelled' && (s.paymentStatus === 'pending' || s.paymentStatus === 'partial' || s.paymentStatus === 'overdue'))
        .reduce((sum, s) => sum + s.amount, 0),
    [sales]
  );

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedCustomer = customer === 'custom' ? customCustomer.trim() : customer;
    const numericAmount = Number(amount);
    if (!resolvedCustomer || !numericAmount || numericAmount <= 0) {
      onShowToast?.('Campos incompletos', 'Selecciona un cliente válido e ingresa el monto en COP.', 'alert');
      return;
    }

    setSubmitting(true);
    try {
      const matchedPro = pros.find(p => p.name === salesRep);
      const created = await apiClient.createSale({
        proId: matchedPro?.id || currentUser.id,
        customer: resolvedCustomer,
        dueDate,
        amount: numericAmount,
        items: Number(itemsCount) || 1,
        paymentTerms,
        salesRep,
        description: description.trim() || 'Servicios técnicos especializados y suministro de materiales',
      });
      setSales(prev => [created, ...prev]);
      setIsCreateOpen(false);
      setAmount('');
      setDescription('');
      setCustomCustomer('');
      onShowToast?.('Orden de venta creada', `Venta ${created.id} registrada por ${formatCOP(created.amount)}.`, 'success');
    } catch (err: any) {
      onShowToast?.('Error al crear venta', err.message, 'alert');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSale = async (id: string, update: Partial<SaleOrder>, toastMsg: string) => {
    try {
      const updated = await apiClient.updateSale(id, update);
      setSales(prev => prev.map(s => (s.id === id ? updated : s)));
      if (selectedSale?.id === id) setSelectedSale(updated);
      onShowToast?.('Venta actualizada', toastMsg, 'success');
    } catch (err: any) {
      onShowToast?.('Error', err.message, 'alert');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteSale(id);
      setSales(prev => prev.filter(s => s.id !== id));
      if (selectedSale?.id === id) setSelectedSale(null);
      onShowToast?.('Venta eliminada', `Se eliminó la orden de venta ${id}.`, 'info');
    } catch (err: any) {
      onShowToast?.('Error', err.message, 'alert');
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID Venta', 'Cliente', 'Trabajador', 'Fecha', 'Vencimiento', 'Items', 'Estado', 'Pago', 'Monto COP'];
    const rows = filteredSales.map(s => [
      s.id,
      `"${s.customer.replace(/"/g, '""')}"`,
      `"${s.salesRep.replace(/"/g, '""')}"`,
      s.date,
      s.dueDate,
      s.items,
      SALE_STATUS_META[s.status].label,
      PAYMENT_STATUS_META[s.paymentStatus].label,
      s.amount,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `velo_ventas_tecnicos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Exportación lista', 'Se descargó el reporte CSV de ventas.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cord-card p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4e9ad9]">
            <Briefcase className="w-4 h-4" />
            <span>Módulo para Trabajadores y Técnicos</span>
            <span className="text-[#dde7ee]">·</span>
            <span className="text-[#486984]">Facturación y Cobros COP</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0b3658] tracking-tight">
            Gestión de Ventas
          </h1>
          <p className="text-sm text-[#486984]">
            Controla tus órdenes de venta, cotizaciones aprobadas, cobros y facturación directa a clientes.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="cord-btn-primary px-5 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Orden de Venta</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Total Ventas</span>
            <DollarSign className="w-4 h-4 text-[#4e9ad9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {formatCOP(totalSalesAmount)}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Facturación acumulada</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Ingresos Cobrados</span>
            <CheckCircle2 className="w-4 h-4 text-[#42b3b1]" />
          </div>
          <div className="text-2xl font-extrabold text-[#42b3b1] font-mono tabular-nums mt-2">
            {formatCOP(paidAmount)}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Pagos confirmados</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Por Cobrar</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {formatCOP(pendingCollection)}
          </div>
          <p className="text-xs text-[#688dac] mt-1">Saldo pendiente o parcial</p>
        </div>

        <div className="cord-card-subtle p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#486984]">
            <span>Órdenes Activas</span>
            <TrendingUp className="w-4 h-4 text-[#4e9ad9]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums mt-2">
            {sales.filter(s => s.status !== 'cancelled').length}
          </div>
          <p className="text-xs text-[#688dac] mt-1">0 $ cobro por cotizar</p>
        </div>
      </div>

      {/* Sales Table Card */}
      <div className="cord-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0b3658]">Órdenes de Venta</h2>
            <p className="text-xs text-[#486984]">
              Lista completa de servicios vendidos, repuestos suministrados y estado de recaudos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-[#688dac] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente, técnico o ID..."
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-[#dde7ee] bg-white text-xs text-[#0b3658] placeholder-[#688dac] focus:outline-none focus:border-[#4e9ad9]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#e6f1fa] rounded-xl border border-[#dde7ee]">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'pending', label: 'Pendientes' },
                { id: 'shipped', label: 'Enviadas' },
                { id: 'completed', label: 'Completadas' },
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

        {/* Table */}
        <div className="overflow-x-auto border border-[#dde7ee] rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8fbfe] border-b border-[#dde7ee] text-[#486984] font-semibold">
                <th className="py-3 px-4">ID Venta</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Monto</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Pago</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dde7ee] text-[#0b3658]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#486984]">
                    Cargando órdenes de venta...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center space-y-3">
                    <p className="text-sm font-semibold text-[#0b3658]">
                      No se encontraron órdenes de venta
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
                filteredSales.map(sale => {
                  const statusMeta = SALE_STATUS_META[sale.status];
                  const paymentMeta = PAYMENT_STATUS_META[sale.paymentStatus];
                  const StatusIcon = statusMeta.icon;
                  return (
                    <tr key={sale.id} className="hover:bg-[#f8fbfe] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#4e9ad9] whitespace-nowrap">
                        {sale.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold max-w-[210px] truncate" title={sale.customer}>
                        {sale.customer}
                      </td>
                      <td className="py-3.5 px-4 text-[#486984] whitespace-nowrap">
                        {sale.salesRep}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-[#486984] whitespace-nowrap">
                        {new Date(sale.date + 'T00:00:00').toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-right whitespace-nowrap">
                        {formatCOP(sale.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-center text-[#486984]">
                        {sale.items}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${statusMeta.colorClass}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-semibold ${paymentMeta.colorClass}`}>
                          {paymentMeta.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            title="Ver detalles"
                            className="p-1.5 rounded-lg text-[#486984] hover:text-[#0b3658] hover:bg-[#e6f1fa] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {sale.status !== 'completed' && sale.status !== 'cancelled' && (
                            <button
                              onClick={() =>
                                handleUpdateSale(
                                  sale.id,
                                  { status: 'completed', paymentStatus: 'paid' },
                                  `Venta ${sale.id} marcada como completada y pagada.`
                                )
                              }
                              title="Marcar completada y pagada"
                              className="p-1.5 rounded-lg text-[#42b3b1] hover:bg-[#e6f1fa] transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {sale.paymentStatus !== 'paid' && sale.status !== 'cancelled' && (
                            <button
                              onClick={() =>
                                handleUpdateSale(
                                  sale.id,
                                  { paymentStatus: 'paid' },
                                  `Pago confirmado para la venta ${sale.id}.`
                                )
                              }
                              title="Registrar pago completo"
                              className="p-1.5 rounded-lg text-[#4e9ad9] hover:bg-[#e6f1fa] transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => generateSaleOrderPdf(sale)}
                            title="Descargar Factura PDF"
                            className="p-1.5 rounded-lg text-[#486984] hover:text-[#0b3658] hover:bg-[#e6f1fa] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sale.id)}
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

      {/* Create Sale Modal */}
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
              <h3 className="text-xl font-extrabold text-[#0b3658]">Crear Nueva Orden de Venta</h3>
              <p className="text-xs text-[#486984] mt-1">
                Registra un trabajo, cotización aprobada o venta de repuestos para tus clientes en Colombia.
              </p>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Cliente</label>
                  <select
                    value={customer}
                    onChange={e => setCustomer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  >
                    {COLOMBIAN_CUSTOMERS.map(cust => (
                      <option key={cust} value={cust}>
                        {cust}
                      </option>
                    ))}
                    <option value="custom">Otro cliente...</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
              </div>

              {customer === 'custom' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Nombre del Cliente / Empresa</label>
                  <input
                    type="text"
                    value={customCustomer}
                    onChange={e => setCustomCustomer(e.target.value)}
                    placeholder="Ej: Inversiones Andinas S.A.S."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-[#0b3658] block">Detalle del servicio o productos vendidos</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe los servicios prestados, mano de obra y materiales incluidos..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Términos de Pago</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value as SalePaymentTerms)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  >
                    <option value="immediate">Inmediato (Pagado)</option>
                    <option value="net15">Neto 15 días</option>
                    <option value="net30">Neto 30 días</option>
                    <option value="net60">Neto 60 días</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Técnico / Representante</label>
                  <select
                    value={salesRep}
                    onChange={e => setSalesRep(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
                  >
                    {pros.map(pro => (
                      <option key={pro.id} value={pro.name}>
                        {pro.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#0b3658] block">Cantidad Items / Servicios</label>
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
                  <label className="font-semibold text-[#0b3658] block">Valor Total (COP)</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="450000"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#dde7ee] bg-white text-[#0b3658] font-mono focus:outline-none focus:border-[#4e9ad9]"
                  />
                </div>
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
                  {submitting ? 'Registrando...' : 'Crear Orden de Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#dde7ee] shadow-xl space-y-5 relative">
            <button
              onClick={() => setSelectedSale(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-[#4e9ad9]">{selectedSale.id}</span>
              <h3 className="text-xl font-extrabold text-[#0b3658] mt-0.5">{selectedSale.customer}</h3>
              <p className="text-xs text-[#486984] mt-1">
                Técnico: <strong className="text-[#0b3658]">{selectedSale.salesRep}</strong> · Vence: {selectedSale.dueDate}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#486984]">Monto Total:</span>
                <strong className="font-mono tabular-nums text-[#0b3658] text-sm">
                  {formatCOP(selectedSale.amount, true)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Estado de Venta:</span>
                <strong className="text-[#0b3658]">{SALE_STATUS_META[selectedSale.status].label}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Estado de Pago:</span>
                <strong className={PAYMENT_STATUS_META[selectedSale.paymentStatus].colorClass}>
                  {PAYMENT_STATUS_META[selectedSale.paymentStatus].label}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#486984]">Términos:</span>
                <strong className="text-[#0b3658]">{PAYMENT_TERMS_LABELS[selectedSale.paymentTerms]}</strong>
              </div>
            </div>

            {selectedSale.description && (
              <div className="text-xs space-y-1">
                <span className="font-semibold text-[#0b3658]">Detalle:</span>
                <p className="text-[#486984] leading-relaxed">{selectedSale.description}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#dde7ee]">
              <div className="flex items-center gap-2">
                {selectedSale.status === 'pending' && (
                  <button
                    onClick={() =>
                      handleUpdateSale(
                        selectedSale.id,
                        { status: 'shipped' },
                        `Orden ${selectedSale.id} marcada como enviada al cliente.`
                      )
                    }
                    className="cord-btn-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-[#4e9ad9]" />
                    <span>Marcar Enviada</span>
                  </button>
                )}
                {selectedSale.status !== 'completed' && selectedSale.status !== 'cancelled' && (
                  <button
                    onClick={() =>
                      handleUpdateSale(
                        selectedSale.id,
                        { status: 'completed', paymentStatus: 'paid' },
                        `Orden ${selectedSale.id} completada y pagada.`
                      )
                    }
                    className="cord-btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completar y Cobrar</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => generateSaleOrderPdf(selectedSale)}
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
