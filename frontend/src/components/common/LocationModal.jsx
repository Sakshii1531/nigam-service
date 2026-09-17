import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  CheckCircle2, 
  Building2, 
  Home, 
  Briefcase, 
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { useLocationContext, POPULAR_CITIES } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { isCityServiceable } from '../../utils/serviceableCities';

export const LocationModal = () => {
  const { 
    isModalOpen, 
    closeLocationModal, 
    currentLocation, 
    activeCities, 
    detectingLocation, 
    locationError, 
    detectCurrentLocation, 
    selectCity, 
    selectAddress 
  } = useLocationContext();

  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isModalOpen) {
      setSearchTerm('');
    }
  }, [isModalOpen]);


  // Combined searchable cities list
  const allCitiesList = useMemo(() => {
    const list = [...activeCities];
    POPULAR_CITIES.forEach(pop => {
      const exists = list.some(c => c.name.toLowerCase().trim() === pop.name.toLowerCase().trim());
      if (!exists) {
        list.push(pop);
      }
    });
    return list;
  }, [activeCities]);

  // Filtered by search
  const filteredCities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allCitiesList;
    return allCitiesList.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.state && c.state.toLowerCase().includes(term))
    );
  }, [allCitiesList, searchTerm]);

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
        {/* Backdrop click */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeLocationModal}
          className="absolute inset-0"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[90vh] sm:max-h-[85vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-blue-50/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#0D47A1] text-white flex items-center justify-center shadow-xs">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">Select Location</h3>
                <p className="text-[11px] text-slate-500 font-medium">Doorstep appliance services & fast delivery</p>
              </div>
            </div>
            <button
              onClick={closeLocationModal}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* GPS Location Button */}
            <button
              onClick={detectCurrentLocation}
              disabled={detectingLocation}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/60 border border-blue-200/80 hover:border-[#0D47A1] text-left transition-all group shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-[#0D47A1] text-white flex items-center justify-center shadow-sm">
                  {detectingLocation ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Navigation size={18} className="text-[#FFD600]" />
                  )}
                  {detectingLocation && (
                    <span className="absolute -inset-1 rounded-xl bg-blue-400/40 animate-ping" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#0D47A1] group-hover:underline flex items-center gap-1.5">
                    {detectingLocation ? 'Detecting your location...' : 'Use My Current Location'}
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100/80 text-[#0D47A1]">GPS</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {detectingLocation ? 'Reading GPS coordinates & checking area...' : 'Using device GPS to detect your area automatically'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#0D47A1] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Error Message if GPS fails */}
            {locationError && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search city, district, or area..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0D47A1] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* User Saved Addresses (if available) */}
            {user?.addresses && user.addresses.length > 0 && !searchTerm && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Saved Addresses
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {user.addresses.map((addr) => {
                    const isCurrent = currentLocation.city.toLowerCase() === (addr.city || '').toLowerCase();
                    return (
                      <button
                        key={addr._id || addr.id || addr.city}
                        onClick={() => selectAddress(addr)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent 
                            ? 'bg-blue-50/70 border-[#0D47A1]/40 shadow-xs' 
                            : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {addr.type === 'Work' ? <Briefcase size={14} /> : <Home size={14} />}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{addr.type || 'Home'}</span>
                              {addr.isDefault && (
                                <span className="text-[9px] font-bold text-brand-blue bg-blue-100/60 px-1.5 py-0.2 rounded">Default</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {addr.house ? `${addr.house}, ` : ''}{addr.city}
                            </p>
                          </div>
                        </div>
                        {isCurrent && (
                          <CheckCircle2 size={16} className="text-[#0D47A1] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Serviceable Operational Cities */}
            {!searchTerm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Serviceable Cities ({activeCities.length})
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Live Doorstep Service
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeCities.map((city) => {
                    const isSelected = (currentLocation?.city || '').toLowerCase() === (city?.name || '').toLowerCase();
                    return (
                      <button
                        key={city.name}
                        onClick={() => selectCity(city.name, city.state)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0D47A1] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        <MapPin size={11} className={isSelected ? 'text-[#FFD600]' : 'text-slate-400'} />
                        <span>{city.name}</span>
                        {city.state && (
                          <span className={`text-[10px] font-normal opacity-75`}>({city.state})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All / Filtered Cities List */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {searchTerm ? 'Search Results' : 'All Cities (Select Any City)'}
              </span>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {filteredCities.length === 0 ? (
                  <div className="text-center py-6">
                    <Building2 size={24} className="mx-auto text-slate-300 mb-1.5" />
                    <p className="text-xs font-bold text-slate-700">No matching city found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      You can still select &quot;{searchTerm}&quot; to check service availability.
                    </p>
                    <button
                      onClick={() => selectCity(searchTerm)}
                      className="mt-3 px-4 py-1.5 bg-[#0D47A1] text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors cursor-pointer"
                    >
                      Check &quot;{searchTerm}&quot;
                    </button>
                  </div>
                ) : (
                  filteredCities.map((city) => {
                    const isServiceable = isCityServiceable(city.name, activeCities);
                    const isCurrent = (currentLocation?.city || '').toLowerCase() === (city?.name || '').toLowerCase();

                    return (
                      <button
                        key={city.name}
                        onClick={() => selectCity(city.name, city.state)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-50/80 text-[#0D47A1]'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isServiceable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            <MapPin size={13} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold">{city.name}</span>
                              {isServiceable ? (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
                                  Active
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/50">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            {city.state && (
                              <span className="text-[10px] text-slate-400 block">{city.state}</span>
                            )}
                          </div>
                        </div>

                        {isCurrent ? (
                          <CheckCircle2 size={16} className="text-[#0D47A1]" />
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Select</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Current Selection Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs px-4">
            <span className="text-slate-500 text-[11px]">
              Current: <strong className="text-slate-800 font-bold">{currentLocation.fullAddress || currentLocation.city}</strong>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentLocation.isServiceable 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {currentLocation.isServiceable ? '✓ Serviceable Area' : '⚠ Area Not Covered'}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationModal;
