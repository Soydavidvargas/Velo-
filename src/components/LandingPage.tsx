import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  TrendingDown, 
  CheckCircle2, 
  ArrowRight, 
  Briefcase, 
  UserCheck, 
  Star, 
  Clock, 
  Award,
  Search,
  Check,
  ChevronRight,
  Wrench,
  Zap,
  Flame,
  Shield,
  Box
} from 'lucide-react';
import { motion } from 'motion/react';
import { ServiceItem } from '../types';
import { formatCOP } from '../utils/formatCurrency';
import { ThreeHeroCanvas } from './ThreeHeroCanvas';

interface LandingPageProps {
  services: ServiceItem[];
  onGoToClientHire: (category?: string) => void;
  onGoToProWork: () => void;
  onEnterFullApp: (tab?: string) => void;
  onOpenAuthModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  services,
  onGoToClientHire,
  onGoToProWork,
  onEnterFullApp,
  onOpenAuthModal,
}) => {
  const [activeRoleToggle, setActiveRoleToggle] = useState<'client' | 'pro'>('client');
  const [heroSearch, setHeroSearch] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeRoleToggle === 'client') {
      onGoToClientHire(selectedCategoryFilter === 'all' ? undefined : selectedCategoryFilter);
    } else {
      onGoToProWork();
    }
  };

  const filterChips = [
    { id: 'all', label: 'Todos los servicios', icon: Sparkles },
    { id: 'plumbing', label: 'Plomería y cañerías', icon: Wrench },
    { id: 'electricity', label: 'Electricidad certificada', icon: Zap },
    { id: 'climatization', label: 'Gasodomésticos & Clima', icon: Flame },
    { id: 'escrow', label: 'Custodia segura Velo', icon: Shield },
  ];

  return (
    <div className="bg-white text-[#0b3658] min-h-screen flex flex-col font-sans antialiased selection:bg-[#4e9ad9]/25 selection:text-[#0b3658]">
      {/* ==========================================================
          1. NAVIGATION HEADER (cord.com style: sticky, minimal, #4e9ad9 CTA)
      ========================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#dde7ee] px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onEnterFullApp('services')}
              className="flex items-center gap-2 group text-left"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] font-extrabold text-xl group-hover:scale-105 transition-transform">
                v
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-[#0b3658]">
                  velo
                </span>
                <span className="text-[10px] text-[#4e9ad9] font-mono font-bold block -mt-1">
                  COLOMBIA · ESCROW
                </span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#486984]">
            <a href="#propuesta" className="hover:text-[#0b3658] transition-colors">Propuesta</a>
            <a href="#servicios" className="hover:text-[#0b3658] transition-colors">Servicios All-In</a>
            <a href="#garantia" className="hover:text-[#0b3658] transition-colors">Garantía 24h</a>
            <button onClick={() => onEnterFullApp('reverse-take-rate')} className="hover:text-[#0b3658] transition-colors">
              Calculadora de Tarifas
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAuthModal}
              className="cord-btn-secondary px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap shadow-sm"
            >
              <span>Ingresar</span>
            </button>

            <button
              onClick={onGoToProWork}
              className="cord-btn-primary px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap flex items-center gap-1.5 shadow-sm"
            >
              <Briefcase className="w-4 h-4" />
              <span>Trabajar</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================================
          2. THREE.JS 3D HERO BANNER ("Diseño a primera vista" - Centered over 3D Canvas)
      ========================================================== */}
      <section className="relative w-full h-[85vh] min-h-[720px] bg-gradient-to-b from-[#e6f1fa] via-[#f8fbfe] to-white border-b border-[#dde7ee] overflow-hidden flex items-center justify-center py-24 sm:py-32 px-4">
        {/* Three.js 3D Interactive Canvas as background */}
        <ThreeHeroCanvas />

        <div className="relative z-10 max-w-4xl w-full mx-auto text-center space-y-6 bg-white/80 backdrop-blur-2xl p-10 sm:p-16 rounded-[40px] shadow-[0px_30px_80px_0px_rgba(11,54,88,0.12)]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e6f1fa] border border-[#dde7ee] text-xs font-bold text-[#4e9ad9] shadow-sm">
            <Box className="w-4 h-4 text-[#4e9ad9] shrink-0" />
            <span>Diseño a primera vista · Bóveda 3D Interactiva Velo</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black text-[#0b3658] tracking-tight leading-[1.08]">
            El futuro de los servicios en <span className="text-[#4e9ad9]">Colombia</span>
          </h1>

          <p className="text-sm sm:text-base text-[#486984] max-w-xl mx-auto leading-relaxed">
            Pagos en custodia fiduciaria, cero cobros por cotizar a técnicos y tarifas decrecientes garantizadas para hogares y profesionales en Bogotá, Medellín y Cali.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => onGoToClientHire()}
              className="cord-btn-primary px-7 py-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md"
            >
              <span>Explorar Servicios</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEnterFullApp('escrow')}
              className="cord-btn-secondary px-7 py-3.5 text-xs sm:text-sm font-bold shadow-sm"
            >
              Ver Bóveda de Custodia
            </button>
          </div>
        </div>
      </section>

      {/* Main Body Content */}
      <main className="flex-1 w-full space-y-20 lg:space-y-24">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto px-4 lg:px-8 pt-10 text-center space-y-6" 
          id="propuesta"
        >
          <div className="inline-flex items-center justify-center">
            <div className="cord-toggle-container">
              <button
                type="button"
                onClick={() => setActiveRoleToggle('client')}
                className={`px-5 py-2 text-xs sm:text-sm transition-all ${
                  activeRoleToggle === 'client'
                    ? 'cord-toggle-item-active'
                    : 'cord-toggle-item-inactive hover:text-[#0b3658]'
                }`}
              >
                Para encontrar técnicos
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleToggle('pro')}
                className={`px-5 py-2 text-xs sm:text-sm transition-all ${
                  activeRoleToggle === 'pro'
                    ? 'cord-toggle-item-active'
                    : 'cord-toggle-item-inactive hover:text-[#0b3658]'
                }`}
              >
                Para profesionales
              </button>
            </div>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-[50px] font-extrabold text-[#0b3658] tracking-[-0.03em] leading-[1.08]">
              Servicios del hogar con{' '}
              <span className="text-[#4e9ad9]">pago protegido</span> y tarifas sin sorpresas.
            </h2>
            <p className="text-base sm:text-lg text-[#486984] font-normal leading-relaxed max-w-2xl mx-auto">
              Olvídate de presupuestos inflados y anticipos a ciegas. Tu dinero queda custodiado en la bóveda Velo hasta que compruebes el trabajo terminado. Y los técnicos no pagan por presupuestar.
            </p>
          </div>

          <form 
            onSubmit={handleHeroSearchSubmit}
            className="max-w-2xl mx-auto relative flex items-center"
          >
            <div className="relative w-full">
              <Search className="w-5 h-5 text-[#486984] absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                placeholder={
                  activeRoleToggle === 'client'
                    ? '¿Qué necesitas en tu hogar? Ej: Fuga en lavaplatos, tacos eléctricos, calentador a gas...'
                    : 'Tu oficio o ciudad en Colombia: Ej: Plomería Bogotá, Electricista Medellín, Cali...'
                }
                className="w-full pl-12 pr-28 sm:pr-44 py-4 rounded-3xl bg-white border border-[#dde7ee] text-sm text-[#0b3658] placeholder-[#486984] focus:outline-none focus:border-[#4e9ad9] shadow-[0px_4px_32px_0px_rgba(11,54,88,0.06)] transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-[5px] bg-[#e6f1fa] text-[11px] font-mono font-medium text-[#4e9ad9]">
                  ⌘K
                </span>
                <button
                  type="submit"
                  className="cord-btn-primary px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                >
                  <span>{activeRoleToggle === 'client' ? 'Buscar' : 'Unirme'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {filterChips.map(chip => {
              const Icon = chip.icon;
              const isSelected = selectedCategoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    setSelectedCategoryFilter(chip.id);
                    if (chip.id === 'escrow') {
                      onEnterFullApp('escrow');
                    } else {
                      onGoToClientHire(chip.id === 'all' ? undefined : chip.id);
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#0b3658] text-white shadow-sm'
                      : 'bg-white border border-[#dde7ee] text-[#0b3658] hover:border-[#4e9ad9]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* ==========================================================
            3. SERVICES PREVIEW GRID (Fixed image proportions & spacing)
        ========================================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto px-4 lg:px-8 space-y-8" 
          id="servicios"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="cord-badge">
                <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
                <span>Catálogo Oficial en Colombia</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b3658] tracking-tight">
                Tarifas All-In con Profesionales Destacados
              </h3>
            </div>
            <button
              onClick={() => onGoToClientHire()}
              className="text-sm font-semibold text-[#4e9ad9] hover:text-[#0b3658] inline-flex items-center gap-1 transition-colors"
            >
              <span>Ver catálogo completo ({services.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <div
                key={service.id}
                className="cord-card-interactive p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Perfectly proportioned image container (h-48 w-full object-cover rounded-[16px]) */}
                  {service.imageUrl && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 relative bg-[#e6f1fa] border border-[#dde7ee]">
                      <img
                        src={service.imageUrl}
                        alt={service.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-[5px] text-xs font-bold text-[#0b3658] shadow-sm border border-[#dde7ee]">
                        {service.categoryLabel}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-[#486984] mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#486984]" />
                    <span>~{service.estimatedHours} horas estimadas</span>
                    <span>·</span>
                    <span className="text-[#4e9ad9] font-medium">Bóveda Protegida</span>
                  </div>

                  <h4 className="text-lg font-bold text-[#0b3658] group-hover:text-[#4e9ad9] transition-colors leading-snug">
                    {service.title}
                  </h4>

                  <p className="text-sm text-[#486984] mt-2 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>

                  <ul className="mt-3.5 space-y-1.5 text-xs text-[#0b3658]">
                    {service.includedTasks.slice(0, 3).map((task, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#4e9ad9] shrink-0" />
                        <span className="truncate">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-4 border-t border-[#dde7ee] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#688dac] uppercase tracking-wider block">
                      Precio All-In
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#0b3658] font-mono tabular-nums">
                        {formatCOP(service.basePrice)}
                      </span>
                      <span className="text-xs text-[#486984]">Tarifa All-In</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <button
                      onClick={() => onGoToClientHire(service.category)}
                      className="cord-btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 shadow-sm"
                    >
                      <span>Solicitar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-[11px] font-semibold text-[#42b3b1] block text-right">
                      100% verificado
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ==========================================================
            4. HOW IT WORKS (3 Simple Steps)
        ========================================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto px-4 lg:px-8 space-y-8" 
          id="garantia"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="cord-badge">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4e9ad9]" />
              <span>Seguridad Radical en 3 Pasos</span>
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0b3658] tracking-tight">
              ¿Cómo funciona el pago en custodia Velo?
            </h3>
            <p className="text-sm text-[#486984]">
              Diseñado para eliminar estafas, anticipos a ciegas y desintermediación.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cord-card p-6 lg:p-8 space-y-4 bg-white border border-[#dde7ee]">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] font-mono font-black text-lg shadow-sm">
                1
              </div>
              <h4 className="text-lg font-extrabold text-[#0b3658]">
                Apruebas Fondos en Custodia
              </h4>
              <p className="text-sm text-[#486984] leading-relaxed">
                Seleccionas el servicio con precio cerrado. El dinero queda retenido de forma segura en la bóveda Velo, sin entregárselo al técnico por adelantado.
              </p>
            </div>

            <div className="cord-card p-6 lg:p-8 space-y-4 bg-white border border-[#dde7ee]">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] font-mono font-black text-lg shadow-sm">
                2
              </div>
              <h4 className="text-lg font-extrabold text-[#0b3658]">
                El Profesional Ejecuta la Visita
              </h4>
              <p className="text-sm text-[#486984] leading-relaxed">
                El técnico verificado acude puntualmente a tu domicilio en Colombia, realiza la reparación con garantía de 6 meses y emite la factura oficial.
              </p>
            </div>

            <div className="cord-card p-6 lg:p-8 space-y-4 bg-white border border-[#dde7ee]">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#42b3b1] font-mono font-black text-lg shadow-sm">
                3
              </div>
              <h4 className="text-lg font-extrabold text-[#0b3658]">
                Validas y se Libera el Pago
              </h4>
              <p className="text-sm text-[#486984] leading-relaxed">
                Verificas que todo funcione a la perfección y presionas "Liberar Pago". Los fondos pasan inmediatamente a su billetera virtual con tarifa reducida para futuras visitas.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ==========================================================
            5. REVERSE TAKE RATE EXPLAINER PREVIEW
        ========================================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto px-4 lg:px-8"
        >
          <div className="cord-card p-8 lg:p-12 bg-gradient-to-br from-white via-[#f8fbfe] to-[#e6f1fa]/40 border border-[#dde7ee] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="cord-badge">
                  <TrendingDown className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  <span>Modelo Win-Win-Win</span>
                </span>
                <h3 className="text-2xl lg:text-3xl font-extrabold text-[#0b3658] tracking-tight">
                  Comisiones decrecientes del 15% al 5% (Reverse Take Rate)
                </h3>
                <p className="text-sm text-[#486984] leading-relaxed">
                  En Velo cuantas más veces contratas al mismo profesional, menor es la comisión de plataforma. Premiamos la confianza y evitamos que las partes salgan de la app.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-[#dde7ee] shadow-sm text-center shrink-0">
                <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-semibold">
                  Comisión para Clientes Frecuentes
                </span>
                <div className="text-4xl font-black text-[#4e9ad9] font-mono mt-1">
                  5%
                </div>
                <div className="text-xs text-[#0b3658] font-medium mt-1">Tarifa VIP recurrente</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#dde7ee] text-xs text-[#486984]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#4e9ad9]" />
                <span>0 $ de cobro por enviar presupuestos (0 pesos por lead)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#4e9ad9]" />
                <span>Soporte y mediación humana en Colombia en menos de 12 horas</span>
              </div>
              <button
                onClick={() => onEnterFullApp('reverse-take-rate')}
                className="text-xs font-bold text-[#4e9ad9] hover:underline"
              >
                Abrir calculadora de comisiones →
              </button>
            </div>
          </div>
        </motion.section>

        {/* ==========================================================
            6. TESTIMONIALS
        ========================================================== */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-[1200px] mx-auto px-4 lg:px-8 space-y-6"
        >
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="cord-badge">
              <Star className="w-3.5 h-3.5 text-[#4e9ad9] fill-[#4e9ad9]" />
              <span>4.94 / 5 Satisfacción Verificada en Colombia</span>
            </span>
            <h3 className="text-2xl font-extrabold text-[#0b3658] tracking-tight">
              Opiniones de quienes ya confían en Velo
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="cord-card p-6 space-y-4">
              <div className="flex items-center gap-1 text-[#4e9ad9]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#4e9ad9]" />
                ))}
              </div>
              <p className="text-[#0b3658] italic leading-relaxed">
                "Tenía una fuga en el lavaplatos y en otros lados me cobraban solo por la visita. Con Velo pagué una tarifa cerrada en pesos que quedó en custodia hasta que Mario terminó el arreglo. Cero sorpresas."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#dde7ee]">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80&fm=webp"
                  alt="Carlos Méndez"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <strong className="text-[#0b3658] block font-bold">Carlos Méndez</strong>
                  <span className="text-xs text-[#486984]">Cliente en Bogotá (Chapinero)</span>
                </div>
              </div>
            </div>

            <div className="cord-card p-6 space-y-4">
              <div className="flex items-center gap-1 text-[#4e9ad9]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#4e9ad9]" />
                ))}
              </div>
              <p className="text-[#0b3658] italic leading-relaxed">
                "Estaba cansado de pagar por 'contactos' que nunca contrataban. En Velo no pago un solo peso por presupuestar y con mis clientes frecuentes en Bogotá la comisión me ha bajado al 5%."
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#dde7ee]">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80&fm=webp"
                  alt="Mario Restrepo"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
                <div>
                  <strong className="text-[#0b3658] block font-bold">Mario Restrepo</strong>
                  <span className="text-xs text-[#486984]">Maestro Plomero en Bogotá (148 servicios)</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ==========================================================
            7. FULL-BLEED DARK CTA BANNER (#0b3658 background)
        ========================================================== */}
        <section className="w-full bg-[#0b3658] py-16 px-4 lg:px-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#4e9ad9]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto space-y-6 relative z-10">
            {/* Avatar Stack (-8px overlap) */}
            <div className="flex items-center justify-center -space-x-3">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80&fm=webp" alt="User 1" className="w-12 h-12 rounded-full object-cover border-2 border-[#0b3658] shadow-md" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80&fm=webp" alt="User 2" className="w-12 h-12 rounded-full object-cover border-2 border-[#0b3658] shadow-md" />
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80&fm=webp" alt="User 3" className="w-12 h-12 rounded-full object-cover border-2 border-[#0b3658] shadow-md" />
              <div className="w-12 h-12 rounded-full bg-[#4e9ad9] border-2 border-[#0b3658] flex items-center justify-center text-xs font-bold text-white shadow-md">
                +3k
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Empieza a contratar con <span className="text-[#4e9ad9]">custodia segura</span> en Colombia
            </h2>

            <p className="text-sm sm:text-base text-[#e6f1fa]/80 max-w-xl mx-auto leading-relaxed">
              Únete a miles de hogares y técnicos independientes en Bogotá, Medellín y Cali que operan sin sorpresas ni costes ocultos.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onEnterFullApp('services')}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#4e9ad9] text-white text-sm font-bold shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all"
              >
                Explorar Servicios en Colombia
              </button>
              <button
                onClick={onGoToProWork}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
              >
                Registrarme como Técnico (0 $ Lead)
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================================
          8. FOOTER
      ========================================================== */}
      <footer className="border-t border-[#dde7ee] py-12 px-4 lg:px-8 bg-white text-xs text-[#486984]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] font-extrabold text-sm">
                v
              </div>
              <span className="text-lg font-black tracking-tight text-[#0b3658]">velo</span>
            </div>
            <p className="text-xs text-[#486984] leading-relaxed">
              Plataforma SaaS-enabled con pagos en custodia fiduciaria y comisiones decrecientes para Colombia.
            </p>
            <div className="text-[11px] text-[#688dac] font-mono">
              © 2026 Velo Colombia S.A.S. Todos los derechos reservados.
            </div>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-base font-bold text-[#0b3658]">Para Clientes</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => onGoToClientHire('plumbing')} className="hover:text-[#0b3658]">Plomería y Fugas</button></li>
              <li><button onClick={() => onGoToClientHire('electricity')} className="hover:text-[#0b3658]">Electricidad y Breakers</button></li>
              <li><button onClick={() => onGoToClientHire('climatization')} className="hover:text-[#0b3658]">Calentadores a Gas y Aire</button></li>
              <li><button onClick={() => onEnterFullApp('escrow')} className="hover:text-[#0b3658]">Bóveda de Custodia Segura</button></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-base font-bold text-[#0b3658]">Para Profesionales</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={onGoToProWork} className="hover:text-[#0b3658]">Unirse como Técnico</button></li>
              <li><button onClick={() => onEnterFullApp('pro-saas')} className="hover:text-[#0b3658]">Agenda y Facturación</button></li>
              <li><button onClick={() => onEnterFullApp('reverse-take-rate')} className="hover:text-[#0b3658]">Tarifa decreciente 15% → 5%</button></li>
              <li><button onClick={onGoToProWork} className="hover:text-[#0b3658]">0 $ por cotización (0 por lead)</button></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-base font-bold text-[#0b3658]">Seguridad y Garantía</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-[#0b3658] font-medium">Bóveda de Pagos Escrow</span></li>
              <li><span className="text-[#0b3658] font-medium">Mediación Humana &lt; 12h</span></li>
              <li><span className="text-[#0b3658] font-medium">Garantía 6 meses por escrito</span></li>
              <li><span className="text-[#0b3658] font-medium">Factura oficial en PDF</span></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
