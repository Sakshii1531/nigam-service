import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Truck, 
  CheckCircle2, 
  X,
  Eye,
  QrCode,
  AlertTriangle,
  PackageCheck,
  ArrowLeft
} from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function shape(ret) {
  return {
    id: ret.id,
    ref: ret.humanId || ret.id,
    technician: ret.technician?.name || 'Unknown',
    partName: ret.partName,
    sku: ret.sku || '—',
    ticketId: ret.serviceRequest?.humanId || '—',
    replaceDate: ret.replaceDate ? dateFormatter.format(new Date(ret.replaceDate)) : '—',
    transitStatus: ret.transitStatus || 'Replaced',
    status: ret.status || 'Pending Verification',
    trackingNo: ret.trackingNo || 'N/A',
    damageFlag: !!ret.damageFlag,
  };
}

const ReverseLogistics = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransit, setSelectedTransit] = useState('All Transit Status');
  const [selectedVerification, setSelectedVerification] = useState('All Verification Status');

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadReturns() {
      try {
        const data = await apiRequest('/brand/returns', { auth: true });
        if (!cancelled) setReturns((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadReturns();
    return () => { cancelled = true; };
  }, []);

  const updateReturn = async (id, patch) => {
    const previous = returns;
    setReturns(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    try {
      const updated = await apiRequest(`/brand/returns/${id}`, { method: 'PATCH', auth: true, body: patch });
      setReturns(prev => prev.map(r => (r.id === id ? shape({ ...updated, technician: { name: r.technician } }) : r)));
      setSuccessMessage('Return updated.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setReturns(previous);
      setError(`Could not update return: ${err.message}`);
    }
  };

  const stats = [
    { title: 'Pending Returns', value: returns.filter(r => r.status === 'Pending Verification' || r.status === 'Pending Return Shipment').length.toString() + ' pcs', icon: <RotateCcw size={20} />, color: 'bg-yellow-500' },
    { title: 'In Transit', value: returns.filter(r => r.transitStatus === 'In Transit').length.toString() + ' pcs', icon: <Truck size={20} />, color: 'bg-blue-600' },
    { title: 'Verified / Scrapped', value: returns.filter(r => r.status === 'Verified & Scrapped').length.toString() + ' pcs', icon: <CheckCircle2 size={20} />, color: 'bg-green-600' },
    { title: 'Transit Damages', value: returns.filter(r => r.damageFlag).length.toString() + ' pcs', icon: <AlertTriangle size={20} />, color: 'bg-red-650' },
  ];

  const handleRowClick = (ret) => {
    setSelectedReturn(ret);
    setShowDrawer(true);
  };

  const handleVerify = async (id) => {
    const patch = { transitStatus: 'Delivered', status: 'Verified & Scrapped' };
    if (selectedReturn && selectedReturn.id === id) setSelectedReturn({ ...selectedReturn, ...patch });
    setShowDrawer(false);
    await updateReturn(id, patch);
  };

  const handleFlagDamage = async (id) => {
    const patch = { transitStatus: 'Delivered', status: 'Transit Damaged', damageFlag: true };
    if (selectedReturn && selectedReturn.id === id) setSelectedReturn({ ...selectedReturn, ...patch });
    setShowDrawer(false);
    await updateReturn(id, patch);
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = ret.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ret.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ret.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ret.technician.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTransit = selectedTransit === 'All Transit Status' || ret.transitStatus === selectedTransit;
    const matchesVerification = selectedVerification === 'All Verification Status' || ret.status === selectedVerification;
    return matchesSearch && matchesTransit && matchesVerification;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Defective Parts Return (Reverse Logistics)" />

        {showDrawer && selectedReturn ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Returns
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl text-sm">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Return Defective Part</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedReturn.ref}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Item Specifications</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Part:</span>
                      <span className="font-semibold text-[#1E293B]">{selectedReturn.partName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">SKU:</span>
                      <span className="font-mono text-[#1E293B]">{selectedReturn.sku}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Ticket ID:</span>
                      <span className="font-semibold text-[#0D47A1]">{selectedReturn.ticketId}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Logistics & Tracking</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Technician:</span>
                      <span className="font-medium text-[#1E293B]">{selectedReturn.technician}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Courier Provider:</span>
                      <span className="font-medium text-[#1E293B]">BlueDart Express</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">AWB Tracking:</span>
                      <span className="font-mono text-[#1E293B]">{selectedReturn.trackingNo}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Logistics Timeline</h3>
                  <div className="border-l-2 border-[#E2E8F0] ml-2 pl-4 space-y-3">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 bg-green-600 rounded-full"></div>
                      <p className="font-semibold text-slate-800">Part replaced at client site</p>
                      <p className="text-xs text-slate-500">{selectedReturn.replaceDate}</p>
                    </div>
                    {selectedReturn.transitStatus !== 'Replaced' && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-green-600 rounded-full"></div>
                        <p className="font-semibold text-slate-800">Picked up by BlueDart</p>
                        <p className="text-xs text-slate-500">AWB Active</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                {(selectedReturn.status === 'Pending Verification' || selectedReturn.status === 'Pending Return Shipment') && (
                  <>
                    <button 
                      onClick={() => handleVerify(selectedReturn.id)}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Verify Part Return
                    </button>
                    <button 
                      onClick={() => handleFlagDamage(selectedReturn.id)}
                      className="bg-white text-red-655 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <AlertTriangle size={14} /> Flag Transit Damage
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((card, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{card.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Actions */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Return ID, SKU..."
                />
              </div>

              <select 
                value={selectedTransit}
                onChange={(e) => setSelectedTransit(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Transit Status</option>
                <option>Replaced</option>
                <option>In Transit</option>
                <option>Delivered</option>
              </select>

              <select 
                value={selectedVerification}
                onChange={(e) => setSelectedVerification(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Verification Status</option>
                <option>Pending Verification</option>
                <option>Verified & Scrapped</option>
                <option>Transit Damaged</option>
                <option>Pending Return Shipment</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Return ID</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Part Name (SKU)</th>
                    <th className="px-6 py-4">Ticket Link</th>
                    <th className="px-6 py-4">Replace Date</th>
                    <th className="px-6 py-4">Transit Status</th>
                    <th className="px-6 py-4">Verification Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading returns…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredReturns.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">No defective-part returns logged.</td></tr>
                  )}
                  {filteredReturns.map((ret) => (
                    <tr 
                      key={ret.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(ret)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{ret.ref}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{ret.technician}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{ret.partName}</p>
                          <p className="text-[#64748B] text-xs">SKU: {ret.sku}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#0D47A1] font-semibold">{ret.ticketId}</td>
                      <td className="px-6 py-4 text-[#64748B]">{ret.replaceDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ret.transitStatus === 'Delivered' ? 'bg-green-50 text-green-700' :
                          ret.transitStatus === 'In Transit' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {ret.transitStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          ret.status === 'Verified & Scrapped' ? 'bg-green-50 text-green-600' :
                          ret.status === 'Transit Damaged' ? 'bg-red-50 text-red-650' :
                          'bg-yellow-50 text-yellow-650'
                        }`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleRowClick(ret)}
                          className="text-[#64748B] hover:text-[#1E293B] p-1.5 hover:bg-[#F1F5F9] rounded-lg"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReverseLogistics;
