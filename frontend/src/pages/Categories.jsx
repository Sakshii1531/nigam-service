import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Sparkles } from 'lucide-react';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { apiRequest } from '../lib/apiClient';

// Sidebar tab artwork — this is pure navigation chrome (which of the 6 fixed
// tabs is active), not data. Every category, section and service shown under
// a tab is fetched live from GET /catalog/categories below; this page used to
// ship its own ~160-line hardcoded catalog (categories, sections, prices)
// that had drifted from — and duplicated — the real admin-managed catalog.
import handymanSidebar from '../assets/categories/plumber_fixed.png';
import applianceSidebar from '../assets/categories/ac.png';
import cleaningSidebar from '../assets/categories/cleaning.png';
import paintingSidebar from '../assets/categories/spa.png';
import moversSidebar from '../assets/categories/security_system.png';

// Tile artwork: a handful of existing image assets reused by keyword match
// against the real category name, since the catalog doesn't have per-category
// photography yet. Anything unmatched falls back to a generic tool icon
// rendered in that category's own seeded accent color, rather than showing a
// photo for an unrelated service (the old page showed a plumber photo on the
// "Carpenter" tile, and an electrician photo on "Mosquito Mesh").
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import sofaImg from '../assets/cleaning_sofa.png';
import tileImg from '../assets/cleaning_bathroom_1.png';
import tvImg from '../assets/categories/television.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';
import iconAc from '../assets/icon_3d_ac.png';
import iconGeyser from '../assets/icon_3d_geyser.png';
import iconRo from '../assets/icon_3d_ro.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconOven from '../assets/icon_3d_oven.png';
import iconFridge from '../assets/icon_3d_fridge.png';
import iconWm from '../assets/icon_3d_wm.png';
import iconCooler from '../assets/icon_3d_cooler.png';
import iconWrench from '../assets/icon_3d_wrench.png';

const SIDEBAR_TABS = [
  { id: 'handyman', name: 'Handyman Services', shortName: 'Handyman', image: handymanSidebar },
  { id: 'appliance', name: 'Appliance Repair', shortName: 'Appliance', image: applianceSidebar },
  { id: 'cleaning', name: 'Cleaning & Pest Control', shortName: 'Cleaning', image: cleaningSidebar },
  { id: 'painting', name: 'Painting & Waterproofing', shortName: 'Painting', image: paintingSidebar },
  { id: 'movers', name: 'Movers & Storage', shortName: 'Movers', image: moversSidebar },
  { id: 'renovation', name: 'Renovation', shortName: 'Renovation', image: handymanSidebar },
];

const IMAGE_MATCHERS = [
  [/electrician/i, electricianImg],
  [/plumber/i, plumberImg],
  [/sofa/i, sofaImg],
  [/tile/i, tileImg],
  [/^tv\b|television/i, tvImg],
  [/kitchen/i, cleaningKitchen],
  [/carpet|mattress/i, cleaningCarpet],
  [/^ac\b|air condition/i, iconAc],
  [/geyser/i, iconGeyser],
  [/water purifier|\bro\b/i, iconRo],
  [/chimney/i, iconChimney],
  [/gas|microwave|oven/i, iconOven],
  [/refrigerator|fridge/i, iconFridge],
  [/washing machine/i, iconWm],
  [/air cooler/i, iconCooler],
];

function getCategoryImage(name) {
  const match = IMAGE_MATCHERS.find(([re]) => re.test(name));
  return match ? match[1] : null;
}

const Categories = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('handyman');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    apiRequest('/catalog/categories')
      .then((res) => setCategories(res || []))
      .catch((err) => setLoadError(err.message || 'Could not load categories.'))
      .finally(() => setLoading(false));
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((c) => (c.groups || []).includes(activeTab)),
    [categories, activeTab],
  );

  // Group the active tab's categories by their `section` field (e.g.
  // "Maintenance", "Installation"), preserving the order sections first
  // appear in — the API already sorts categories by sortOrder/name.
  const activeSections = useMemo(() => {
    const bySection = new Map();
    activeCategories.forEach((cat) => {
      const key = cat.section || 'Services';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(cat);
    });
    return Array.from(bySection.entries()).map(([title, items]) => ({ title, items }));
  }, [activeCategories]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(query) || (c.section || '').toLowerCase().includes(query),
    );
  }, [categories, searchQuery]);

  const activeTabInfo = SIDEBAR_TABS.find((t) => t.id === activeTab);

  // Appliance-repair categories go into the step-based booking flow that
  // already reads this exact catalog; everything else (a general handyman
  // service, cleaning, pest control, painting, movers, renovation) goes to
  // the service detail page.
  const handleSelectCategory = (cat) => {
    if ((cat.groups || []).includes('appliance')) {
      navigate(`/book/${encodeURIComponent(cat.key)}`);
    } else {
      navigate(`/service-details?service=${encodeURIComponent(cat.name)}`);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden pb-16 lg:pb-0 relative font-sans">
      {/* Top Header — mobile only */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0 lg:hidden shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">Categories</h1>
          <span className="text-[10px] font-medium text-slate-400">Explore all home services</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      {/* Main Split Container */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">

        {/* Left Sidebar — custom no-scrollbar for smooth scrolling. Icon/text
            sizes used to be flat across the whole 320–639px phone range
            (Tailwind's own `sm:` only kicks in at 640px, which no phone in
            portrait ever reaches), so a small phone and a large one rendered
            the exact same fixed-size rail; the min-[Npx] tiers below scale it
            down on narrow phones and back up on wider ones. */}
        <div className="w-16 min-[380px]:w-18 min-[425px]:w-20.5 sm:w-28 md:w-36 lg:w-44 bg-slate-50/90 border-r border-slate-200/60 flex flex-col py-2 overflow-y-auto no-scrollbar select-none shrink-0 gap-1 min-[380px]:gap-1.5 sm:gap-2">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = activeTab === tab.id && !searchQuery.trim();
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`relative flex flex-col items-center gap-0.5 min-[380px]:gap-1 py-1.5 min-[380px]:py-2 sm:py-2.5 px-1 sm:px-1.5 mx-1 sm:mx-1.5 rounded-lg min-[380px]:rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer text-left group ${
                  isActive
                    ? 'bg-white shadow-xs border border-blue-100/80 font-extrabold text-brand-blue'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 border border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-linear-to-b from-brand-blue to-blue-500 rounded-r-full shadow-2xs" />
                )}

                <div className={`w-9 h-9 min-[380px]:w-10.5 min-[380px]:h-10.5 min-[425px]:w-12 min-[425px]:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg min-[380px]:rounded-xl flex items-center justify-center p-1 min-[380px]:p-1.5 sm:p-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-linear-to-br from-[#EAF4FF] to-blue-50/90 scale-105 shadow-2xs border border-blue-200/60'
                    : 'bg-white border border-slate-100 shadow-2xs group-hover:scale-102'
                }`}>
                  <img src={tab.image} alt={tab.name} className="w-full h-full object-contain drop-shadow-2xs" />
                </div>
                <span className={`text-[8.5px] min-[380px]:text-[9.5px] min-[425px]:text-[10px] sm:text-xs text-center px-0.5 leading-tight w-full font-bold transition-colors ${
                  isActive ? 'text-brand-blue' : 'text-slate-600 group-hover:text-slate-900'
                }`}>
                  {tab.shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel — styled single custom scrollbar */}
        <div className="flex-1 bg-[#F8FAFC] p-2.5 min-[380px]:p-3 sm:p-5 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-[380px]:gap-3.5 sm:gap-6">

          {/* Header & Search Bar Banner */}
          <div className="bg-linear-to-br from-[#0B3C86] via-brand-blue to-indigo-900 text-white p-3 min-[380px]:p-3.5 sm:p-5 rounded-xl min-[380px]:rounded-2xl border border-blue-800/50 shadow-xs flex flex-col gap-2 min-[380px]:gap-2.5 sm:gap-3 lg:from-white lg:via-[#F4F8FF]/60 lg:to-[#EBF3FE]/40 lg:text-slate-900 lg:border-blue-100/70">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] min-[380px]:text-sm sm:text-xl font-black text-white lg:text-slate-900 tracking-tight">
                  {searchQuery ? 'Search Services' : activeTabInfo?.name}
                </h2>
              </div>
              {!searchQuery && (
                <span className="text-[9px] min-[380px]:text-[10px] sm:text-xs font-bold text-blue-900 bg-white lg:text-white lg:bg-brand-blue px-2 min-[380px]:px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                  {activeCategories.length} services
                </span>
              )}
            </div>
            <p className="text-[10px] min-[380px]:text-[11px] sm:text-xs text-blue-100 lg:text-slate-500 leading-tight">
              {searchQuery
                ? `Showing results matching "${searchQuery}"`
                : 'Browse verified serviceProviders and instant home services'}
            </p>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72 md:w-80 mt-0.5 sm:mt-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services (e.g. AC, Electrician)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 sm:py-2 text-[11px] min-[380px]:text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 min-[380px]:gap-2.5 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 min-[380px]:h-28 rounded-xl min-[380px]:rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-2xl p-6 sm:p-12 text-center border border-slate-200/60 my-2 sm:my-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">Could not load categories</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">{loadError}</p>
            </div>
          ) : searchResults ? (
            <div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 min-[380px]:gap-2.5 sm:gap-4">
                  {searchResults.map((cat) => {
                    const img = getCategoryImage(cat.name);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat)}
                        className="group bg-white border border-slate-200/80 rounded-xl min-[380px]:rounded-2xl p-2 min-[380px]:p-2.5 min-[425px]:p-3 sm:p-3.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:border-brand-blue/40 active:scale-[0.97]"
                      >
                        <div
                          className="w-11 h-11 min-[380px]:w-12.5 min-[380px]:h-12.5 min-[425px]:w-14 min-[425px]:h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-lg min-[380px]:rounded-xl p-1.5 min-[425px]:p-2 flex items-center justify-center transition-all duration-200 border border-slate-100/90 shadow-2xs"
                          style={{ backgroundColor: cat.lightBg || '#F1F5F9' }}
                        >
                          <img src={img || iconWrench} alt={cat.name} className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-2xs" />
                        </div>
                        <div className="mt-1.5 min-[380px]:mt-2 text-center w-full">
                          <span className="text-[7.5px] min-[380px]:text-[8.5px] min-[425px]:text-[9px] font-extrabold text-brand-blue uppercase tracking-wider block mb-0.5 line-clamp-1">
                            {cat.section || 'Services'}
                          </span>
                          <h4 className="text-[9.5px] min-[380px]:text-[10.5px] min-[425px]:text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-brand-blue line-clamp-2 leading-snug transition-colors">
                            {cat.name}
                          </h4>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 sm:p-12 text-center border border-slate-200/60 my-2 sm:my-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                    <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">No services found</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Try searching with a different keyword like "AC", "Cleaning", or "Plumber"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3.5 px-3.5 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-xs"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 min-[380px]:gap-4 sm:gap-5 md:gap-8">
              {activeSections.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 sm:p-12 text-center border border-slate-200/60 my-2 sm:my-4">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">No services in this category yet</h3>
                </div>
              ) : (
                activeSections.map((section) => (
                  <div key={section.title} className="flex flex-col gap-1.5 min-[380px]:gap-2 sm:gap-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-blue ring-4 ring-blue-100" />
                        <h3 className="text-[10px] min-[380px]:text-[11px] sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                          {section.title}
                        </h3>
                      </div>
                      <span className="text-[8px] min-[380px]:text-[9px] sm:text-[11px] font-bold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200/50 shrink-0">
                        {section.items.length} services
                      </span>
                    </div>

                    {/* Cards Grid: 2 columns on mobile for spacious touch
                        targets, 4+ on desktop. Icon/text sizes scale across
                        the 320–425px phone range, the same fix already
                        applied to the product-detail assurance grid. */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 min-[380px]:gap-2.5 sm:gap-4">
                      {section.items.map((cat) => {
                        const img = getCategoryImage(cat.name);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat)}
                            className="group bg-white border border-slate-200/80 rounded-xl min-[380px]:rounded-2xl p-2 min-[380px]:p-2.5 min-[425px]:p-3 sm:p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:border-brand-blue/40 hover:shadow-md transition-all text-center min-h-21.5 min-[380px]:min-h-24 md:min-h-30"
                          >
                            <div
                              className="w-11 h-11 min-[380px]:w-12.5 min-[380px]:h-12.5 min-[425px]:w-14 min-[425px]:h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-lg min-[380px]:rounded-xl p-1.5 min-[425px]:p-2 flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: cat.lightBg || '#F1F5F9' }}
                            >
                              <img
                                src={img || iconWrench}
                                alt={cat.name}
                                className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-2xs"
                              />
                            </div>
                            <span className="text-[9.5px] min-[380px]:text-[10.5px] min-[425px]:text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-brand-blue text-center w-full px-0.5 line-clamp-2 leading-snug transition-colors">
                              {cat.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Menu Bar (Custom Mobile Tabs) — hidden on desktop */}
      <CustomerBottomNav />
    </div>
  );
};

export default Categories;
