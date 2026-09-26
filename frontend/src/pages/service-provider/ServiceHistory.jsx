import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, X, RefreshCw, AlertCircle, ChevronRight, Star, MapPin, Phone,
  Wrench, Wind, Droplets, Flame, Tv, Refrigerator, WashingMachine, Receipt, ClipboardList,
  Package, History as HistoryIcon, Wallet,
} from 'lucide-react';
import ServiceProviderBottomNav from '../../components/ServiceProviderBottomNav';
import { apiRequest } from '../../lib/apiClient';
import { useTech } from '../../context/ServiceProviderContext';
import { useServiceProviderSummary } from '../../hooks/useServiceProviderSummary';
import { Skeleton } from '../../components/common/Skeleton';

const PAGE_SIZE = 20;

// Each chip maps onto the history endpoint's `status` / `type` query params.
const FILTERS = [
  { id: 'all', label: 'All', status: 'all', type: 'all' },
  { id: 'completed', label: 'Completed', status: 'completed', type: 'all' },
  { id: 'in_progress', label: 'In progress', status: 'in_progress', type: 'all' },
  { id: 'paid', label: 'Paid', status: 'all', type: 'paid' },
  { id: 'warranty', label: 'Warranty', status: 'all', type: 'warranty' },
  { id: 'amc', label: 'AMC', status: 'all', type: 'amc' },
];

const TYPE_LABEL = {
  'NCC Paid Service': 'Paid',
  'Brand Warranty': 'Warranty',
  'NCC Extended Warranty': 'Ext. Warranty',
  'AMC Visit': 'AMC',
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function formatAddress(addr) {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.house, addr.area, addr.landmark, addr.city, addr.pincode].filter(Boolean).join(', ');
}

function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
}

/** Everything the list and the detail sheet need, read from the real job shape. */
function describeJob(job) {
  const sr = job.serviceRequest || {};
  const booking = sr.booking || {};
  const category = sr.category || booking.category || '';
  const step = job.activeStep;
  const repairStatus = job.revisit?.repairStatus;

  let status = { label: 'In progress', tone: 'bg-amber-50 text-amber-700 ring-amber-200' };
  if (step === 'completed') status = { label: 'Completed', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  else if (step === 'cancelled' || repairStatus === 'cancelled') status = { label: 'Cancelled', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  else if (repairStatus === 'unable') status = { label: 'Unable to fix', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
  else if (step?.startsWith('revisit') || step === 'spareapproval' || step === 'spare_part_required') {
    status = { label: 'Revisit pending', tone: 'bg-blue-50 text-[#0D47A1] ring-blue-200' };
  }

  const isCompleted = step === 'completed';
  const earned = job.billingEstimate?.serviceProviderEarnings;

  return {
    id: job.id || job._id,
    ticket: sr.humanId || job.humanId || '',
    title: booking.service?.name || (category ? `${category} Service` : 'Service job'),
    category,
    brand: sr.brand?.name || booking.brand || '',
    model: sr.model || '',
    serialNo: sr.serialNo || '',
    complaint: sr.description || '',
    customer: booking.fullName || sr.user?.name || 'Customer',
    phone: booking.mobile || sr.user?.phone || '',
    address: formatAddress(booking.address) || sr.zone || '',
    type: job.type,
    typeLabel: TYPE_LABEL[job.type] || job.type,
    isCompleted,
    status,
    date: isCompleted ? job.updatedAt : booking.scheduledDate || job.createdAt,
    amount: isCompleted && earned > 0 ? earned : job.estEarnings || 0,
    amountLabel: isCompleted && earned > 0 ? 'Earned' : 'Est. earning',
  };
}

function CategoryIcon({ category, className = 'h-5 w-5' }) {
  const text = (category || '').toLowerCase();
  if (/\bac\b|air ?condition|cooler/.test(text)) return <Wind className={className} />;
  if (/fridge|refrigerator/.test(text)) return <Refrigerator className={className} />;
  if (/washing/.test(text)) return <WashingMachine className={className} />;
  if (/\bro\b|purifier|water/.test(text)) return <Droplets className={className} />;
  if (/geyser|heater|chimney|gas/.test(text)) return <Flame className={className} />;
  if (/\btv\b|led|television/.test(text)) return <Tv className={className} />;
  return <Wrench className={className} />;
}

const ServiceHistory = () => {
  const navigate = useNavigate();
  const { selectJobForDetails } = useTech();
  const { summary, loading: summaryLoading, refresh: refreshSummary } = useServiceProviderSummary();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [selected, setSelected] = useState(null);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(async (pageNum) => {
    const filter = FILTERS.find((f) => f.id === filterId) || FILTERS[0];
    const params = new URLSearchParams({
      status: filter.status,
      type: filter.type,
      search,
      page: String(pageNum),
      limit: String(PAGE_SIZE),
    });
    return apiRequest(`/service-provider/jobs/history?${params}`, { auth: true });
  }, [filterId, search]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPage(1);
      setItems(res?.items || []);
      setTotal(res?.total || 0);
      setPage(1);
    } catch (err) {
      setError(err.message || 'Could not load your service history.');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...(res?.items || [])]);
      setTotal(res?.total || 0);
      setPage((p) => p + 1);
    } catch (err) {
      setError(err.message || 'Could not load more records.');
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshAll = () => {
    loadFirstPage();
    refreshSummary();
  };

  // Group by month so a long history is scannable.
  const groups = useMemo(() => {
    const map = new Map();
    for (const job of items) {
      const info = describeJob(job);
      const key = formatDate(info.date, { month: 'long', year: 'numeric' }) || 'Undated';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ job, info });
    }
    return [...map.entries()];
  }, [items]);

  const selectedInfo = selected ? describeJob(selected) : null;
  const hasFilters = Boolean(search) || filterId !== 'all';

  const openJob = (job) => {
    setSelected(null);
    selectJobForDetails(job.id || job._id);
    navigate('/service-provider/active-job');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] flex flex-col pb-28 lg:pb-10 font-sans">

      {/* Header */}
      <header className="sticky top-0 lg:static z-20 bg-white/95 backdrop-blur border-b border-slate-200/70">
        <div className="max-w-screen-lg mx-auto w-full px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-bold text-[#052355] truncate">Service History</h1>
          </div>
          <button
            onClick={refreshAll}
            aria-label="Refresh"
            className="p-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto w-full px-2.5 sm:px-4 lg:px-6 pt-2.5 sm:pt-4 flex flex-col gap-3.5 sm:gap-4">

        {/* Summary */}
        <section className="rounded-3xl bg-linear-to-br from-[#052355] to-[#0D47A1] text-white p-3.5 sm:p-5 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-blue-200 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Lifetime earnings
              </p>
              <p className="text-3xl font-bold mt-1 tabular-nums">
                {summaryLoading && !summary ? '—' : inr(summary?.lifetimeEarnings)}
              </p>
              <p className="text-xs text-blue-200 mt-1">From completed jobs</p>
            </div>
            {summary?.completionRate != null && (
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{summary.completionRate}%</p>
                <p className="text-[11px] text-blue-200">Completion rate</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 mt-5 rounded-2xl bg-white/10 divide-x divide-white/10">
            <SummaryStat label="Completed" value={summary?.completedJobs} loading={summaryLoading && !summary} />
            <SummaryStat label="In progress" value={summary?.inProgressJobs} loading={summaryLoading && !summary} />
            <div className="px-2 py-3 text-center">
              <p className="text-lg font-bold flex items-center justify-center gap-1 tabular-nums">
                {summaryLoading && !summary ? '—' : summary?.rating != null ? (
                  <>
                    {summary.rating.toFixed(1)}
                    <Star className="h-3.5 w-3.5 fill-[#FFD400] text-[#FFD400]" />
                  </>
                ) : '—'}
              </p>
              <p className="text-[11px] text-blue-200 leading-tight">
                {summary?.reviewCount ? `${summary.reviewCount} review${summary.reviewCount === 1 ? '' : 's'}` : 'No ratings yet'}
              </p>
            </div>
          </div>
        </section>

        {/* Search + filters */}
        <section className="flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Search service history</span>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search ticket, customer, brand…"
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-2.5 px-2.5 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterId(f.id)}
                className={`h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterId === f.id
                    ? 'bg-[#052355] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Records */}
        {loading ? (
          <div className="flex flex-col gap-2.5" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-21 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error && items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-rose-100 p-8 flex flex-col items-center text-center gap-3">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              onClick={loadFirstPage}
              className="h-10 px-5 rounded-xl bg-[#052355] text-white text-sm font-semibold cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-100 px-6 py-12 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
              {hasFilters ? <Search className="h-6 w-6" /> : <HistoryIcon className="h-6 w-6" />}
            </div>
            <div>
              <p className="text-base font-bold text-[#052355]">
                {hasFilters ? 'No matching jobs' : 'No jobs yet'}
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                {hasFilters
                  ? 'Try a different search or filter.'
                  : 'Jobs you accept will show up here, along with what you earned from each.'}
              </p>
            </div>
            {hasFilters ? (
              <button
                onClick={() => { setSearchInput(''); setFilterId('all'); }}
                className="h-10 px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/service-provider/dashboard')}
                className="h-10 px-5 rounded-xl bg-[#052355] text-white text-sm font-semibold cursor-pointer"
              >
                Find jobs
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-slate-500 -mb-2">
              Showing {items.length} of {total} job{total === 1 ? '' : 's'}
            </p>
            {groups.map(([month, rows]) => (
              <section key={month} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">{month}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                  {rows.map(({ job, info }) => (
                    <button
                      key={info.id}
                      onClick={() => setSelected(job)}
                      className="w-full text-left rounded-2xl bg-white border border-slate-200/70 p-3.5 flex items-center gap-3 hover:border-[#0D47A1]/40 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center shrink-0">
                        <CategoryIcon category={info.category} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#052355] break-words line-clamp-2">{info.title}</p>
                        </div>
                        <p className="text-xs text-slate-500 break-words mt-0.5 line-clamp-1">
                          {[info.customer, formatDate(info.date, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${info.status.tone}`}>
                            {info.status.label}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {info.typeLabel}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#052355] tabular-nums">{inr(info.amount)}</p>
                        <p className="text-[11px] text-slate-400">{info.amountLabel}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            ))}

            {items.length < total && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="h-11 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-[#052355] hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* Job detail sheet */}
      {selected && selectedInfo && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Job details"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl"
          >
            <div className="p-5 pb-4 border-b border-slate-100 flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center shrink-0">
                <CategoryIcon category={selectedInfo.category} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">
                  {[selectedInfo.ticket, selectedInfo.typeLabel].filter(Boolean).join(' · ')}
                </p>
                <h3 className="text-base font-bold text-[#052355] leading-snug">{selectedInfo.title}</h3>
                <span className={`inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${selectedInfo.status.tone}`}>
                  {selectedInfo.status.label}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-sm">
              <DetailSection title="Customer">
                <p className="font-semibold text-slate-800">{selectedInfo.customer}</p>
                {selectedInfo.address && (
                  <p className="text-slate-500 flex items-start gap-1.5 mt-1">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{selectedInfo.address}</span>
                  </p>
                )}
                {/* Only while the job is live — no reason to keep dialling a closed job's customer. */}
                {!selectedInfo.isCompleted && selectedInfo.phone && (
                  <a
                    href={`tel:${selectedInfo.phone}`}
                    className="inline-flex items-center gap-1.5 mt-2 h-9 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold"
                  >
                    <Phone className="h-4 w-4" /> Call customer
                  </a>
                )}
              </DetailSection>

              <DetailSection title="Appliance">
                <DetailRow label="Category" value={selectedInfo.category} />
                <DetailRow label="Brand" value={selectedInfo.brand} />
                <DetailRow label="Model" value={selectedInfo.model} />
                <DetailRow label="Serial no." value={selectedInfo.serialNo} />
                <DetailRow label={selectedInfo.isCompleted ? 'Completed on' : 'Scheduled'} value={formatDate(selectedInfo.date)} />
              </DetailSection>

              {selectedInfo.complaint && (
                <DetailSection title="Reported problem">
                  <p className="text-slate-700 leading-relaxed">{selectedInfo.complaint}</p>
                </DetailSection>
              )}

              {selected.diagnosis?.notes && (
                <DetailSection title="Work done">
                  <p className="text-slate-700 leading-relaxed">{selected.diagnosis.notes}</p>
                </DetailSection>
              )}

              {selected.spareParts?.length > 0 && (
                <DetailSection title="Spare parts" icon={<Package className="h-3.5 w-3.5" />}>
                  {selected.spareParts.map((part, idx) => (
                    <DetailRow key={idx} label={part.name || `Part ${idx + 1}`} value={inr(part.price)} />
                  ))}
                </DetailSection>
              )}

              <DetailSection title="Billing">
                {selected.billingEstimate?.total > 0 ? (
                  <>
                    <DetailRow label="Service charge" value={inr(selected.billingEstimate.serviceCharge)} />
                    {selected.billingEstimate.sparePartsTotal > 0 && (
                      <DetailRow label="Spare parts" value={inr(selected.billingEstimate.sparePartsTotal)} />
                    )}
                    {selected.billingEstimate.additionalServicesTotal > 0 && (
                      <DetailRow label="Additional services" value={inr(selected.billingEstimate.additionalServicesTotal)} />
                    )}
                    <DetailRow label="Bill total" value={inr(selected.billingEstimate.total)} />
                  </>
                ) : (
                  <p className="text-slate-500">
                    {selectedInfo.isCompleted ? 'No customer bill — covered job.' : 'Bill not generated yet.'}
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{selectedInfo.isCompleted ? 'Your earning' : 'Estimated earning'}</span>
                  <span className="text-base font-bold text-emerald-700 tabular-nums">{inr(selectedInfo.amount)}</span>
                </div>
              </DetailSection>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {selectedInfo.isCompleted ? (
                <button
                  onClick={() => { setSelected(null); navigate(`/service-provider/earning-detail/${selectedInfo.id}`); }}
                  className="flex-1 h-11 rounded-xl bg-[#052355] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="h-4 w-4" /> View earning slip
                </button>
              ) : (
                <button
                  onClick={() => openJob(selected)}
                  className="flex-1 h-11 rounded-xl bg-[#052355] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ClipboardList className="h-4 w-4" /> Open job
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="h-11 px-5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ServiceProviderBottomNav activeTab="history" />
    </div>
  );
};

function SummaryStat({ label, value, loading }) {
  return (
    <div className="px-2 py-3 text-center">
      <p className="text-lg font-bold tabular-nums">{loading ? <Skeleton inline className="h-5 w-8 bg-white/25" /> : (value ?? 0)}</p>
      <p className="text-[11px] text-blue-200 leading-tight">{label}</p>
    </div>
  );
}

function DetailSection({ title, icon, children }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5">
        {icon}{title}
      </h4>
      <div className="rounded-2xl bg-slate-50 p-3.5">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800 text-right">{value}</span>
    </div>
  );
}

export default ServiceHistory;
