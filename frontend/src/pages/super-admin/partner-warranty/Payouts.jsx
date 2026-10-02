import { useState } from 'react';
import { Loader2, IndianRupee } from 'lucide-react';
import AdminShell, { Panel } from '../../../components/super-admin/partner-warranty/AdminShell';
import { useApiData } from '../../../hooks/useApiData';
import { adminWarrantyApi } from '../../../lib/adminWarrantyApi';
import { formatDateTime } from '../../../lib/partnerWarrantyFormat';

// Super Admin → Partner Warranty → B2B2C Payouts (docs/partner-warranty
// Phases 11 and 14, client #20): partner-warranty job earnings are settled by
// hand. Pick a partner, tick the jobs you paid, record the transfer reference.

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function PartnerJobs({ partner, onSettled }) {
  const jobs = useApiData(() => adminWarrantyApi.partnerJobs(partner.serviceProvider.id, 'unsettled'), [partner.serviceProvider.id], { initial: [] });
  const [picked, setPicked] = useState(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = picked ?? new Set(jobs.data.map((j) => j.id));
  const total = jobs.data.filter((j) => selected.has(j.id)).reduce((s, j) => s + j.amount, 0);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const settle = async (e) => {
    e.preventDefault();
    if (!selected.size) return setError('Tick at least one job.');
    setBusy(true);
    setError('');
    try {
      const res = await adminWarrantyApi.settle({ serviceProviderId: partner.serviceProvider.id, jobIds: [...selected], reference: reference.trim(), note: note.trim() || undefined });
      onSettled(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Panel title={`Unsettled jobs — ${partner.serviceProvider.name}`}>
      <table className="w-full text-xs mb-4">
        <thead className="text-[10px] uppercase text-[#64748B]">
          <tr>
            <th className="py-1.5 w-8" />
            <th className="text-left">Job</th>
            <th className="text-left">Claim</th>
            <th className="text-left">Brand</th>
            <th className="text-left">Product</th>
            <th className="text-left">Completed</th>
            <th className="text-right">Payout</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {jobs.data.map((j) => (
            <tr key={j.id}>
              <td className="py-2">
                <input type="checkbox" aria-label={`Include ${j.jobId}`} checked={selected.has(j.id)} onChange={() => toggle(j.id)} className="accent-[#0D47A1]" />
              </td>
              <td className="font-mono">{j.jobId}</td>
              <td>{j.claimId}</td>
              <td>{j.brand}</td>
              <td>{j.product}</td>
              <td className="text-[#64748B]">{formatDateTime(j.completedAt)}</td>
              <td className="text-right font-bold">{rupees(j.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={settle} className="flex gap-3 items-end flex-wrap bg-[#F8FAFC] rounded-xl p-3">
        <p className="text-sm font-black text-[#1E293B] mr-auto">
          {selected.size} job{selected.size === 1 ? '' : 's'} · {rupees(total)}
        </p>
        <label className="text-xs font-semibold">
          Transfer reference (UTR / UPI ref) <span className="text-red-500" aria-hidden="true">*</span>
          <input required minLength={3} maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 block w-56 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs user-invalid:border-red-400" />
        </label>
        <label className="text-xs font-semibold">
          Note
          <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-56 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs" />
        </label>
        {/* Not before the job list has loaded: nothing is selected until then. */}
        <button type="submit" disabled={busy || jobs.loading} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <IndianRupee size={13} />} Record settlement
        </button>
        {error && (
          <p role="alert" className="w-full text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
      </form>
    </Panel>
  );
}

export default function B2b2cPayouts() {
  const [brand, setBrand] = useState('');
  const brands = useApiData(() => adminWarrantyApi.brands(), [], { initial: [] });
  const owed = useApiData(() => adminWarrantyApi.owed({ brand }), [brand], { initial: [] });
  const [active, setActive] = useState(null);
  const [done, setDone] = useState(null);
  const total = owed.data.reduce((s, r) => s + r.amount, 0);

  return (
    <AdminShell title="B2B2C Payouts" subtitle="Partner-warranty job earnings — settled manually by NCC">
      {done && (
        <p role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm font-semibold">
          Settled {rupees(done.amount)} for {done.jobs} job(s), reference {done.reference}. The partner has been notified.
        </p>
      )}
      <Panel
        title={`Owed to partners · ${rupees(total)}`}
        right={
          <label className="text-[10px] font-semibold text-[#64748B] flex items-center gap-2">
            Brand
            <select value={brand} onChange={(e) => { setBrand(e.target.value); setActive(null); }} className="px-3 py-1.5 border border-[#E2E8F0] rounded-xl text-xs">
              <option value="">All</option>
              {brands.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-[#64748B] bg-[#F8FAFC]">
            <tr>
              <th className="text-left px-3 py-2">Partner</th>
              <th className="text-left">Jobs</th>
              <th className="text-left">By brand</th>
              <th className="text-left">Oldest</th>
              <th className="text-right px-3">Owed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {owed.data.map((r) => (
              <tr key={r.serviceProvider.id} onClick={() => setActive(r)} className={`cursor-pointer hover:bg-[#F8FAFC] ${active?.serviceProvider.id === r.serviceProvider.id ? 'bg-[#EEF4FF]' : ''}`}>
                <td className="px-3 py-2.5">
                  <p className="font-bold">{r.serviceProvider.name}</p>
                  <p className="text-[10px] text-[#64748B]">{r.serviceProvider.phone}</p>
                </td>
                <td>{r.jobs}</td>
                <td className="text-[#64748B]">{r.byBrand.map((b) => `${b.brand} ${rupees(b.amount)}`).join(' · ')}</td>
                <td className="text-[#64748B]">{formatDateTime(r.oldestCompletedAt)}</td>
                <td className="px-3 text-right font-black">{rupees(r.amount)}</td>
              </tr>
            ))}
            {!owed.loading && owed.data.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-[#64748B]">
                  Nothing owed — every completed warranty job is settled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
      {active && (
        <PartnerJobs
          key={active.serviceProvider.id}
          partner={active}
          onSettled={(res) => {
            setDone(res);
            setActive(null);
            owed.reload();
          }}
        />
      )}
    </AdminShell>
  );
}
