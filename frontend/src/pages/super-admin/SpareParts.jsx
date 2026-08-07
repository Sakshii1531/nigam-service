import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, Plus, Filter, Wrench, Settings, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const SpareParts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // The default markup is a platform setting, not a display constant.
  const [defaultMarkup, setDefaultMarkup] = useState(null);

  useEffect(() => {
    apiRequest('/super-admin/settings', { auth: true })
      .then((res) => setDefaultMarkup(res.data?.defaultSparePartMarkupPercent ?? null))
      .catch((err) => console.warn('[spare-parts] Could not load platform settings:', err.message));
  }, []);

  useEffect(() => {
    const fetchParts = async () => {
      try {
        const data = await apiRequest('/super-admin/spare-parts', { auth: true });
        const list = Array.isArray(data?.data) ? data.data : [];
        setParts(list.map(p => {
          const cost = Number(p.costPrice || p.cost || 0);
          const markup = Number(p.markupPercent || p.markup || 15);
          const retail = Math.round(cost * (1 + markup / 100));
          const qty = p.stock ?? p.quantity ?? 0;
          return {
            id: p._id || p.id || p.partCode,
            name: p.name || p.partName || 'Part',
            brand: p.brand || 'N/A',
            code: p.partCode || p.skuCode || `SP-${Math.floor(Math.random()*9999)}`,
            costPrice: `₹${cost.toLocaleString('en-IN')}`,
            markup: `${markup}%`,
            retailPrice: `₹${retail.toLocaleString('en-IN')}`,
            stock: qty,
            status: qty === 0 ? 'Out of Stock' : qty <= (p.reorderLevel || 5) ? 'Low Stock' : 'In Stock'
          };
        }));
      } catch (err) {
        setLoadError(err.message || 'Could not load spare parts.');
      } finally {
        setLoading(false);
      }
    };
    fetchParts();
  }, []);

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [partBrand, setPartBrand] = useState('LG');
  const [costPrice, setCostPrice] = useState('');
  const [markupPct, setMarkupPct] = useState('15%');
  const [stockQty, setStockQty] = useState('');

  const handleAddPart = (e) => {
    e.preventDefault();
    const costVal = parseFloat(costPrice.replace(/[^\d.]/g, '')) || 0;
    const markupVal = parseFloat(markupPct.replace(/[^\d.]/g, '')) || 0;
    const retailVal = Math.round(costVal * (1 + markupVal / 100));
    const qty = parseInt(stockQty) || 0;

    const newPart = {
      id: parts.length + 1,
      name: partName,
      brand: partBrand,
      code: partCode || `SP-GEN-${Math.floor(100 + Math.random() * 900)}`,
      costPrice: `₹${costVal.toLocaleString('en-IN')}`,
      markup: `${markupVal}%`,
      retailPrice: `₹${retailVal.toLocaleString('en-IN')}`,
      stock: qty,
      status: qty === 0 ? 'Out of Stock' : qty < 10 ? 'Low Stock' : 'In Stock'
    };

    setParts([...parts, newPart]);

    // Reset inputs and close modal
    setPartName('');
    setPartCode('');
    setPartBrand('LG');
    setCostPrice('');
    setMarkupPct('15%');
    setStockQty('');
    setIsModalOpen(false);
  };

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 animate-in fade-in duration-150">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Spare Parts Control" subtitle="Configure spare parts pricing, markups, and stock controls" />

        {loadError && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-700">
            {loadError}
          </div>
        )}
        <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spare Parts</p>
              <p className="text-2xl font-black text-slate-800 mt-2">{parts.length}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of Stock</p>
              <p className="text-2xl font-black text-red-600 mt-2">
                {parts.filter(p => p.stock === 0).length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock items</p>
              <p className="text-2xl font-black text-yellow-600 mt-2">
                {parts.filter(p => p.stock > 0 && p.stock < 10).length}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Platform Markup</p>
              <p className="text-2xl font-black text-blue-600 mt-2">{defaultMarkup != null ? `${defaultMarkup}%` : '—'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
                <input 
                  type="text" 
                  placeholder="Search Part Name, Code..." 
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-white border border-[#E2E8F0] text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer">
                <Settings size={16} /> Markup Settings
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={16} /> Add Spare Part
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Part Details</th>
                  <th className="p-4">Part Code</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4">Cost Price</th>
                  <th className="p-4">Markup Pct</th>
                  <th className="p-4">Retail Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 pr-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredParts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><Wrench size={14} className="text-slate-400" /> {p.name}</p>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-500">{p.code}</td>
                    <td className="p-4 text-xs font-bold text-[#0D47A1] uppercase">{p.brand}</td>
                    <td className="p-4 text-slate-600 font-semibold">{p.costPrice}</td>
                    <td className="p-4 text-slate-600 font-semibold">{p.markup}</td>
                    <td className="p-4 text-slate-800 font-black flex items-center gap-1">{p.retailPrice} <ArrowUpRight size={12} className="text-green-500" /></td>
                    <td className="p-4 text-slate-700 font-semibold">{p.stock} units</td>
                    <td className="p-4 pr-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'In Stock' ? 'bg-green-50 text-green-600 border border-green-100' :
                        p.status === 'Low Stock' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredParts.length === 0 && (
              <div className="text-center py-12 text-[#64748B]">No spare parts found matching filters.</div>
            )}
          </div>

        </div>
      </div>

      {/* Form Modal for Add Spare Part */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-800">Add New Spare Part</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-extrabold text-lg select-none cursor-pointer p-1"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddPart} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Part Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Fridge Fan Motor 12V" 
                  className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Part Code / SKU</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SP-RF-MOT-09" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Brand</label>
                  <select 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm bg-white font-semibold text-slate-700"
                    value={partBrand}
                    onChange={(e) => setPartBrand(e.target.value)}
                  >
                    <option value="LG">LG</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Kent">Kent</option>
                    <option value="IFB">IFB</option>
                    <option value="Whirlpool">Whirlpool</option>
                    <option value="Havells">Havells</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cost Price</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 500" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Markup Pct</label>
                  <select 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm bg-white font-semibold text-slate-700"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(e.target.value)}
                  >
                    <option value="5%">5%</option>
                    <option value="10%">10%</option>
                    <option value="15%">15%</option>
                    <option value="20%">20%</option>
                    <option value="25%">25%</option>
                    <option value="30%">30%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock Units</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 10" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
                >
                  Save Spare Part
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpareParts;
