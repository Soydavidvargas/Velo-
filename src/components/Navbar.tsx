import React from 'react';
import { ShieldCheck, Briefcase, Home, UserCheck, ChevronDown } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onSelectUser: (user: User) => void;
  users: User[];
  activeTab: 'services' | 'escrow' | 'reverse-take-rate' | 'pro-saas' | 'admin-mediation';
  setActiveTab: (tab: 'services' | 'escrow' | 'reverse-take-rate' | 'pro-saas' | 'admin-mediation') => void;
  onOpenBooking: () => void;
  onGoToProWork: () => void;
  onGoToLanding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectUser,
  users,
  activeTab,
  setActiveTab,
  onOpenBooking,
  onGoToProWork,
  onGoToLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dde7ee] px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6">
        {/* Brand Zone (cord style lowercase Figtree 24px 800) */}
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
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-[#486984]">
                · servicios con custodia
              </span>
            </div>
          </button>
        </div>

        {/* Clean Navigation Links (14px 600 in #486984) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('services')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'services'
                ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Servicios y Precios
          </button>
          <button
            onClick={() => setActiveTab('escrow')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'escrow'
                ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Bóveda de Pago
          </button>
          <button
            onClick={() => setActiveTab('reverse-take-rate')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'reverse-take-rate'
                ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Tarifas 15% → 5%
          </button>
          <button
            onClick={() => setActiveTab('pro-saas')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'pro-saas'
                ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Panel del Técnico
          </button>
          <button
            onClick={() => setActiveTab('admin-mediation')}
            className={`whitespace-nowrap transition-colors pb-0.5 ${
              activeTab === 'admin-mediation'
                ? 'text-[#0b3658] font-bold border-b-2 border-[#4e9ad9]'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Mediación
          </button>
        </nav>

        {/* Action Buttons & Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onGoToLanding}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e6f1fa] text-xs font-semibold text-[#0b3658] hover:bg-[#dde7ee] transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Inicio</span>
          </button>

          {/* User Mode Switcher Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e6f1fa] border border-[#dde7ee]">
            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = users.find(u => u.id === e.target.value);
                if (found) {
                  onSelectUser(found);
                  if (found.role === 'professional') setActiveTab('pro-saas');
                  if (found.role === 'admin') setActiveTab('admin-mediation');
                  if (found.role === 'client') setActiveTab('escrow');
                }
              }}
              className="bg-transparent text-xs font-bold text-[#0b3658] cursor-pointer focus:outline-none"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-white text-[#0b3658]">
                  {u.role === 'client' ? 'Cliente: ' : u.role === 'professional' ? 'Técnico: ' : 'Mediación: '}
                  {u.name.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Botón 1: Contratar */}
          <button
            onClick={onOpenBooking}
            className="cord-btn-secondary px-3.5 py-1.5 rounded-3xl text-xs font-semibold whitespace-nowrap hidden sm:inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#4e9ad9]" />
            <span>Contratar</span>
          </button>

          {/* Botón 2: Llamativo Trabajar */}
          <button
            onClick={onGoToProWork}
            className="cord-btn-primary px-4 py-1.5 rounded-3xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Trabajar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
