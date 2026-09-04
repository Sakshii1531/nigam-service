import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Bell, 
  CheckCircle2, 
  ArrowRight, 
  LogOut, 
  Globe2, 
  Compass, 
  Building2, 
  Sparkles,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppLogo } from '../context/LogoContext';
import { getActiveCities, isCityServiceable } from '../utils/serviceableCities';
import { apiRequest } from '../lib/apiClient';

const AreaNotServiceable = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { logoUrl } = useAppLogo();

  const [notified, setNotified] = useState(false);
  const [activeCities, setActiveCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [showChangeCityModal, setShowChangeCityModal] = useState(false);
  const [showActiveCitiesModal, setShowActiveCitiesModal] = useState(false);
  const [searchCity, setSearchCity] = useState('');
  const [updatingCity, setUpdatingCity] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Extract user's registered city
  const userAddress = user?.addresses?.find(a => a?.isDefault) || user?.addresses?.[0];
  const userCity = user?.city || userAddress?.city || 'Your Area';

  useEffect(() => {
    async function load() {
      setLoadingCities(true);
      const cities = await getActiveCities();
      setActiveCities(cities);
      setLoadingCities(false);

      // If user's city is already serviceable (e.g. updated recently), redirect to dashboard
      if (isCityServiceable(userCity, cities)) {
        navigate('/dashboard', { replace: true });
      }
    }
    load();
  }, [userCity, navigate]);

  const handleNotifyMe = () => {
    setNotified(true);
  };

  const handleSelectServiceableCity = async (selectedCity) => {
    setUpdatingCity(true);
    setUpdateError('');
    try {
      // Find the existing default or primary address
      const currentAddr = user?.addresses?.find(a => a?.isDefault) || user?.addresses?.[0];
      const newAddress = {
        type: currentAddr?.type || 'Home',
        house: currentAddr?.house || `${selectedCity.name}, Central Area`,
        landmark: currentAddr?.landmark || '',
        city: selectedCity.name,
        state: selectedCity.state || '',
        pincode: currentAddr?.pincode || '',
        name: user?.name || 'Customer',
        isDefault: true
      };

      let updatedAddresses;
      if (currentAddr?._id) {
        // Update existing address in-place via PUT
        const res = await apiRequest(`/auth/addresses/${currentAddr._id}`, {
          method: 'PUT',
          auth: true,
          body: newAddress
        });
        updatedAddresses = Array.isArray(res) ? res : [newAddress];
      } else {
        // Create new address via POST
        const res = await apiRequest('/auth/addresses', {
          method: 'POST',
          auth: true,
          body: newAddress
        });
        updatedAddresses = Array.isArray(res) ? res : [newAddress];
      }

      // Ensure the default address is at index 0
      const defaultIdx = updatedAddresses.findIndex(a => a.isDefault || a.city === selectedCity.name);
      if (defaultIdx > 0) {
        const [def] = updatedAddresses.splice(defaultIdx, 1);
        updatedAddresses.unshift(def);
      }

      // Update auth context state with addresses AND user.city
      updateUser({ 
        addresses: updatedAddresses,
        city: selectedCity.name,
        state: selectedCity.state || ''
      });

      setShowChangeCityModal(false);
      // Navigate to normal app flow
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to update city:', err);
      setUpdateError(err?.message || 'Failed to update city. Please try again.');
    } finally {
      setUpdatingCity(false);
    }
  };

  const filteredActiveCities = activeCities.filter(c =>
    c.name.toLowerCase().includes(searchCity.trim().toLowerCase()) ||
    (c.state && c.state.toLowerCase().includes(searchCity.trim().toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F7FC] via-[#EEF4FB] to-[#E3ECF9] flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden text-slate-800">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute top-[-80px] left-[-80px] w-96 h-96 bg-[#0D47A1]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-[#FFD600]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-2xl flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Nigam Care" className="h-10 w-auto object-contain" />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white/70 hover:bg-white border border-slate-200/80 rounded-full shadow-xs transition-all"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-lg my-auto py-6 relative z-10">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_20px_60px_rgba(13,71,161,0.08)] rounded-[32px] p-6 sm:p-8 text-center flex flex-col items-center relative overflow-hidden">
          
          {/* Pulsating Animated Radar & Location Beacon */}
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            {/* Outer Expanding Waves */}
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-[#0D47A1]/20"
            />
            <motion.div
              animate={{ scale: [1, 1.7], opacity: [0.8, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, delay: 0.9, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-[#FFD600]/30"
            />

            {/* Glowing Core Disk */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#0D47A1] to-[#1976D2] flex items-center justify-center shadow-lg shadow-blue-500/25 border-4 border-white">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="relative flex items-center justify-center"
              >
                <MapPin className="text-[#FFD600] w-9 h-9 drop-shadow-md" />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white"
                />
              </motion.div>
            </div>
          </div>

          {/* Current City Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-3 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{userCity} — Coming Soon</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            We&apos;re Not in Your Area Yet!
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            Nigam Care doorstep repair and appliance services are not active in{' '}
            <strong className="text-slate-900 font-bold">{userCity}</strong> right now. We are expanding rapidly across India and will be launching in your neighborhood soon!
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* 1. Notify Me Button */}
            {!notified ? (
              <button
                type="button"
                onClick={handleNotifyMe}
                className="w-full bg-gradient-to-r from-[#FFD600] to-[#FFCA00] text-[#0D47A1] font-bold py-3 px-5 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/20 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Bell size={16} />
                <span>Notify Me When You Launch</span>
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
              >
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>You&apos;re on the priority list! We will notify you upon launch.</span>
              </motion.div>
            )}

            {/* 2. Change City Button */}
            <button
              type="button"
              onClick={() => setShowChangeCityModal(true)}
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs"
            >
              <Compass size={15} className="text-[#0D47A1]" />
              <span>Change Location / Select Another City</span>
            </button>

            {/* 3. View Serviceable Cities */}
            <button
              type="button"
              onClick={() => setShowActiveCitiesModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors pt-2"
            >
              <Globe2 size={13} />
              <span>See where Nigam Care is available now ({activeCities.length} cities)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-xs text-slate-400 py-3 relative z-10">
        © 2026 Nigam Care. Empowering doorstep home & appliance services.
      </footer>

      {/* CHANGE CITY MODAL */}
      <AnimatePresence>
        {showChangeCityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#E3ECF9] text-[#0D47A1]">
                    <Building2 size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Select Serviceable City</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangeCityModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2 mb-3">
                Select one of our active cities below to unlock all services and features immediately.
              </p>

              {/* Search input */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="Search operational city..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D47A1] focus:bg-white transition-all"
                />
              </div>

              {updateError && (
                <div className="mb-2 p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold">
                  ⚠️ {updateError}
                </div>
              )}

              {/* Cities List */}
              <div className="overflow-y-auto space-y-2 pr-1 divide-y divide-slate-50">
                {filteredActiveCities.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching serviceable city found.
                  </div>
                ) : (
                  filteredActiveCities.map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      disabled={updatingCity}
                      onClick={() => handleSelectServiceableCity(city)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#E3ECF9]/60 border border-transparent hover:border-[#0D47A1]/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0D47A1] flex items-center justify-center font-bold text-xs group-hover:bg-[#0D47A1] group-hover:text-white transition-colors">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{city.name}</p>
                          {city.state && (
                            <p className="text-[10px] text-slate-400">{city.state}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#0D47A1] text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Select</span>
                        <ArrowRight size={13} />
                      </div>
                    </button>
                  ))
                )}
              </div>

              {updatingCity && (
                <div className="pt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#0D47A1]">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Updating your location...</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ALL ACTIVE CITIES MODAL */}
      <AnimatePresence>
        {showActiveCitiesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">Serviceable Cities</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActiveCitiesModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-2 mb-4">
                Nigam Care doorstep technicians and verified experts are currently operating in these regions:
              </p>

              <div className="overflow-y-auto space-y-2 pr-1 max-h-72">
                {activeCities.map((city) => (
                  <div
                    key={city.name}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{city.name}</p>
                        {city.state && <p className="text-[10px] text-slate-400">{city.state}</p>}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowActiveCitiesModal(false);
                  setShowChangeCityModal(true);
                }}
                className="mt-4 w-full bg-[#0D47A1] text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-800 transition-colors"
              >
                Switch to an Active City
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AreaNotServiceable;
