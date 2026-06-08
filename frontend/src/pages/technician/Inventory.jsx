import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Search, Filter, Briefcase, ClipboardList, Wrench, Calendar, User, Check, X, ShieldAlert
} from 'lucide-react';
import { useTech } from '../../context/TechContext';

const Inventory = () => {
  const navigate = useNavigate();
  const { inventory } = useTech();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('All'); // 'All', 'In Stock', 'Low Stock', 'Out of Stock'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Filter inventory
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (stockFilter === 'In Stock' && item.qty <= 1) return false;
    if (stockFilter === 'Low Stock' && item.qty !== 1) return false;
    if (stockFilter === 'Out of Stock' && item.qty > 0) return false;
    
    return true;
  });

  const getStockBadge = (qty) => {
    if (qty === 0) return 'bg-red-50 text-red-700 border-red-150';
    if (qty === 1) return 'bg-amber-50 text-amber-700 border-amber-150';
    return 'bg-green-50 text-green-700 border-green-150';
  };

  const getStockLabel = (qty) => {
    if (qty === 0) return 'Out of Stock';
    if (qty === 1) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-200 shadow-xl relative font-sans">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1 hover:bg-slate-50 rounded-full text-slate-700 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-slate-700 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-medium text-[#052355] flex-1 text-center pr-8">Inventory</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-3.5 flex flex-col gap-5">
        
        {/* Search Bar & Filter Button Wrapper */}
        <div className="flex gap-3 items-center relative">
          {/* Search Input */}
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts or SKU"
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-normal focus:outline-none focus:border-[#0D47A1] shadow-sm"
            />
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-600" />
          </div>

          {/* Filter Trigger Button */}
          <button 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`p-3 bg-white border rounded-2xl shadow-sm transition-all hover:bg-slate-50 relative ${
              showFilterDropdown ? 'border-[#0D47A1] text-[#0D47A1]' : 'border-slate-200 text-slate-500'
            }`}
          >
            <Filter className="h-4.5 w-4.5" />
            {stockFilter !== 'All' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>

          {/* Stock Filter Popover */}
          {showFilterDropdown && (
            <div className="absolute right-0 top-14 bg-white border border-slate-200 shadow-xl rounded-2xl p-3 z-15 flex flex-col gap-1 w-44 text-left">
              <span className="text-[9px] font-medium text-slate-600 uppercase px-2 pb-1.5 tracking-wider block border-b border-slate-200 mb-1">Filter Stock</span>
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setStockFilter(opt);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-2 py-2 rounded-lg text-[10px] font-normal text-left transition-colors flex items-center justify-between ${
                    stockFilter === opt 
                      ? 'bg-[#E3ECF9]/50 text-[#0D47A1]' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{opt}</span>
                  {stockFilter === opt && <Check className="h-3 w-3 text-[#0D47A1] stroke-[2.5]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inventory Parts List */}
        <div className="flex flex-col gap-3.5">
          {filteredInventory.length > 0 ? (
            filteredInventory.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex justify-between items-center hover:shadow-sm transition-shadow text-left"
              >
                <div>
                  <h4 className="text-xs font-medium text-[#052355]">{item.name}</h4>
                  <p className="text-[10px] text-slate-600 font-normal mt-0.5">SKU: {item.sku} • Price: ₹{item.price}</p>
                  
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[9px] font-normal px-2 py-0.5 rounded-md border uppercase ${getStockBadge(item.qty)}`}>
                      {getStockLabel(item.qty)}
                    </span>
                    <span className="text-[10px] font-normal text-slate-600">Qty: {item.qty}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl flex items-center justify-center">
                  <Wrench className="h-4.5 w-4.5" />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-4 text-slate-600">
              <ShieldAlert className="h-10 w-10 mx-auto text-slate-500 mb-2" />
              <p className="text-sm font-normal">No parts found matching filter.</p>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 py-3 px-3.5 flex justify-between items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <Wrench className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <User className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default Inventory;
