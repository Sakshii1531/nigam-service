import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Calendar, CheckCircle2, Clock, 
  MapPin, Star, User, Phone, Wrench, Shield, ChevronRight, 
  FileText, Sparkles, RefreshCw, X, AlertCircle, TrendingUp,
  Tag, ExternalLink, Check, Briefcase, Zap, Flame, Wind, Droplets, Cpu,
  CreditCard, Package, Receipt
} from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { apiRequest } from '../../lib/apiClient';
import { useTech } from '../../context/TechContext';

function formatAddress(addr) {
  if (!addr) return '—';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    const parts = [
      addr.house,
      addr.area,
      addr.landmark,
      addr.city,
      addr.pincode,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }
  return String(addr);
}

const ServiceHistory = () => {
  const navigate = useNavigate();
  const { earningsTally } = useTech();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch technician service history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/tech/jobs/history?status=${activeFilter}&search=${encodeURIComponent(searchQuery)}`, { auth: true });
      setHistory(res?.items || []);
    } catch (err) {
      console.warn('[service-history] Fetch error:', err.message);
      setError(err.message || 'Could not load service history.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Icon Helper for Appliance/Service Types
  const getCategoryIcon = (category = '', title = '') => {
    const text = (category + ' ' + title).toLowerCase();
    if (text.includes('ac') || text.includes('air') || text.includes('cooling')) {
      return <Wind className="h-5 w-5 text-cyan-600" />;
    }
    if (text.includes('ro') || text.includes('water') || text.includes('purifier') || text.includes('plumb')) {
      return <Droplets className="h-5 w-5 text-blue-600" />;
    }
    if (text.includes('geyser') || text.includes('heater') || text.includes('gas')) {
      return <Flame className="h-5 w-5 text-amber-600" />;
    }
    if (text.includes('pcb') || text.includes('tv') || text.includes('electric') || text.includes('circuit')) {
      return <Cpu className="h-5 w-5 text-indigo-600" />;
    }
    return <Wrench className="h-5 w-5 text-[#0D47A1]" />;
  };

  // Filter Pills Definition
  const filterPills = [
    { id: 'all', label: 'All Services' },
    { id: 'completed', label: 'Completed' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'quick', label: 'QuickPayout (D2C)' },
    { id: 'warranty', label: 'Warranty (FOC)' },
    { id: 'amc', label: 'AMC Service' },
  ];

  // Calculated Stats
  const totalCompleted = history.filter(j => j.activeStep === 'completed' || j.repairStatus === 'completed').length;
  const totalEarned = history.reduce((sum, j) => sum + (j.billingEstimate?.technicianEarnings || j.billingEstimate?.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-8 font-sans relative">

      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-black text-[#052355]">Service History</h1>
        </div>
        <button 
          onClick={() => fetchHistory()} 
          className="p-2 hover:bg-slate-50 rounded-full text-slate-500 active:rotate-180 transition-transform"
          title="Refresh"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Desktop Page Top Header Bar */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#052355] tracking-tight">Service & Job History</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Complete record of fulfilled jobs, customer verification and earned payouts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHistory()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3.5 lg:px-6 xl:px-8 flex flex-col gap-4 max-w-screen-xl mx-auto w-full">

        {/* Top KPI Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[#0D47A1] flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Services</span>
              <p className="text-xl font-black text-[#052355] mt-0.5">{earningsTally?.completedTotal || totalCompleted || history.length}</p>
              <span className="text-[9.5px] text-slate-400 font-medium">All-time jobs</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 flex-shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jobs Revenue</span>
              <p className="text-xl font-black text-[#052355] mt-0.5">₹{(earningsTally?.total || totalEarned).toLocaleString('en-IN')}</p>
              <span className="text-[9.5px] text-emerald-700 font-medium">Credited to ledger</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600 flex-shrink-0">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer Rating</span>
              <p className="text-xl font-black text-[#052355] mt-0.5">4.9 ★</p>
              <span className="text-[9.5px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded-sm">Verified Elite</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600 flex-shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Success Rate</span>
              <p className="text-xl font-black text-[#052355] mt-0.5">99.2%</p>
              <span className="text-[9.5px] text-slate-400 font-medium">First-visit resolved</span>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Options Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-4">
          <div className="relative w-full">
            <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Job ID, customer name, brand or service..."
              className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D47A1] focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filterPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveFilter(pill.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === pill.id
                    ? 'bg-[#0D47A1] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* History Records Container */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0D47A1]" />
            <span className="text-xs font-semibold">Loading service history records...</span>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-2 text-rose-600">
            <AlertCircle className="h-7 w-7" />
            <span className="text-xs font-bold">{error}</span>
            <button 
              onClick={() => fetchHistory()}
              className="mt-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Briefcase className="h-8 w-8 stroke-[1.5]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#052355]">No Service Records Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {searchQuery 
                  ? `No service history matching "${searchQuery}". Try clearing search keywords.`
                  : 'Completed jobs and resolved service tickets will be permanently logged here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((job) => {
              const sr = job.serviceRequest || {};
              const customerName = sr?.user?.name || sr?.contactName || 'Customer';
              const customerPhone = sr?.user?.phone || sr?.contactPhone || '';
              const customerAddress = formatAddress(sr?.booking?.address || sr?.address || sr?.zone);
              const serviceTitle = sr?.title || sr?.serviceType || sr?.category || 'Appliance Repair & Service';
              const brandName = sr?.brand || 'Nigam Care Verified';
              const completedDate = job.updatedAt ? new Date(job.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';
              const earnings = job.billingEstimate?.technicianEarnings ?? job.billingEstimate?.totalAmount ?? 0;
              const isWarranty = job.type === 'Brand Warranty' || job.type === 'Under Warranty' || job.type === 'NCC Extended Warranty';
              const isAmc = job.type === 'AMC Service' || job.type === 'AMC Visit';
              const jobIdShort = String(sr?.humanId || job.humanId || job._id || job.id).slice(-8).toUpperCase();
              const isCompleted = job.activeStep === 'completed' || job.repairStatus === 'completed';

              return (
                <div
                  key={job._id || job.id}
                  onClick={() => setSelectedJob(job)}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-4 hover:border-[#0D47A1]/40 hover:shadow-xs transition-all text-left group cursor-pointer"
                >
                  {/* Top Bar: Category badge & Job ID */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {getCategoryIcon(sr?.category, serviceTitle)}
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          #{jobIdShort} • {brandName}
                        </span>
                        <h3 className="text-sm font-black text-[#052355] line-clamp-1 leading-snug group-hover:text-[#0D47A1] transition-colors">
                          {serviceTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[9.5px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        isWarranty 
                          ? 'bg-blue-50 text-[#0D47A1] border-blue-200' 
                          : isAmc 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {job.type || 'D2C Service'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        isCompleted ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Location Snippet */}
                  <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-3.5 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-700 font-bold min-w-0">
                        <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{customerName}</span>
                      </div>
                      {customerPhone && (
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" /> ••••{customerPhone.slice(-4)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{customerAddress}</span>
                    </div>
                  </div>

                  {/* Bottom Footer: Date, Earnings & View CTA */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{completedDate}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-black text-[#052355]">₹{earnings.toLocaleString('en-IN')}</span>
                        <span className="text-[9px] text-emerald-600 font-bold block">
                          {isCompleted ? 'Credited' : 'Estimated'}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="p-2 bg-slate-100 hover:bg-[#0D47A1] hover:text-white rounded-xl text-slate-500 transition-colors cursor-pointer"
                        title="View Job Details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Comprehensive Service Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Service Summary • #{String(selectedJob.serviceRequest?.humanId || selectedJob.humanId || selectedJob._id || selectedJob.id).slice(-8).toUpperCase()}
                </span>
                <h3 className="text-base font-black text-[#052355]">
                  {selectedJob.serviceRequest?.title || selectedJob.serviceRequest?.serviceType || selectedJob.serviceRequest?.category || 'Service Record'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedJob(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 text-xs">
              
              {/* Status & Category Overview Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-2.5">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Job Status</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full border ${
                    selectedJob.activeStep === 'completed' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                      : 'text-blue-700 bg-blue-50 border-blue-200'
                  }`}>
                    {selectedJob.activeStep === 'completed' ? 'Completed & Settled' : (selectedJob.activeStep || 'In Progress')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Service Type</span>
                  <span className="font-bold text-slate-800">{selectedJob.type || 'NCC Paid Service'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Appliance / Brand</span>
                  <span className="font-bold text-slate-800">
                    {selectedJob.serviceRequest?.brand || 'Nigam Care Verified'} {selectedJob.serviceRequest?.model ? `(${selectedJob.serviceRequest.model})` : ''}
                  </span>
                </div>
                {selectedJob.serviceRequest?.serialNo && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Serial Number</span>
                    <span className="font-bold text-slate-800">{selectedJob.serviceRequest.serialNo}</span>
                  </div>
                )}
              </div>

              {/* Customer Contact & Address Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Details</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <User className="h-4 w-4 text-[#0D47A1]" />
                    <span>{selectedJob.serviceRequest?.user?.name || selectedJob.serviceRequest?.contactName || 'Customer'}</span>
                  </div>
                  {selectedJob.serviceRequest?.user?.phone && (
                    <a
                      href={`tel:${selectedJob.serviceRequest.user.phone}`}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{selectedJob.serviceRequest.user.phone}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-start gap-2 text-slate-600 text-[11px] pt-1 border-t border-slate-100">
                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>{formatAddress(selectedJob.serviceRequest?.booking?.address || selectedJob.serviceRequest?.address || selectedJob.serviceRequest?.zone)}</span>
                </div>
              </div>

              {/* Complaint Description */}
              {selectedJob.serviceRequest?.description && (
                <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Reported Complaint</span>
                  <p className="text-slate-700 text-xs font-medium leading-relaxed">{selectedJob.serviceRequest.description}</p>
                </div>
              )}

              {/* Diagnosis notes if present */}
              {selectedJob.diagnosisNotes && (
                <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">Diagnosis & Work Done</span>
                  <p className="text-slate-700 text-xs font-medium leading-relaxed">{selectedJob.diagnosisNotes}</p>
                </div>
              )}

              {/* Spare Parts Summary */}
              {selectedJob.sparePartsUsed && selectedJob.sparePartsUsed.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Spare Parts Replaced</span>
                  <div className="space-y-1">
                    {selectedJob.sparePartsUsed.map((part, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-700 font-semibold">{part.name || part.partName || `Part #${idx + 1}`} (x{part.qty || 1})</span>
                        <span className="text-slate-900 font-bold">₹{part.price || part.amount || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payout & Billing Breakdown */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium text-xs">Total Service Charge</span>
                  <span className="text-slate-900 font-bold text-xs">
                    ₹{(selectedJob.billingEstimate?.serviceCharge ?? selectedJob.billingEstimate?.totalAmount ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Technician Share</span>
                  <span className="text-emerald-800 font-black text-sm">
                    ₹{(selectedJob.billingEstimate?.technicianEarnings ?? selectedJob.billingEstimate?.totalAmount ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const id = selectedJob._id || selectedJob.id;
                  setSelectedJob(null);
                  navigate(`/technician/earning-detail/${id}`);
                }}
                className="flex-1 py-3 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                <span>View Earning Slip</span>
              </button>
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="history" />

    </div>
  );
};

export default ServiceHistory;
