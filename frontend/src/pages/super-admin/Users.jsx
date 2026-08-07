import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest, getStoredTokens } from '../../lib/apiClient';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle, 
  Trash2,
  Eye,
  X,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Tv,
  Refrigerator,
  Flame,
  Smartphone,
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  Info,
  Download,
  Gift,
  ShoppingBag,
  Shield,
  FileText,
  RefreshCw
} from 'lucide-react';

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedSource, setSelectedSource] = useState('All Sources');
  const [selectedSort, setSelectedSort] = useState('Sort By');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals / Drawer state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [minAppliances, setMinAppliances] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 4;

  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

  const handleViewProfile = async (user) => {
    setSelectedUser(user);
    setShowDrawer(true);
    setActiveTab('overview');
    setLoadingDetails(true);
    try {
      const fullUser = await apiRequest(`/super-admin/users/${user._id || user.id}`, { auth: true });
      if (fullUser) {
        const formatted = {
          _id: fullUser._id,
          id: fullUser.humanId || user.id,
          name: fullUser.name,
          email: fullUser.email,
          phone: fullUser.phone,
          status: fullUser.status,
          referralCode: fullUser.referralCode || '—',
          addresses: fullUser.addresses ? fullUser.addresses.map(a => `${a.house || ''}, ${a.landmark || ''}, ${a.city || ''} ${a.pincode || ''}`) : [],
          applianceList: fullUser.ownedAppliances || [],
          source: fullUser.source || user.source || 'B2C',
          referrals: fullUser.referrals || [],
          amcSubscriptions: fullUser.amcSubscriptions || [],
          warrantyOrders: fullUser.warrantyOrders || [],
          serviceRequests: fullUser.serviceRequests || [],
          orders: fullUser.orders || [],
          exchangeRequests: fullUser.exchangeRequests || []
        };
        setSelectedUser(formatted);
      }
    } catch (err) {
      console.warn("Could not load complete customer profile, using list item:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await apiRequest('/super-admin/users?role=customer&limit=200', { auth: true });
        setUsers((res.data || []).map((item) => ({
          _id: item.id,
          id: item.humanId || item.id,
          name: item.name || 'User',
          email: item.email || '—',
          phone: item.phone || '—',
          appliances: item.appliancesCount ?? 0,
          services: item.servicesCount ?? 0,
          status: item.status || 'Active',
          lastActive: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-IN') : '—',
          addresses: (item.addresses || []).map(a => [a.house, a.landmark, a.city].filter(Boolean).join(', ')),
          applianceList: item.ownedAppliances || [],
          source: item.source || 'B2C',
        })));
      } catch (err) {
        setLoadError(err.message || 'Could not load the user list.');
      }
    }
    fetchUsers();
  }, []);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Persists the change. This was local-only, so suspending an account showed a
  // success toast while the user stayed signed in and fully active.
  const handleStatusChange = async (id, newStatus) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const previous = users;

    setUsers(users.map(u => (u.id === id ? { ...u, status: newStatus } : u)));
    if (selectedUser?.id === id) setSelectedUser({ ...selectedUser, status: newStatus });

    try {
      await apiRequest(`/super-admin/users/${target._id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus },
      });
      showToast(`User status updated to ${newStatus}`);
    } catch (err) {
      setUsers(previous);
      if (selectedUser?.id === id) setSelectedUser(previous.find(u => u.id === id) || null);
      setLoadError(err.message || 'Could not update the user status.');
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingUserId(id);
    setShowDeleteConfirm(true);
  };

  // Closing an account suspends it and revokes its sessions server-side. It is
  // not a hard delete: orders, service requests and invoices reference the user,
  // and the console used to claim a "permanent delete" that removed nothing.
  const handleDeleteConfirm = async () => {
    const user = users.find(u => u.id === deletingUserId);
    if (!user) return;

    try {
      await apiRequest(`/super-admin/users/${user._id}`, { method: 'DELETE', auth: true });
      setUsers(users.map(u => (u.id === deletingUserId ? { ...u, status: 'Suspended' } : u)));
      if (selectedUser?.id === deletingUserId) {
        setSelectedUser(null);
        setShowDrawer(false);
      }
      showToast(`Account for "${user.name}" was closed and signed out.`);
    } catch (err) {
      setLoadError(err.message || 'Could not close the account.');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
    }
  };

  // Filter and Sort logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || u.status === selectedStatus;
    const matchesSource = selectedSource === 'All Sources' || u.source === selectedSource;
    const matchesMinAppliances = !minAppliances || u.appliances >= Number(minAppliances);
    return matchesSearch && matchesStatus && matchesSource && matchesMinAppliances;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (selectedSort === 'Newest First') {
      return a.id.localeCompare(b.id) * -1;
    } else if (selectedSort === 'Most Active') {
      return b.services - a.services;
    }
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedUsers.length / entriesPerPage);
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = sortedUsers.slice(indexOfFirstEntry, indexOfLastEntry);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="User Management" />

        {/* Body */}
        {showDrawer && selectedUser ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowDrawer(false);
                  setSelectedUser(null);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Customers
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              {/* Header */}
              <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-[#1E293B]">Customer Details</h3>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview & Addresses' },
                  { id: 'appliances', label: 'Appliances & Plans' },
                  { id: 'services', label: 'Service History' },
                  { id: 'orders', label: 'Orders & Exchanges' },
                  { id: 'referrals', label: 'Referral Network' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#0D47A1] text-[#0D47A1]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[600px]">
                {loadingDetails ? (
                  <div className="animate-pulse space-y-6">
                    {/* Skeleton Overview */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-200 rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/5"></div>
                      </div>
                    </div>
                    {/* Skeleton Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3 border border-slate-100 rounded-xl p-4 bg-slate-50">
                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-3.5 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
                        <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Overview & Addresses */}
                    {activeTab === 'overview' && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 bg-[#EEF4FF] text-[#0D47A1] rounded-full flex items-center justify-center font-bold text-xl">
                            {selectedUser.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-[#1E293B] text-base">{selectedUser.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              selectedUser.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>{selectedUser.status}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2.5 text-xs border border-[#E2E8F0] rounded-xl p-4 bg-slate-50 font-medium">
                            <p className="flex items-center gap-2 text-slate-700"><Mail size={14} className="text-[#64748B]" /> {selectedUser.email}</p>
                            <p className="flex items-center gap-2 text-slate-700 mt-1.5"><Phone size={14} className="text-[#64748B]" /> {selectedUser.phone}</p>
                            <p className="flex items-center gap-2 text-slate-700 mt-1.5"><Info size={14} className="text-[#64748B]" /> Source: {selectedUser.source || 'B2C'}</p>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                              <MapPin size={14} className="text-[#0D47A1]" /> Saved Addresses ({selectedUser.addresses?.length || 0})
                            </h4>
                            <div className="space-y-2">
                              {selectedUser.addresses?.map((addr, idx) => (
                                <p key={idx} className="bg-white text-xs p-3 border border-[#E2E8F0] rounded-xl text-slate-600 font-semibold shadow-xs">
                                  {addr}
                                </p>
                              ))}
                              {(!selectedUser.addresses || selectedUser.addresses.length === 0) && (
                                <p className="text-xs text-slate-500 italic">No addresses saved yet.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Appliances & Plans */}
                    {activeTab === 'appliances' && (
                      <div className="space-y-6">
                        {/* Appliances */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Registered Appliances ({selectedUser.applianceList?.length || 0})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedUser.applianceList?.map((app, idx) => (
                              <div key={idx} className="p-3 border border-[#E2E8F0] rounded-xl flex items-center justify-between bg-white shadow-xs">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 bg-slate-100 rounded-lg text-[#0D47A1]">
                                    {app.type === 'TV' ? <Tv size={16} /> : <Refrigerator size={16} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-[#1E293B]">{app.brand} {app.type}</p>
                                    <p className="text-[10px] text-slate-500 font-semibold">{app.model || '—'}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] text-[#0D47A1] font-bold bg-[#EEF4FF] px-2 py-0.5 rounded-full">Active</span>
                              </div>
                            ))}
                            {(!selectedUser.applianceList || selectedUser.applianceList.length === 0) && (
                              <p className="text-xs text-slate-500 italic">No registered appliances.</p>
                            )}
                          </div>
                        </div>

                        {/* Purchased Plans (AMC & Extended Warranty) */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Purchased Subscriptions & Policies</h4>
                          
                          {/* AMC Plans */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-[#0D47A1] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">AMC Plans ({selectedUser.amcSubscriptions?.length || 0})</span>
                            <div className="grid grid-cols-1 gap-2 mt-1">
                              {selectedUser.amcSubscriptions?.map((sub, idx) => (
                                <div key={idx} className="p-3.5 border border-[#E2E8F0] rounded-xl bg-white flex flex-wrap justify-between items-center gap-3">
                                  <div>
                                    <p className="text-xs font-bold text-[#1E293B]">{sub.planName || sub.plan?.name || 'Annual Maintenance Plan'}</p>
                                    <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">Contract: {sub.contractNo} | Appliance: {sub.brand || '—'} {sub.category || ''}</p>
                                    <p className="text-[9px] text-[#94A3B8] font-bold mt-0.5">Valid: {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.expiryDate).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-[#0D47A1]">₹{sub.amountPaid || 1499}</p>
                                    <span className="text-[9px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{sub.status}</span>
                                  </div>
                                </div>
                              ))}
                              {(!selectedUser.amcSubscriptions || selectedUser.amcSubscriptions.length === 0) && (
                                <p className="text-xs text-slate-500 italic pl-1">No active AMC subscriptions.</p>
                              )}
                            </div>
                          </div>

                          {/* Extended Warranties */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">Extended Warranties ({selectedUser.warrantyOrders?.length || 0})</span>
                            <div className="grid grid-cols-1 gap-2 mt-1">
                              {selectedUser.warrantyOrders?.map((policy, idx) => (
                                <div key={idx} className="p-3.5 border border-slate-100 rounded-xl bg-white flex flex-wrap justify-between items-center gap-3">
                                  <div>
                                    <p className="text-xs font-bold text-[#1E293B]">{policy.brand} {policy.applianceCategory || 'Appliance'} Warranty</p>
                                    <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">Policy: {policy.policyId} | Model: {policy.modelNumber || '—'}</p>
                                    <p className="text-[9px] text-[#94A3B8] font-bold mt-0.5">Valid Till: {new Date(policy.validTill).toLocaleDateString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-indigo-700">₹{policy.price}</p>
                                    <span className="text-[9px] font-bold bg-green-50 text-green-600 px-1.5 py-0.5 rounded mt-1 inline-block uppercase tracking-wider">{policy.status}</span>
                                  </div>
                                </div>
                              ))}
                              {(!selectedUser.warrantyOrders || selectedUser.warrantyOrders.length === 0) && (
                                <p className="text-xs text-slate-500 italic pl-1">No active extended warranty policies.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Service Requests */}
                    {activeTab === 'services' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Service Booking History ({selectedUser.serviceRequests?.length || 0})</h4>
                        <div className="space-y-3">
                          {selectedUser.serviceRequests?.map((req) => {
                            const { accessToken } = getStoredTokens();
                            const receiptUrl = `${API_BASE_URL}/super-admin/users/${selectedUser._id}/service-receipt/${req._id}?token=${accessToken}`;
                            
                            return (
                              <div key={req._id} className="p-4 border border-[#E2E8F0] rounded-xl bg-white shadow-xs space-y-3">
                                <div className="flex justify-between items-start flex-wrap gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-[#0D47A1]">{req.humanId}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        req.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                      }`}>{req.status}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">Booked: {new Date(req.createdAt).toLocaleString()}</p>
                                  </div>
                                  <a
                                    href={receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 bg-[#EEF4FF] text-[#0D47A1] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#D5E4F7] transition-all"
                                  >
                                    <Download size={13} />
                                    Download Receipt
                                  </a>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs border-t border-slate-100 pt-2 font-semibold">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">APPLIANCE</span>
                                    {req.appliance?.brand || req.brand} {req.appliance?.type || req.category}
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">COMPLAINT TYPE</span>
                                    {req.complaintType}
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 block font-normal">TECHNICIAN</span>
                                    {req.technician?.name || 'Not Assigned'}
                                  </div>
                                </div>

                                {req.description && (
                                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    "{req.description}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {(!selectedUser.serviceRequests || selectedUser.serviceRequests.length === 0) && (
                            <p className="text-xs text-slate-500 italic text-center py-6">No service requests found for this customer.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Orders & Exchanges */}
                    {activeTab === 'orders' && (
                      <div className="space-y-6">
                        {/* E-Commerce Product Orders */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Product Purchase Orders ({selectedUser.orders?.length || 0})</h4>
                          <div className="space-y-3">
                            {selectedUser.orders?.map((ord) => {
                              const { accessToken } = getStoredTokens();
                              const orderReceiptUrl = `${API_BASE_URL}/super-admin/users/${selectedUser._id}/product-receipt/${ord._id}?token=${accessToken}`;
                              
                              return (
                                <div key={ord._id} className="p-4 border border-[#E2E8F0] rounded-xl bg-white shadow-xs space-y-3">
                                  <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#0D47A1]">{ord.humanId || ord._id}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">{ord.status}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">Ordered: {new Date(ord.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a
                                      href={orderReceiptUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1.5 bg-[#EEF4FF] text-[#0D47A1] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#D5E4F7] transition-all"
                                    >
                                      <Download size={13} />
                                      Download Invoice
                                    </a>
                                  </div>

                                  {/* Items list */}
                                  <div className="border-t border-slate-100 pt-2 text-xs font-semibold">
                                    <span className="text-[10px] text-slate-400 block font-normal mb-1.5">ITEMS</span>
                                    <div className="space-y-1.5">
                                      {ord.items?.map((item, i) => (
                                        <div key={i} className="flex justify-between text-slate-700">
                                          <span>{item.name} <span className="text-slate-400 font-normal">x{item.quantity}</span></span>
                                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex justify-between border-t border-slate-50 mt-2.5 pt-2 text-slate-800 font-black">
                                      <span>Grand Total:</span>
                                      <span>₹{ord.total.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {(!selectedUser.orders || selectedUser.orders.length === 0) && (
                              <p className="text-xs text-slate-500 italic pl-1">No orders placed yet.</p>
                            )}
                          </div>
                        </div>

                        {/* Exchange Valuation Requests */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Device Exchange Valuations ({selectedUser.exchangeRequests?.length || 0})</h4>
                          <div className="space-y-3">
                            {selectedUser.exchangeRequests?.map((exch) => {
                              const { accessToken } = getStoredTokens();
                              const exchangeReceiptUrl = `${API_BASE_URL}/super-admin/users/${selectedUser._id}/exchange-receipt/${exch._id}?token=${accessToken}`;
                              
                              return (
                                <div key={exch._id} className="p-4 border border-[#E2E8F0] rounded-xl bg-white shadow-xs space-y-3">
                                  <div className="flex justify-between items-start flex-wrap gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#0D47A1]">{exch.humanId || exch._id}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600">{exch.status}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">Submitted: {new Date(exch.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a
                                      href={exchangeReceiptUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1.5 bg-[#EEF4FF] text-[#0D47A1] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#D5E4F7] transition-all"
                                    >
                                      <Download size={13} />
                                      Valuation Report
                                    </a>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-slate-100 pt-2 font-semibold">
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-normal">APPLIANCE</span>
                                      {exch.brand} {exch.category}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-normal">MODEL</span>
                                      {exch.model || '—'}
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-normal">CONDITION</span>
                                      {exch.condition}
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[10px] text-slate-400 block font-normal">EST. VALUE</span>
                                      <span className="text-[#22C55E]">₹{exch.estimatedValue}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {(!selectedUser.exchangeRequests || selectedUser.exchangeRequests.length === 0) && (
                              <p className="text-xs text-slate-500 italic pl-1">No exchange requests submitted.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 5: Referral Network */}
                    {activeTab === 'referrals' && (
                      <div className="space-y-5">
                        {/* Referral Code Display */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold text-[#0D47A1] uppercase tracking-wider">Referral Code</span>
                            <p className="text-lg font-black text-slate-800 tracking-wider mt-0.5">{selectedUser.referralCode || '—'}</p>
                          </div>
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#0D47A1] shadow-xs">
                            <Gift size={22} />
                          </div>
                        </div>

                        {/* Referred Signups */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Referred Signups Network ({selectedUser.referrals?.length || 0})</h4>
                          <div className="space-y-2">
                            {selectedUser.referrals?.map((ref) => {
                              const refUserObj = ref.referredUser || {};
                              return (
                                <div key={ref._id} className="p-3 border border-[#E2E8F0] rounded-xl flex items-center justify-between bg-white shadow-xs">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                                      {refUserObj.name ? refUserObj.name.split(' ').map(n => n[0]).join('') : 'U'}
                                    </div>
                                    <div className="text-left">
                                      {/* Deep Link to Referred User Profile */}
                                      <button
                                        type="button"
                                        onClick={() => handleViewProfile(refUserObj)}
                                        className="text-[#0D47A1] text-xs font-bold hover:underline block text-left"
                                      >
                                        {refUserObj.name || 'Anonymous User'}
                                      </button>
                                      <span className="text-[10px] text-slate-400 font-bold block">{refUserObj.phone || '—'}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold">Reward Bonus</p>
                                    <span className="text-xs font-bold text-green-600">₹{ref.bonusAmount || 100}</span>
                                  </div>
                                </div>
                              );
                            })}
                            {(!selectedUser.referrals || selectedUser.referrals.length === 0) && (
                              <p className="text-xs text-slate-500 italic pl-1">No signups registered with this referral code yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                {selectedUser.status === 'Active' ? (
                  <button
                    onClick={() => handleStatusChange(selectedUser.id, 'Suspended')}
                    className="w-full bg-orange-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <Ban size={16} /> Suspend Account
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(selectedUser.id, 'Active')}
                    className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} /> Activate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Customers / Users</h2>
            <div className="flex gap-2">
              <span className="text-sm text-[#64748B] font-semibold">Total Users: <span className="text-[#0D47A1] font-bold">{users.length}</span></span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-col gap-4 shadow-sm">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                    placeholder="Search Name, ID or Email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Filters */}
                <select 
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Pending</option>
                </select>

                <select 
                  value={selectedSource}
                  onChange={(e) => {
                    setSelectedSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>All Sources</option>
                  <option>B2B</option>
                  <option>B2C</option>
                  <option>AMC</option>
                  <option>Extended Warranty</option>
                </select>

                <select 
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>Sort By</option>
                  <option>Newest First</option>
                  <option>Most Active</option>
                </select>
              </div>

              <button 
                onClick={() => setShowExtraFilters(!showExtraFilters)}
                className={`border px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  showExtraFilters ? 'bg-[#EEF4FF] border-[#0D47A1] text-[#0D47A1]' : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <Filter size={16} /> More Filters
              </button>
            </div>

            {/* Extra Filters panel */}
            {showExtraFilters && (
              <div className="border-t border-[#E2E8F0] pt-4 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#64748B] uppercase">Min Appliances:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={minAppliances}
                    onChange={(e) => {
                      setMinAppliances(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-[#E2E8F0] rounded px-3 py-1.5 outline-none text-xs w-20 text-slate-800 bg-[#F8FAFC]"
                  />
                </div>
                <button 
                  onClick={() => {
                    setMinAppliances('');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-[#0D47A1] font-semibold hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-700">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Appliances</th>
                    <th className="px-6 py-4">Service Count</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {currentEntries.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                          <div className="flex items-center gap-2">
                              <p className="text-[#1E293B] font-bold text-sm">{user.name}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                user.source === 'B2B' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                user.source === 'AMC' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                user.source === 'Extended Warranty' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {user.source || 'B2C'}
                              </span>
                            </div>
                            <p className="text-[#64748B] text-xs font-medium">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] text-xs font-semibold">{user.email}</p>
                          <p className="text-[#64748B] text-xs mt-0.5 font-medium">{user.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{user.appliances}</td>
                      <td className="px-6 py-4 font-bold text-[#1E293B]">{user.services}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.status === 'Active' ? 'bg-green-50 text-green-600' :
                          user.status === 'Suspended' ? 'bg-red-50 text-red-600' :
                          'bg-yellow-50 text-yellow-600'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B] font-medium">{user.lastActive}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleViewProfile(user)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          {user.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Suspended')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors" 
                              title="Suspend"
                            >
                              <Ban size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(user.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteClick(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {sortedUsers.length === 0 && (
              <div className="text-center py-12 bg-white">
                <UsersIcon size={48} className="text-[#64748B] mx-auto mb-4 opacity-50 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Users Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}

            {/* Pagination */}
            {sortedUsers.length > 0 && (
              <div className="p-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm text-[#64748B] font-semibold">
                <span>Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, sortedUsers.length)} of {sortedUsers.length} entries</span>
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => paginate(idx + 1)}
                      className={`px-3 py-1 rounded transition-colors ${
                        currentPage === idx + 1 ? 'bg-[#0D47A1] text-white' : 'border border-[#E2E8F0] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 border border-[#E2E8F0] rounded hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>



      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[#1E293B] text-lg">Close Customer Account?</h3>
              <p className="text-sm text-[#64748B]">The account is suspended and signed out immediately. Service history, warranty registrations and invoices are kept — they are referenced by past orders and cannot be removed.</p>
            </div>

            <div className="flex gap-3 justify-center text-sm pt-2">
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingUserId(null);
                }}
                className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex-1"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm flex-1"
              >
                Confirm Delete
              </button>
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
  );
};

export default Users;
