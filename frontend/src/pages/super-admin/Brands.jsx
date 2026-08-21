import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Building, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  Eye,
  Plus,
  ShieldCheck,
  TrendingUp,
  X,
  ArrowLeft,
  Mail,
  Phone as PhoneIcon,
  Calendar as CalendarIcon,
  Download
} from 'lucide-react';

const Brands = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedBrandProfile, setSelectedBrandProfile] = useState(null);
  // SLA figures are per-brand and derived server-side; loaded when a profile opens.
  const [brandSla, setBrandSla] = useState(null);

  useEffect(() => {
    if (!selectedBrandProfile?.id) { setBrandSla(null); return; }
    let cancelled = false;
    apiRequest(`/super-admin/brands/${selectedBrandProfile.id}/sla`, { auth: true })
      .then((res) => { if (!cancelled) setBrandSla(res); })
      .catch((err) => console.warn('[brands] Could not load SLA figures:', err.message));
    return () => { cancelled = true; };
  }, [selectedBrandProfile?.id]);

  // Real billed work for the brand being viewed, grouped by service category.
  const [serviceRevenue, setServiceRevenue] = useState([]);

  useEffect(() => {
    if (!selectedBrandProfile?.id) { setServiceRevenue([]); return; }
    let cancelled = false;
    apiRequest(`/super-admin/brands/${selectedBrandProfile.id}/service-revenue`, { auth: true })
      .then((res) => { if (!cancelled) setServiceRevenue(res || []); })
      .catch((err) => { if (!cancelled) { setServiceRevenue([]); console.warn('[brands] Could not load service revenue:', err.message); } });
    return () => { cancelled = true; };
  }, [selectedBrandProfile?.id]);

  const [showModal, setShowModal] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: '', category: 'Home Appliances', activeCases: '0', spareStock: '0', status: 'Active', revenue: '₹0' });

  const [brands, setBrands] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function fetchBrands() {
      try {
        // `apiRequest` returns the envelope's `data` payload directly (apiClient's
        // rawRequest ends in `return json.data`), so this is already the array.
        // Unwrapping it a second time yielded undefined and this screen showed
        // five invented brands instead of the real ones.
        const res = await apiRequest('/super-admin/brands?limit=200', { auth: true });
        setBrands((res || []).map((item) => ({
          id: item.id,
          humanId: item.humanId || item.id,
          name: item.name,
          category: item.category || '—',
          activeCases: item.activeCases ?? 0,
          spareStock: item.spareStock ?? 0,
          status: item.status || 'Pending',
          revenue: item.revenue != null ? `₹${Number(item.revenue).toLocaleString('en-IN')}` : '₹0',
          supportEmail: item.supportEmail || '',
          supportPhone: item.supportPhone || '',
          createdAt: item.createdAt || null,
        })));
      } catch (err) {
        setLoadError(err.message || 'Could not load the brand list.');
      }
    }
    fetchBrands();
  }, []);

  useEffect(() => {
    if (location.search.includes('add=true')) {
      setShowModal(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Persists. This only changed browser state, so a brand "activated" here was
  // still Pending for everyone else and could not be assigned work.
  const handleStatusChange = async (id, newStatus) => {
    const previous = brands;
    setBrands(brands.map(b => (b.id === id ? { ...b, status: newStatus } : b)));
    setLoadError('');
    try {
      await apiRequest(`/super-admin/brands/${id}`, { method: 'PUT', auth: true, body: { status: newStatus } });
      showToast(`Brand status updated to ${newStatus}`);
    } catch (err) {
      setBrands(previous);
      setLoadError(err.message || 'Could not update the brand status.');
    }
  };

  const handleAddBrandSubmit = async (e) => {
    e.preventDefault();
    if (!newBrand.name) {
      showToast('Please enter a brand name.');
      return;
    }

    setLoadError('');
    try {
      const res = await apiRequest('/super-admin/brands', {
        method: 'POST',
        auth: true,
        body: {
          name: newBrand.name,
          category: newBrand.category,
          status: newBrand.status,
        },
      });
      setBrands((prev) => [{
        id: res.id,
        humanId: res.humanId || res.id,
        name: res.name,
        category: res.category || '—',
        activeCases: 0,
        spareStock: 0,
        status: res.status,
        revenue: '₹0',
      }, ...prev]);
      setNewBrand({ name: '', category: 'Home Appliances', activeCases: '0', spareStock: '0', status: 'Active', revenue: '₹0' });
      setShowModal(false);
      showToast(`Brand "${res.name}" registered.`);
    } catch (err) {
      setLoadError(err.message || 'Could not register the brand.');
    }
  };

  const handleExportCSV = (brandName, rowsIn) => {
    if (!rowsIn.length) {
      setLoadError('There is no billed work for this brand to export.');
      return;
    }
    const headers = ["Category", "Avg per Ticket (INR)", "Tickets Closed", "Total Revenue (INR)"];
    const rows = rowsIn.map(r => [r.category, r.averageTicket, r.count, r.revenue]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${brandName.toLowerCase().replace(/\s+/g, '_')}_service_revenue.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Service revenue sheet downloaded successfully!');
  };

  const filteredBrands = brands.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || b.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All Status' || b.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const renderFullPageBrand = () => {
    const brand = selectedBrandProfile;
    return (
      <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC]">
        {/* Back navigation & Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedBrandProfile(null)}
            className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Partner Brands
          </button>
          
          <div className="flex gap-2">
            {brand.status === 'Pending' ? (
              <button 
                onClick={() => {
                  handleStatusChange(brand.id, 'Active');
                  setSelectedBrandProfile({ ...brand, status: 'Active' });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck size={14} /> Approve Brand
              </button>
            ) : (
              <button 
                onClick={() => {
                  handleStatusChange(brand.id, 'Pending');
                  setSelectedBrandProfile({ ...brand, status: 'Pending' });
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <XCircle size={14} /> Deactivate Brand
              </button>
            )}
          </div>
        </div>

        {/* Brand Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden text-left">
          <div className="bg-gradient-to-r from-[#0D47A1] to-[#1E3A8A] h-32 relative"></div>
          <div className="p-6 relative pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 bg-[#EEF4FF] rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-[#0D47A1] font-black text-3xl -mt-12 relative z-10">
                  {brand.name[0]}
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl font-extrabold text-[#1E293B]">{brand.name}</h1>
                  <p className="text-sm text-[#64748B] font-medium">{brand.id} • Authorized Nigam Partner Brand</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pb-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  brand.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                  'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  {brand.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold bg-[#EEF4FF] text-[#0D47A1] border border-blue-200`}>
                  {brand.category}
                </span>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Core Info */}
              <div className="space-y-6 lg:col-span-1">
                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">Partner Brand Info</h3>
                  <div className="space-y-3.5 text-sm">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Mail size={16} className="text-[#64748B] flex-shrink-0" />
                      <span className="truncate">{brand.supportEmail || 'No support email recorded'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <PhoneIcon size={16} className="text-[#64748B] flex-shrink-0" />
                      <span>{brand.supportPhone || 'No support number recorded'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-700">
                      <CalendarIcon size={16} className="text-[#64748B] flex-shrink-0" />
                      <span>{brand.createdAt ? `Partnered ${new Date(brand.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Partnership date not recorded'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-4">SLA Compliance</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-[#64748B] font-medium">Avg Resolution Time</span>
                      <span className="text-slate-800 font-semibold">
                        {brandSla?.avgResolutionHours != null ? `${brandSla.avgResolutionHours} Hrs` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-[#64748B] font-medium">SLA Adherence Rate</span>
                      <span className="text-green-600 font-semibold">
                        {brandSla?.slaAdherencePercent != null ? `${brandSla.slaAdherencePercent}%` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[#64748B] font-medium">Customer Sat Score</span>
                      <span className="text-amber-500 font-semibold">
                        {brandSla?.avgRating != null ? `${brandSla.avgRating} / 5.0` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Stats & History */}
              <div className="space-y-6 lg:col-span-2">
                
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Active Cases</p>
                    <p className="text-2xl font-bold text-[#1E293B] mt-1">{brand.activeCases}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Spare Parts Stock</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{brand.spareStock}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Revenue Share</p>
                    <p className="text-2xl font-bold text-green-600 mt-1 flex items-center justify-center gap-1">
                      <TrendingUp size={18} /> {brand.revenue}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-sm text-center">
                    <p className="text-xs text-[#64748B] font-medium">Contract Terms</p>
                    <p className="text-sm font-semibold text-slate-800 mt-2">12 Months (Auto-Renew)</p>
                  </div>
                </div>

                {/* Service Offerings & Revenue Breakdown */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-[#1E293B]">Service Revenue Breakdown</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Calculated total business contribution of each service for {brand.name}.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleExportCSV(brand.name, serviceRevenue)}
                        className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-205 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-3xs"
                        title="Download CSV / Excel"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export Excel</span>
                      </button>
                      <span className="bg-green-55 text-green-700 text-xs font-bold px-2.5 py-1.5 rounded-full border border-green-200">
                        Total: {brand.revenue}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-3xs mt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Service Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Price per Ticket</th>
                          <th className="p-3 text-center">Tickets Closed</th>
                          <th className="p-3 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                        {serviceRevenue.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-xs font-semibold text-slate-400">
                              No completed work billed for this brand yet.
                            </td>
                          </tr>
                        )}
                        {serviceRevenue.map((row) => (
                          <tr key={row.category} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{row.category}</td>
                            <td className="p-3 text-slate-500">Service</td>
                            <td className="p-3 text-right text-slate-500">₹{row.averageTicket.toLocaleString('en-IN')}</td>
                            <td className="p-3 text-center">
                              <span className="bg-blue-50 text-[#0D47A1] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                {row.count} Tickets
                              </span>
                            </td>
                            <td className="p-3 text-right text-green-600 font-black">
                              ₹{row.revenue.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Brand Management" />

        {/* Body */}
        {selectedBrandProfile ? (
          renderFullPageBrand()
        ) : (
          <div className="p-6 space-y-6 flex-1 text-left">
          
            {/* Header Actions */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1E293B]">Partner Brands</h2>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Add Brand
              </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                    placeholder="Search Brand Name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Filter */}
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>All Categories</option>
                  <option>Home Appliances</option>
                  <option>Electronics & Appliances</option>
                  <option>White Goods</option>
                  <option>Small Appliances</option>
                </select>

                {/* Status Filter */}
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Pending</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All Categories');
                  setSelectedStatus('All Status');
                  showToast('Filters reset successfully');
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Reset Filters
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-6 py-4">Brand</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Active Cases</th>
                      <th className="px-6 py-4">Spare Stock</th>
                      <th className="px-6 py-4">Revenue Share</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-slate-700 font-semibold">
                    {filteredBrands.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#EEF4FF] rounded-lg flex items-center justify-center text-[#0D47A1] font-bold text-lg">
                              {b.name[0]}
                            </div>
                            <div>
                              <p className="text-[#1E293B] font-bold text-sm">{b.name}</p>
                              <p className="text-[#64748B] text-xs font-semibold">{b.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{b.category}</td>
                        <td className="px-6 py-4">{b.activeCases}</td>
                        <td className="px-6 py-4 text-[#64748B]">{b.spareStock} units</td>
                        <td className="px-6 py-4 text-green-600 font-extrabold">{b.revenue}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            b.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => setSelectedBrandProfile(b)}
                              className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            {b.status === 'Active' ? (
                              <button 
                                onClick={() => handleStatusChange(b.id, 'Pending')}
                                className="p-1.5 text-red-655 hover:bg-red-50 rounded transition-colors"
                                title="Deactivate"
                              >
                                <XCircle size={16} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStatusChange(b.id, 'Active')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Main Register Brand Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-[#1E293B] text-lg">Register New Partner Brand</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[#64748B] hover:text-[#1E293B] p-1 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddBrandSubmit} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Brand Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  placeholder="e.g. Somany"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#64748B] mb-1 block">Category</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                  value={newBrand.category}
                  onChange={(e) => setNewBrand({ ...newBrand, category: e.target.value })}
                >
                  <option>Home Appliances</option>
                  <option>Electronics & Appliances</option>
                  <option>White Goods</option>
                  <option>Small Appliances</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Spare Stock Units</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. 500"
                    value={newBrand.spareStock}
                    onChange={(e) => setNewBrand({ ...newBrand, spareStock: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64748B] mb-1 block">Contract Revenue Share</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-slate-800 bg-[#F8FAFC]"
                    placeholder="e.g. ₹1.5L"
                    value={newBrand.revenue}
                    onChange={(e) => setNewBrand({ ...newBrand, revenue: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex gap-3 justify-end text-sm">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white text-[#64748B] border border-[#E2E8F0] px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0D47A1] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {successMessage}
        </div>
      )}

    </div>
  );
};

export default Brands;
