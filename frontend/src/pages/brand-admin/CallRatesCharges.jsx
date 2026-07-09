import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Phone, Plus, Edit2, CheckCircle2, Trash2, Save, X } from 'lucide-react';

const initialRates = [
  { id: 1, category: 'Air Conditioner', serviceType: 'Inspection / Gas Refill', laborRate: 800, partsMarkup: 15, totalBase: 920 },
  { id: 2, category: 'Air Conditioner', serviceType: 'Compressor Replacement', laborRate: 1500, partsMarkup: 12, totalBase: 1680 },
  { id: 3, category: 'Refrigerator', serviceType: 'Inspection / Cooling Issue', laborRate: 600, partsMarkup: 10, totalBase: 660 },
  { id: 4, category: 'Refrigerator', serviceType: 'Compressor Replacement', laborRate: 1200, partsMarkup: 12, totalBase: 1344 },
  { id: 5, category: 'Washing Machine', serviceType: 'Inspection / Drum Issue', laborRate: 500, partsMarkup: 10, totalBase: 550 },
  { id: 6, category: 'Washing Machine', serviceType: 'PCB Replacement', laborRate: 900, partsMarkup: 15, totalBase: 1035 },
  { id: 7, category: 'Television', serviceType: 'Panel Inspection', laborRate: 500, partsMarkup: 10, totalBase: 550 },
  { id: 8, category: 'Microwave Oven', serviceType: 'Magnetron Replacement', laborRate: 700, partsMarkup: 12, totalBase: 784 },
];

const categories = ['All', 'Air Conditioner', 'Refrigerator', 'Washing Machine', 'Television', 'Microwave Oven'];

const CallRatesCharges = () => {
  const [rates, setRates] = useState(initialRates);
  const [filterCat, setFilterCat] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRate, setNewRate] = useState({ category: 'Air Conditioner', serviceType: '', laborRate: '', partsMarkup: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const startEdit = (r) => { setEditingId(r.id); setEditData({ ...r }); };
  const saveEdit = (id) => {
    const lr = parseFloat(editData.laborRate) || 0;
    const pm = parseFloat(editData.partsMarkup) || 0;
    setRates(prev => prev.map(r => r.id === id ? { ...editData, totalBase: Math.round(lr * (1 + pm / 100)) } : r));
    setEditingId(null);
    toast('Rate updated successfully!');
  };

  const handleAddRate = () => {
    const lr = parseFloat(newRate.laborRate) || 0;
    const pm = parseFloat(newRate.partsMarkup) || 0;
    const next = { ...newRate, id: rates.length + 1, laborRate: lr, partsMarkup: pm, totalBase: Math.round(lr * (1 + pm / 100)) };
    setRates(prev => [...prev, next]);
    setShowAddModal(false);
    setNewRate({ category: 'Air Conditioner', serviceType: '', laborRate: '', partsMarkup: '' });
    toast('New rate card added!');
  };

  const filtered = rates.filter(r => filterCat === 'All' || r.category === filterCat);

  const summaryStats = [
    { label: 'Total Rate Cards', value: rates.length },
    { label: 'Avg Labor Rate', value: '₹' + Math.round(rates.reduce((a, r) => a + r.laborRate, 0) / rates.length) },
    { label: 'Avg Parts Markup', value: Math.round(rates.reduce((a, r) => a + r.partsMarkup, 0) / rates.length) + '%' },
    { label: 'Max Base Charge', value: '₹' + Math.max(...rates.map(r => r.totalBase)) },
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
                              <button onClick={() => saveEdit(r.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save size={13} /></button>
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
                            <button onClick={() => startEdit(r)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Edit2 size={13} /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
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
