import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { WarrantyHeader, BrandLogo, ErrorNote } from '../components/partner-warranty/ui';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { warrantyApi } from '../lib/partnerWarrantyApi';
import handshakeIcon from '../assets/HANDSHAKE.png';

const PartnerWarranty = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const brands = useApiData(() => warrantyApi.brands(), [], { initial: [] });
  const shown = useMemo(() => brands.data.filter(brand => brand.name.toLowerCase().includes(q.trim().toLowerCase())), [brands.data, q]);

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

        <div className="relative">
          <label htmlFor="pw-brand-search" className="sr-only">Search brands</label>
          <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input id="pw-brand-search" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search brands (e.g. LG, Voltas)" autoComplete="off" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20" />
        </div>

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

        <section className="flex flex-col gap-4" aria-labelledby="pw-brands">
          <div><h2 id="pw-brands" className="text-sm font-black text-text-primary uppercase tracking-wider">Choose your brand</h2><p className="mt-1 text-xs text-text-secondary">Select your product’s brand to start a warranty request.</p></div>
          <ErrorNote message={brands.error ? 'Could not load partner brands.' : ''} onRetry={brands.reload} />
          {brands.loading ? <SkeletonList rows={4} /> : brands.error ? null : shown.length === 0 ? <p className="bg-white border border-slate-200 rounded-2xl px-5 py-6 text-sm text-slate-500 text-center" role="status">{q.trim() ? `No partner brand matches “${q.trim()}”.` : 'No partner brands are available for warranty service yet.'}</p> : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map(brand => <button key={brand.id} type="button" onClick={() => navigate(`/partner-warranty/products/${brand.id}`)} className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-4 text-left cursor-pointer transition hover:border-brand-blue hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-brand-blue">
                <BrandLogo brand={brand} size="h-14 w-14" />
                <span className="flex-1 min-w-0"><span className="block text-sm font-black text-brand-navy">{brand.name}</span><span className="mt-1 block text-[11px] text-text-secondary">Warranty support</span></span>
                <ChevronRight className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
              </button>)}
            </div>
          )}
        </section>
      </div>

      <CustomerBottomNav />
    </div>
  );
};

export default PartnerWarranty;
