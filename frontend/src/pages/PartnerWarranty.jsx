import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { WarrantyHeader, BrandLogo, ErrorNote } from '../components/partner-warranty/ui';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { warrantyApi } from '../lib/partnerWarrantyApi';
import { resolveMediaUrl } from '../lib/apiClient';
import handshakeIcon from '../assets/HANDSHAKE.png';

// Pictures for the seeded groups until an admin uploads one (Super Admin →
// Partner Warranty → Catalogue). The groups themselves come from the API.
import fridgeImg from '../assets/appliance_fridge.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import laptopPeripheralImg from '../assets/categories/laptop_peripheral.png';
import kitchenApplianceImg from '../assets/categories/kitchen_appliance.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import securitySystemImg from '../assets/categories/security_system.png';

const FALLBACK_IMAGES = {
  electrocare: fridgeImg,
  bathcare: plumberImg,
  'it-cpcare': laptopPeripheralImg,
  kitchencare: kitchenApplianceImg,
  aircare: splitAcImg,
  watercare: waterPurifierImg,
  securecare: securitySystemImg,
};

function BrandSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  // Results are kept with the term they answer, so a stale reply for an
  // earlier term is never shown for the current one.
  const [found, setFound] = useState({ term: '', list: [] });
  const term = q.trim();
  const results = term.length >= 2 && found.term === term ? found.list : null;

  useEffect(() => {
    if (term.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      warrantyApi
        .brands({ q: term })
        .then((list) => !cancelled && setFound({ term, list }))
        .catch(() => !cancelled && setFound({ term, list: [] }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="pw-brand-search" className="sr-only">
        Search brands
      </label>
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          id="pw-brand-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands (e.g. LG, Voltas)"
          autoComplete="off"
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
        />
      </div>
      {results && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" aria-live="polite">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No partner brand matches “{term}”.</p>
          ) : (
            results.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => navigate(`/partner-warranty/products/all/${brand.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50"
              >
                <BrandLogo brand={brand} size="h-8 w-8" />
                <span className="flex-1 text-sm font-bold text-brand-navy">{brand.name}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const PartnerWarranty = () => {
  const navigate = useNavigate();
  const groups = useApiData(() => warrantyApi.groups(), [], { initial: [] });

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-16 lg:pb-8">
      <WarrantyHeader title="Partner Warranty" back="/dashboard" />

      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-blue-50 rounded-2xl p-5 border border-border-color shadow-sm flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-brand-navy rounded-full flex items-center justify-center shrink-0 shadow-md">
            <img src={handshakeIcon} alt="" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex flex-col flex-1">
            <h2 className="text-sm font-black text-brand-navy leading-tight mb-1">Authorized Brand Support</h2>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Raise a warranty request for your NCC Partner Brand products. The brand verifies it and an NCC technician fixes it.
            </p>
          </div>
        </motion.div>

        <BrandSearch />

        <Link
          to="/partner-warranty/claims"
          className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:bg-slate-50"
        >
          <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-brand-blue" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-black text-brand-navy">My Warranty Claims</span>
            <span className="block text-[11px] text-text-secondary">Track tickets and respond to brands</span>
          </span>
          <ChevronRight className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </Link>

        <section className="flex flex-col gap-4" aria-labelledby="pw-groups">
          <h2 id="pw-groups" className="text-sm font-black text-text-primary uppercase tracking-wider pl-1">
            Choose a Category
          </h2>
          <ErrorNote message={groups.error ? 'Could not load warranty categories.' : ''} onRetry={groups.reload} />
          {groups.loading ? (
            <SkeletonList rows={4} />
          ) : (
            <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 xl:grid-cols-3">
              {groups.data.map((group, i) => {
                const empty = group.brandCount === 0;
                const image = group.imageUrl ? resolveMediaUrl(group.imageUrl) : FALLBACK_IMAGES[group.slug];
                return (
                  <motion.button
                    key={group.id}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }}
                    disabled={empty}
                    onClick={() => navigate(`/partner-warranty/brands/${group.slug}`)}
                    className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {image ? <img src={image} alt="" className="w-16 h-16 object-contain mix-blend-multiply" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-brand-navy leading-tight mb-1">{group.name}</h3>
                      <p className="text-[11px] text-text-secondary font-medium leading-tight">{group.tagline}</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        {empty ? 'No partner brands yet' : `${group.brandCount} partner brand${group.brandCount === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <CustomerBottomNav />
    </div>
  );
};

export default PartnerWarranty;
