import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useServiceRequestUpdates } from '../../hooks/useServiceRequestUpdates';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Clock, Loader2, MapPin, Search, SlidersHorizontal, UserPlus, Wand2,
} from 'lucide-react';

// Super Admin → Job Assignment.
//
// New bookings are offered to nearby partners automatically; this page is for
// the ones still waiting. Each waiting booking has one "Assign" button that
// opens two choices: let the system pick the best partner, or pick one from
// the partners who can actually take it (the rest are listed with why not).
// The scoring weights live under "Advanced".

const WEIGHT_META = [
  { key: 'proximity', label: 'Distance' },
  { key: 'skill', label: 'Skill match' },
  { key: 'rating', label: 'Customer rating' },
  { key: 'workload', label: 'Current workload' },
];

const TERMINAL = ['Closed', 'Completed', 'Cancelled'];

function shapeRequest(item) {
  const partner = item.serviceProvider && typeof item.serviceProvider === 'object' ? item.serviceProvider : null;
  return {
    id: item.id,
    ref: item.humanId || item.id,
    customer: item.user?.name || 'Customer',
    category: item.category || 'Service',
    city: item.zone || '—',
    createdAt: item.createdAt ? new Date(item.createdAt) : null,
    status: item.status,
    instant: Boolean(item.isInstant),
    partnerName: partner?.name || null,
    accepted: Boolean(item.isAccepted),
  };
}

const timeAgo = (date) => {
  if (!date) return '';
  const min = Math.round((Date.now() - date.getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** The "Assign" panel for one waiting booking. */
function AssignPanel({ request, onAssigned, onToast }) {
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // 'auto' | partner id
  const [showBlocked, setShowBlocked] = useState(false);

  useEffect(() => {
    let alive = true;
    apiRequest(`/service-requests/${request.id}/assignment-check`, { auth: true })
      .then((d) => alive && setCheck(d))
      .catch((err) => alive && setError(err.message || 'Could not load partners.'));
    return () => {
      alive = false;
    };
  }, [request.id]);

  const assign = async (partner) => {
    setBusy(partner ? partner.id : 'auto');
    setError('');
    try {
      const res = await apiRequest(`/service-requests/${request.id}/assign`, { method: 'PATCH', auth: true, body: partner ? { serviceProvider: partner.id } : {} });
      onToast(`${request.ref} offered to ${res?.serviceProvider?.name || partner?.name || 'the best partner'}. They have 60 seconds to accept in the partner app.`);
      onAssigned();
    } catch (err) {
      setError(err.message || 'Could not assign.');
    } finally {
      setBusy(null);
    }
  };

  if (!check && !error) return <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={18} /></div>;

  const able = (check?.partners || []).filter((p) => p.canAssign).sort((a, b) => Number(b.availability === 'Available') - Number(a.availability === 'Available'));
  const blocked = (check?.partners || []).filter((p) => !p.canAssign);
  const deadline = check?.searchDeadline ? new Date(check.searchDeadline) : null;
  const minutesLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 60000) : null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
      {deadline && (
        <p className={`text-xs font-bold flex items-center gap-1.5 ${minutesLeft <= 10 ? 'text-rose-700' : 'text-slate-600'}`}>
          <Clock size={13} />
          {minutesLeft > 0 ? `Assign within ${minutesLeft} min, or the booking is cancelled automatically.` : 'The 30-minute search has ended; this booking will be cancelled.'}
        </p>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>}

      {able.length > 0 ? (
        <>
          {able.some((p) => p.availability === 'Available') ? (
            <button
              type="button"
              onClick={() => assign(null)}
              disabled={Boolean(busy)}
              className="w-full py-2.5 rounded-xl bg-[#0D47A1] hover:bg-blue-800 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {busy === 'auto' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Assign the best partner automatically
            </button>
          ) : (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              No suitable partner is online right now. You can still assign one below; they will see the job when they go online.
            </p>
          )}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 mb-1.5">Or choose a partner ({able.length} can take it)</p>
            <ul className="space-y-1.5" aria-label={`Partners who can take ${request.ref}`}>
              {able.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800 truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.availability === 'Available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {p.availability === 'Available' ? 'Online' : `${p.availability}: won't see it until they go online`} · {p.city}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => assign(p)}
                    disabled={Boolean(busy)}
                    aria-label={`Assign ${p.name} to ${request.ref}`}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-[#0D47A1] text-[#0D47A1] text-xs font-bold hover:bg-blue-50 cursor-pointer disabled:opacity-60"
                  >
                    {busy === p.id ? 'Assigning…' : 'Assign'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : check && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-black text-amber-900 flex items-center gap-1.5"><AlertTriangle size={15} /> No partner can take this booking</p>
          <p className="text-xs text-amber-900 mt-1">
            It needs an <b>Active</b> partner approved for <b>{check.category}</b> who serves <b>{check.city || 'the customer’s city'}</b>. Add or approve one under Service Partners.
          </p>
        </div>
      )}

      {blocked.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowBlocked((v) => !v)} aria-expanded={showBlocked || able.length === 0} className="text-[11px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer">
            Why other partners can’t take it ({blocked.length}) <ChevronDown size={13} className={showBlocked || able.length === 0 ? 'rotate-180' : ''} />
          </button>
          {(showBlocked || able.length === 0) && (
            <ul className="mt-1.5 space-y-1" aria-label="Partners who can't take this booking">
              {blocked.map((p) => (
                <li key={p.id} className="text-[11px] text-slate-600">
                  <b className="text-slate-800">{p.name}</b> ({p.city || 'no city'}): <span className="text-rose-700">{p.reasons.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, open, onToggle, onAssigned, onToast }) {
  const waitingAccept = request.partnerName && !request.accepted;
  return (
    <li className={`bg-white rounded-2xl border p-4 ${open ? 'border-[#0D47A1] shadow-sm' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black text-slate-900 flex items-center gap-2 flex-wrap">
            {request.ref}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{request.category}</span>
            {request.instant && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">ASAP</span>}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{request.customer}</span>
            <span className="flex items-center gap-0.5"><MapPin size={11} /> {request.city}</span>
            <span className="flex items-center gap-0.5"><Clock size={11} /> {timeAgo(request.createdAt)}</span>
          </p>
          {waitingAccept && (
            <p className="text-xs font-semibold text-blue-700 mt-1">Offered to {request.partnerName}, waiting for them to accept</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer ${open ? 'bg-slate-100 text-slate-700' : 'bg-[#0D47A1] text-white hover:bg-blue-800'}`}
        >
          <UserPlus size={15} /> {open ? 'Close' : waitingAccept ? 'Reassign' : 'Assign'}
        </button>
      </div>
      {open && <AssignPanel request={request} onAssigned={onAssigned} onToast={onToast} />}
    </li>
  );
}

const Assignment = () => {
  const location = useLocation();
  const { user } = useAuth();
  // Scoring weights are platform-wide and super-admin only; an ASM assigns within their zone.
  const isAsm = user?.role === 'asm';

  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState('waiting');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [weights, setWeights] = useState({ proximity: 40, skill: 30, rating: 20, workload: 10 });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest('/service-requests?limit=200&sort=-createdAt', { auth: true });
      const items = Array.isArray(res) ? res : [];
      setRequests(
        items
          .filter((item) => !TERMINAL.includes(item.status) && !['Completed', 'Cancelled'].includes(item.booking?.status) && !['completed', 'cancelled'].includes(item.job?.activeStep))
          .map(shapeRequest),
      );
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load bookings.');
      setRequests((r) => r || []);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (!isAsm) {
      apiRequest('/super-admin/assignment-weighting', { auth: true })
        .then((w) => w && setWeights({ proximity: w.proximityPercent ?? 40, skill: w.skillPercent ?? 30, rating: w.ratingPercent ?? 20, workload: w.workloadPercent ?? 10 }))
        .catch(() => {});
    }
  }, [loadData, isAsm]);
  useServiceRequestUpdates(loadData);

  // ?req=<id or ref> opens that booking's Assign panel (links from other pages).
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get('req');
    if (!wanted || !requests) return;
    const match = requests.find((r) => r.id === wanted || r.ref === wanted);
    if (match) setOpenId(match.id);
  }, [location.search, requests]);

  const waiting = useMemo(() => (requests || []).filter((r) => !r.accepted && ['New', 'Assigned', 'Pending'].includes(r.status)), [requests]);
  const assigned = useMemo(() => (requests || []).filter((r) => !waiting.includes(r)), [requests, waiting]);
  const list = (tab === 'waiting' ? waiting : assigned).filter((r) =>
    [r.ref, r.customer, r.category, r.city, r.partnerName || ''].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const saveWeights = async () => {
    try {
      await apiRequest('/super-admin/assignment-weighting', {
        method: 'PUT',
        auth: true,
        body: { proximityPercent: weights.proximity, skillPercent: weights.skill, ratingPercent: weights.rating, workloadPercent: weights.workload },
      });
      showToast('Matching rules saved.');
    } catch (err) {
      showToast(err.message || 'Could not save.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Job Assignment" />
        <div className="p-6 space-y-5 max-w-5xl w-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-black text-slate-900">Assign partners to bookings</h2>
            <p className="text-sm text-slate-600 mt-1">
              New bookings are offered to the nearest suitable partner automatically. Bookings below are still waiting. Click <b>Assign</b>, then either let the system pick the best partner or choose one yourself. A partner must accept within 60 seconds in the partner app; a booking nobody takes is cancelled after 30 minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1" role="tablist" aria-label="Bookings">
              {[
                ['waiting', `Waiting for a partner (${waiting.length})`],
                ['assigned', `Partner confirmed (${assigned.length})`],
              ].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${tab === id ? 'bg-white text-[#0D47A1] shadow-xs' : 'text-slate-500'}`}>
                  {label}
                </button>
              ))}
            </div>
            <label className="relative flex-1 min-w-56">
              <span className="sr-only">Search bookings</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking, customer, service, city or partner" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#0D47A1]" />
            </label>
          </div>

          {requests === null ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-bold text-slate-700">{tab === 'waiting' ? 'No booking is waiting for a partner.' : 'No bookings here.'}</p>
            </div>
          ) : tab === 'waiting' ? (
            <ul className="space-y-3" aria-label="Bookings waiting for a partner">
              {list.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  open={openId === r.id}
                  onToggle={() => setOpenId((id) => (id === r.id ? null : r.id))}
                  onAssigned={() => {
                    setOpenId(null);
                    loadData();
                  }}
                  onToast={showToast}
                />
              ))}
            </ul>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 text-left">
                  <tr><th className="p-3">Booking</th><th className="p-3">Service</th><th className="p-3">Customer</th><th className="p-3">City</th><th className="p-3">Partner</th><th className="p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="p-3 font-bold">{r.ref}</td>
                      <td className="p-3">{r.category}</td>
                      <td className="p-3">{r.customer}</td>
                      <td className="p-3">{r.city}</td>
                      <td className="p-3 font-semibold">{r.partnerName || '—'}</td>
                      <td className="p-3"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isAsm && (
            <div className="bg-white rounded-2xl border border-slate-200">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced} className="w-full flex items-center justify-between p-4 text-sm font-bold text-slate-700 cursor-pointer">
                <span className="flex items-center gap-2"><SlidersHorizontal size={16} /> Advanced: how the best partner is chosen</span>
                <ChevronDown size={16} className={showAdvanced ? 'rotate-180' : ''} />
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-slate-500">Only partners who are approved for the service and serve the customer’s city are considered. Among them, these weights decide who is “best”.</p>
                  {WEIGHT_META.map(({ key, label }) => (
                    <label key={key} className="block">
                      <span className="flex justify-between text-xs font-semibold text-slate-700 mb-1"><span>{label}</span><span>{weights[key]}%</span></span>
                      <input type="range" min="0" max="100" value={weights[key]} onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))} className="w-full accent-[#0D47A1]" aria-label={label} />
                    </label>
                  ))}
                  <button type="button" onClick={saveWeights} className="px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold cursor-pointer">Save</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(loadError || toast) && (
        <div role="status" className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 max-w-[90vw] ${loadError ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {loadError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {loadError || toast}
        </div>
      )}
    </div>
  );
};

export default Assignment;
