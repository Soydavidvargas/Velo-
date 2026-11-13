import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  Briefcase,
  ArrowRight,
  Camera,
  CheckCircle2,
  SkipForward,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { User, UserRole, ServiceCategory } from '../types';
import { apiClient } from '../services/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  lockedRole?: 'client' | 'professional' | null;
  switchFromClient?: User | null;
  onAuthenticate: (authenticatedUser: User, targetRoute: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  lockedRole = null,
  switchFromClient = null,
  onAuthenticate,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'client' | 'professional'>(
    lockedRole || 'client'
  );

  // Common auth inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [cityInput, setCityInput] = useState('Bogotá');

  // Client name input
  const [clientNameInput, setClientNameInput] = useState('');

  // Worker separated name & verification inputs
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secondLastName, setSecondLastName] = useState('');
  const [cedula, setCedula] = useState('');
  const [trade, setTrade] = useState('Plomería & Mantenimiento');
  const [category, setCategory] = useState<ServiceCategory>('plumbing');
  const [hourlyRate, setHourlyRate] = useState('95000');

  // Facial verification state
  const [faceVerified, setFaceVerified] = useState(false);
  const [verificationSkipped, setVerificationSkipped] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (switchFromClient) {
      setSelectedRole('professional');
      const parts = (switchFromClient.name || '').trim().split(/\s+/).filter(Boolean);
      setFirstName(switchFromClient.firstName || parts[0] || '');
      setLastName(switchFromClient.lastName || parts.slice(1).join(' ') || '');
      setEmailInput(switchFromClient.email || '');
      setPhoneInput(switchFromClient.phone || '');
      setCityInput(switchFromClient.city || 'Bogotá');
      setPasswordInput('');
      setAuthMode('login');
      setErrorMsg(null);
      return;
    }
    if (lockedRole) {
      setSelectedRole(lockedRole);
    }
    setErrorMsg(null);
  }, [lockedRole, switchFromClient, isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveRole: 'client' | 'professional' = switchFromClient
    ? 'professional'
    : lockedRole || selectedRole;

  const linkedWorkerAccount = switchFromClient?.linkedProId
    ? users.find(u => u.id === switchFromClient.linkedProId && u.role === 'professional')
    : undefined;

  const roleDemoUsers = switchFromClient
    ? linkedWorkerAccount
      ? [linkedWorkerAccount]
      : []
    : users.filter(u => u.role === effectiveRole);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador o entorno no expone cámara. Puedes usar la captura biométrica simulada o el botón Omitir verificación.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 60);
    } catch {
      setCameraError('No se detectó cámara física disponible. Usa el escaneo de prueba o presiona Omitir verificación.');
    }
  };

  const captureFaceScan = () => {
    setFaceVerified(true);
    setVerificationSkipped(false);
    stopCamera();
  };

  const handleSkipVerification = () => {
    stopCamera();
    setVerificationSkipped(true);
    setFaceVerified(false);
    setErrorMsg(null);
  };

  const routeForRole = (role: UserRole) => {
    if (role === 'professional') return '/dashboard/agenda';
    if (role === 'admin') return '/admin/mediacion';
    return '/app/explorar';
  };

  const handleQuickDemoLogin = async (demoUser: User) => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (switchFromClient) {
        const switched = await apiClient.switchToWorker({
          clientId: switchFromClient.id,
          mode: 'login',
          email: demoUser.email,
        });
        onAuthenticate(switched, '/dashboard/agenda');
        onClose();
        return;
      }
      const logged = await apiClient.login({
        quickDemoUserId: demoUser.id,
        role: demoUser.role,
      });
      onAuthenticate(logged, routeForRole(logged.role));
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (authMode === 'login') {
      setSubmitting(true);
      try {
        if (switchFromClient) {
          const switched = await apiClient.switchToWorker({
            clientId: switchFromClient.id,
            mode: 'login',
            email: emailInput.trim(),
            password: passwordInput,
          });
          onAuthenticate(switched, '/dashboard/agenda');
          onClose();
          return;
        }
        const logged = await apiClient.login({
          email: emailInput.trim(),
          password: passwordInput,
          role: effectiveRole,
        });
        onAuthenticate(logged, routeForRole(logged.role));
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Registration validation
    if (effectiveRole === 'professional') {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('El Primer Nombre y el Primer Apellido son obligatorios para trabajadores.');
        return;
      }
      if (!verificationSkipped && (!cedula.trim() || !faceVerified)) {
        setErrorMsg('Completa la Cédula y el Reconocimiento Facial, o presiona "Omitir verificación (modo prueba)".');
        return;
      }
    } else {
      if (!clientNameInput.trim()) {
        setErrorMsg('Por favor ingresa tu nombre completo.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (switchFromClient) {
        const switched = await apiClient.switchToWorker({
          clientId: switchFromClient.id,
          mode: 'register',
          email: emailInput.trim() || switchFromClient.email,
          password: passwordInput || 'velo123',
          phone: phoneInput.trim() || switchFromClient.phone || '+57 300 000 0000',
          city: cityInput.trim() || switchFromClient.city || 'Bogotá',
          firstName: firstName.trim(),
          middleName: middleName.trim(),
          lastName: lastName.trim(),
          secondLastName: secondLastName.trim(),
          cedula: cedula.trim(),
          faceVerified,
          verificationSkipped,
          trade: trade.trim(),
          category,
          hourlyRate: Number(hourlyRate) || 95000,
        });
        onAuthenticate(switched, '/dashboard/agenda');
        onClose();
        return;
      }

      const created = await apiClient.register({
        role: effectiveRole,
        email: emailInput.trim(),
        password: passwordInput || 'velo123',
        phone: phoneInput.trim() || '+57 300 000 0000',
        city: cityInput.trim() || 'Bogotá',
        name: effectiveRole === 'client' ? clientNameInput.trim() : undefined,
        firstName: effectiveRole === 'professional' ? firstName.trim() : undefined,
        middleName: effectiveRole === 'professional' ? middleName.trim() : undefined,
        lastName: effectiveRole === 'professional' ? lastName.trim() : undefined,
        secondLastName: effectiveRole === 'professional' ? secondLastName.trim() : undefined,
        cedula: effectiveRole === 'professional' ? cedula.trim() : undefined,
        faceVerified: effectiveRole === 'professional' ? faceVerified : undefined,
        verificationSkipped: effectiveRole === 'professional' ? verificationSkipped : undefined,
        trade: effectiveRole === 'professional' ? trade.trim() : undefined,
        category: effectiveRole === 'professional' ? category : undefined,
        hourlyRate: effectiveRole === 'professional' ? Number(hourlyRate) || 95000 : undefined,
      });

      onAuthenticate(created, routeForRole(created.role));
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/45 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[24px] p-6 lg:p-8 max-w-xl w-full my-8 relative border border-[#dde7ee] shadow-[0px_16px_48px_0px_rgba(11,54,88,0.18)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header scoped strictly to the selected portal */}
        <div className="text-center space-y-2 mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9] shadow-sm">
            {effectiveRole === 'professional' ? (
              <Briefcase className="w-6 h-6" />
            ) : (
              <UserCheck className="w-6 h-6" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#e6f1fa] text-[11px] font-bold text-[#4e9ad9]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {effectiveRole === 'professional'
                ? 'Portal Privado de Trabajadores'
                : 'Portal Privado de Clientes'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#0b3658] tracking-tight">
            {switchFromClient
              ? authMode === 'login'
                ? 'Cambiar a Rol de Trabajador'
                : 'Activar tu Perfil de Trabajador'
              : effectiveRole === 'professional'
              ? authMode === 'login'
                ? 'Ingresa como Trabajador'
                : 'Registro de Trabajador Verificado'
              : authMode === 'login'
              ? 'Ingresa como Cliente'
              : 'Crea tu Cuenta de Cliente'}
          </h2>
          <p className="text-xs text-[#486984] max-w-md mx-auto">
            {switchFromClient
              ? `Usando tus datos de Cliente (${switchFromClient.name}). Toda tu información, contratos y compras como Cliente permanecerán guardados.`
              : effectiveRole === 'professional'
              ? 'Tu sesión es privada e independiente. Administra contratos, verifica llegadas con código Rappi y publica tus anuncios.'
              : 'Tu sesión es privada e independiente. Busca trabajadores, chatea en tiempo real, contrata y verifica su llegada con tu código.'}
          </p>
        </div>

        {switchFromClient && (
          <div className="mb-4 p-3 rounded-2xl bg-[#e6f1fa]/70 border border-[#dde7ee] text-xs text-[#0b3658] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4e9ad9] shrink-0 mt-0.5" />
            <span>
              Inicia sesión como Trabajador con tu cuenta vinculada o activa tu registro en la pestaña{' '}
              <strong>Registrarme</strong> (ya prellenada con tu correo y datos de Cliente).
            </span>
          </div>
        )}

        {/* Role selector ONLY if opened generically without a lockedRole */}
        {!lockedRole && !switchFromClient && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('client');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'client'
                  ? 'bg-[#0b3658] text-white border-[#0b3658]'
                  : 'bg-white text-[#486984] border-[#dde7ee] hover:border-[#4e9ad9]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Soy Cliente</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('professional');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                selectedRole === 'professional'
                  ? 'bg-[#0b3658] text-white border-[#0b3658]'
                  : 'bg-white text-[#486984] border-[#dde7ee] hover:border-[#4e9ad9]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Soy Trabajador</span>
            </button>
          </div>
        )}

        {/* Login vs Register Tabs */}
        <div className="flex p-1 bg-[#e6f1fa] rounded-full mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
              authMode === 'login'
                ? 'bg-white text-[#0b3658] shadow-sm font-bold'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Ya tengo cuenta (Iniciar Sesión)
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
              authMode === 'register'
                ? 'bg-white text-[#0b3658] shadow-sm font-bold'
                : 'text-[#486984] hover:text-[#0b3658]'
            }`}
          >
            Soy nuevo (Registrarme)
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Demo Access ONLY for the active role (or linked worker profile when switching) */}
        {authMode === 'login' && roleDemoUsers.length > 0 && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-2">
            <span className="text-[11px] font-bold text-[#688dac] uppercase tracking-wider block">
              {switchFromClient
                ? 'Tu Perfil de Trabajador Vinculado'
                : `Cuentas de Prueba (${effectiveRole === 'professional' ? 'Trabajadores' : 'Clientes'})`}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roleDemoUsers.slice(0, 2).map(u => (
                <button
                  key={u.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleQuickDemoLogin(u)}
                  className="p-2.5 rounded-xl bg-white border border-[#dde7ee] hover:border-[#4e9ad9] hover:bg-[#e6f1fa]/40 text-left transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0b3658] truncate">{u.name}</div>
                    <div className="text-[10px] text-[#486984] truncate">{u.email}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#4e9ad9] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
          {/* CLIENT REGISTRATION */}
          {authMode === 'register' && effectiveRole === 'client' && (
            <>
              <div>
                <label className="block text-[#0b3658] font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={clientNameInput}
                  onChange={e => setClientNameInput(e.target.value)}
                  placeholder="Ej: Laura Camila Torres"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0b3658] font-bold mb-1">Ciudad en Colombia</label>
                  <select
                    value={cityInput}
                    onChange={e => setCityInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                  >
                    <option value="Bogotá">Bogotá</option>
                    <option value="Medellín">Medellín</option>
                    <option value="Cali">Cali</option>
                    <option value="Barranquilla">Barranquilla</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#0b3658] font-bold mb-1">Celular / WhatsApp</label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    placeholder="+57 310 555 1234"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* WORKER REGISTRATION (Separated Names + Cédula + Face Recognition + Skip Test Button) */}
          {authMode === 'register' && effectiveRole === 'professional' && (
            <div className="space-y-3.5">
              {/* Separated Names */}
              <div className="p-3.5 rounded-2xl bg-[#f8fbfe] border border-[#dde7ee] space-y-2.5">
                <div className="text-[11px] font-bold text-[#0b3658] uppercase tracking-wider">
                  1. Nombre Completo (Campos Separados)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#0b3658] font-bold mb-1">Primer Nombre *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Ej: Andrés"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#486984] font-semibold mb-1">Segundo Nombre (opcional)</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={e => setMiddleName(e.target.value)}
                      placeholder="Ej: Felipe"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#0b3658] font-bold mb-1">Primer Apellido *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Ej: Morales"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#486984] font-semibold mb-1">Segundo Apellido (opcional)</label>
                    <input
                      type="text"
                      value={secondLastName}
                      onChange={e => setSecondLastName(e.target.value)}
                      placeholder="Ej: Rojas"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Oficio y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[#0b3658] font-bold mb-1">Oficio Principal</label>
                  <input
                    type="text"
                    value={trade}
                    onChange={e => setTrade(e.target.value)}
                    placeholder="Ej: Plomero certificado"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#0b3658] font-bold mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                  >
                    <option value="plumbing">Plomería</option>
                    <option value="electricity">Electricidad</option>
                    <option value="climatization">Gas & Clima</option>
                    <option value="locksmith">Cerrajería</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#0b3658] font-bold mb-1">Tarifa Base (COP)</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] font-mono focus:border-[#4e9ad9] focus:outline-none"
                  />
                </div>
              </div>

              {/* Mandatory Identity Verification + Skip Button */}
              <div className="p-4 rounded-2xl bg-[#e6f1fa]/60 border border-[#dde7ee] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#0b3658] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#4e9ad9]" />
                    2. Cédula y Reconocimiento Facial (Obligatorio)
                  </span>
                  <button
                    type="button"
                    onClick={handleSkipVerification}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border transition-all ${
                      verificationSkipped
                        ? 'bg-[#0b3658] text-white border-[#0b3658]'
                        : 'bg-white text-[#486984] border-[#dde7ee] hover:border-[#4e9ad9] hover:text-[#0b3658]'
                    }`}
                  >
                    <SkipForward className="w-3 h-3" />
                    <span>{verificationSkipped ? 'Verificación omitida (modo prueba)' : 'Omitir verificación (modo prueba)'}</span>
                  </button>
                </div>

                {!verificationSkipped ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#0b3658] font-bold mb-1">
                        Número de Cédula de Ciudadanía *
                      </label>
                      <input
                        type="text"
                        value={cedula}
                        onChange={e => setCedula(e.target.value)}
                        placeholder="Ej: 1.020.456.789"
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs font-mono text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
                      />
                    </div>

                    {/* Facial Recognition Box */}
                    <div className="p-3 rounded-xl bg-white border border-[#dde7ee] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0b3658] flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-[#4e9ad9]" />
                          Reconocimiento Facial Biométrico *
                        </span>
                        {faceVerified && (
                          <span className="text-[11px] font-bold text-[#42b3b1] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Rostro Verificado
                          </span>
                        )}
                      </div>

                      {cameraActive ? (
                        <div className="space-y-2 text-center">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-40 object-cover rounded-xl bg-[#0b3658]/10 border border-[#dde7ee]"
                          />
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={captureFaceScan}
                              className="cord-btn-primary px-4 py-1.5 text-xs font-bold"
                            >
                              Capturar Rostro y Verificar
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="cord-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancelar cámara
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="cord-btn-secondary px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#4e9ad9]" />
                            <span>{faceVerified ? 'Repetir Escaneo Facial' : 'Abrir Cámara Biométrica'}</span>
                          </button>

                          {!faceVerified && (
                            <button
                              type="button"
                              onClick={captureFaceScan}
                              className="px-3.5 py-2 rounded-xl bg-[#e6f1fa] text-[#0b3658] font-semibold text-xs hover:bg-[#dde7ee] transition-colors"
                            >
                              Simular Captura Facial
                            </button>
                          )}
                        </div>
                      )}

                      {cameraError && (
                        <p className="text-[11px] text-[#486984]">{cameraError}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#486984] bg-white p-2.5 rounded-xl border border-[#dde7ee]">
                    Modo prueba activado: Puedes crear tu cuenta de trabajador sin subir cédula ni escaneo facial. Podrás completarlo más adelante.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#0b3658] font-bold mb-1">Correo Electrónico *</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder={
                  effectiveRole === 'professional'
                    ? 'trabajador@ejemplo.com'
                    : 'cliente@ejemplo.com'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#0b3658] font-bold mb-1">Contraseña *</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:border-[#4e9ad9] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="cord-btn-primary w-full py-3 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50"
          >
            <span>
              {submitting
                ? 'Validando acceso...'
                : authMode === 'login'
                ? `Entrar como ${effectiveRole === 'professional' ? 'Trabajador' : 'Cliente'}`
                : `Registrarme como ${effectiveRole === 'professional' ? 'Trabajador' : 'Cliente'}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
