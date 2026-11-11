import React, { useState } from 'react';
import { X, ShieldCheck, UserCheck, Briefcase, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAuthenticate: (selectedUser: User, targetRoute: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  onAuthenticate,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  if (!isOpen) return null;

  const clientUser = users.find(u => u.role === 'client') || users[0];
  const proUser = users.find(u => u.role === 'professional') || users[1];
  const adminUser = users.find(u => u.role === 'admin') || users[4] || users[0];

  const handleQuickLogin = (user: User) => {
    let route = '/app/explorar';
    if (user.role === 'professional') route = '/dashboard/agenda';
    if (user.role === 'admin') route = '/admin/mediacion';
    onAuthenticate(user, route);
    onClose();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.role === selectedRole) || users[0];
    const targetUser: User = {
      ...target,
      name: nameInput.trim() || target.name,
      email: emailInput.trim() || target.email,
    };
    let route = '/app/explorar';
    if (selectedRole === 'professional') route = '/dashboard/agenda';
    if (selectedRole === 'admin') route = '/admin/mediacion';

    onAuthenticate(targetUser, route);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 max-w-lg w-full relative border border-[#dde7ee] shadow-[0px_16px_48px_0px_rgba(11,54,88,0.16)] animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0b3658] tracking-tight">
            Acceso a Velo
          </h2>
          <p className="text-xs sm:text-sm text-[#486984] max-w-xs mx-auto">
            El sistema detecta tu rol y te redirige automáticamente a tu espacio de trabajo o catálogo.
          </p>
        </div>

        {/* 1-Click Role Direct Route Switcher */}
        <div className="space-y-2 mb-6">
          <span className="text-xs font-bold text-[#688dac] uppercase tracking-wider block text-center">
            Acceso Rápido por Rol
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Client Option */}
            <button
              type="button"
              onClick={() => handleQuickLogin(clientUser)}
              className="p-3.5 rounded-2xl bg-white border border-[#dde7ee] hover:border-[#4e9ad9] hover:bg-[#e6f1fa]/40 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <UserCheck className="w-4 h-4 text-[#4e9ad9]" />
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#e6f1fa] text-[#4e9ad9] font-mono font-semibold">
                  Catálogo
                </span>
              </div>
              <div className="text-xs font-bold text-[#0b3658] group-hover:text-[#4e9ad9]">
                Soy Cliente
              </div>
              <div className="text-[10px] text-[#486984] mt-0.5 truncate">
                {clientUser.name}
              </div>
            </button>

            {/* Pro Option */}
            <button
              type="button"
              onClick={() => handleQuickLogin(proUser)}
              className="p-3.5 rounded-2xl bg-white border border-[#dde7ee] hover:border-[#4e9ad9] hover:bg-[#e6f1fa]/40 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Briefcase className="w-4 h-4 text-[#4e9ad9]" />
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#e6f1fa] text-[#4e9ad9] font-mono font-semibold">
                  Agenda
                </span>
              </div>
              <div className="text-xs font-bold text-[#0b3658] group-hover:text-[#4e9ad9]">
                Soy Técnico
              </div>
              <div className="text-[10px] text-[#486984] mt-0.5 truncate">
                {proUser.name}
              </div>
            </button>

            {/* Platform Owner / Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin(adminUser)}
              className="p-3.5 rounded-2xl bg-white border border-[#dde7ee] hover:border-[#4e9ad9] hover:bg-[#e6f1fa]/40 text-left transition-all group flex flex-col justify-between shadow-sm"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <ShieldAlert className="w-4 h-4 text-[#42b3b1]" />
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#e6f1fa] text-[#42b3b1] font-mono font-semibold">
                  Soporte
                </span>
              </div>
              <div className="text-xs font-bold text-[#0b3658] group-hover:text-[#4e9ad9]">
                Mediación
              </div>
              <div className="text-[10px] text-[#486984] mt-0.5 truncate">
                {adminUser.name}
              </div>
            </button>
          </div>
        </div>

        {/* Form Separator */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#dde7ee]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-3 text-[#486984] font-semibold">O ingresa con credenciales</span>
          </div>
        </div>

        {/* Tab switcher: Login or Register */}
        <div className="flex p-1 bg-[#e6f1fa] rounded-full mb-5">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
              authMode === 'login'
                ? 'bg-white text-[#0b3658] shadow-sm font-bold'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
              authMode === 'register'
                ? 'bg-white text-[#0b3658] shadow-sm font-bold'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-[#0b3658] font-bold mb-1">Tu Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Ej: Carlos Méndez o Fontanería Mario"
                  className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[#0b3658] font-bold mb-1">Tipo de Cuenta:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('client')}
                    className={`py-2 px-3 rounded-full border text-xs font-semibold transition-all ${
                      selectedRole === 'client'
                        ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] font-bold'
                        : 'bg-white border-[#dde7ee] text-[#486984]'
                    }`}
                  >
                    Soy Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('professional')}
                    className={`py-2 px-3 rounded-full border text-xs font-semibold transition-all ${
                      selectedRole === 'professional'
                        ? 'bg-[#e6f1fa] border-[#4e9ad9] text-[#0b3658] font-bold'
                        : 'bg-white border-[#dde7ee] text-[#486984]'
                    }`}
                  >
                    Soy Profesional
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[#0b3658] font-bold mb-1">Correo Electrónico:</label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="tu.correo@ejemplo.com"
              className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[#0b3658] font-bold mb-1">Contraseña:</label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-full bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="cord-btn-primary w-full py-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 mt-4 shadow-sm"
          >
            <span>{authMode === 'login' ? 'Acceder a mi Cuenta' : 'Registrar y Comenzar'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
