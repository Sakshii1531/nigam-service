import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { apiRequest } from '../lib/apiClient';
import tvImg from '../assets/categories/television.png';
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import geyserImg from '../assets/icon_3d_geyser.png';

// Same category set used across BuyNew.jsx / Buy.jsx / AMC.jsx, so a brand
// picked here lands on the exact same product listing those screens use.
const CATEGORIES = [
  { name: 'All', img: null },
  { name: 'Television', img: tvImg },
  { name: 'Refrigerator', img: fridgeImg },
  { name: 'Washing Machine', img: washingImg },
  { name: 'Air Conditioner', img: splitAcImg },
  { name: 'Water Purifier', img: waterPurifierImg },
  { name: 'Geyser', img: geyserImg },
];

// A handful of accent colors to cycle through so the dynamic brand list
// doesn't render as one flat, monotone grid — mirrors the palette used for
// brand chips elsewhere (Buy.jsx, BuyNew.jsx).
const ACCENT_COLORS = [
  '#0B4EA2', '#C6004E', '#00A0E9', '#005691', '#E31B23',
  '#005AAB', '#D32F2F', '#004098', '#0077C0', '#E53935',
];

const AllBrands = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Brand data now comes straight from the same catalogue the brand-admin
  // console manages (GET /catalog/brands) — previously this screen shipped
  // its own hand-drawn list of 14 logos that could drift from whatever
  // brands were actually onboarded, and never showed a brand added later.
  useEffect(() => {
    apiRequest('/catalog/brands')
      .then((res) => {
        if (Array.isArray(res)) {
          setBrands(res.map((b, i) => ({
            id: b.id,
            name: b.name,
            color: ACCENT_COLORS[i % ACCENT_COLORS.length],
          })));
        }
      })
      .catch((err) => setLoadError(err.message || 'Could not load brands.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // A brand tap used to always open a hardcoded "AC Repair" service page
  // regardless of which brand or category was picked (service-details
  // doesn't even read the brand/service query params it was given). Now it
  // goes to the real product catalogue, scoped to the category if one is
  // selected, pre-filtered to the chosen brand.
  const handleSelectBrand = (brand) => {
    if (activeCategory !== 'All') {
      navigate(
        `/buy-new/products/${encodeURIComponent(activeCategory)}?brand=${encodeURIComponent(brand.name)}`,
      );
    } else {
      navigate(`/buy-new?brand=${encodeURIComponent(brand.name)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-5 sm:p-6 rounded-b-3xl sm:rounded-b-[30px] shadow-sm flex flex-col gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-brand-blue" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-text-primary">Shop by Brand</h1>
            <p className="text-[11px] sm:text-xs text-text-secondary font-semibold">
              Pick a category and brand to browse matching products
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search brands (Samsung, LG...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-11 pr-4 py-2.5 sm:py-3 rounded-2xl border border-border-color focus:border-brand-blue focus:outline-none text-sm transition-all shadow-inner"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-text-secondary" />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                activeCategory === cat.name
                  ? 'bg-brand-blue border-brand-blue text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-brand-blue/40'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Brands Grid */}
      <div className="flex-1 p-5 sm:p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">⚠️</span>
            <h3 className="font-bold text-text-primary text-sm">Could not load brands</h3>
            <p className="text-xs text-text-secondary mt-1">{loadError}</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">🔍</span>
            <h3 className="font-bold text-text-primary text-sm">No brands found</h3>
            <p className="text-xs text-text-secondary mt-1">
              {brands.length === 0
                ? 'No brands have been added yet.'
                : 'Try typing another brand name.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id || brand.name}
                onClick={() => handleSelectBrand(brand)}
                className="group bg-white border border-slate-200/80 hover:border-brand-blue hover:bg-blue-50/10 p-4 rounded-2xl flex items-center gap-3 h-20 cursor-pointer transition-all hover:scale-[1.02] shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                  style={{ backgroundColor: brand.color }}
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 min-w-0 text-sm font-bold text-slate-800 leading-tight line-clamp-2">
                  {brand.name}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-blue transition-colors shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <CustomerBottomNav />
    </div>
  );
};

export default AllBrands;
