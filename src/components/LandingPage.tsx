import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Briefcase,
  UserCheck,
  Search,
  MessageSquare,
  KeyRound,
  FileText,
  Scale,
  CheckCircle2,
  X,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';
import { ServiceItem } from '../types';
import { ThreeHeroCanvas } from './ThreeHeroCanvas';

interface LandingPageProps {
  services: ServiceItem[];
  onGoToClientHire: (category?: string) => void;
  onGoToProWork: () => void;
  onEnterFullApp: (tab?: string) => void;
  onOpenAuthModal: (role?: 'client' | 'professional') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuthModal,
}) => {
  const [guideTab, setGuideTab] = useState<'client' | 'professional'>('client');
  const [termsModalOpen, setTermsModalOpen] = useState<boolean>(false);

  const clientSteps = [
    {
      num: '01',
      title: 'Inicia sesión o regístrate como Cliente',
      desc: 'Haz clic en el botón "Cliente". Tu cuenta es estrictamente privada y te da acceso exclusivo al portal de contratación, tus contratos y tu módulo de Gestión de Compras.',
      icon: UserCheck,
    },
    {
      num: '02',
      title: 'Busca trabajadores por chat o filtros',
      desc: 'Usa el chat buscador con autocompletado o los filtros laterales (oficio, ciudad, tarifa y verificación) para explorar anuncios y revisar el perfil completo de cada técnico.',
      icon: Search,
    },
    {
      num: '03',
      title: 'Acuerda por chat o correo y contrata',
      desc: 'Escríbele al trabajador en tiempo real desde la web o envíale un correo. Cuando lleguen a un acuerdo, presiona "Contratar" para proteger el pago en la bóveda de custodia Velo.',
      icon: MessageSquare,
    },
    {
      num: '04',
      title: 'Entrega el código al llegar y libera el pago',
      desc: 'Al confirmar el contrato recibirás un código secreto de 4 dígitos (sistema tipo Rappi). Entrégaselo al trabajador cuando llegue a tu domicilio y confirma la finalización para liberar el pago.',
      icon: KeyRound,
    },
  ];

  const workerSteps = [
    {
      num: '01',
      title: 'Regístrate como Trabajador con verificación',
      desc: 'Entra por el botón "Trabajador". Ingresa tu nombre completo separado (primer nombre y primer apellido obligatorios), tu cédula y reconocimiento facial (puedes usar el botón Omitir en modo prueba).',
      icon: Briefcase,
    },
    {
      num: '02',
      title: 'Publica tus anuncios de servicio',
      desc: 'Desde tu portal privado crea anuncios con tu oficio, ciudad en Colombia, descripción de visita y tarifa base transparente para que los clientes te encuentren y contacten.',
      icon: FileText,
    },
    {
      num: '03',
      title: 'Responde en tiempo real y confirma llegada',
      desc: 'Chatea o responde correos desde la web sin cobros por cotizar. Al llegar al domicilio del cliente, registra el código de 4 dígitos que él te entregue para iniciar la ejecución.',
      icon: KeyRound,
    },
    {
      num: '04',
      title: 'Finaliza el trabajo y gestiona tus ventas',
      desc: 'Marca el servicio como finalizado para que el cliente libere el pago en custodia. Administra tus ingresos, clientes frecuentes y facturación desde el módulo Gestión de Ventas.',
      icon: TrendingDown,
    },
  ];

  const activeSteps = guideTab === 'client' ? clientSteps : workerSteps;

  return (
    <div className="bg-white text-[#0b3658] min-h-screen flex flex-col font-sans antialiased selection:bg-[#4e9ad9]/25 selection:text-[#0b3658]">
      {/* ==========================================================
          1. HEADER / TOP BAR (Clean 3-zone navigation)
      ========================================================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#dde7ee] px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
          <a
            href="#inicio"
            className="text-2xl font-extrabold tracking-tight text-[#0b3658] whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-8 h-8 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] font-extrabold text-lg">
              v
            </span>
            <span>velo</span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#486984]">
            <a
              href="#sobre-la-web"
              className="hover:text-[#0b3658] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sobre la web
            </a>
            <a
              href="#como-usarla"
              className="hover:text-[#0b3658] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Cómo usarla
            </a>
            <a
              href="#terminos-footer"
              className="hover:text-[#0b3658] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Roles y términos
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuthModal('client')}
              className="cord-btn-secondary px-4 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-[#4e9ad9]" />
              <span>Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuthModal('professional')}
              className="cord-btn-primary px-4 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              <span>Trabajador</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================================
          2. ADJUSTED THREE.JS 3D HERO (Airy blur veil without frame border, centered typography)
      ========================================================== */}
      <section
        id="inicio"
        className="relative w-full min-h-[540px] lg:min-h-[600px] bg-gradient-to-b from-[#e6f1fa]/80 via-[#f7fbff] to-white border-b border-[#dde7ee] overflow-hidden flex items-center justify-center py-16 sm:py-24 px-4 sm:px-6 lg:px-8"
      >
        <ThreeHeroCanvas />

        {/* Soft radial frosted backdrop so centered text stays 100% legible without showing any box outline */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.68)_42%,rgba(255,255,255,0.08)_78%,rgba(255,255,255,0)_100%)]"
        />

        <div className="relative z-10 max-w-3xl w-full mx-auto text-center space-y-6 px-4 py-8 sm:py-10 backdrop-blur-[2px]">
          <p className="text-xs sm:text-sm font-semibold text-[#4e9ad9] tracking-tight">
            Plataforma Colombiana de Servicios para el Hogar · Roles Privados · Pago en Custodia
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#0b3658] tracking-tight leading-[1.08] [text-wrap:balance]">
            Conectamos hogares y técnicos con{' '}
            <span className="text-[#4e9ad9]">custodia segura</span>
          </h1>

          <p className="text-base sm:text-lg text-[#486984] max-w-2xl mx-auto leading-relaxed">
            Velo protege cada contratación en Colombia mediante pago retenido en garantía, chat y correo en tiempo real, y validación de llegada con código de 4 dígitos.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('client')}
              className="cord-btn-primary px-7 py-3.5 text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2 shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>Entrar como Cliente</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenAuthModal('professional')}
              className="cord-btn-secondary px-7 py-3.5 text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-[#4e9ad9]" />
              <span>Entrar como Trabajador</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================================
          3. SOBRE LA WEB (Solo información clara sobre qué es Velo)
      ========================================================== */}
      <main className="flex-1 w-full">
        <section
          id="sobre-la-web"
          className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 space-y-10"
        >
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold text-[#4e9ad9]">
              01 · Información sobre la web
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0b3658] tracking-tight [text-wrap:balance]">
              ¿Qué es Velo y qué resuelve para hogares y trabajadores?
            </h2>
            <p className="text-base text-[#486984] leading-relaxed">
              Velo es una plataforma web diseñada para eliminar la desconfianza, los cobros por anticipado y las tarifas ocultas al contratar servicios técnicos o reparaciones del hogar en Colombia. Todo ocurre dentro de espacios privados separados para cada rol.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <article className="p-6 rounded-[20px] bg-white border border-[#dde7ee] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0b3658]">
                Pago retenido en custodia (Escrow)
              </h3>
              <p className="text-sm text-[#486984] leading-relaxed">
                Cuando el cliente contrata, el dinero queda resguardado en la bóveda digital de Velo y no se entrega al trabajador hasta que la visita concluye y el cliente confirma su satisfacción.
              </p>
            </article>

            <article className="p-6 rounded-[20px] bg-white border border-[#dde7ee] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0b3658]">
                Roles privados e identidad verificada
              </h3>
              <p className="text-sm text-[#486984] leading-relaxed">
                Clientes y trabajadores operan en portales totalmente aislados. Los trabajadores registran nombre y apellido separados, cédula y validación facial antes de publicar o atender servicios.
              </p>
            </article>

            <article className="p-6 rounded-[20px] bg-white border border-[#dde7ee] space-y-3 md:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#42b3b1]">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0b3658]">
                Verificación de llegada y trazabilidad
              </h3>
              <p className="text-sm text-[#486984] leading-relaxed">
                Cada contrato genera un código único de 4 dígitos (sistema tipo Rappi) para confirmar la llegada presencial, además de módulos dedicados de Gestión de Compras y Gestión de Ventas.
              </p>
            </article>
          </div>
        </section>

        {/* ==========================================================
            4. CÓMO USAR LA WEB (Guía interactiva Cliente vs Trabajador)
        ========================================================== */}
        <section
          id="como-usarla"
          className="border-t border-[#dde7ee] bg-[#f8fbfe]/70 py-16 lg:py-20"
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-semibold text-[#4e9ad9]">
                  02 · Guía paso a paso
                </p>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0b3658] tracking-tight [text-wrap:balance]">
                  Cómo usar la plataforma según tu rol
                </h2>
                <p className="text-base text-[#486984] leading-relaxed">
                  Selecciona si deseas ver el recorrido para contratar un trabajador o el recorrido para ofrecer tus servicios técnicos.
                </p>
              </div>

              {/* Interactive Role Guide Selector */}
              <div className="cord-toggle-container self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setGuideTab('client')}
                  className={`px-5 py-2.5 text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all ${
                    guideTab === 'client'
                      ? 'cord-toggle-item-active'
                      : 'cord-toggle-item-inactive hover:text-[#0b3658]'
                  }`}
                >
                  Uso para Clientes
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab('professional')}
                  className={`px-5 py-2.5 text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all ${
                    guideTab === 'professional'
                      ? 'cord-toggle-item-active'
                      : 'cord-toggle-item-inactive hover:text-[#0b3658]'
                  }`}
                >
                  Uso para Trabajadores
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSteps.map(step => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="p-6 sm:p-7 rounded-[20px] bg-white border border-[#dde7ee] flex items-start gap-4"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#e6f1fa] flex items-center justify-center text-[#0b3658] font-mono font-bold text-sm shrink-0 tabular-nums">
                      {step.num}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#4e9ad9]">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{guideTab === 'client' ? 'Portal Cliente' : 'Portal Trabajador'}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0b3658] leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-sm text-[#486984] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#dde7ee]">
              <p className="text-sm text-[#486984]">
                {guideTab === 'client'
                  ? '¿Necesitas un técnico verificado para tu hogar hoy?'
                  : '¿Quieres publicar tus anuncios y gestionar tus ventas sin cobro por cotizar?'}
              </p>
              <button
                type="button"
                onClick={() => onOpenAuthModal(guideTab)}
                className="cord-btn-primary px-6 py-3 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2"
              >
                <span>
                  {guideTab === 'client'
                    ? 'Ingresar como Cliente'
                    : 'Ingresar como Trabajador'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================================
          5. FOOTER (Con botón + Términos, Condiciones, Roles y Responsabilidades)
      ========================================================== */}
      <footer
        id="terminos-footer"
        className="border-t border-[#dde7ee] bg-white py-14 px-4 sm:px-6 lg:px-8 text-xs text-[#486984]"
      >
        <div className="max-w-[1200px] mx-auto space-y-10">
          {/* Top row: Brand + Legal Action Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#dde7ee]">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] font-extrabold text-sm">
                  v
                </div>
                <span className="text-lg font-extrabold tracking-tight text-[#0b3658]">
                  velo
                </span>
                <span className="text-[#dde7ee]">·</span>
                <span>Colombia</span>
              </div>
              <p className="text-sm text-[#486984] leading-relaxed">
                Marco operativo de uso, separación estricta de roles privados y responsabilidad de las partes en toda la plataforma web Velo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              className="cord-btn-primary px-6 py-3 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-2 self-start md:self-auto"
            >
              <Scale className="w-4 h-4" />
              <span>Ver Términos, Roles y Responsabilidades</span>
            </button>
          </div>

          {/* Direct summary of Terms, Roles & Responsibilities in the Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#0b3658]">
                Términos y Condiciones Generales
              </h3>
              <p className="leading-relaxed">
                El acceso a Velo implica aceptar el uso lícito de la plataforma, la custodia temporal de pagos hasta la validación del servicio y la prohibición de acuerdos fuera de la app para evadir garantías o mediación.
              </p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#0b3658]">
                Roles Separados y Privados
              </h3>
              <p className="leading-relaxed">
                <strong>Cliente:</strong> explora anuncios, chatea, contrata con custodia, entrega el código de 4 dígitos y gestiona sus compras.{' '}
                <strong>Trabajador:</strong> valida cédula, rostro y nombres, publica anuncios, registra el código en sitio y administra sus ventas.
              </p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-[#0b3658]">
                Responsabilidades de las Partes
              </h3>
              <p className="leading-relaxed">
                El cliente responde por la veracidad de la dirección y el resguardo del código de llegada. El trabajador responde por su idoneidad técnica y ejecución. Velo media disputas en menos de 12 horas y custodia fondos durante el servicio.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[#dde7ee] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#688dac]">
            <span>© 2026 Velo Colombia. Todos los derechos reservados.</span>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setTermsModalOpen(true)}
                className="font-semibold text-[#4e9ad9] hover:text-[#0b3658] hover:underline"
              >
                Documento completo de Términos y Responsabilidad
              </button>
              <span className="text-[#dde7ee]">·</span>
              <button
                type="button"
                onClick={() => onOpenAuthModal('client')}
                className="hover:text-[#0b3658]"
              >
                Acceso Cliente
              </button>
              <span className="text-[#dde7ee]">·</span>
              <button
                type="button"
                onClick={() => onOpenAuthModal('professional')}
                className="hover:text-[#0b3658]"
              >
                Acceso Trabajador
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ==========================================================
          6. MODAL DE TÉRMINOS Y CONDICIONES, ROLES Y RESPONSABILIDAD
      ========================================================== */}
      {termsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/50 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
        >
          <div className="bg-white rounded-[24px] border border-[#dde7ee] shadow-2xl max-w-3xl w-full my-8 p-6 sm:p-8 relative space-y-6 max-h-[88vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setTermsModalOpen(false)}
              aria-label="Cerrar términos y condiciones"
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5 pr-10 border-b border-[#dde7ee] pb-4">
              <p className="text-xs font-semibold text-[#4e9ad9]">
                Marco Legal y Operativo de Velo Colombia
              </p>
              <h2
                id="terms-modal-title"
                className="text-xl sm:text-2xl font-extrabold text-[#0b3658]"
              >
                Términos y Condiciones, Roles y Responsabilidades
              </h2>
            </div>

            <div className="space-y-6 text-sm text-[#486984] leading-relaxed">
              <section className="space-y-2">
                <h3 className="text-base font-bold text-[#0b3658] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#4e9ad9]" />
                  <span>1. Términos y Condiciones Generales de toda la Web</span>
                </h3>
                <p>
                  Al registrarse o utilizar cualquier sección de Velo (portada informativa, chat buscador con autocompletado, mensajería en tiempo real, contratación en custodia, verificación de llegada o módulos de Gestión de Compras y Ventas), el usuario acepta regirse por las presentes condiciones y las leyes vigentes de la República de Colombia.
                </p>
                <p>
                  El valor acordado en pesos colombianos (COP) se retiene en custodia temporal desde la confirmación del contrato hasta que el cliente aprueba la finalización del servicio o hasta que se emita resolución mediante el sistema de mediación.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-[#0b3658] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4e9ad9]" />
                  <span>2. Roles Privados y Aislamiento de Cuentas</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-1.5">
                    <h4 className="font-bold text-[#0b3658] text-sm">Rol: Cliente</h4>
                    <p className="text-xs leading-relaxed">
                      Accede exclusivamente al portal privado de clientes. Puede filtrar trabajadores, revisar perfiles, chatear o enviar correos en tiempo real, contratar servicios con pago en custodia, generar/entregar el código de llegada de 4 dígitos y administrar sus registros en Gestión de Compras. No puede acceder al panel de trabajadores.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-1.5">
                    <h4 className="font-bold text-[#0b3658] text-sm">Rol: Trabajador</h4>
                    <p className="text-xs leading-relaxed">
                      Accede exclusivamente al portal privado de trabajadores tras registrar primer nombre y primer apellido obligatorios, cédula y reconocimiento facial (o marca temporal si omite en modo prueba). Publica anuncios, responde mensajes, valida su llegada con el código del cliente y gestiona sus ingresos en Gestión de Ventas.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="text-base font-bold text-[#0b3658] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#4e9ad9]" />
                  <span>3. Responsabilidades de cada Parte y de la Plataforma</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm list-disc pl-5">
                  <li>
                    <strong className="text-[#0b3658]">Responsabilidad del Cliente:</strong> Suministrar dirección exacta, describir con claridad la necesidad, custodiar el código secreto de 4 dígitos y entregarlo únicamente cuando el trabajador esté presencialmente en el sitio. Revisar el resultado antes de liberar el pago.
                  </li>
                  <li>
                    <strong className="text-[#0b3658]">Responsabilidad del Trabajador:</strong> Aportar datos de identidad veraces, cumplir puntualmente las visitas aceptadas, ejecutar el trabajo bajo estándares técnicos seguros, registrar el código de llegada entregado por el cliente y responder por la garantía de su mano de obra.
                  </li>
                  <li>
                    <strong className="text-[#0b3658]">Responsabilidad de Velo:</strong> Proveer la infraestructura tecnológica de intermediación, mantener la privacidad estricta entre roles, resguardar el dinero en custodia durante el servicio y atender disputas o incidencias mediante mediación humana en un plazo objetivo menor a 12 horas. Velo no asume responsabilidad por acuerdos paralelos ejecutados fuera de la plataforma ni por daños ajenos al alcance contratado.
                  </li>
                </ul>
              </section>
            </div>

            <div className="pt-4 border-t border-[#dde7ee] flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTermsModalOpen(false)}
                className="cord-btn-primary px-6 py-2.5 text-xs sm:text-sm font-bold"
              >
                Entendido y cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
