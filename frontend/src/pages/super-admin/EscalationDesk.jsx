import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, AlertTriangle, ShieldCheck, Clock, User } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = (new Date(iso) - Date.now()) / 1000;
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

// The API's status vocabulary is wider than this desk's three-state view.
// Anything not yet owned reads as Unassigned; anything finished reads as Resolved.
function toDeskStatus(status, manager) {
  if (status === 'Resolved') return 'Resolved';
  if (!manager || status === 'Open' || status === 'Unassigned') return 'Unassigned';
  return 'In Progress';
}

function shape(esc) {
  return {
    id: esc.id,
    ticket: esc.serviceRequest?.humanId ? `#${esc.serviceRequest.humanId}` : `#${esc.id}`,
    description: esc.description || esc.reason || 'Escalation',
    city: esc.city?.name || '—',
    priority: esc.priority,
    manager: esc.manager?.name || 'Unassigned',
    status: toDeskStatus(esc.status, esc.manager),
    date: timeAgo(esc.createdAt),
  };
}

const EscalationDesk = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadEscalations() {
      try {
        const data = await apiRequest('/super-admin/escalations', { auth: true });
        if (!cancelled) setEscalations((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadEscalations();
    return () => { cancelled = true; };
  }, []);

  const handleAssignToSelf = async (id) => {
    const managerId = user?.id || user?._id;
    if (!managerId) {
      setError('Could not resolve the signed-in user to assign this escalation to.');
      return;
    }
    try {
      const updated = await apiRequest(`/super-admin/escalations/${id}/assign`, {
        method: 'PATCH', auth: true, body: { managerId },
      });
      setEscalations(prev => prev.map(esc => esc.id === id
        ? { ...esc, manager: user.name || 'Me', status: toDeskStatus(updated?.status, managerId) }
        : esc));
    } catch (err) {
      setError(`Could not assign escalation: ${err.message}`);
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiRequest(`/super-admin/escalations/${id}/status`, {
        method: 'PATCH', auth: true, body: { status: 'Resolved' },
      });
      setEscalations(prev => prev.map(esc => esc.id === id ? { ...esc, status: 'Resolved' } : esc));
    } catch (err) {
      setError(`Could not resolve escalation: ${err.message}`);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredEscalations = escalations.filter(esc =>
    esc.ticket.toLowerCase().includes(q) ||
    esc.description.toLowerCase().includes(q)
  );

  const countByStatus = (status) => escalations.filter(e => e.status === status).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Escalation Desk" subtitle="Monitor and resolve critical escalated complaints" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Escalations</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{escalations.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unassigned</p>
              <p className="text-2xl font-black text-red-600 mt-2">{countByStatus('Unassigned')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-black text-yellow-600 mt-2">{countByStatus('In Progress')}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <p className="text-2xl font-black text-green-600 mt-2">{countByStatus('Resolved')}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Ticket, Issue..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Ticket Code</th>
                  <th className="p-4">Escalation Issue</th>
                  <th className="p-4">Region</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Assigned Mgr</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">Loading escalations…</td></tr>
                )}
                {!loading && error && (
                  <tr><td colSpan={7} className="p-8 text-center text-red-600 font-semibold">{error}</td></tr>
                )}
                {!loading && !error && filteredEscalations.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">No escalations open.</td></tr>
                )}
                {filteredEscalations.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-500" /> {esc.ticket}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{esc.description}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{esc.date}</p>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{esc.city}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esc.priority === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {esc.priority}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-600 flex items-center gap-1.5"><User size={12} /> {esc.manager}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esc.status === 'Unassigned' ? 'bg-red-50 text-red-600 border border-red-100' :
                        esc.status === 'In Progress' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-green-50 text-green-600 border border-green-100'
                      }`}>
                        {esc.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {esc.status === 'Unassigned' ? (
                        <button onClick={() => handleAssignToSelf(esc.id)} className="text-xs bg-[#0D47A1] text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">Assign to Self</button>
                      ) : esc.status === 'In Progress' ? (
                        <button onClick={() => handleResolve(esc.id)} className="text-xs bg-green-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors cursor-pointer">Resolve</button>
                      ) : (
                        <span className="text-green-600 font-bold text-xs flex items-center justify-end gap-1"><ShieldCheck size={14} /> Resolved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EscalationDesk;
