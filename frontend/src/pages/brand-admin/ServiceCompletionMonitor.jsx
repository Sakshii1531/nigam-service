import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { CheckCircle2, Clock, Star, Search, Download, Eye, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// There is no QC field on a service request, so "QC" here reflects how far the
// request has actually travelled: Closed means the customer signed it off,
// anything earlier is still awaiting confirmation.
function qcFor(status) {
  return status === 'Closed' ? 'QC Passed' : 'Pending QC';
}

function shape(r) {
  return {
    id: r.id,
    ref: r.humanId || r.id,
    customer: r.user?.name || 'Customer',
    product: r.category || '—',
    tech: r.technician?.name || 'Unassigned',
    completedAt: r.updatedAt ? dateFormatter.format(new Date(r.updatedAt)) : '—',
    qcStatus: qcFor(r.status),
    feedbackStatus: r.feedbackStatus || 'Pending',
    rating: r.rating ?? null,
  };
}

const qcColors = {
  'QC Passed': 'bg-green-100 text-green-700',
  'Pending QC': 'bg-yellow-100 text-yellow-700',
  'QC Failed': 'bg-red-100 text-red-700',
};

const ServiceCompletionMonitor = () => {
  const [tab, setTab] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function loadCompletions() {
      try {
        const data = await apiRequest('/brand/completions', { auth: true });
        if (!cancelled) setJobs((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCompletions();
    return () => { cancelled = true; };
  }, []);

  const tabs = ['All', 'Completed Today', 'Pending QC', 'Feedback Pending'];

  const filtered = jobs.filter(j => {
    const matchSearch = j.customer.toLowerCase().includes(searchQ.toLowerCase()) || j.ref.toLowerCase().includes(searchQ.toLowerCase());
    if (tab === 'Pending QC') return matchSearch && j.qcStatus === 'Pending QC';
    if (tab === 'Feedback Pending') return matchSearch && j.feedbackStatus === 'Pending';
    if (tab === 'Completed Today') return matchSearch;
    return matchSearch;
  });

  const rated = jobs.filter(j => j.rating != null);
  const avgRating = rated.length
    ? (rated.reduce((acc, j) => acc + j.rating, 0) / rated.length).toFixed(1)
    : '—';
  // "Avg Resolution Time" was a fixed string; a request records no start-to-finish
  // duration, so it's replaced with the feedback gap, which this data supports.
  const kpis = [
    { label: 'Jobs Completed', value: String(jobs.length), icon: <CheckCircle2 size={18} />, bg: 'bg-green-600' },
    { label: 'Pending QC', value: String(jobs.filter(j => j.qcStatus === 'Pending QC').length), icon: <Clock size={18} />, bg: 'bg-yellow-600' },
    { label: 'Feedback Pending', value: String(jobs.filter(j => j.feedbackStatus === 'Pending').length), icon: <Clock size={18} />, bg: 'bg-blue-600' },
    { label: 'Avg Customer Rating', value: avgRating === '—' ? '—' : `${avgRating} ★`, icon: <Star size={18} />, bg: 'bg-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Service Completion Monitor" subtitle="Track job completions, QC status, and feedback" />
        <div className="p-5 space-y-5">

          <div className="grid grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center text-white`}>{k.icon}</div>
                <div>
                  <p className="text-xl font-black text-[#1E293B]">{k.value}</p>
                  <p className="text-[10px] font-semibold text-[#64748B]">{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[#E2E8F0]">
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 ${tab === t ? 'border-[#0D47A1] text-[#0D47A1]' : 'border-transparent text-[#64748B] hover:text-[#1E293B]'}`}
                >{t}</button>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input placeholder="Search by ID or customer..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
              </div>
              <button onClick={() => toast('Completion report exported!')} className="flex items-center gap-1.5 border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]">
                <Download size={13} /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Job ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Technician</th>
                    <th className="px-3 py-3">Completed At</th>
                    <th className="px-3 py-3">QC Status</th>
                    <th className="px-3 py-3">Feedback</th>
                    <th className="px-3 py-3">Rating</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {loading && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-[#64748B] font-semibold">Loading completions…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filtered.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-[#64748B] font-semibold">No completed jobs yet.</td></tr>
                  )}
                  {filtered.map((j, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold">{j.ref}</td>
                      <td className="px-3 py-3 font-semibold text-[#1E293B]">{j.customer}</td>
                      <td className="px-3 py-3 text-[#64748B]">{j.product}</td>
                      <td className="px-3 py-3 text-[#64748B]">{j.tech}</td>
                      <td className="px-3 py-3 text-[#64748B]">{j.completedAt}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${qcColors[j.qcStatus]}`}>{j.qcStatus}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${j.feedbackStatus === 'Received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{j.feedbackStatus}</span>
                      </td>
                      <td className="px-3 py-3">
                        {j.rating ? <span className="font-bold text-yellow-500">★ {j.rating}</span> : <span className="text-[#94A3B8]">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setSelectedJob(j)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Eye size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-start bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-[#1E293B] text-sm">Job Details</h3>
                <p className="text-[#0D47A1] font-semibold text-xs mt-0.5">{selectedJob.id}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                ['Customer', selectedJob.customer], ['Product', selectedJob.product],
                ['Technician', selectedJob.tech], ['Completed At', selectedJob.completedAt],
                ['QC Status', selectedJob.qcStatus], ['Feedback', selectedJob.feedbackStatus],
                ['Rating', selectedJob.rating ? `★ ${selectedJob.rating}` : 'Not yet received'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#F1F5F9] pb-2 last:border-0">
                  <span className="text-[#64748B] font-semibold">{k}</span>
                  <span className="font-bold text-[#1E293B]">{v}</span>
                </div>
              ))}
              <button onClick={() => { toast('Request for re-QC submitted!'); setSelectedJob(null); }}
                className="w-full bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 mt-2">
                Request Re-QC
              </button>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default ServiceCompletionMonitor;
