import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Plus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomerBottomNav from '../components/CustomerBottomNav';
import { WarrantyHeader, BrandLogo, StatusPill, ErrorNote } from '../components/partner-warranty/ui';
import { formatDateTime } from '../lib/partnerWarrantyFormat';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { useWarrantyClaimLive } from '../hooks/useWarrantyClaimLive';
import { warrantyApi } from '../lib/partnerWarrantyApi';

// The customer's own warranty claims (docs/partner-warranty Phase 12), live:
// a status change pushed by the server refreshes the list.
const TABS = [
  { key: 'open', label: 'Active' },
  { key: 'closed', label: 'Past' },
];

const MyWarrantyClaims = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('open');
  const list = useApiData(() => warrantyApi.myClaims(tab), [tab], { initial: { data: [] }, enabled: Boolean(user) });
  useWarrantyClaimLive(() => list.reload());
  const claims = list.data?.data || [];

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-20 lg:pb-8">
      <WarrantyHeader title="My Warranty Claims" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {!user ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 flex flex-col gap-3">
            Log in to see your warranty claims.
            <Link to="/login" className="text-center py-3 bg-brand-navy text-white font-bold rounded-2xl">
              Log in
            </Link>
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Claims" className="grid grid-cols-2 bg-white border border-slate-200 rounded-2xl p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`py-2.5 rounded-xl text-sm font-bold cursor-pointer ${tab === t.key ? 'bg-brand-navy text-white' : 'text-slate-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <ErrorNote message={list.error ? 'Could not load your claims.' : ''} onRetry={list.reload} />
            {list.loading ? (
              <SkeletonList rows={3} />
            ) : claims.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-8 flex flex-col items-center gap-3 text-center">
                <ShieldCheck className="h-8 w-8 text-slate-300" aria-hidden="true" />
                <p className="text-sm text-slate-500">{tab === 'open' ? 'No active warranty claims.' : 'No past claims yet.'}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {claims.map((c) => (
                  <li key={c.id}>
                    <Link to={`/partner-warranty/claims/${c.id}`} className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-2xl px-4 py-4">
                      <BrandLogo brand={c.brand} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-black text-brand-navy truncate">
                          {c.productName} · {c.issueName}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {c.humanId} · {formatDateTime(c.createdAt)}
                        </span>
                        <span className="block mt-1.5">
                          <StatusPill status={c.status} label={c.statusLabel} />
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <Link to="/partner-warranty" className="flex items-center justify-center gap-2 py-3.5 bg-white border border-brand-navy text-brand-navy font-bold rounded-2xl">
              <Plus className="h-4 w-4" aria-hidden="true" /> Raise a new claim
            </Link>
          </>
        )}
      </div>
      <CustomerBottomNav />
    </div>
  );
};

export default MyWarrantyClaims;
