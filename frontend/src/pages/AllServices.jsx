import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import Footer from '../components/layout/Footer';
import CustomerBottomNav from '../components/CustomerBottomNav';

// Visual image assets
import acImg from '../assets/categories/ac.png';
import wasingImg from '../assets/categories/wasing.png';
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import cleaningImg from '../assets/categories/cleaning.png';
import saloonImg from '../assets/categories/saloon.png';
import spaImg from '../assets/categories/spa.png';
import tvImg from '../assets/categories/television.png';
import iconCooler from '../assets/icon_3d_cooler.png';
import iconGeyser from '../assets/icon_3d_geyser.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconRo from '../assets/icon_3d_ro.png';
import iconOven from '../assets/icon_3d_oven.png';
import iconFridge from '../assets/icon_3d_fridge.png';
import iconWrench from '../assets/icon_3d_wrench.png';

const IMAGE_MATCHERS = [
  [/electrician/i, electricianImg],
  [/plumber|pipeline/i, plumberImg],
  [/tv|television/i, tvImg],
  [/^ac\b|air condition/i, acImg],
  [/cooler/i, iconCooler],
  [/geyser|water heater/i, iconGeyser],
  [/water purifier|\bro\b/i, iconRo],
  [/chimney/i, iconChimney],
  [/gas|microwave|oven|hob/i, iconOven],
  [/refrigerator|fridge/i, iconFridge],
  [/washing machine|wm/i, wasingImg],
  [/cleaning|pest|bug/i, cleaningImg],
  [/salon|saloon/i, saloonImg],
  [/spa|massage/i, spaImg],
  [/carpenter|furniture|renovation/i, iconWrench],
];

function getCategoryImage(name = '') {
  const match = IMAGE_MATCHERS.find(([re]) => re.test(name));
  return match ? match[1] : null;
}

const AllServices = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message || 'Could not load service catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => {
      const matchCat = cat.name.toLowerCase().includes(query);
      const matchService = (cat.services || []).some((s) =>
        (s.name || '').toLowerCase().includes(query) ||
        (s.description || '').toLowerCase().includes(query)
      );
      return matchCat || matchService;
    });
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 lg:pb-12 font-sans">
      {/* Top Header Banner */}
      <div className="bg-linear-to-br from-[#0B3C86] via-brand-blue to-indigo-900 text-white p-6 lg:py-10 rounded-b-[32px] shadow-sm">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white/15 hover:bg-white/25 rounded-full backdrop-blur-xs transition-all active:scale-95 cursor-pointer text-white"
              aria-label="Go Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-3xl font-black tracking-tight">Service Catalog</h1>
                <span className="bg-white/20 text-white text-[10px] lg:text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {categories.length} Categories
                </span>
              </div>
              <p className="text-xs lg:text-sm text-blue-100 mt-1">
                Explore real doorstep services, transparent pricing, and instant booking
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-xl mt-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories or services (e.g. AC Repair, Fan, Cleaning)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white text-slate-900 rounded-xl text-xs sm:text-sm shadow-xs border-0 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="p-4 sm:p-6 md:p-8 lg:px-16 xl:px-20 max-w-screen-2xl mx-auto w-full flex-1">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200/70 p-5 animate-pulse flex flex-col justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 max-w-md mx-auto my-10">
            <p className="text-sm text-rose-600 font-semibold">{error}</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 max-w-md mx-auto my-10">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No matching services found</h3>
            <p className="text-xs text-slate-500 mt-1">Try another search term like "AC", "Washing", "Plumber", or "Electrician".</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-blue-800 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredCategories.map((cat) => {
              const image = getCategoryImage(cat.name);
              const services = cat.services || [];
              return (
                <div
                  key={cat.key}
                  onClick={() => navigate(`/book/${encodeURIComponent(cat.key)}`)}
                  className="group bg-white border border-slate-200/80 hover:border-brand-blue/50 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Category Top: Icon & Title */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-2 shrink-0 border border-slate-100 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: cat.lightBg || '#EAF4FF' }}
                    >
                      <img
                        src={image || iconWrench}
                        alt={cat.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = iconWrench;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-brand-blue transition-colors truncate">
                          {cat.name}
                        </h2>
                      </div>
                      <span className="inline-block text-[11px] font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                        {services.length} {services.length === 1 ? 'service' : 'services'}
                      </span>
                    </div>
                  </div>

                  {/* Services Inside Category Preview */}
                  {services.length > 0 ? (
                    <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 flex flex-col gap-1.5 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Available Services
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {services.slice(0, 4).map((s, idx) => (
                          <span
                            key={s.id || idx}
                            className="text-[11px] bg-white border border-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md font-medium truncate max-w-[180px]"
                          >
                            {s.name}
                          </span>
                        ))}
                        {services.length > 4 && (
                          <span className="text-[10px] font-bold text-brand-blue self-center px-1">
                            +{services.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 text-left">
                      <span className="text-[11px] text-slate-400 italic">Book on-demand inspection</span>
                    </div>
                  )}

                  {/* Action CTA */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-bold text-brand-blue group-hover:text-blue-800">
                    <span>View & Book Services</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation — mobile only */}
      <CustomerBottomNav />

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default AllServices;
