import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, LogOut, Briefcase, UserCheck } from 'lucide-react';
import { User, ServiceItem, Order, ToastNotification, DirectMessage, WorkerAd } from './types';
import { formatCOP } from './utils/formatCurrency';
import { apiClient } from './services/apiClient';
import { useRealtimeSocket } from './hooks/useRealtimeSocket';
import { Navbar, WorkspaceTab } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ClientMarketplace } from './components/ClientMarketplace';
import { BookingModal } from './components/BookingModal';
import { EscrowTracker } from './components/EscrowTracker';
import { ReverseTakeRateExplainer } from './components/ReverseTakeRateExplainer';
import { ProSaaSPanel } from './components/ProSaaSPanel';
import { AdminMediationPanel } from './components/AdminMediationPanel';
import { PurchasesModule } from './components/PurchasesModule';
import { SalesModule } from './components/SalesModule';
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
  const [incomingMessages, setIncomingMessages] = useState<DirectMessage[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authLockedRole, setAuthLockedRole] = useState<'client' | 'professional' | null>(null);
  const [pendingClientCategory, setPendingClientCategory] = useState<string | null>(null);
  const [switchToWorkerModalOpen, setSwitchToWorkerModalOpen] = useState<boolean>(false);
  const [switchingToClient, setSwitchingToClient] = useState<boolean>(false);

  // Booking & Payment Modals
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<ServiceItem | null>(null);
  const [selectedProIdForBooking, setSelectedProIdForBooking] = useState<string | undefined>(undefined);
  const [selectedAdForBooking, setSelectedAdForBooking] = useState<WorkerAd | null>(null);
  const [initialNotesForBooking, setInitialNotesForBooking] = useState<string>('');
  const [paymentFailedModalOpen, setPaymentFailedModalOpen] = useState<boolean>(false);
  const [serviceForFailedPayment, setServiceForFailedPayment] = useState<ServiceItem | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [criticalError, setCriticalError] = useState<{ title: string; message: string; onRetry?: () => void } | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'alert' | 'push' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newToast: ToastNotification = { id, title, message, type, timestamp };

    setNotifications(prev => [newToast, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setNotifications(prev => prev.filter(t => t.id !== id));
  };

  // Load initial public catalog + users (orders only loaded scoped to authenticated user)
  const loadPublicData = async () => {
    try {
      const [uList, sList] = await Promise.all([apiClient.getUsers(), apiClient.getServices()]);
      setUsers(uList);
      setServices(sList);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setCriticalError({
        title: 'Error de Sincronización',
        message: 'No pudimos conectar con los servicios de datos. Por favor reintenta en unos instantes.',
        onRetry: () => {
          setCriticalError(null);
          loadPublicData();
        },
      });
    } finally {
      setTimeout(() => setLoadingInitial(false), 300);
    }
  };

  const refreshScopedOrders = useCallback(async (userOverride?: User | null) => {
    const targetUser = userOverride !== undefined ? userOverride : currentUser;
    if (!targetUser) {
      setOrders([]);
      return;
    }
    try {
      apiClient.setSessionContext(targetUser);
      const filter =
        targetUser.role === 'client'
          ? { clientId: targetUser.id }
          : targetUser.role === 'professional'
          ? { proId: targetUser.id }
          : undefined;
      const list = await apiClient.getOrders(filter);
      setOrders(list);
    } catch (err) {
      console.error('Error refreshing scoped orders:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPublicData();
  }, []);

  // Real-time WebSocket listener scoped strictly to logged-in user
  useRealtimeSocket(currentUser, {
    onChatMessage: msg => {
      setIncomingMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
      if (currentUser && msg.senderId !== currentUser.id) {
        showToast(
          msg.type === 'email' ? `Nuevo Correo de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
          msg.type === 'email' ? `${msg.subject}: ${msg.text}` : msg.text,
          'push'
        );
      }
    },
    onOrderCreated: order => {
      setOrders(prev => (prev.some(o => o.id === order.id) ? prev : [order, ...prev]));
    },
    onOrderUpdated: order => {
      setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
    },
    onArrivalVerified: order => {
      setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
      if (currentUser?.role === 'client') {
        showToast(
          '¡Llegada Verificada (Sistema Rappi)!',
          `${order.proName} registró tu código y ya está en tu domicilio.`,
          'success'
        );
      }
    },
  });

  // Strict Role-Guarded Router
  const navigate = (path: string, userOverride?: User) => {
    const activeUser = userOverride || currentUser;

    if (path === '/' || !activeUser) {
      setCurrentRoute('/');
      setViewMode('landing');
      return;
    }

    // Strict Role Isolation Guards
    if (activeUser.role === 'client') {
      if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
        setCurrentRoute('/app/explorar');
        setActiveTab('services');
        setViewMode('app');
        return;
      }
      setViewMode('app');
      setCurrentRoute(path);
      if (path === '/app/escrow' || path === '/app/pedidos') setActiveTab('escrow');
      else if (path === '/app/compras') setActiveTab('purchases');
      else if (path === '/app/fidelidad') setActiveTab('reverse-take-rate');
      else setActiveTab('services');
      return;
    }

    if (activeUser.role === 'professional') {
      if (path.startsWith('/app') || path.startsWith('/admin')) {
        setCurrentRoute('/dashboard/agenda');
        setActiveTab('pro-saas');
        setViewMode('app');
        return;
      }
      setViewMode('app');
      setCurrentRoute(path);
      if (path === '/dashboard/ventas') setActiveTab('sales');
      else if (path === '/dashboard/anuncios') setActiveTab('pro-ads');
      else if (path === '/dashboard/mensajes') setActiveTab('pro-messages');
      else setActiveTab('pro-saas');
      return;
    }

    // Admin
    setViewMode('app');
    setCurrentRoute('/admin/mediacion');
    setActiveTab('admin-mediation');
  };

  const openRoleAuth = (role: 'client' | 'professional') => {
    if (currentUser && currentUser.role === role) {
      navigate(role === 'professional' ? '/dashboard/agenda' : '/app/explorar', currentUser);
      return;
    }
    setAuthLockedRole(role);
    setAuthModalOpen(true);
  };

  const handleAuthenticate = async (authenticatedUser: User, targetRoute: string) => {
    apiClient.setSessionContext(authenticatedUser);
    setCurrentUser(authenticatedUser);
    setIncomingMessages([]);

    // Refresh users list in case a new worker/client just registered
    const updatedUsers = await apiClient.getUsers().catch(() => users);
    setUsers(updatedUsers);
    await refreshScopedOrders(authenticatedUser);

    if (pendingClientCategory && authenticatedUser.role === 'client') {
      setSelectedCategory(pendingClientCategory);
      setPendingClientCategory(null);
    }

    showToast(
      `¡Bienvenido, ${authenticatedUser.name.split(' ')[0]}!`,
      authenticatedUser.role === 'client'
        ? 'Has entrado a tu portal privado de Cliente.'
        : authenticatedUser.role === 'professional'
        ? 'Has entrado a tu portal privado de Trabajador.'
        : 'Has entrado a la consola de Mediación.',
      'success'
    );

    navigate(targetRoute, authenticatedUser);
  };

  const handleLogout = () => {
    apiClient.setSessionContext(null);
    setCurrentUser(null);
    setOrders([]);
    setIncomingMessages([]);
    setSwitchToWorkerModalOpen(false);
    setViewMode('landing');
    setCurrentRoute('/');
    showToast('Sesión cerrada', 'Has salido de tu cuenta de forma segura.', 'info');
  };

  // Direct Worker -> Client switch (no login required, preserves all Worker info)
  const handleDirectSwitchToClient = async () => {
    if (!currentUser || currentUser.role !== 'professional' || switchingToClient) return;
    setSwitchingToClient(true);
    try {
      const clientUser = await apiClient.switchToClient(currentUser.id);
      apiClient.setSessionContext(clientUser);
      setCurrentUser(clientUser);
      setIncomingMessages([]);
      const updatedUsers = await apiClient.getUsers().catch(() => users);
      setUsers(updatedUsers);
      await refreshScopedOrders(clientUser);
      navigate('/app/explorar', clientUser);
      showToast(
        'Rol cambiado a Cliente',
        'Tu información, anuncios y ventas de Trabajador quedaron guardados.',
        'success'
      );
    } catch (err: any) {
      showToast('No se pudo cambiar de rol', err.message || 'Intenta nuevamente.', 'alert');
    } finally {
      setSwitchingToClient(false);
    }
  };

  const pros = users.filter(u => u.role === 'professional');

  const handleOpenBooking = (payload: {
    service: ServiceItem;
    proId?: string;
    ad?: WorkerAd;
    initialNotes?: string;
  }) => {
    setSelectedServiceForBooking(payload.service);
    setSelectedProIdForBooking(payload.proId);
    setSelectedAdForBooking(payload.ad || null);
    setInitialNotesForBooking(payload.initialNotes || '');
    setBookingModalOpen(true);
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => (prev.some(o => o.id === newOrder.id) ? prev : [newOrder, ...prev]));
    navigate('/app/escrow');

    showToast(
      'Contrato Confirmado · Código Rappi Generado',
      `Fondos en custodia. Tu código secreto de llegada es ${newOrder.arrivalCode}.`,
      'success'
    );
  };

  const handleTriggerPaymentFailed = () => {
    setServiceForFailedPayment(selectedServiceForBooking || services[0]);
    setBookingModalOpen(false);
    setPaymentFailedModalOpen(true);
  };

  const handleRetryPaymentSuccess = async (methodChosen: string) => {
    if (!currentUser) return;
    const srv = serviceForFailedPayment || services[0];
    const defaultPro = pros[0] || users.find(u => u.role === 'professional');
    if (!defaultPro) return;

    try {
      const newOrder = await apiClient.createOrder({
        clientId: currentUser.id,
        proId: defaultPro.id,
        serviceId: srv.id,
        scheduledDate: new Date('2026-11-14').toISOString(),
        scheduledTimeSlot: '11:00 AM - 1:00 PM',
        address: currentUser.city || 'Calle 67 # 7-35, Chapinero, Bogotá',
        notes: `Pago reintentado con éxito mediante ${methodChosen.toUpperCase()}`,
      });

      setPaymentFailedModalOpen(false);
      handleOrderCreated(newOrder);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Landing page handlers strictly enforce role auth
  const handleLandingHire = (category?: string) => {
    if (category) setPendingClientCategory(category);
    if (currentUser?.role === 'client') {
      if (category) setSelectedCategory(category);
      navigate('/app/explorar', currentUser);
      return;
    }
    openRoleAuth('client');
  };

  const handleLandingProWork = () => {
    openRoleAuth('professional');
  };

  if (loadingInitial) {
    return <PageSkeleton />;
  }

  // 1. Landing Page View (Unauthenticated or when visiting Home)
  if (viewMode === 'landing' || !currentUser) {
    return (
      <>
        <LandingPage
          services={services}
          onGoToClientHire={handleLandingHire}
          onGoToProWork={handleLandingProWork}
          onEnterFullApp={tab => {
            if (tab === 'sales' || tab === 'pro-saas') {
              if (currentUser?.role === 'professional') {
                navigate(tab === 'sales' ? '/dashboard/ventas' : '/dashboard/agenda', currentUser);
              } else {
                openRoleAuth('professional');
              }
            } else {
              if (currentUser?.role === 'client') {
                const map: Record<string, string> = {
                  escrow: '/app/escrow',
                  purchases: '/app/compras',
                  'reverse-take-rate': '/app/fidelidad',
                  services: '/app/explorar',
                };
                navigate(map[tab || 'services'] || '/app/explorar', currentUser);
              } else {
                openRoleAuth('client');
              }
            }
          }}
          onOpenAuthModal={role => openRoleAuth(role || 'client')}
        />

        <NotificationToast
          notifications={notifications}
          onDismiss={dismissToast}
          criticalError={criticalError}
          onDismissCriticalError={() => setCriticalError(null)}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          users={users}
          lockedRole={authLockedRole}
          onAuthenticate={handleAuthenticate}
        />
      </>
    );
  }

  // Mobile navigation items strictly scoped to active role
  const mobileNavItems: Array<{ id: WorkspaceTab; label: string; route: string }> =
    currentUser.role === 'client'
      ? [
          { id: 'services', label: 'Buscar Trabajadores', route: '/app/explorar' },
          { id: 'escrow', label: 'Mis Contratos', route: '/app/escrow' },
          { id: 'purchases', label: 'Compras', route: '/app/compras' },
          { id: 'reverse-take-rate', label: 'Tarifas', route: '/app/fidelidad' },
        ]
      : currentUser.role === 'professional'
      ? [
          { id: 'pro-saas', label: 'Mi Agenda', route: '/dashboard/agenda' },
          { id: 'pro-ads', label: 'Mis Anuncios', route: '/dashboard/anuncios' },
          { id: 'pro-messages', label: 'Mensajes', route: '/dashboard/mensajes' },
          { id: 'sales', label: 'Ventas', route: '/dashboard/ventas' },
        ]
      : [{ id: 'admin-mediation', label: 'Mediación', route: '/admin/mediacion' }];

  return (
    <div className="min-h-screen bg-white text-[#0b3658] flex flex-col font-sans antialiased selection:bg-[#4e9ad9]/25 selection:text-[#0b3658]">
      {/* Role-Isolated Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={tab => {
          if (tab === 'services') navigate('/app/explorar');
          else if (tab === 'escrow') navigate('/app/escrow');
          else if (tab === 'purchases') navigate('/app/compras');
          else if (tab === 'reverse-take-rate') navigate('/app/fidelidad');
          else if (tab === 'pro-saas') navigate('/dashboard/agenda');
          else if (tab === 'pro-ads') navigate('/dashboard/anuncios');
          else if (tab === 'pro-messages') navigate('/dashboard/mensajes');
          else if (tab === 'sales') navigate('/dashboard/ventas');
          else if (tab === 'admin-mediation') navigate('/admin/mediacion');
        }}
        onOpenBooking={
          currentUser.role === 'client' && services[0]
            ? () => handleOpenBooking({ service: services[0] })
            : undefined
        }
        onGoToLanding={() => navigate('/')}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1200px] w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Role-Isolated Navigation */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {mobileNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 border transition-colors ${
                activeTab === item.id
                  ? 'bg-[#0b3658] text-white border-[#0b3658]'
                  : 'bg-white text-[#486984] border-[#dde7ee]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Private Session Status Bar (no cross-role switching) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[#4e9ad9] hover:text-[#0b3658] font-semibold pr-2 border-r border-[#dde7ee]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ir a Portada</span>
            </button>
            <span className="text-[#0b3658]">
              Sesión privada:{' '}
              <strong className="text-[#0b3658]">{currentUser.name}</strong> (
              {currentUser.role === 'client'
                ? 'Cliente'
                : currentUser.role === 'professional'
                ? `Trabajador · ${currentUser.trade || 'Especialista'}`
                : 'Mediación'}
              )
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-white border border-[#dde7ee] text-[#486984]">
              Ruta: <strong className="text-[#4e9ad9]">{currentRoute}</strong>
            </span>

            <button
              onClick={handleLogout}
              className="px-3 py-1 rounded-full bg-white border border-[#dde7ee] text-[#0b3658] hover:border-[#4e9ad9] font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-[#4e9ad9]" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* =====================================================
            CLIENT-ONLY PRIVATE WORKSPACE
           ===================================================== */}
        {currentUser.role === 'client' && activeTab === 'services' && (
          <ClientMarketplace
            currentUser={currentUser}
            pros={pros}
            services={services}
            orders={orders}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onHireWorker={({ service, proId, ad, initialNotes }) =>
              handleOpenBooking({ service, proId, ad, initialNotes })
            }
            incomingMessages={incomingMessages}
          />
        )}

        {currentUser.role === 'client' && activeTab === 'escrow' && (
          <EscrowTracker
            orders={orders}
            currentUser={currentUser}
            onRefreshOrders={() => refreshScopedOrders()}
            onSelectTab={tab => {
              if (tab === 'services') navigate('/app/explorar');
              else if (tab === 'purchases') navigate('/app/compras');
            }}
            incomingMessages={incomingMessages}
          />
        )}

        {currentUser.role === 'client' && activeTab === 'purchases' && (
          <PurchasesModule currentUser={currentUser} onShowToast={showToast} />
        )}

        {currentUser.role === 'client' && activeTab === 'reverse-take-rate' && (
          <ReverseTakeRateExplainer />
        )}

        {/* =====================================================
            WORKER-ONLY PRIVATE WORKSPACE
           ===================================================== */}
        {currentUser.role === 'professional' &&
          (activeTab === 'pro-saas' || activeTab === 'pro-ads' || activeTab === 'pro-messages') && (
            <ProSaaSPanel
              currentPro={currentUser}
              orders={orders}
              pros={pros}
              onRefreshOrders={() => refreshScopedOrders()}
              onShowToast={showToast}
              initialSubTab={
                activeTab === 'pro-ads' ? 'ads' : activeTab === 'pro-messages' ? 'messages' : 'agenda'
              }
              incomingMessages={incomingMessages}
            />
          )}

        {currentUser.role === 'professional' && activeTab === 'sales' && (
          <SalesModule
            currentUser={currentUser}
            pros={pros.length > 0 ? pros : [currentUser]}
            onShowToast={showToast}
          />
        )}

        {/* =====================================================
            ADMIN MEDIATION CONSOLE
           ===================================================== */}
        {currentUser.role === 'admin' && activeTab === 'admin-mediation' && (
          <AdminMediationPanel orders={orders} onRefreshOrders={() => refreshScopedOrders()} />
        )}
      </main>

      {/* Client-Only Booking Modal */}
      {currentUser.role === 'client' && (
        <>
          <BookingModal
            isOpen={bookingModalOpen}
            onClose={() => setBookingModalOpen(false)}
            service={selectedServiceForBooking}
            currentUser={currentUser}
            pros={pros}
            onOrderCreated={handleOrderCreated}
            initialNotes={initialNotesForBooking}
            initialProId={selectedProIdForBooking}
            selectedAd={selectedAdForBooking}
            onTriggerPaymentRetryFlow={handleTriggerPaymentFailed}
          />

          <PaymentFailedModal
            isOpen={paymentFailedModalOpen}
            onClose={() => setPaymentFailedModalOpen(false)}
            service={serviceForFailedPayment}
            onRetrySuccess={handleRetryPaymentSuccess}
          />
        </>
      )}

      {/* Global Notifications */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissToast}
        criticalError={criticalError}
        onDismissCriticalError={() => setCriticalError(null)}
      />

      {/* Floating Role Switch Buttons */}
      {currentUser.role === 'client' && (
        <button
          type="button"
          onClick={() => setSwitchToWorkerModalOpen(true)}
          className="fixed bottom-5 right-5 z-40 cord-btn-primary px-5 py-3 rounded-full shadow-[0px_12px_32px_rgba(11,54,88,0.22)] flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap"
          title="Cambiar al portal privado de Trabajador conservando tu información de Cliente"
        >
          <Briefcase className="w-4 h-4 shrink-0" />
          <span>Cambiar a Trabajador</span>
        </button>
      )}

      {currentUser.role === 'professional' && (
        <button
          type="button"
          onClick={handleDirectSwitchToClient}
          disabled={switchingToClient}
          className="fixed bottom-5 right-5 z-40 px-5 py-3 rounded-full bg-white text-[#0b3658] border border-[#4e9ad9]/40 hover:bg-[#e6f1fa] shadow-[0px_12px_32px_rgba(11,54,88,0.18)] flex items-center gap-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-all disabled:opacity-60"
          title="Cambiar al portal privado de Cliente conservando tu información de Trabajador"
        >
          <UserCheck className="w-4 h-4 text-[#4e9ad9] shrink-0" />
          <span>{switchingToClient ? 'Cambiando a Cliente...' : 'Cambiar a Cliente'}</span>
        </button>
      )}

      {/* Client -> Worker Switch Auth Modal (prefilled with Client info) */}
      {currentUser.role === 'client' && (
        <AuthModal
          isOpen={switchToWorkerModalOpen}
          onClose={() => setSwitchToWorkerModalOpen(false)}
          users={users}
          lockedRole="professional"
          switchFromClient={currentUser}
          onAuthenticate={(proUser, route) => {
            setSwitchToWorkerModalOpen(false);
            handleAuthenticate(proUser, route);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#dde7ee] pt-6 pb-20 sm:pb-8 px-4 lg:px-8 mt-12 bg-white text-xs text-[#486984]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#0b3658] tracking-tight">velo</span>
            <span className="text-[#dde7ee]">·</span>
            <span>Roles privados separados · Chat en tiempo real y verificación Rappi</span>
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
