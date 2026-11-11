import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  TrendingDown, 
  Award,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { User, ServiceItem, Order, ToastNotification } from './types';
import { formatCOP } from './utils/formatCurrency';
import { apiClient } from './services/apiClient';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AiAssistant } from './components/AiAssistant';
import { ServiceCatalog } from './components/ServiceCatalog';
import { BookingModal } from './components/BookingModal';
import { EscrowTracker } from './components/EscrowTracker';
import { ReverseTakeRateExplainer } from './components/ReverseTakeRateExplainer';
import { ProSaaSPanel } from './components/ProSaaSPanel';
import { AdminMediationPanel } from './components/AdminMediationPanel';
import { PageSkeleton } from './components/PageSkeleton';
import { AuthModal } from './components/AuthModal';
import { PaymentFailedModal } from './components/PaymentFailedModal';
import { NotificationToast } from './components/NotificationToast';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'escrow' | 'reverse-take-rate' | 'pro-saas' | 'admin-mediation'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<ServiceItem | null>(null);
  const [initialNotesForBooking, setInitialNotesForBooking] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [paymentFailedModalOpen, setPaymentFailedModalOpen] = useState<boolean>(false);
  const [serviceForFailedPayment, setServiceForFailedPayment] = useState<ServiceItem | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [criticalError, setCriticalError] = useState<{ title: string; message: string; onRetry?: () => void } | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Helper to trigger friendly toasts in #C48CB3
  const showToast = (title: string, message: string, type: 'info' | 'success' | 'alert' | 'push' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newToast: ToastNotification = { id, title, message, type, timestamp };
    
    setNotifications(prev => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setNotifications(prev => prev.filter(t => t.id !== id));
  };

  // Dynamic Router helper
  const navigate = (path: string, userOverride?: User) => {
    setCurrentRoute(path);
    const userToUse = userOverride || currentUser;

    if (path === '/') {
      setViewMode('landing');
      return;
    }

    setViewMode('app');
    if (path === '/app/explorar') {
      setActiveTab('services');
    } else if (path === '/app/escrow' || path === '/app/pedidos') {
      setActiveTab('escrow');
    } else if (path === '/dashboard/agenda') {
      setActiveTab('pro-saas');
      // If user is client, switch to default pro to view technician perspective
      if (userToUse?.role !== 'professional') {
        const pro = users.find(u => u.role === 'professional') || users[1];
        if (pro) setCurrentUser(pro);
      }
    } else if (path === '/admin/mediacion') {
      setActiveTab('admin-mediation');
      if (userToUse?.role !== 'admin') {
        const admin = users.find(u => u.role === 'admin') || users[4] || users[0];
        if (admin) setCurrentUser(admin);
      }
    } else if (path === '/app/fidelidad') {
      setActiveTab('reverse-take-rate');
    }
  };

  // Load initial data
  const loadData = async () => {
    try {
      const [uList, sList, oList] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getServices(),
        apiClient.getOrders(),
      ]);
      setUsers(uList);
      setServices(sList);
      setOrders(oList);
      if (!currentUser && uList.length > 0) {
        // Default to client Carlos
        setCurrentUser(uList[0]);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setCriticalError({
        title: 'Error de Sincronización',
        message: 'No pudimos conectar con los servicios de datos. Por favor reintenta en unos instantes.',
        onRetry: () => {
          setCriticalError(null);
          loadData();
        },
      });
    } finally {
      setTimeout(() => {
        setLoadingInitial(false);
      }, 350);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pros = users.filter(u => u.role === 'professional');

  // Handle Authentication (Fase 1: Redirección Basada en Roles)
  const handleAuthenticate = (authenticatedUser: User, targetRoute: string) => {
    setCurrentUser(authenticatedUser);
    showToast(
      `¡Bienvenido, ${authenticatedUser.name.split(' ')[0]}!`,
      authenticatedUser.role === 'client'
        ? 'Redirigido a tu catálogo oficial de servicios (/app/explorar).'
        : authenticatedUser.role === 'professional'
        ? 'Redirigido a tu agenda y panel de gestión de trabajos (/dashboard/agenda).'
        : 'Redirigido a la consola de mediación humana (/admin/mediacion).',
      'success'
    );
    navigate(targetRoute, authenticatedUser);
  };

  const handleOpenBookingWithService = (service: ServiceItem, initialNotes?: string) => {
    setSelectedServiceForBooking(service);
    setInitialNotesForBooking(initialNotes || '');
    setBookingModalOpen(true);
  };

  // Phase 2: Order created -> Escrow custody & Pro push notification
  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    navigate('/app/escrow');

    showToast(
      'Depósito en Custodia Confirmado',
      `Has reservado "${newOrder.serviceTitle}". Tu dinero queda protegido hasta que valides el resultado.`,
      'success'
    );

    // Push notification for technician (Fase 2)
    setTimeout(() => {
      showToast(
        '¡Notificación PUSH para el Técnico!',
        `Nueva solicitud asignada a ${newOrder.proName}. Ganancia neta: ${formatCOP(newOrder.commission.proNetEarnings)} (0 $ por lead).`,
        'push'
      );
    }, 1200);
  };

  // Phase 3: Payment Rejection Edge Case (10-minute hold window)
  const handleTriggerPaymentFailed = () => {
    setServiceForFailedPayment(selectedServiceForBooking || services[0]);
    setBookingModalOpen(false);
    setPaymentFailedModalOpen(true);
  };

  const handleRetryPaymentSuccess = async (methodChosen: string) => {
    const srv = serviceForFailedPayment || services[0];
    const defaultPro = pros[0] || users[1];

    try {
      const newOrder = await apiClient.createOrder({
        clientId: currentUser?.id || users[0].id,
        proId: defaultPro.id,
        serviceId: srv.id,
        scheduledDate: new Date('2026-11-14').toISOString(),
        scheduledTimeSlot: '11:00 - 13:00',
        address: currentUser?.city || 'Calle Mayor 45, Madrid',
        notes: `Pago reintentado con éxito mediante ${methodChosen.toUpperCase()}`,
      });

      setPaymentFailedModalOpen(false);
      handleOrderCreated(newOrder);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handlers from Landing Page
  const handleLandingHire = (category?: string) => {
    if (category) {
      setSelectedCategory(category);
    }
    const clientUser = users.find(u => u.role === 'client') || users[0];
    if (clientUser) setCurrentUser(clientUser);
    navigate('/app/explorar', clientUser);
  };

  const handleLandingProWork = () => {
    const proUser = users.find(u => u.role === 'professional') || users[1];
    if (proUser) setCurrentUser(proUser);
    navigate('/dashboard/agenda', proUser);
  };

  if (loadingInitial || !currentUser) {
    return <PageSkeleton />;
  }

  // 1. Landing Page View (Default Entry Point with single "Ingresar / Registrarse" top button)
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          services={services}
          onGoToClientHire={handleLandingHire}
          onGoToProWork={handleLandingProWork}
          onEnterFullApp={(tab) => {
            if (tab === 'escrow') navigate('/app/escrow');
            else if (tab === 'pro-saas') navigate('/dashboard/agenda');
            else navigate('/app/explorar');
          }}
          onOpenAuthModal={() => setAuthModalOpen(true)}
        />

        {/* Global Toast Notifications */}
        <NotificationToast
          notifications={notifications}
          onDismiss={dismissToast}
          criticalError={criticalError}
          onDismissCriticalError={() => setCriticalError(null)}
        />

        {/* Auth Modal with Role-Based Redirection */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          users={users}
          onAuthenticate={handleAuthenticate}
        />
      </>
    );
  }

  // 2. Full Application Workspace View
  return (
    <div className="min-h-screen bg-white text-[#0b3658] flex flex-col font-sans antialiased selection:bg-[#4e9ad9]/25 selection:text-[#0b3658]">
      {/* Top Navigation Bar with Dynamic Routing & Role Switcher */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={(u) => {
          setCurrentUser(u);
          if (u.role === 'client') navigate('/app/explorar', u);
          else if (u.role === 'professional') navigate('/dashboard/agenda', u);
          else if (u.role === 'admin') navigate('/admin/mediacion', u);
        }}
        users={users}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'services') navigate('/app/explorar');
          else if (tab === 'escrow') navigate('/app/escrow');
          else if (tab === 'reverse-take-rate') navigate('/app/fidelidad');
          else if (tab === 'pro-saas') navigate('/dashboard/agenda');
          else if (tab === 'admin-mediation') navigate('/admin/mediacion');
        }}
        onOpenBooking={() => handleOpenBookingWithService(services[0] || null)}
        onGoToProWork={handleLandingProWork}
        onGoToLanding={() => navigate('/')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Breadcrumb & Dynamic Routing Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[#4e9ad9] hover:text-[#0b3658] font-semibold pr-2 border-r border-[#dde7ee]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Portada</span>
            </button>
            <span className="w-2 h-2 rounded-full bg-[#42b3b1]" />
            <span className="text-[#0b3658]">
              Sesión activa: <strong className="text-[#0b3658]">{currentUser.name}</strong> ({currentUser.role === 'client' ? 'Cliente' : currentUser.role === 'professional' ? `Técnico (${currentUser.trade})` : 'Soporte / Dueño'})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-white border border-[#dde7ee] text-[#486984]">
              Ruta: <strong className="text-[#4e9ad9]">{currentRoute}</strong>
            </span>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1 rounded-full bg-white border border-[#dde7ee] text-[#0b3658] hover:border-[#4e9ad9] font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#4e9ad9]" />
              <span>Cambiar Perfil</span>
            </button>
          </div>
        </div>

        {/* Tab 1: /app/explorar -> Mobile-app-style Services Catalog & AI Diagnosis */}
        {activeTab === 'services' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 cord-card p-6 lg:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#4e9ad9] tracking-wider uppercase cord-badge">
                    <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
                    <span>Servicios del Hogar con Precios Claros y Cerrados</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0b3658] tracking-tight leading-tight">
                    El fin de las tarifas ocultas y los cobros por adelantado.
                  </h1>

                  <p className="text-xs sm:text-sm text-[#486984] leading-relaxed max-w-xl">
                    Velo sustituye el modelo tradicional por total tranquilidad. Tus pagos quedan seguros en custodia hasta tu visto bueno, los técnicos no pagan por presupuestar y la comisión de gestión baja del 15% al 5% por fidelidad.
                  </p>
                </div>

                {/* 3 Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
                    <Lock className="w-4 h-4 text-[#4e9ad9] mb-1.5" />
                    <div className="font-bold text-xs text-[#0b3658]">Pagos en Custodia</div>
                    <div className="text-[11px] text-[#486984] mt-0.5">Fondos retenidos y seguros</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
                    <TrendingDown className="w-4 h-4 text-[#4e9ad9] mb-1.5" />
                    <div className="font-bold text-xs text-[#0b3658]">Ahorro por Fidelidad</div>
                    <div className="text-[11px] text-[#486984] mt-0.5">Comisión del 15% al 5%</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee]">
                    <ShieldCheck className="w-4 h-4 text-[#42b3b1] mb-1.5" />
                    <div className="font-bold text-xs text-[#0b3658]">Precios All-In</div>
                    <div className="text-[11px] text-[#486984] mt-0.5">Sin recargos sorpresa</div>
                  </div>
                </div>
              </div>

              {/* Hero Image Container */}
              <div className="lg:col-span-5 rounded-[20px] overflow-hidden relative min-h-[260px] lg:min-h-full border border-[#dde7ee] bg-[#e6f1fa] shadow-sm">
                <img
                  src="/src/assets/images/hero_velo_service_1794317976474.jpg"
                  alt="Técnico profesional de Velo asesorando a un cliente"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b3658]/90 via-[#0b3658]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#dde7ee] text-xs text-[#0b3658] shadow-lg">
                  <div className="font-bold text-[#0b3658] flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#4e9ad9]" />
                    <span>Garantía de Satisfacción Velo</span>
                  </div>
                  <div className="text-[11px] text-[#486984] mt-0.5">
                    Técnicos certificados, seguro de responsabilidad y mediación humana en menos de 12 horas.
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant for Plain Text Diagnostic (Fase 2 Ruta del Cliente) */}
            <AiAssistant
              services={services}
              onSelectServiceAndBook={handleOpenBookingWithService}
              onManualCategorySelect={(cat) => setSelectedCategory(cat)}
            />

            {/* Catalog of Services */}
            <ServiceCatalog
              services={services}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectService={handleOpenBookingWithService}
            />
          </div>
        )}

        {/* Tab 2: /app/escrow -> Escrow Tracker & Vault */}
        {activeTab === 'escrow' && (
          <EscrowTracker
            orders={orders}
            currentUser={currentUser}
            onRefreshOrders={loadData}
            onSelectTab={(tab) => {
              if (tab === 'services') navigate('/app/explorar');
              else if (tab === 'admin-mediation') navigate('/admin/mediacion');
              else setActiveTab(tab);
            }}
          />
        )}

        {/* Tab 3: /app/fidelidad -> Reverse Take Rate Explainer */}
        {activeTab === 'reverse-take-rate' && (
          <ReverseTakeRateExplainer />
        )}

        {/* Tab 4: /dashboard/agenda -> Pro High-Density Workspace */}
        {activeTab === 'pro-saas' && (
          <ProSaaSPanel
            currentPro={currentUser.role === 'professional' ? currentUser : pros[0]}
            orders={orders}
            onRefreshOrders={loadData}
            onShowToast={showToast}
          />
        )}

        {/* Tab 5: /admin/mediacion -> Platform Owner & Human Mediation */}
        {activeTab === 'admin-mediation' && (
          <AdminMediationPanel
            orders={orders}
            onRefreshOrders={loadData}
          />
        )}
      </main>

      {/* Booking Modal with Option to Test Failed Payment */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        service={selectedServiceForBooking}
        currentUser={currentUser}
        pros={pros}
        onOrderCreated={handleOrderCreated}
        initialNotes={initialNotesForBooking}
        onTriggerPaymentRetryFlow={handleTriggerPaymentFailed}
      />

      {/* Payment Failed Modal (Fase 3: 10-Minute Hold Timer & Alternate Methods) */}
      <PaymentFailedModal
        isOpen={paymentFailedModalOpen}
        onClose={() => setPaymentFailedModalOpen(false)}
        service={serviceForFailedPayment}
        onRetrySuccess={handleRetryPaymentSuccess}
      />

      {/* Unified Auth Modal with Role-Based Routing (Fase 1) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        users={users}
        onAuthenticate={handleAuthenticate}
      />

      {/* Global Notifications: Rosa/Malva Toasts & Dark Critical Modal (Fase 4) */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissToast}
        criticalError={criticalError}
        onDismissCriticalError={() => setCriticalError(null)}
      />

      {/* Footer */}
      <footer className="border-t border-[#dde7ee] py-6 px-4 lg:px-8 mt-12 bg-white text-xs text-[#486984]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0b3658] tracking-tight">velo</span>
            <span className="text-[#dde7ee]">·</span>
            <span>Servicios del Hogar con Pago Protegido y Tarifas Justas</span>
          </div>
          <div className="flex items-center gap-4 text-[#688dac]">
            <span>Custodia Segura Garantizada</span>
            <span className="text-[#dde7ee]">·</span>
            <span>Tarifas Reducidas por Fidelidad</span>
            <span className="text-[#dde7ee]">·</span>
            <span>Facturación Oficial en PDF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
