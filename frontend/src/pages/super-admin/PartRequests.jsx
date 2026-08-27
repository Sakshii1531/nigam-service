import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Package, 
  CheckCircle2, 
  X, 
  Clock, 
  Truck, 
  AlertTriangle, 
  Eye, 
  User, 
  Phone, 
  Building, 
  Wrench, 
  Tag, 
  Calendar, 
  FileText,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Dispatched: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Dispatched', 'Delivered', 'Rejected'];

const PartRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  // Modal State for viewing spare part details
  const [selectedRequest, setSelectedRequest] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/super-admin/part-orders?limit=200${filter === 'All' ? '' : `&status=${filter}`}`, { auth: true });
      const items = Array.isArray(data) ? data : [];
      setRequests(items);

      // If a modal is open, keep selectedRequest updated
      if (selectedRequest) {
        const updated = items.find(item => item.id === selectedRequest.id || item._id === selectedRequest._id);
        if (updated) setSelectedRequest(updated);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load part requests.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (selectedRequest) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedRequest]);

  const decide = async (id, status) => {
    setBusyId(id);
    try {
      await apiRequest(`/super-admin/part-orders/${id}`, { method: 'PATCH', auth: true, body: { status } });
      setToast(
        status === 'Approved'
          ? 'Approved — request approved and ready for dispatch.'
          : status === 'Dispatched'
          ? 'Dispatched — spare parts are on the way to technician.'
          : status === 'Delivered'
          ? 'Delivered — parts delivered & technician revisit has been rescheduled!'
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
    <div className="flex min-h-screen bg-[#F8FAFC] relative text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar 
          title="Spare Part Requests" 
          subtitle="Manage technician spare part requests and warehouse fulfillment" 
        />

        <div className="p-6 flex flex-col gap-5">
          {toast && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl px-4 py-3 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={15} /> {toast}
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  filter === f ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f}{filter === f ? ` (${counts[f] ?? 0})` : ''}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400 font-semibold text-xs flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
                Loading part requests…
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-2">
                <Package size={32} className="text-slate-300" />
                <p className="text-sm font-bold text-[#1E293B]">No part requests{filter === 'All' ? '' : ` marked ${filter}`}</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  When a technician needs a spare part to finish a job, the request lands here for approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wider text-[#64748B] border-b border-slate-200/80">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Request ID</th>
                      <th className="px-5 py-3.5 font-bold">Part Details</th>
                      <th className="px-5 py-3.5 font-bold">Technician</th>
                      <th className="px-5 py-3.5 font-bold">Job / Service Request</th>
                      <th className="px-5 py-3.5 font-bold">Source</th>
                      <th className="px-5 py-3.5 font-bold">Status</th>
                      <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {requests.map((r) => {
                      const sr = r.job?.serviceRequest;
                      return (
                        <tr key={r.id || r._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold text-[#1E293B]">
                            <span className="font-mono text-xs text-[#0D47A1]">#{r.humanId || r.id?.slice(-6)}</span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-[#1E293B] text-sm flex items-center gap-1.5">
                              <Package size={14} className="text-[#0D47A1]" /> {r.partName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              Qty {r.qty}{r.price ? ` · ₹${r.price}` : ''}{r.sku ? ` · SKU: ${r.sku}` : ''}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-slate-700">
                            <p className="font-bold text-slate-800">{r.technician?.name || '—'}</p>
                            {r.technician?.phone && (
                              <p className="text-[11px] text-slate-500 font-medium">{r.technician.phone}</p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {sr ? (
                              <>
                                <span className="font-bold text-[#1E293B]">{sr.humanId}</span>
                                <span className="block text-[11px] text-slate-500 font-semibold">
                                  {sr.category}{sr.brand?.name ? ` · ${sr.brand.name}` : ' · D2C'}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold">Restock (no job)</span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {r.orderSource || 'NCC Warehouse'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[r.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {r.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex gap-2 justify-end items-center">
                              {/* View Details Icon Button */}
                              <button
                                onClick={() => setSelectedRequest(r)}
                                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="View Spare Part Details"
                              >
                                <Eye size={13} /> Details
                              </button>

                              {r.status === 'Pending' ? (
                                <>
                                  <button
                                    onClick={() => decide(r.id || r._id, 'Approved')}
                                    disabled={busyId === (r.id || r._id)}
                                    className="inline-flex items-center gap-1 bg-[#0D47A1] hover:bg-blue-800 disabled:opacity-60 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                                  >
                                    <CheckCircle2 size={13} /> Approve
                                  </button>
                                  <button
                                    onClick={() => decide(r.id || r._id, 'Rejected')}
                                    disabled={busyId === (r.id || r._id)}
                                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 disabled:opacity-60 text-rose-600 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  >
                                    <X size={13} /> Reject
                                  </button>
                                </>
                              ) : r.status === 'Approved' ? (
                                <button
                                  onClick={() => decide(r.id || r._id, 'Dispatched')}
                                  disabled={busyId === (r.id || r._id)}
                                  className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                  <Truck size={13} /> Dispatch
                                </button>
                              ) : r.status === 'Dispatched' ? (
                                <button
                                  onClick={() => decide(r.id || r._id, 'Delivered')}
                                  disabled={busyId === (r.id || r._id)}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                                >
                                  <CheckCircle2 size={13} /> Deliver
                                </button>
                              ) : r.status === 'Delivered' ? (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                  <CheckCircle2 size={11} /> Revisit Rescheduled
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold inline-flex items-center gap-1">
                                  <Clock size={11} /> Closed ({r.status})
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

      {/* Spare Part Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4 text-left">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#0D47A1] uppercase tracking-wider">
                  Request #{selectedRequest.humanId || selectedRequest.id?.slice(-6)}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mt-0.5">
                  <Package size={18} className="text-[#0D47A1]" /> {selectedRequest.partName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              
              {/* Part Specifications Grid */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={13} className="text-[#0D47A1]" /> Spare Part Technical Details
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Part Name</span>
                    <span className="text-slate-900 font-bold">{selectedRequest.partName}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">SKU / Code</span>
                    <span className="text-slate-900 font-mono font-bold">{selectedRequest.sku || 'N/A'}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Quantity Requested</span>
                    <span className="text-[#0D47A1] font-black">{selectedRequest.qty} Unit(s)</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Unit Price</span>
                    <span className="text-emerald-600 font-black">
                      {selectedRequest.price ? `₹${selectedRequest.price}` : 'Quote Pending'}
                    </span>
                  </div>
                </div>

                {selectedRequest.price && selectedRequest.qty && (
                  <div className="flex justify-between items-center bg-blue-50 p-2.5 rounded-lg border border-blue-100 text-xs font-bold text-[#0D47A1]">
                    <span>Total Estimated Cost:</span>
                    <span>₹{Number(selectedRequest.price) * Number(selectedRequest.qty)}</span>
                  </div>
                )}
              </div>

              {/* Source & Status Info */}
              <div className="grid grid-cols-2 gap-3 font-semibold">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Fulfillment Source</span>
                  <span className="text-slate-800 font-bold flex items-center gap-1 mt-0.5">
                    <Building size={13} className="text-slate-500" />
                    {selectedRequest.orderSource || 'NCC Warehouse'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 border ${STATUS_STYLES[selectedRequest.status]}`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {/* Job & Service Request Info */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-[#0D47A1]" /> Associated Job & Customer Service Request
                </h4>

                {selectedRequest.job?.serviceRequest ? (
                  <div className="space-y-1.5 text-xs text-slate-700 font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Service Ticket:</span>
                      <span className="font-bold text-[#0D47A1]">{selectedRequest.job.serviceRequest.humanId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Appliance Category:</span>
                      <span>{selectedRequest.job.serviceRequest.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Brand:</span>
                      <span>{selectedRequest.job.serviceRequest.brand?.name || 'D2C Direct'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-xs">Direct technician warehouse restock (no specific job ticket).</p>
                )}
              </div>

              {/* Technician Info */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-[#0D47A1]" /> Requesting Technician
                </h4>

                <div className="flex items-center justify-between text-xs font-semibold bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-900">{selectedRequest.technician?.name || '—'}</span>
                  {selectedRequest.technician?.phone && (
                    <span className="text-slate-600 flex items-center gap-1">
                      <Phone size={12} className="text-slate-400" /> {selectedRequest.technician.phone}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex gap-2">
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => decide(selectedRequest.id || selectedRequest._id, 'Approved')}
                      disabled={busyId === (selectedRequest.id || selectedRequest._id)}
                      className="px-3.5 py-2 bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Approve Request
                    </button>
                    <button
                      onClick={() => decide(selectedRequest.id || selectedRequest._id, 'Rejected')}
                      disabled={busyId === (selectedRequest.id || selectedRequest._id)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Reject
                    </button>
                  </>
                )}

                {selectedRequest.status === 'Approved' && (
                  <button
                    onClick={() => decide(selectedRequest.id || selectedRequest._id, 'Dispatched')}
                    disabled={busyId === (selectedRequest.id || selectedRequest._id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Mark Dispatched
                  </button>
                )}

                {selectedRequest.status === 'Dispatched' && (
                  <button
                    onClick={() => decide(selectedRequest.id || selectedRequest._id, 'Delivered')}
                    disabled={busyId === (selectedRequest.id || selectedRequest._id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Mark Delivered
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default PartRequests;
