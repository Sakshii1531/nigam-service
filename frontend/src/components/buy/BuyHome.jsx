import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, ChevronRight, MapPin, Search, ShieldCheck, Phone, CheckCircle2, LayoutGrid } from 'lucide-react';
import { apiRequest, resolveMediaUrl } from '../../lib/apiClient';
import { isImageIcon } from '../common/ItemIcon';
import { Skeleton } from '../common/Skeleton';

import iconAc from '../../assets/icon_3d_ac.png';
import iconCooler from '../../assets/icon_3d_cooler.png';
import iconChimney from '../../assets/icon_3d_chimney.png';
import iconGeyser from '../../assets/icon_3d_geyser.png';
import iconOven from '../../assets/icon_3d_oven.png';
import iconFridge from '../../assets/icon_3d_fridge.png';
import iconTv from '../../assets/icon_3d_tv.png';
import iconWm from '../../assets/icon_3d_wm.png';
import iconRo from '../../assets/icon_3d_ro.png';
import iconWrench from '../../assets/icon_3d_wrench.png';
import iconCart from '../../assets/icon_3d_cart.png';
import iconCalendar from '../../assets/icon_3d_calendar.png';
import iconHome from '../../assets/icon_3d_home.png';
import iconCctv from '../../assets/categories/security_system.png';
import iconLaptop from '../../assets/categories/laptop_peripheral.png';
import iconDishwasher from '../../assets/categories/dishwasher.png';
import iconKitchen from '../../assets/categories/kitchen_appliance.png';

/** A 3D picture for an appliance name; an uploaded picture always wins. */
function applianceIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('cooler')) return iconCooler;
  if (/\bac\b/.test(n) || n.includes('air condition')) return iconAc;
  if (n.includes('chimney')) return iconChimney;
  if (n.includes('geyser') || n.includes('heater')) return iconGeyser;
  if (n.includes('microwave') || n.includes('oven')) return iconOven;
  if (n.includes('fridge') || n.includes('refrigerator')) return iconFridge;
  if (n.includes('tv') || n.includes('television')) return iconTv;
  if (n.includes('washing')) return iconWm;
  if (n.includes('purifier') || /\bro\b/.test(n)) return iconRo;
  if (n.includes('cctv') || n.includes('camera') || n.includes('security')) return iconCctv;
  if (n.includes('laptop') || n.includes('computer')) return iconLaptop;
  if (n.includes('dishwasher')) return iconDishwasher;
  if (n.includes('kitchen') || n.includes('mixer')) return iconKitchen;
  return iconWrench;
}

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// The three things the Buy tab sells. Each tab owns a colour, and the active
// tab runs straight into a hero band of that colour (the reference design).
const TABS = [
  {
    id: 'ew',
    label: 'Extended Warranty',
    short: 'Warranty',
    icon: ShieldCheck,
    hero: 'from-[#0B4EA2] via-[#1565C0] to-[#1E88E5]',
    solid: '#0B4EA2',
    title: 'Extend your appliance warranty',
    accent: 'text-amber-300',
  },
  {
    id: 'amc',
    label: 'AMC Plans',
    short: 'AMC',
    icon: CheckCircle2,
    hero: 'from-[#0F766E] via-[#0D9488] to-[#14B8A6]',
    solid: '#0F766E',
    title: 'Annual care, zero worry',
    accent: 'text-yellow-200',
  },
  {
    id: 'new',
    label: 'Buy New',
    short: 'Buy New',
    icon: LayoutGrid,
    hero: 'from-[#1E1B4B] via-[#312E81] to-[#4338CA]',
    solid: '#1E1B4B',
    title: 'Shop new appliances',
    accent: 'text-amber-300',
  },
];

function Tile({ title, sub, img, onClick, index }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="group bg-white rounded-2xl pt-2.5 px-1.5 flex flex-col items-center text-center shadow-[0_6px_16px_-8px_rgba(15,23,42,.35)] overflow-hidden cursor-pointer active:scale-95 transition-transform min-h-[118px]"
    >
      <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight line-clamp-2 min-h-[28px] flex items-center">{title}</span>
      {sub && <span className="text-[9.5px] font-bold text-emerald-700 mt-0.5">{sub}</span>}
      <span className="mt-auto w-full h-14 sm:h-16 flex items-end justify-center bg-linear-to-t from-slate-100 to-transparent rounded-t-xl pt-1">
        <img src={img} alt="" className="h-full max-w-[80%] object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" />
      </span>
    </motion.button>
  );
}

function OfferCard({ offer }) {
  return (
    <button
      type="button"
      onClick={offer.onClick}
      className={`snap-center shrink-0 w-[86%] sm:w-[360px] relative overflow-hidden rounded-2xl border p-4 text-left cursor-pointer ${offer.card}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{offer.eyebrow}</p>
      <p className="mt-1 text-lg font-black leading-tight text-slate-900 max-w-[64%]">
        <span className={offer.highlight}>{offer.big}</span> {offer.rest}
      </p>
      <span className={`mt-3 inline-flex items-center gap-1 rounded-xl border-2 bg-white px-3 py-1.5 text-xs font-black ${offer.cta}`}>
        {offer.button} <ChevronRight className="w-3.5 h-3.5" />
      </span>
      <img src={offer.img} alt="" className="absolute right-2 bottom-1 h-24 w-24 object-contain mix-blend-multiply" />
    </button>
  );
}

export default function BuyHome({ user, currentLocation, openLocationModal, storeCategories, dynamicBrands, ewAppliances }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabId = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'ew';
  const tab = TABS.find((t) => t.id === tabId);
  const tabIndex = TABS.indexOf(tab);
  const [q, setQ] = useState('');
  const [amcAppliances, setAmcAppliances] = useState(null);

  useEffect(() => {
    apiRequest('/warranty-amc/amc/appliances').then((rows) => setAmcAppliances(Array.isArray(rows) ? rows : [])).catch(() => setAmcAppliances([]));
  }, []);

  const pickTab = (id) => {
    setQ('');
    const next = new URLSearchParams(params);
    if (id === 'ew') next.delete('tab');
    else next.set('tab', id);
    setParams(next, { replace: true });
  };

  // Tiles of the active tab, all from live data.
  const tiles = useMemo(() => {
    if (tabId === 'ew') {
      if (ewAppliances === null) return null;
      return ewAppliances.map((a) => ({
        key: a.appliance,
        title: a.name,
        sub: Number(a.fromPrice) > 0 ? `from ${rupees(a.fromPrice)}` : null,
        img: a.imageUrl ? resolveMediaUrl(a.imageUrl) : applianceIcon(a.name),
        onClick: () => navigate(`/buy/select-appliance?category=${encodeURIComponent(a.appliance)}&view=plans`),
      }));
    }
    if (tabId === 'amc') {
      if (amcAppliances === null) return null;
      return amcAppliances.map((a) => ({
        key: a.appliance,
        title: a.name,
        sub: Number(a.fromPrice) > 0 ? `from ${rupees(a.fromPrice)}/yr` : null,
        img: a.imageUrl ? resolveMediaUrl(a.imageUrl) : applianceIcon(a.name),
        onClick: () => navigate(`/buy/amc/plans/${encodeURIComponent(a.appliance)}`),
      }));
    }
    return storeCategories.map((c) => ({
      key: c.id || c.name,
      title: c.name,
      sub: null,
      img: isImageIcon(c.icon) ? resolveMediaUrl(c.icon) : applianceIcon(c.name),
      onClick: () => navigate(`/buy-new/products/${encodeURIComponent(c.name)}`),
    }));
  }, [tabId, ewAppliances, amcAppliances, storeCategories, navigate]);

  const lowest = (rows) => (rows && rows.some((r) => Number(r.fromPrice) > 0) ? Math.min(...rows.map((r) => Number(r.fromPrice)).filter((p) => p > 0)) : null);
  const subline = {
    ew: lowest(ewAppliances) != null ? <>Plans from <b className={tab.accent}>{rupees(lowest(ewAppliances))}</b> · repairs covered after the brand warranty ends</> : 'Repairs covered after the brand warranty ends',
    amc: lowest(amcAppliances) != null ? <>Yearly service plans from <b className={tab.accent}>{rupees(lowest(amcAppliances))}</b> · scheduled visits included</> : 'Scheduled service visits all year',
    new: <>Genuine products with <b className={tab.accent}>free doorstep installation</b></>,
  }[tabId];

  const filtered = tiles ? tiles.filter((t) => t.title.toLowerCase().includes(q.trim().toLowerCase())) : null;
  const more = filtered && !q.trim() && filtered.length > 8;
  // Two full rows: seven tiles and "View all" when there are more.
  const shown = filtered ? filtered.slice(0, q.trim() ? 24 : more ? 7 : 8) : null;

  const offers = [
    { eyebrow: 'Extended warranty', big: 'Up to 3 years', rest: 'of extra cover', button: 'See plans', img: iconHome, card: 'bg-linear-to-br from-blue-50 to-indigo-100 border-blue-100', highlight: 'text-[#0B4EA2]', cta: 'border-[#0B4EA2] text-[#0B4EA2]', onClick: () => pickTab('ew') },
    { eyebrow: 'AMC care plans', big: 'Planned visits', rest: 'all year round', button: 'Explore AMC', img: iconCalendar, card: 'bg-linear-to-br from-emerald-50 to-teal-100 border-emerald-100', highlight: 'text-teal-700', cta: 'border-teal-700 text-teal-700', onClick: () => pickTab('amc') },
    { eyebrow: 'New appliances', big: 'Free installation', rest: 'at your doorstep', button: 'Shop now', img: iconCart, card: 'bg-linear-to-br from-amber-50 to-orange-100 border-amber-100', highlight: 'text-orange-600', cta: 'border-orange-600 text-orange-600', onClick: () => navigate('/buy-new') },
  ];
  const offerRef = useRef(null);
  const [offerIndex, setOfferIndex] = useState(0);
  const onOfferScroll = () => {
    const el = offerRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    if (!card) return;
    setOfferIndex(Math.round(el.scrollLeft / (card.clientWidth + 12)));
  };

  const quick = [
    { title: 'My Plans', sub: 'Warranty & AMC', img: iconCalendar, to: '/protection-plans' },
    { title: 'My Orders', sub: 'Track deliveries', img: iconCart, to: '/my-orders' },
    { title: 'My Appliances', sub: 'Bills & coverage', img: iconHome, to: '/my-appliances' },
    { title: 'Spare Parts', sub: 'Filters & more', img: iconWrench, to: '/buy/accessories' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Location & profile */}
      <div className="flex justify-between items-center -mt-1">
        <button type="button" onClick={openLocationModal} className="flex items-center gap-2 text-left cursor-pointer group" aria-label="Change location">
          <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><MapPin className="h-4 w-4 text-brand-blue" /></span>
          <span>
            <span className="text-[10px] text-text-secondary block font-semibold leading-tight">Your Location</span>
            <span className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold text-text-primary truncate max-w-44 sm:max-w-56">
                {currentLocation?.area ? `${currentLocation.area}, ${currentLocation.city}` : currentLocation?.city || 'Select Location'}
              </span>
              <ChevronDown className="h-3 w-3 text-text-secondary" />
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => navigate('/notifications')} aria-label="Notifications" className="w-9 h-9 bg-white rounded-full relative flex items-center justify-center border border-slate-200 cursor-pointer">
            <Bell className="h-4 w-4 text-text-primary" />
          </button>
          <button type="button" onClick={() => navigate('/profile')} aria-label="Profile" className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        </div>
      </div>

      {/* Tabs merged into the hero band */}
      <div className="-mx-3.5 sm:mx-0">
        <div className="grid grid-cols-3 gap-2 px-2 sm:px-0 items-end" role="tablist" aria-label="What would you like to buy">
          {TABS.map((t) => {
            const active = t.id === tabId;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pickTab(t.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-t-2xl px-1 cursor-pointer transition-all ${
                  active ? 'pt-3 pb-3 text-white' : 'pt-2.5 pb-2.5 mb-1.5 bg-white border border-slate-200 rounded-b-2xl text-slate-500 shadow-2xs'
                }`}
                style={active ? { backgroundColor: t.solid } : undefined}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-[11.5px] sm:text-sm font-bold leading-none">
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`relative overflow-hidden bg-linear-to-b ${tab.hero} sm:rounded-3xl ${tabIndex === 0 ? 'sm:rounded-tl-none' : ''} ${tabIndex === 2 ? 'sm:rounded-tr-none' : ''} px-3.5 sm:px-6 pt-5 pb-5 transition-colors duration-500`}
        >
          {/* Rays */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] pointer-events-none" aria-hidden="true">
            <div
              className="w-full h-full animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
              style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,.09) 0deg 9deg, transparent 9deg 22deg)', maskImage: 'radial-gradient(circle, black 18%, transparent 62%)', WebkitMaskImage: 'radial-gradient(circle, black 18%, transparent 62%)' }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={tabId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="relative">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{tab.title}</h2>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-white/85">{subline}</p>

              <label className="relative mt-4 block">
                <span className="sr-only">Search</span>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={tabId === 'new' ? 'Search categories, e.g. Refrigerator' : 'Search appliance, e.g. AC, Geyser'}
                  className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-sm outline-none shadow-md placeholder:text-slate-400"
                />
              </label>

              <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                {shown === null &&
                  Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[118px] bg-white/30" rounded="rounded-2xl" />)}
                {shown?.map((t, i) => <Tile key={t.key} index={i} title={t.title} sub={t.sub} img={t.img} onClick={t.onClick} />)}
                {more && (
                  <Tile
                    index={7}
                    title="View all"
                    sub={`${filtered.length} options`}
                    img={iconWrench}
                    onClick={() => (tabId === 'new' ? navigate('/buy-new') : tabId === 'amc' ? navigate('/buy/amc/select-appliance') : navigate('/buy/all-appliances'))}
                  />
                )}
              </div>
              {shown && shown.length === 0 && (
                <p className="mt-3 rounded-xl bg-white/15 text-white text-xs font-semibold px-3 py-3 text-center">
                  {q.trim() ? `Nothing matches “${q.trim()}”.` : 'Nothing to show here yet.'}{' '}
                  {tabId === 'new' && (
                    <button type="button" onClick={() => navigate('/buy-new')} className="underline font-black cursor-pointer">Browse the store</button>
                  )}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Offers */}
      <section aria-labelledby="buy-offers">
        <h3 id="buy-offers" className="text-lg font-black text-slate-900 mb-3">Offers for you</h3>
        <div ref={offerRef} onScroll={onOfferScroll} className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-1">
          {offers.map((o) => <OfferCard key={o.eyebrow} offer={o} />)}
        </div>
        <div className="flex justify-center gap-1.5 mt-2.5" aria-hidden="true">
          {offers.map((o, i) => <span key={o.eyebrow} className={`h-1.5 rounded-full transition-all ${i === offerIndex ? 'w-5 bg-slate-800' : 'w-1.5 bg-slate-300'}`} />)}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-labelledby="buy-quick">
        <div className="flex items-center gap-3 mb-3">
          <h3 id="buy-quick" className="text-lg font-black text-slate-900 shrink-0">Manage your purchases</h3>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quick.map((item, i) => (
            <motion.button
              key={item.title}
              type="button"
              onClick={() => navigate(item.to)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative bg-white border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3 text-left shadow-[0_4px_14px_-8px_rgba(15,23,42,.25)] cursor-pointer active:scale-[.98]"
            >
              <img src={item.img} alt="" className="w-11 h-11 object-contain mix-blend-multiply shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900 leading-tight">{item.title}</span>
                <span className="block text-[11px] font-semibold text-slate-500 truncate">{item.sub}</span>
              </span>
              <ChevronRight className="absolute top-2.5 right-2.5 w-3.5 h-3.5 text-slate-300" />
            </motion.button>
          ))}
        </div>
      </section>

      {/* Brands */}
      {dynamicBrands.length > 0 && (
        <section aria-labelledby="buy-brands">
          <div className="flex justify-between items-center mb-3">
            <h3 id="buy-brands" className="text-lg font-black text-slate-900">Top brands</h3>
            <button type="button" onClick={() => navigate('/buy-new')} className="text-xs font-bold text-brand-blue cursor-pointer">View all</button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-1">
            {dynamicBrands.map((brand, idx) => (
              <button
                key={brand.name || idx}
                type="button"
                onClick={() => navigate(`/buy-new?brand=${encodeURIComponent(brand.name)}`)}
                className="shrink-0 px-4 py-3 bg-white border border-slate-200 rounded-2xl cursor-pointer shadow-2xs active:scale-95 text-xs font-black tracking-wide whitespace-nowrap"
                style={{ color: brand.color || '#0D47A1' }}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trust */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
        {[
          { title: 'Secure payments', icon: ShieldCheck },
          { title: 'Expert support', icon: Phone },
          { title: 'Easy claims', icon: CheckCircle2 },
        ].map((b) => (
          <div key={b.title} className="flex flex-col items-center gap-1.5">
            <span className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center"><b.icon className="h-4.5 w-4.5 text-brand-blue" /></span>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">{b.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
