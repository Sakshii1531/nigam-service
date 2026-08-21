import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Phone, Plus, Edit2, CheckCircle2, Trash2, Save, X } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const FALLBACK_CATEGORIES = ['Air Conditioner', 'Refrigerator', 'Washing Machine', 'Television', 'Microwave Oven'];

// The API stores partsMarkupPercent and derives totalBase as a virtual; this page
// has always called those partsMarkup/totalBase.
function shape(card) {
  return {
    id: card.id,
    category: card.category,
    serviceType: card.serviceType,
    laborRate: card.laborRate,
    partsMarkup: card.partsMarkupPercent ?? 0,
    totalBase: Math.round(card.totalBase ?? card.laborRate),
  };
}

const CallRatesCharges = () => {
  const [rates, setRates] = useState([]);
  const [filterCat, setFilterCat] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRate, setNewRate] = useState({ category: 'Air Conditioner', serviceType: '', laborRate: '', partsMarkup: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function loadRates() {
      try {
        const data = await apiRequest('/brand/rate-cards', { auth: true });
        if (!cancelled) setRates((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRates();
    return () => { cancelled = true; };
  }, []);

  // Categories come from whatever rate cards exist, falling back to the standard
  // appliance list so the "add" form is usable before any card is configured.
  const knownCategories = Array.from(new Set([...rates.map(r => r.category), ...FALLBACK_CATEGORIES]));
  const categories = ['All', ...knownCategories];

  const startEdit = (r) => { setEditingId(r.id); setEditData({ ...r }); };

  // The API upserts on (category, serviceType), so both create and edit go
  // through the same PUT — an edit that renames serviceType writes a new card
  // rather than mutating in place, which is why the list is refetched after.
  const persistRate = async ({ category, serviceType, laborRate, partsMarkup }) => {
    await apiRequest('/brand/rate-cards', {
      method: 'PUT',
      auth: true,
      body: {
        category,
        serviceType,
        laborRate: Number(laborRate) || 0,
        partsMarkupPercent: Number(partsMarkup) || 0,
      },
    });
    const data = await apiRequest('/brand/rate-cards', { auth: true });
    setRates((data || []).map(shape));
  };

  const saveEdit = async () => {
    try {
      await persistRate(editData);
      setEditingId(null);
      toast('Rate updated successfully!');
    } catch (err) {
      setError(`Could not update rate: ${err.message}`);
    }
  };

  const handleAddRate = async () => {
    if (!newRate.serviceType.trim()) {
      toast('Enter a service type.');
      return;
    }
    try {
      await persistRate(newRate);
      setShowAddModal(false);
      setNewRate({ category: 'Air Conditioner', serviceType: '', laborRate: '', partsMarkup: '' });
      toast('New rate card added!');
    } catch (err) {
      setError(`Could not add rate: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    const previous = rates;
    setRates(prev => prev.filter(r => r.id !== id));
    try {
      await apiRequest(`/brand/rate-cards/${id}`, { method: 'DELETE', auth: true });
      toast('Rate card removed.');
    } catch (err) {
      setRates(previous);
      setError(`Could not delete rate: ${err.message}`);
    }
  };

  const filtered = rates.filter(r => filterCat === 'All' || r.category === filterCat);

  const summaryStats = [
    { label: 'Total Rate Cards', value: rates.length },
    { label: 'Avg Labor Rate', value: rates.length ? '₹' + Math.round(rates.reduce((a, r) => a + r.laborRate, 0) / rates.length) : '—' },
    { label: 'Avg Parts Markup', value: rates.length ? Math.round(rates.reduce((a, r) => a + r.partsMarkup, 0) / rates.length) + '%' : '—' },
    { label: 'Max Base Charge', value: rates.length ? '₹' + Math.max(...rates.map(r => r.totalBase)) : '—' },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Call Rates & Charges" subtitle="Manage service call rates, labor charges, and parts markup" />
        <div className="p-5 space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {summaryStats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
                <p className="text-2xl font-black text-[#1E293B]">{s.value}</p>
                <p className="text-[10px] font-semibold text-[#64748B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            {/* Filters + Add */}
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="flex gap-1 flex-wrap flex-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setFilterCat(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterCat === c ? 'bg-[#0D47A1] text-white border-[#0D47A1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'}`}
                  >{c}</button>
                ))}
              </div>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700">
                <Plus size={13} /> Add New Rate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Product Category</th>
                    <th className="px-3 py-3">Service Type</th>
                    <th className="px-3 py-3">Labor Rate (₹)</th>
                    <th className="px-3 py-3">Parts Markup (%)</th>
                    <th className="px-3 py-3">Total Base Charge (₹)</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {editingId === r.id ? (
                        <>
                          <td className="px-3 py-2">
                            <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })}
                              className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1] w-full">
                              {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input value={editData.serviceType} onChange={e => setEditData({ ...editData, serviceType: e.target.value })}
                              className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs w-full bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1]" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={editData.laborRate} onChange={e => setEditData({ ...editData, laborRate: e.target.value })}
                              className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs w-24 bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1]" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={editData.partsMarkup} onChange={e => setEditData({ ...editData, partsMarkup: e.target.value })}
                              className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs w-20 bg-[#F8FAFC] outline-none focus:ring-1 focus:ring-[#0D47A1]" />
                          </td>
                          <td className="px-3 py-2 text-[#64748B]">
                            ₹{Math.round((parseFloat(editData.laborRate) || 0) * (1 + (parseFloat(editData.partsMarkup) || 0) / 100))}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save size={13} /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg"><X size={13} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-semibold text-[#1E293B]">{r.category}</td>
                          <td className="px-3 py-3 text-[#64748B]">{r.serviceType}</td>
                          <td className="px-3 py-3 font-bold text-[#1E293B]">₹{r.laborRate}</td>
                          <td className="px-3 py-3 text-[#64748B]">{r.partsMarkup}%</td>
                          <td className="px-3 py-3 font-bold text-green-700">₹{r.totalBase}</td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(r)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Edit2 size={13} /></button>
                              <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {loading && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-[#64748B] font-semibold">Loading rate cards…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-[#64748B] font-semibold">No rate cards configured yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] text-sm">Add New Rate Card</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Product Category', key: 'category', type: 'select' },
                { label: 'Service Type', key: 'serviceType', type: 'text', placeholder: 'e.g. Panel Replacement' },
                { label: 'Labor Rate (₹)', key: 'laborRate', type: 'number', placeholder: '800' },
                { label: 'Parts Markup (%)', key: 'partsMarkup', type: 'number', placeholder: '12' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">{f.label}</label>
                  {f.type === 'select' ? (
                    <select value={newRate.category} onChange={e => setNewRate({ ...newRate, category: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]">
                      {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} placeholder={f.placeholder} value={newRate[f.key]}
                      onChange={e => setNewRate({ ...newRate, [f.key]: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]" />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 border border-[#E2E8F0] py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={handleAddRate} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Add Rate</button>
              </div>
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

export default CallRatesCharges;
