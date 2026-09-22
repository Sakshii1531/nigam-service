import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, X, ChevronRight, Sparkles } from 'lucide-react';
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

const FILTER_TAGS = [
  { id: 'all', label: 'All' },
  { id: 'appliance', label: 'Appliances', match: /ac|refrigerator|fridge|washing|geyser|cooler|water purifier|ro|tv|microwave|chimney/i },
  { id: 'cleaning', label: 'Cleaning', match: /cleaning|pest|bug|sanitize|wash/i },
  { id: 'repairs', label: 'Repairs & Fitting', match: /electrician|plumber|carpenter|renovation/i },
  { id: 'beauty', label: 'Salon & Spa', match: /salon|saloon|spa|massage/i },
];

const AllServices = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch((err) => setError(err.message || 'Could not load service catalog.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredCategories = useMemo(() => {
    let result = categories;

    // Apply tag filter
    if (selectedTag !== 'all') {
      const activeTag = FILTER_TAGS.find((t) => t.id === selectedTag);
      if (activeTag?.match) {
        result = result.filter((cat) => activeTag.match.test(cat.name || ''));
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((cat) => {
        const matchCat = (cat.name || '').toLowerCase().includes(query);
        const matchService = (cat.services || []).some((s) =>
          (s.name || '').toLowerCase().includes(query) ||
          (s.description || '').toLowerCase().includes(query)
        );
        return matchCat || matchService;
      });
    }

    return result;
  }, [categories, searchQuery, selectedTag]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 lg:pb-12 font-sans">
      {/* Top Header Banner — compact and responsive */}
      <div className="bg-linear-to-br from-[#0B3C86] via-brand-blue to-indigo-900 text-white px-3.5 py-3.5 sm:px-6 sm:py-5 lg:py-6 rounded-b-2xl sm:rounded-b-3xl shadow-sm sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-2.5 sm:gap-3.5">
          {/* Header row with back button and titles */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center backdrop-blur-xs transition-all active:scale-95 cursor-pointer text-white shrink-0"
                aria-label="Go Back"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight truncate">
                    Service Catalog
                  </h1>
                  <span className="bg-white/20 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
                    {categories.length}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-blue-100 hidden sm:block truncate">
                  Doorstep home services with transparent pricing & genuine warranty
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search category or service (e.g. AC, Tap, Cleaning)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-white text-slate-900 rounded-xl text-xs sm:text-sm shadow-2xs border-0 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-white/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {FILTER_TAGS.map((tag) => {
              const active = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-brand-blue shadow-xs font-bold'
                      : 'bg-white/15 text-white hover:bg-white/20'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2x Grid Card Catalog — Optimized for all devices */}
      <div className="p-3 sm:p-5 md:p-6 lg:px-12 xl:px-16 max-w-screen-2xl mx-auto w-full flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-36 sm:h-44 rounded-xl sm:rounded-2xl bg-white border border-slate-200/70 p-3 sm:p-4 animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100" />
                  <div className="w-12 h-3.5 bg-slate-100 rounded-full" />
                </div>
                <div className="space-y-1.5 my-auto">
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-full pt-1" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-slate-200/80 max-w-md mx-auto my-8">
            <p className="text-xs sm:text-sm text-rose-600 font-semibold">{error}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-slate-200/80 max-w-md mx-auto my-8">
            <p className="text-xs sm:text-sm text-text-secondary">No service categories are available right now.</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-slate-200/80 max-w-md mx-auto my-8">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2.5 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">No matching services found</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              Try another keyword or tap "All" to view all available services.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('all');
              }}
              className="mt-3.5 px-3.5 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-blue-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
            {filteredCategories.map((cat) => {
              const image = getCategoryImage(cat.name);
              const services = cat.services || [];
              const topServices = services.slice(0, 2);

              return (
                <div
                  key={cat.key || cat.id || cat.name}
                  onClick={() => navigate(`/book/${encodeURIComponent(cat.key || cat.name)}`)}
                  className="group bg-white border border-slate-200/80 hover:border-brand-blue/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 flex flex-col justify-between gap-2 sm:gap-2.5 cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  {/* Top: Icon + Service Count Badge */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl flex items-center justify-center p-1.5 sm:p-2 shrink-0 border border-slate-100 transition-transform group-hover:scale-105"
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
                    <span className="text-[9px] sm:text-[10.5px] font-bold text-brand-blue bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                      {services.length} {services.length === 1 ? 'service' : 'services'}
                    </span>
                  </div>

                  {/* Middle: Category Title & Service Highlights */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1 leading-snug">
                      {cat.name}
                    </h2>

                    {/* Compact Services Highlights Preview */}
                    {topServices.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {topServices.map((s, idx) => (
                          <span
                            key={s.id || idx}
                            className="text-[9.5px] sm:text-[10.5px] bg-slate-50 border border-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium truncate max-w-full"
                          >
                            {s.name}
                          </span>
                        ))}
                        {services.length > 2 && (
                          <span className="text-[9px] sm:text-[10px] font-bold text-brand-blue self-center">
                            +{services.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                        Instant Doorstep Service
                      </p>
                    )}
                  </div>

                  {/* Bottom: Book CTA */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11.5px] font-bold text-brand-blue group-hover:text-blue-800">
                    <span>Book Service</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
