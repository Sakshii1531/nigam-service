import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Package, CheckCircle2, X, Clock, Truck, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

// Spare part requests raised by technicians. The brand console only sees the
// ones raised against its own brand's jobs, which leaves out every D2C job (no
// brand at all) and every 'NCC Warehouse' order — those are NCC's to fulfil,
// and before this page existed nobody could see or action them.

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-green-50 text-green-700 border-green-200',
  Dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Dispatched', 'Rejected'];

const PartRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/super-admin/part-orders?limit=200${filter === 'All' ? '' : `&status=${filter}`}`, { auth: true });
      setRequests(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load part requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => {
    setBusyId(id);
    try {
      await apiRequest(`/super-admin/part-orders/${id}`, { method: 'PATCH', auth: true, body: { status } });
      setToast(
        status === 'Approved'
          ? 'Approved — the technician’s revisit has been scheduled.'
          : `Request marked ${status}.`,
      );
      setTimeout(() => setToast(''), 4000);
      await load();
    } catch (err) {
      setError(err.message || `Could not mark this request ${status}.`);
    } finally {
      setBusyId(null);
    }
  };

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'All' ? requests.length : requests.filter((r) => r.status === f).length;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />

        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1E293B] flex items-center gap-2">
                <Package size={20} className="text-[#0D47A1]" /> Spare Part Requests
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Requests raised by technicians against NCC warehouse stock, and any job with no brand behind it.
                Approving one schedules the technician&rsquo;s revisit automatically.
              </p>
            </div>
          </div>

          {toast && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={15} /> {toast}
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filter === f ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f}{filter === f ? ` (${counts[f] ?? 0})` : ''}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            {loading ? (
              <p className="text-sm text-slate-500 p-8 text-center font-medium">Loading part requests…</p>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <Package size={28} className="text-slate-300" />
                <p className="text-sm font-bold text-[#1E293B]">No part requests{filter === 'All' ? '' : ` marked ${filter}`}</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  When a technician needs a spare part to finish a job, the request lands here for approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B]">
                    <tr>
                      <th className="px-5 py-3 font-bold">Request</th>
                      <th className="px-5 py-3 font-bold">Part</th>
                      <th className="px-5 py-3 font-bold">Technician</th>
                      <th className="px-5 py-3 font-bold">Job / Request</th>
                      <th className="px-5 py-3 font-bold">Source</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                      <th className="px-5 py-3 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((r) => {
                      const sr = r.job?.serviceRequest;
                      return (
                        <tr key={r.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-5 py-3.5 font-bold text-[#1E293B]">{r.humanId || r.id?.slice(-6)}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#1E293B]">{r.partName}</p>
                            <p className="text-[11px] text-slate-500">
                              Qty {r.qty}{r.price ? ` · ₹${r.price}` : ''}{r.sku ? ` · ${r.sku}` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{r.technician?.name || '—'}</td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {sr ? (
                              <>
                                <span className="font-semibold text-[#1E293B]">{sr.humanId}</span>
                                <span className="block text-[11px] text-slate-500">
                                  {sr.category}{sr.brand?.name ? ` · ${sr.brand.name}` : ' · D2C'}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400">Restock (no job)</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 text-xs">{r.orderSource}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLES[r.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex gap-2 justify-end">
                              {r.status === 'Pending' ? (
                                <>
                                  <button
                                    onClick={() => decide(r.id, 'Approved')}
                                    disabled={busyId === r.id}
                                    className="inline-flex items-center gap-1 bg-[#0D47A1] hover:bg-blue-800 disabled:opacity-60 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    <CheckCircle2 size={13} /> Approve
                                  </button>
                                  <button
                                    onClick={() => decide(r.id, 'Rejected')}
                                    disabled={busyId === r.id}
                                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
                                  >
                                    <X size={13} /> Reject
                                  </button>
                                </>
                              ) : r.status === 'Approved' ? (
                                <button
                                  onClick={() => decide(r.id, 'Dispatched')}
                                  disabled={busyId === r.id}
                                  className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 disabled:opacity-60 text-[#0D47A1] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#0D47A1]/30 transition-colors"
                                >
                                  <Truck size={13} /> Mark Dispatched
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                  <Clock size={12} /> No action needed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartRequests;
