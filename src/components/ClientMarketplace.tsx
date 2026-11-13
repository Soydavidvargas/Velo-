import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Star,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Mail,
  Briefcase,
  UserCheck,
  X,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { User, WorkerAd, ServiceItem, Order, DirectMessage, AiRecommendation } from '../types';
import { apiClient } from '../services/apiClient';
import { formatCOP } from '../utils/formatCurrency';
import { RealtimeChatDrawer } from './RealtimeChatDrawer';

interface ClientMarketplaceProps {
  currentUser: User;
  pros: User[];
  services: ServiceItem[];
  orders: Order[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onHireWorker: (payload: { service: ServiceItem; proId: string; ad?: WorkerAd; initialNotes?: string }) => void;
  incomingMessages?: DirectMessage[];
}

const AUTOCOMPLETE_PROMPTS = [
  { label: 'Fuga de agua en lavaplatos o tubería', category: 'plumbing', query: 'fuga' },
  { label: 'Tacos eléctricos que se disparan / Caja de breakers', category: 'electricity', query: 'breaker' },
  { label: 'Mantenimiento de calentador a gas o aire acondicionado', category: 'climatization', query: 'calentador' },
  { label: 'Instalación o cambio de chapa de seguridad', category: 'locksmith', query: 'chapa' },
  { label: 'Destape de cañería y sifón con sonda eléctrica', category: 'plumbing', query: 'cañería' },
  { label: 'Electricista certificado CONTE en Medellín', category: 'electricity', query: 'Medellín' },
];

export const ClientMarketplace: React.FC<ClientMarketplaceProps> = ({
  currentUser,
  pros,
  services,
  orders,
  selectedCategory,
  onSelectCategory,
  onHireWorker,
  incomingMessages = [],
}) => {
  const [workerAds, setWorkerAds] = useState<WorkerAd[]>([]);
  const [loadingAds, setLoadingAds] = useState<boolean>(true);

  // Auto-complete search chat state
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [aiDiag, setAiDiag] = useState<AiRecommendation | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Left-side Filter Sidebar state
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(0);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [verifiedOnlyFilter, setVerifiedOnlyFilter] = useState<boolean>(false);

  // Worker Profile Modal & Chat Drawer state
  const [profilePro, setProfilePro] = useState<{ pro: User; ad?: WorkerAd } | null>(null);
  const [chatTarget, setChatTarget] = useState<{
    pro: User;
    ad?: WorkerAd;
    mode: 'chat' | 'email';
  } | null>(null);

  useEffect(() => {
    setLoadingAds(true);
    apiClient
      .getWorkerAds()
      .then(list => setWorkerAds(list))
      .catch(err => console.error('Error loading worker ads:', err))
      .finally(() => setLoadingAds(false));
  }, []);

  // Autocomplete suggestions combining static problems + live worker ads
  const autocompleteSuggestions = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const promptMatches = AUTOCOMPLETE_PROMPTS.filter(
      p => p.label.toLowerCase().includes(q) || p.query.toLowerCase().includes(q)
    ).map(p => ({
      type: 'prompt' as const,
      id: p.label,
      title: p.label,
      subtitle: 'Sugerencia rápida de búsqueda',
      category: p.category,
      query: p.query,
    }));

    const adMatches = workerAds
      .filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.proName.toLowerCase().includes(q) ||
          a.proTrade.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map(a => ({
        type: 'ad' as const,
        id: a.id,
        title: a.title,
        subtitle: `${a.proName} · ${a.city} · ${formatCOP(a.priceFrom)}`,
        ad: a,
      }));

    return [...adMatches, ...promptMatches].slice(0, 6);
  }, [chatSearchQuery, workerAds]);

  // Filtered worker ads via sidebar + search
  const filteredAds = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    return workerAds.filter(ad => {
      if (selectedCategory !== 'all' && ad.category !== selectedCategory) return false;
      if (cityFilter !== 'all' && !ad.city.toLowerCase().includes(cityFilter.toLowerCase())) {
        return false;
      }
      if (maxPriceFilter > 0 && ad.priceFrom > maxPriceFilter) return false;
      if (minRatingFilter > 0 && ad.rating < minRatingFilter) return false;
      if (verifiedOnlyFilter && !(ad.verifiedCedula && ad.verifiedFace)) return false;
      if (q) {
        const hit =
          ad.title.toLowerCase().includes(q) ||
          ad.description.toLowerCase().includes(q) ||
          ad.proName.toLowerCase().includes(q) ||
          ad.proTrade.toLowerCase().includes(q) ||
          ad.city.toLowerCase().includes(q) ||
          ad.categoryLabel.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [workerAds, selectedCategory, cityFilter, maxPriceFilter, minRatingFilter, verifiedOnlyFilter, chatSearchQuery]);

  const handleRunAiAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowAutocomplete(false);
    if (!chatSearchQuery.trim() || chatSearchQuery.trim().length < 4) return;
    setLoadingAi(true);
    try {
      const rec = await apiClient.getAiRecommendation(chatSearchQuery.trim());
      setAiDiag(rec);
    } catch {
      // Fallback silently; text filter still works
    } finally {
      setLoadingAi(false);
    }
  };

  const resolveProForAd = (ad: WorkerAd): User => {
    const found = pros.find(p => p.id === ad.proId);
    if (found) return found;
    return {
      id: ad.proId,
      name: ad.proName,
      email: `${ad.proName.toLowerCase().replace(/\s+/g, '.')}@velo.com.co`,
      role: 'professional',
      city: ad.city,
      trade: ad.proTrade,
      rating: ad.rating,
      verifiedIdentity: ad.verifiedCedula && ad.verifiedFace,
      verificationSkipped: ad.verificationSkipped,
      hourlyRate: ad.priceFrom,
    };
  };

  const resolveServiceForAd = (ad: WorkerAd): ServiceItem => {
    const found =
      (ad.serviceId ? services.find(s => s.id === ad.serviceId) : undefined) ||
      services.find(s => s.category === ad.category) ||
      services[0];
    return {
      ...found,
      title: ad.title,
      description: ad.description,
      basePrice: ad.priceFrom,
      category: ad.category,
      categoryLabel: ad.categoryLabel,
    };
  };

  const resetFilters = () => {
    onSelectCategory('all');
    setCityFilter('all');
    setMaxPriceFilter(0);
    setMinRatingFilter(0);
    setVerifiedOnlyFilter(false);
    setChatSearchQuery('');
    setAiDiag(null);
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* 1. AUTO-COMPLETING SEARCH CHAT BAR */}
      <div className="cord-card p-5 lg:p-6 bg-gradient-to-br from-white via-[#f8fbfe] to-[#e6f1fa]/50 border border-[#dde7ee] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="cord-badge mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
              <span>Chat Buscador con Autocompletado</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0b3658] tracking-tight">
              ¿Qué trabajador o servicio necesitas hoy?
            </h1>
          </div>
          <span className="text-xs text-[#486984]">
            Explora anuncios verificados, chatea en tiempo real y contrata con custodia Velo
          </span>
        </div>

        <form onSubmit={handleRunAiAssist} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#486984] absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={chatSearchQuery}
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 180)}
              onChange={e => {
                setChatSearchQuery(e.target.value);
                setShowAutocomplete(true);
              }}
              placeholder="Escribe lo que necesitas... Ej: Fuga en lavaplatos, electricista Medellín, chapa..."
              className="w-full pl-11 pr-36 py-3.5 rounded-2xl bg-white border border-[#dde7ee] text-xs sm:text-sm text-[#0b3658] placeholder-[#688dac] focus:outline-none focus:border-[#4e9ad9] shadow-sm"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {chatSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setChatSearchQuery('');
                    setAiDiag(null);
                  }}
                  className="p-1.5 rounded-full text-[#486984] hover:text-[#0b3658]"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={loadingAi}
                className="cord-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <span>{loadingAi ? 'Buscando...' : 'Buscar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showAutocomplete && autocompleteSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white rounded-2xl border border-[#dde7ee] shadow-xl overflow-hidden divide-y divide-[#dde7ee]">
              {autocompleteSuggestions.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => {
                    if (item.type === 'prompt') {
                      setChatSearchQuery(item.query);
                      onSelectCategory(item.category);
                      setShowAutocomplete(false);
                    } else {
                      const pro = resolveProForAd(item.ad);
                      setProfilePro({ pro, ad: item.ad });
                      setShowAutocomplete(false);
                    }
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[#e6f1fa]/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0b3658] truncate">{item.title}</div>
                    <div className="text-[11px] text-[#486984] truncate">{item.subtitle}</div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f1fa] text-[#4e9ad9] shrink-0">
                    {item.type === 'ad' ? 'Ver Anuncio' : 'Filtrar'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Optional Smart Diagnosis Suggestion Strip */}
        {aiDiag && (
          <div className="p-3.5 rounded-2xl bg-white border border-[#4e9ad9]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-[#0b3658] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4e9ad9]" />
                <span>Sugerencia inteligente: {aiDiag.suggestedServiceTitle}</span>
              </div>
              <p className="text-[#486984]">{aiDiag.diagnosticSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectCategory(aiDiag.detectedCategory)}
              className="cord-btn-secondary px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0"
            >
              Filtrar por {aiDiag.detectedCategory === 'plumbing' ? 'Plomería' : aiDiag.detectedCategory === 'electricity' ? 'Electricidad' : aiDiag.detectedCategory === 'climatization' ? 'Gas & Clima' : 'Oficio'}
            </button>
          </div>
        )}
      </div>

      {/* 2. LEFT FILTER SIDEBAR + RIGHT WORKER ADS RESULTS */}
      <div className="flex flex-col lg:flex-row items-start gap-6 w-full min-w-0">
        {/* LEFT SIDEBAR FILTERS */}
        <aside className="w-full lg:w-[280px] lg:shrink-0 cord-card p-5 bg-white border border-[#dde7ee] space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-[#dde7ee] pb-3">
            <h2 className="text-sm font-extrabold text-[#0b3658] flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#4e9ad9]" />
              <span>Filtros</span>
            </h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] font-semibold text-[#4e9ad9] hover:text-[#0b3658] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>

          {/* Filter: Category */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-[#0b3658] block">Oficio / Especialidad</span>
            <div className="space-y-1.5">
              {[
                { id: 'all', label: 'Todos los oficios' },
                { id: 'plumbing', label: 'Plomería y cañerías' },
                { id: 'electricity', label: 'Electricidad certificada' },
                { id: 'climatization', label: 'Gasodomésticos & Clima' },
                { id: 'locksmith', label: 'Cerrajería' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all font-medium ${
                    selectedCategory === cat.id
                      ? 'bg-[#0b3658] text-white font-bold'
                      : 'bg-[#f8fbfe] text-[#486984] hover:bg-[#e6f1fa] hover:text-[#0b3658]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter: City */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-[#0b3658] block">Ciudad en Colombia</label>
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
            >
              <option value="all">Todas las ciudades</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Medellín">Medellín</option>
              <option value="Cali">Cali</option>
            </select>
          </div>

          {/* Filter: Max Budget */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-[#0b3658] block">Presupuesto máximo</label>
            <select
              value={maxPriceFilter}
              onChange={e => setMaxPriceFilter(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
            >
              <option value={0}>Sin límite de precio</option>
              <option value={95000}>Hasta {formatCOP(95000)}</option>
              <option value={120000}>Hasta {formatCOP(120000)}</option>
              <option value={150000}>Hasta {formatCOP(150000)}</option>
            </select>
          </div>

          {/* Filter: Min Rating */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-[#0b3658] block">Calificación mínima</label>
            <select
              value={minRatingFilter}
              onChange={e => setMinRatingFilter(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#dde7ee] text-xs text-[#0b3658] focus:outline-none focus:border-[#4e9ad9]"
            >
              <option value={0}>Cualquier calificación</option>
              <option value={4.5}>4.5 ★ o superior</option>
              <option value={4.9}>4.9 ★ o superior</option>
            </select>
          </div>

          {/* Filter: Verified Identity */}
          <label className="flex items-start gap-2.5 text-xs cursor-pointer pt-2 border-t border-[#dde7ee]">
            <input
              type="checkbox"
              checked={verifiedOnlyFilter}
              onChange={e => setVerifiedOnlyFilter(e.target.checked)}
              className="mt-0.5 rounded border-[#dde7ee] text-[#4e9ad9] focus:ring-[#4e9ad9]"
            />
            <span className="text-[#0b3658] font-semibold leading-snug">
              Solo trabajadores con Cédula y Rostro verificados
            </span>
          </label>
        </aside>

        {/* RIGHT RESULTS: WORKER ANNOUNCEMENTS */}
        <section className="w-full flex-1 min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-[#0b3658]">
                Anuncios de Trabajadores Disponibles ({filteredAds.length})
              </h2>
              <p className="text-xs text-[#486984]">
                Revisa su perfil, escríbele por chat en tiempo real o correo, y contrátalo cuando lleguen a un acuerdo.
              </p>
            </div>
          </div>

          {loadingAds ? (
            <div className="cord-card p-10 text-center text-xs text-[#486984]">
              Cargando anuncios de trabajadores...
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="cord-card p-10 text-center space-y-3 bg-white border border-[#dde7ee]">
              <p className="text-sm font-bold text-[#0b3658]">
                No encontramos anuncios con esos filtros
              </p>
              <p className="text-xs text-[#486984]">
                Prueba ampliando el presupuesto o limpiando el filtro de ciudad.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="cord-btn-secondary px-4 py-2 text-xs font-bold"
              >
                Restablecer todos los filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {filteredAds.map(ad => {
                const pro = resolveProForAd(ad);
                return (
                  <div
                    key={ad.id}
                    className="cord-card p-5 bg-white border border-[#dde7ee] flex flex-col justify-between gap-4 hover:border-[#4e9ad9] transition-colors w-full min-w-0 overflow-hidden"
                  >
                    <div className="space-y-3 min-w-0">
                      {/* Worker top row */}
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center font-extrabold text-sm text-[#4e9ad9] shrink-0">
                            {ad.proName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setProfilePro({ pro, ad })}
                              className="text-sm font-extrabold text-[#0b3658] hover:text-[#4e9ad9] truncate block w-full text-left"
                              title={ad.proName}
                            >
                              {ad.proName}
                            </button>
                            <div className="text-[11px] text-[#486984] truncate">
                              {ad.proTrade}
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-[#e6f1fa] text-[#0b3658] text-[11px] font-bold shrink-0 whitespace-nowrap">
                          {ad.categoryLabel}
                        </span>
                      </div>

                      {/* Badges: City, Rating, Verification */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-[#486984] font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#4e9ad9]" />
                          {ad.city}
                        </span>
                        <span className="text-[#dde7ee]">·</span>
                        <span className="inline-flex items-center gap-1 font-bold text-[#0b3658]">
                          <Star className="w-3.5 h-3.5 fill-[#4e9ad9] text-[#4e9ad9]" />
                          {ad.rating.toFixed(2)}
                        </span>
                        <span className="text-[#dde7ee]">·</span>
                        {ad.verifiedCedula && ad.verifiedFace ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#42b3b1]">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Cédula y Rostro Verificados
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-[#688dac]">
                            <Clock className="w-3.5 h-3.5" />
                            Registro modo prueba
                          </span>
                        )}
                      </div>

                      {/* Ad Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-[#0b3658] leading-snug">
                          {ad.title}
                        </h3>
                        <p className="text-xs text-[#486984] mt-1 line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="pt-3.5 border-t border-[#dde7ee] space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-[#688dac] uppercase tracking-wider font-semibold block">
                            Tarifa Base All-In
                          </span>
                          <span className="text-lg font-black text-[#0b3658] font-mono tabular-nums">
                            {formatCOP(ad.priceFrom)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProfilePro({ pro, ad })}
                          className="text-xs font-bold text-[#4e9ad9] hover:text-[#0b3658] inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Ver Perfil Completo</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setChatTarget({ pro, ad, mode: 'chat' })}
                          className="cord-btn-secondary py-2 px-2 text-[11px] font-bold flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#4e9ad9]" />
                          <span>Chat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatTarget({ pro, ad, mode: 'email' })}
                          className="cord-btn-secondary py-2 px-2 text-[11px] font-bold flex items-center justify-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#4e9ad9]" />
                          <span>Correo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onHireWorker({
                              service: resolveServiceForAd(ad),
                              proId: pro.id,
                              ad,
                            })
                          }
                          className="cord-btn-primary py-2 px-2 text-[11px] font-bold flex items-center justify-center gap-1"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Contratar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* WORKER PROFILE MODAL */}
      {profilePro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b3658]/45 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[24px] p-6 lg:p-8 max-w-2xl w-full my-8 relative border border-[#dde7ee] shadow-2xl space-y-5">
            <button
              onClick={() => setProfilePro(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#e6f1fa] text-[#486984] hover:text-[#0b3658] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#dde7ee] pb-5">
              <div className="w-16 h-16 rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-2xl font-black text-[#4e9ad9] shrink-0">
                {profilePro.pro.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold text-[#0b3658]">
                    {profilePro.pro.name}
                  </h3>
                  {profilePro.pro.verifiedIdentity ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#42b3b1]/15 text-[#42b3b1] text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cédula + Rostro Verificados
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e6f1fa] text-[#486984] text-[11px] font-semibold">
                      Verificación pendiente (Prueba)
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-[#4e9ad9]">
                  {profilePro.pro.trade} · {profilePro.pro.city}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#486984]">
                  <span className="font-bold text-[#0b3658] inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#4e9ad9] text-[#4e9ad9]" />
                    {profilePro.pro.rating || 5.0}
                  </span>
                  <span>·</span>
                  <span>{profilePro.pro.completedJobsCount || 0} contratos completados</span>
                  <span>·</span>
                  <span>Respuesta: {profilePro.pro.responseTime || '< 15 min'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h4 className="font-bold text-[#0b3658] uppercase tracking-wider text-[11px] mb-1">
                  Biografía y Experiencia
                </h4>
                <p className="text-[#486984] leading-relaxed">
                  {profilePro.pro.bio || profilePro.ad?.description}
                </p>
              </div>

              {profilePro.pro.skills && profilePro.pro.skills.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#0b3658] uppercase tracking-wider text-[11px] mb-1.5">
                    Especialidades Técnicas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profilePro.pro.skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-[#e6f1fa] text-[#0b3658] font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews from real orders */}
              <div>
                <h4 className="font-bold text-[#0b3658] uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  <span>Reseñas de Clientes</span>
                </h4>
                {orders.filter(o => o.proId === profilePro.pro.id && o.clientReview).length === 0 ? (
                  <p className="text-[#688dac] italic">
                    Profesional verificado listo para su próximo servicio contigo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orders
                      .filter(o => o.proId === profilePro.pro.id && o.clientReview)
                      .slice(0, 2)
                      .map(o => (
                        <div key={o.id} className="p-3 rounded-xl bg-[#f8fbfe] border border-[#dde7ee]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#0b3658]">{o.clientName}</span>
                            <span className="text-[#4e9ad9] font-bold">★ {o.clientReview?.rating}/5</span>
                          </div>
                          <p className="text-[#486984] italic">"{o.clientReview?.comment}"</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Actions */}
            <div className="pt-4 border-t border-[#dde7ee] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = profilePro;
                    setProfilePro(null);
                    setChatTarget({ pro: target.pro, ad: target.ad, mode: 'chat' });
                  }}
                  className="cord-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  <span>Chat en Tiempo Real</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = profilePro;
                    setProfilePro(null);
                    setChatTarget({ pro: target.pro, ad: target.ad, mode: 'email' });
                  }}
                  className="cord-btn-secondary px-4 py-2.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-[#4e9ad9]" />
                  <span>Enviar Correo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const target = profilePro;
                  setProfilePro(null);
                  const srv = target.ad
                    ? resolveServiceForAd(target.ad)
                    : services.find(s => s.category === 'plumbing') || services[0];
                  onHireWorker({
                    service: srv,
                    proId: target.pro.id,
                    ad: target.ad,
                  });
                }}
                className="cord-btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                <span>Contratar Trabajador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME CHAT & EMAIL DRAWER */}
      {chatTarget && (
        <RealtimeChatDrawer
          isOpen={Boolean(chatTarget)}
          onClose={() => setChatTarget(null)}
          currentUser={currentUser}
          partner={{
            id: chatTarget.pro.id,
            name: chatTarget.pro.name,
            trade: chatTarget.pro.trade,
            email: chatTarget.pro.email,
            city: chatTarget.pro.city,
          }}
          incomingMessages={incomingMessages}
          initialMode={chatTarget.mode}
          onHireFromChat={() => {
            const target = chatTarget;
            setChatTarget(null);
            const srv = target.ad
              ? resolveServiceForAd(target.ad)
              : services[0];
            onHireWorker({
              service: srv,
              proId: target.pro.id,
              ad: target.ad,
            });
          }}
        />
      )}
    </div>
  );
};
