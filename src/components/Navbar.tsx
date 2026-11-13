import React from 'react';
import { ShieldCheck, Home, LogOut, UserCheck, Briefcase } from 'lucide-react';
import { User } from '../types';

export type WorkspaceTab =
  | 'services'
  | 'escrow'
  | 'purchases'
  | 'sales'
  | 'reverse-take-rate'
  | 'pro-saas'
  | 'pro-ads'
  | 'pro-messages'
  | 'admin-mediation';

interface NavbarProps {
  currentUser: User;
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  onOpenBooking?: () => void;
  onGoToLanding: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenBooking,
  onGoToLanding,
  onLogout,
}) => {
  // Strictly isolated navigation items per private role
  const navItems: Array<{ id: WorkspaceTab; label: string }> =
    currentUser.role === 'client'
      ? [
          { id: 'services', label: 'Buscar Trabajadores' },
          { id: 'escrow', label: 'Mis Contratos' },
          { id: 'purchases', label: 'Gestión de Compras' },
          { id: 'reverse-take-rate', label: 'Tarifas' },
        ]
      : currentUser.role === 'professional'
      ? [
          { id: 'pro-saas', label: 'Mi Agenda y Contratos' },
          { id: 'pro-ads', label: 'Mis Anuncios' },
          { id: 'pro-messages', label: 'Mensajes' },
          { id: 'sales', label: 'Gestión de Ventas' },
        ]
      : [{ id: 'admin-mediation', label: 'Mediación' }];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dde7ee] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2 group text-left focus:outline-none"
            title="Ir a la portada"
          >
            <div className="w-8 h-8 rounded-xl bg-[#e6f1fa] flex items-center justify-center text-[#4e9ad9] font-extrabold text-lg group-hover:scale-105 transition-transform">
              v
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-[#0b3658] group-hover:text-[#4e9ad9] transition-colors">
                velo
              </span>
            </div>
          </button>
        </div>

        {/* Strict Role-Isolated Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs lg:text-sm font-semibold">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
                activeTab === item.id
                  ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                  : 'text-[#486984] hover:text-[#0b3658]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Private Session Info & Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onGoToLanding}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e6f1fa] text-xs font-semibold text-[#0b3658] hover:bg-[#dde7ee] transition-colors whitespace-nowrap shrink-0"
          >
            <Home className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Inicio</span>
          </button>

          {/* Private Role Indicator (no cross-role switching allowed!) */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8fbfe] border border-[#dde7ee] text-xs font-bold text-[#0b3658] whitespace-nowrap">
            {currentUser.role === 'professional' ? (
              <Briefcase className="w-3.5 h-3.5 text-[#4e9ad9]" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-[#4e9ad9]" />
            )}
            <span>
              {currentUser.role === 'client'
                ? `Cliente: ${currentUser.name.split(' ')[0]}`
                : currentUser.role === 'professional'
                ? `Trabajador: ${currentUser.name.split(' ')[0]}`
                : 'Soporte Velo'}
            </span>
          </div>

          {/* Client-only Quick Hire Button */}
          {currentUser.role === 'client' && onOpenBooking && (
            <button
              onClick={onOpenBooking}
              className="cord-btn-primary px-3.5 py-1.5 rounded-3xl text-xs font-bold whitespace-nowrap hidden sm:inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Nuevo Contrato</span>
            </button>
          )}

          {/* Logout Button to return to Landing cleanly */}
          <button
            onClick={onLogout}
            className="cord-btn-secondary px-3.5 py-1.5 rounded-3xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
