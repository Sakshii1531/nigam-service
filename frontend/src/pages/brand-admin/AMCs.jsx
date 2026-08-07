import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  Wrench, 
  CheckCircle2, 
  TrendingUp, 
  IndianRupee,
  X,
  Eye,
  Calendar,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function shape(sub) {
  const total = sub.visitsTotal ?? sub.plan?.visitsTotal ?? 0;
  const remaining = sub.visitsRemaining ?? 0;
  return {
    id: sub.id,
    ref: sub.humanId || sub.id,
    customer: sub.user?.name || 'Customer',
    // AMC subscriptions record the appliance brand/model, not a product name.
    product: sub.model || sub.brand || '—',
    planName: sub.plan?.name || 'AMC Plan',
    cost: sub.plan?.price != null ? currency.format(sub.plan.price) : '—',
    costValue: sub.plan?.price || 0,
    // Displayed as used/total, which is what the operator reads.
    visits: `${Math.max(total - remaining, 0)}/${total}`,
    visitsRemaining: remaining,
    status: sub.status || 'Active',
    expiryDate: sub.expiryDate ? dateFormatter.format(new Date(sub.expiryDate)) : '—',
    brand: sub.brand || '—',
    model: sub.model || '—',
  };
}

const AMCs = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedAmc, setSelectedAmc] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('All Plans');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [amcs, setAmcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadAmcs() {
      try {
        const data = await apiRequest('/brand/amc-subscriptions', { auth: true });
        if (!cancelled) setAmcs((data?.data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAmcs();
    return () => { cancelled = true; };
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleRowClick = (amc) => {
    setSelectedAmc(amc);
    setShowDrawer(true);
  };

  // Both actions reach the customer now. They used to be success toasts only:
  // no reminder was sent, and "scheduling" a visit just incremented a counter
  // in the browser while no AMCVisit was ever created.
  const triggerRenewalReminder = async (amcId) => {
    setError('');
    try {
      await apiRequest(`/brand/actions/amc/${amcId}/renewal-reminder`, { method: 'POST', auth: true });
      showToast('Renewal reminder sent to the customer.');
      setShowDrawer(false);
    } catch (err) {
      setError(err.message || 'Could not send the renewal reminder.');
    }
  };

  const triggerScheduleVisit = async (amcId) => {
    const date = window.prompt('Visit date (YYYY-MM-DD):');
    if (!date) return;

    setError('');
    try {
      await apiRequest(`/brand/actions/amc/${amcId}/visits`, {
        method: 'POST',
        auth: true,
        body: { scheduledDate: date },
      });
      showToast('Maintenance visit scheduled and the customer notified.');
      setShowDrawer(false);
    } catch (err) {
      setError(err.message || 'Could not schedule the visit.');
    }
  };

  const filteredAmcs = amcs.filter(amc => {
    const matchesSearch = amc.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          amc.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          amc.product.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlan === 'All Plans' || amc.planName === selectedPlan;
    const matchesStatus = selectedStatus === 'All Status' || amc.status === selectedStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const activeAmcCount = amcs.filter(a => a.status === 'Active' || a.status === 'Expiring Soon').length;

  // "Renewal Rate" is gone — nothing records whether a subscription replaced an
  // earlier one, so it cannot be derived. Visits remaining is real and is the
  // figure that actually drives scheduling.
  const stats = [
    { title: 'Active AMCs', value: String(activeAmcCount), icon: <Wrench size={20} />, color: 'bg-blue-600' },
    { title: 'AMC Revenue', value: currency.format(amcs.reduce((acc, a) => acc + a.costValue, 0)), icon: <IndianRupee size={20} />, color: 'bg-emerald-600' },
    { title: 'Visits Remaining', value: String(amcs.reduce((acc, a) => acc + a.visitsRemaining, 0)), icon: <Calendar size={20} />, color: 'bg-yellow-500' },
    { title: 'Expiring Soon', value: String(amcs.filter(a => a.status === 'Expiring Soon').length), icon: <TrendingUp size={20} />, color: 'bg-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="AMC Subscriptions" />

        {showDrawer && selectedAmc ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to AMC Subscriptions
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl">
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">AMC Contract Details</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedAmc.id}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Customer Info</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Name:</span>
                      <span className="font-medium text-[#1E293B]">{selectedAmc.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Appliance:</span>
                      <span className="font-medium text-[#1E293B]">{selectedAmc.product} ({selectedAmc.brand})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Model:</span>
                      <span className="font-medium text-[#1E293B]">{selectedAmc.model}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Plan Coverage</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Plan:</span>
                      <span className="font-semibold text-indigo-600">{selectedAmc.planName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Visits:</span>
                      <span className="font-medium text-[#1E293B]">{selectedAmc.visits} scheduled visits completed</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Expiry Date:</span>
                      <span className="font-medium text-red-600">{selectedAmc.expiryDate}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Maintenance History</h3>
                  <div className="border-l-2 border-[#E2E8F0] ml-2 pl-4 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 bg-green-600 rounded-full"></div>
                      <p className="text-sm font-medium text-[#1E293B]">Visit #1: Deep Cleaning</p>
                      <p className="text-xs text-[#64748B]">Completed on 15 Feb, 2026 by Rahul Kumar</p>
                    </div>
                    {selectedAmc.visits.startsWith('0') ? (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <p className="text-sm font-medium text-[#1E293B]">Visit #1: Preventive Maintenance</p>
                        <p className="text-xs text-[#64748B]">Scheduled for 30 Jun, 2026</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-300 rounded-full"></div>
                        <p className="text-sm font-medium text-[#64748B]">Visit #2: Diagnostics checkup</p>
                        <p className="text-xs text-[#64748B]">Pending schedule</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                <button 
                  onClick={() => triggerRenewalReminder(selectedAmc.id)}
                  className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-1"
                >
                  <Bell size={14} /> Send Reminder
                </button>
                <button 
                  onClick={() => triggerScheduleVisit(selectedAmc.id)}
                  className="bg-[#0D47A1] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  Schedule Visit
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
            {/* Summary Cards */}
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
                  placeholder="Search Subscription ID, Customer..."
                />
              </div>

              <select 
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Plans</option>
                <option>Essential AMC</option>
                <option>Comprehensive AMC</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Expiring Soon</option>
                <option>Expired</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedPlan('All Plans');
                setSelectedStatus('All Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
            >
              Reset Filters
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Subscription ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Appliance</th>
                    <th className="px-6 py-4">Plan Name</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Visits Completed</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading AMC subscriptions…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={9} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {filteredAmcs.map((amc) => (
                    <tr 
                      key={amc.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(amc)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{amc.ref}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{amc.customer}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{amc.product}</td>
                      <td className="px-6 py-4 text-[#64748B]">{amc.planName}</td>
                      <td className="px-6 py-4 font-semibold text-[#1E293B]">{amc.cost}</td>
                      <td className="px-6 py-4 text-[#64748B]">{amc.visits}</td>
                      <td className="px-6 py-4 text-[#64748B]">{amc.expiryDate}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          amc.status === 'Active' ? 'bg-green-50 text-green-600' :
                          amc.status === 'Expiring Soon' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {amc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleRowClick(amc)}
                          className="text-[#64748B] hover:text-[#0D47A1]"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAmcs.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-6 py-10 text-center text-sm text-[#64748B]">
                        No AMC subscriptions found matching search or filter criteria.
                      </td>
                    </tr>
                  )}
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

export default AMCs;
