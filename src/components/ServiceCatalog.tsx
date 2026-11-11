import React, { useState, useMemo } from 'react';
import { ShieldCheck, Check, Clock, ArrowRight, HelpCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServiceItem } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { formatCOP } from '../utils/formatCurrency';

interface ServiceCatalogProps {
  services: ServiceItem[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSelectService: (service: ServiceItem) => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  services,
  selectedCategory,
  onSelectCategory,
  onSelectService,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const categories = [
    { id: 'all', label: 'Todos los Oficios' },
    { id: 'plumbing', label: 'Plomería' },
    { id: 'electricity', label: 'Electricidad' },
    { id: 'climatization', label: 'Gasodomésticos & Clima' },
    { id: 'locksmith', label: 'Cerrajería' },
  ];

  // Filter based on selected category and debounced search term
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      const matchesSearch = !debouncedSearch.trim() || 
        service.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        service.description.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        service.categoryLabel.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, debouncedSearch]);

  // Pagination calculation
  const totalItems = filteredServices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedServices = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, safePage, itemsPerPage]);

  const handleCategoryChange = (catId: string) => {
    onSelectCategory(catId);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#dde7ee] pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0b3658] tracking-tight">
            Catálogo Oficial de Servicios All-In
          </h2>
          <p className="text-sm text-[#486984] mt-0.5">
            Tarifas cerradas transparentes. Sin cobros por presupuestar y fondos seguros en custodia.
          </p>
        </div>

        {/* Search and Category Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Debounced Search Bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-[#486984] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar servicio en Colombia (ej. fuga, tacos, calentador a gas)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dde7ee] focus:border-[#4e9ad9] text-[#0b3658] placeholder-[#486984] rounded-full text-xs sm:text-sm outline-none transition-all shadow-sm"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-[#e6f1fa] rounded-full border border-[#dde7ee] overflow-x-auto">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => handleCategoryChange(c.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-white text-[#0b3658] shadow-sm font-bold border border-[#dde7ee]'
                    : 'text-[#486984] hover:text-[#0b3658]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-xs text-[#486984]">
        <span>
          Mostrando {paginatedServices.length} de {totalItems} servicios disponibles
          {debouncedSearch && <span className="text-[#4e9ad9] ml-1.5 font-bold">para "{debouncedSearch}"</span>}
        </span>
        {totalPages > 1 && (
          <span className="font-mono text-xs text-[#486984]">
            Página {safePage} de {totalPages}
          </span>
        )}
      </div>

      {/* Grid of services */}
      {paginatedServices.length === 0 ? (
        <div className="cord-card p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e6f1fa] border border-[#dde7ee] flex items-center justify-center text-[#4e9ad9]">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0b3658]">No encontramos servicios con ese criterio</h3>
            <p className="text-sm text-[#486984] mt-1">
              Prueba cambiando los términos de búsqueda o seleccionando otro oficio.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchInput('');
              onSelectCategory('all');
            }}
            className="cord-btn-secondary px-5 py-2 text-xs font-bold"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedServices.map(service => (
            <div
              key={service.id}
              className="cord-card-interactive p-5 flex flex-col justify-between group"
            >
              <div>
                {/* Image slot with lazy loading and async decoding */}
                {service.imageUrl && (
                  <div className="w-full h-44 rounded-[20px] overflow-hidden mb-4 relative bg-[#e6f1fa] border border-[#dde7ee]">
                    <img
                      src={service.imageUrl}
                      alt={service.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-[5px] border border-[#dde7ee] text-xs font-bold text-[#0b3658] shadow-sm">
                      {service.categoryLabel}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-[#486984] mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-[#4e9ad9]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Bóveda Escrow
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[#486984]">
                    <Clock className="w-3.5 h-3.5" />
                    ~{service.estimatedHours} horas
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#0b3658] group-hover:text-[#4e9ad9] transition-colors leading-snug">
                  {service.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#486984] mt-2 line-clamp-2 leading-relaxed">
                  {service.description}
                </p>

                {/* Included tasks checkmarks */}
                <ul className="mt-3.5 space-y-1.5 text-xs text-[#0b3658]">
                  {service.includedTasks.map((task, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#4e9ad9] shrink-0" />
                      <span className="truncate">{task}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price and CTA Strip */}
              <div className="mt-5 pt-4 border-t border-[#dde7ee] flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-[#688dac] uppercase tracking-wider block font-semibold">
                    Precio All-In
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-extrabold text-[#0b3658] font-mono tabular-nums">
                      {formatCOP(service.basePrice)}
                    </span>
                    <span className="text-[11px] text-[#486984]">Tarifa All-In</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectService(service)}
                  className="cord-btn-primary px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                >
                  <span>Solicitar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#dde7ee] text-[#0b3658] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#4e9ad9] transition-all flex items-center gap-1 shadow-sm"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-full text-xs font-mono font-bold transition-all ${
                    safePage === p
                      ? 'bg-[#4e9ad9] text-white shadow-sm'
                      : 'bg-white border border-[#dde7ee] text-[#0b3658] hover:border-[#4e9ad9]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#dde7ee] text-[#0b3658] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#4e9ad9] transition-all flex items-center gap-1 shadow-sm"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
