import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp, 
  PackageOpen, 
  X,
  Eye,
  IndianRupee,
  ShieldAlert,
  Truck,
  ArrowLeft
} from 'lucide-react';

const Exchanges = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [exchanges, setExchanges] = useState([
    { id: 'EX-5001', customer: 'Amit Sharma', oldProduct: 'Refrigerator', oldBrand: 'Samsung', oldModel: 'RT28DoubleDoor', condition: 'Good', valuation: '₹4,500', status: 'Pending Inspection', date: '12 May, 2026' },
    { id: 'EX-5002', customer: 'Priya Patel', oldProduct: 'Washing Machine', oldBrand: 'IFB', oldModel: 'SenoritaVX', condition: 'Excellent', valuation: '₹3,200', status: 'Inspection Approved', date: '12 May, 2026' },
    { id: 'EX-5003', customer: 'Rajesh K.', oldProduct: 'Smart TV', oldBrand: 'Sony', oldModel: 'KLV-32R', condition: 'Poor', valuation: '₹1,500', status: 'Defective Received', date: '11 May, 2026' },
    { id: 'EX-5004', customer: 'Neha Gupta', oldProduct: 'Microwave', oldBrand: 'Kenstar', oldModel: 'KEN-MW-20', condition: 'Good', valuation: '₹1,800', status: 'Pending Inspection', date: '10 May, 2026' },
  ]);

  const stats = [
    { title: 'Exchange Requests', value: (exchanges.length + 82).toString(), icon: <RefreshCw size={20} />, color: 'bg-blue-600' },
    { title: 'Avg. Valuation', value: '₹3,400', icon: <IndianRupee size={20} />, color: 'bg-emerald-600' },
    { title: 'Discounts Approved', value: '₹1.8L', icon: <CheckCircle2 size={20} />, color: 'bg-indigo-600' },
    { title: 'Received at WH', value: '42 pcs', icon: <PackageOpen size={20} />, color: 'bg-yellow-500' },
  ];

  const updateExchangeStatus = (id, newStatus) => {
    setExchanges(exchanges.map(ex => ex.id === id ? { ...ex, status: newStatus } : ex));
    if (selectedExchange && selectedExchange.id === id) {
      setSelectedExchange({ ...selectedExchange, status: newStatus });
    }
    setSuccessMessage(`Exchange status updated successfully to: ${newStatus}`);
    setShowDrawer(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDispute = (id) => {
    setSuccessMessage(`Dispute successfully raised for Exchange ${id}. Platform admin will review the valuation.`);
    setShowDrawer(false);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleRowClick = (ex) => {
    setSelectedExchange(ex);
    setShowDrawer(true);
  };

  const filteredExchanges = exchanges.filter(ex => {
    const matchesSearch = ex.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ex.oldProduct.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = selectedCondition === 'All Conditions' || ex.condition === selectedCondition;
    const matchesStatus = selectedStatus === 'All Status' || ex.status === selectedStatus;
    return matchesSearch && matchesCondition && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        <Topbar title="Exchange Program" />

        {showDrawer && selectedExchange ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Exchanges
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl text-sm">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Exchange Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedExchange.id}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Customer & Order Details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Name:</span>
                      <span className="font-medium text-[#1E293B]">{selectedExchange.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Buying New:</span>
                      <span className="font-medium text-blue-650">LG OLED 55" Smart TV</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Exchange Discount:</span>
                      <span className="font-bold text-green-600">{selectedExchange.valuation}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Traded appliance Details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Appliance:</span>
                      <span className="font-medium text-[#1E293B]">{selectedExchange.oldProduct}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Brand & Model:</span>
                      <span className="font-medium text-[#1E293B]">{selectedExchange.oldBrand} - {selectedExchange.oldModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Condition:</span>
                      <span className="font-bold text-indigo-600">{selectedExchange.condition}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Verification Inspection Report</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-xs text-[#64748B]">
                    <p className="font-medium text-[#1E293B] mb-1">Technician Inspection Log (By Rahul Kumar):</p>
                    <p>• Compressor starting up normally. Minor rust on condenser coil.</p>
                    <p>• Interior shelving intact. Door seal gasket requires replacement.</p>
                    <p className="font-semibold text-green-600 mt-2">✓ Verified: Final exchange valuation matches initial estimate.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                {selectedExchange.status === 'Pending Inspection' && (
                  <>
                    <button 
                      onClick={() => updateExchangeStatus(selectedExchange.id, 'Inspection Approved')}
                      className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      Approve Valuation
                    </button>
                    <button 
                      onClick={() => handleDispute(selectedExchange.id)}
                      className="bg-white text-red-655 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50/20 transition-colors flex items-center justify-center gap-1"
                    >
                      <ShieldAlert size={14} /> Dispute
                    </button>
                  </>
                )}
                {selectedExchange.status === 'Inspection Approved' && (
                  <button 
                    onClick={() => updateExchangeStatus(selectedExchange.id, 'Defective Received')}
                    className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Truck size={16} /> Mark Defective Appliance Received
                  </button>
                )}
                {selectedExchange.status === 'Defective Received' && (
                  <button 
                    disabled 
                    className="w-full bg-gray-150 text-gray-400 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    ✓ Defective Appliance Logged In Inventory
                  </button>
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
                  placeholder="Search Exchange ID, Customer..."
                />
              </div>

              <select 
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Conditions</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Poor</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Pending Inspection</option>
                <option>Inspection Approved</option>
                <option>Defective Received</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Exchange ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Old appliance Details</th>
                    <th className="px-6 py-4">Condition</th>
                    <th className="px-6 py-4">Valuation Offered</th>
                    <th className="px-6 py-4">Request Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredExchanges.map((ex) => (
                    <tr 
                      key={ex.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(ex)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{ex.id}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{ex.customer}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{ex.oldProduct}</p>
                          <p className="text-[#64748B] text-xs">{ex.oldBrand} - {ex.oldModel}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          ex.condition === 'Excellent' ? 'bg-green-50 text-green-700 border border-green-150' :
                          ex.condition === 'Good' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                          'bg-red-50 text-red-700 border border-red-150'
                        }`}>
                          {ex.condition}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{ex.valuation}</td>
                      <td className="px-6 py-4 text-[#64748B]">{ex.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          ex.status === 'Inspection Approved' ? 'bg-indigo-50 text-indigo-600' :
                          ex.status === 'Defective Received' ? 'bg-green-50 text-green-600' :
                          'bg-yellow-50 text-yellow-650'
                        }`}>
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleRowClick(ex)}
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

export default Exchanges;
