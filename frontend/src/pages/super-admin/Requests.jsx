import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { 
  Search, 
  Eye, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  User,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
  Wrench,
  Sparkles,
  Navigation,
} from 'lucide-react';

const STATUS_BUCKET = {
  New: 'Pending',
  Reschedule: 'Pending',
  'Customer NA': 'Pending',
  Assigned: 'Assigned',
  'Engineer Accepted': 'In Progress',
  'Visit Scheduled': 'In Progress',
  'Engineer Reached': 'In Progress',
  'Diagnosis Done': 'In Progress',
  'Spare Required': 'In Progress',
  'Spare Ordered': 'In Progress',
  'Spare Received': 'In Progress',
  'Repair Completed': 'In Progress',
  'Customer Confirmation': 'In Progress',
  Closed: 'Completed',
  Cancelled: 'Cancelled',
};

const Requests = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [selectedMode, setSelectedMode] = useState('All Modes');
  const [selectedInstantFilter, setSelectedInstantFilter] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Newest First');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [successCardData, setSuccessCardData] = useState(null);

  const [requests, setRequests] = useState([]);
  const [openEscalations, setOpenEscalations] = useState(0);
  // The tiles above the table are platform-wide totals, so they read from the
  // dashboard aggregation rather than counting the (limit=200) page of rows
  // the table shows — a status count derived from a capped page would
  // undercount once there are more than 200 requests.
  const [stats, setStats] = useState({ open: 0, assigned: 0, inProgress: 0, completed: 0 });
  const [loadError, setLoadError] = useState('');

  const loadRequests = React.useCallback(async () => {
    try {
      const res = await apiRequest('/service-requests?limit=200&sort=-createdAt', { auth: true });
      const items = Array.isArray(res) ? res : [];
      setRequests(items.map(item => {
        const bk = item.booking && typeof item.booking === 'object' ? item.booking : null;
        const addr = bk?.address || (item.user?.addresses?.length ? item.user.addresses[0] : null);
        const lat = addr?.latitude ?? item.customerLocation?.latitude ?? null;
        const lng = addr?.longitude ?? item.customerLocation?.longitude ?? null;

        return {
          id: item.id,
          raw: item,
          ref: item.humanId || item.brandTicketNo || item.id,
          bookingId: bk?.humanId || (bk?._id ? String(bk._id) : null),
          customer: bk?.fullName || item.user?.name || 'Customer',
          customerEmail: item.user?.email || null,
          customerPhone: bk?.mobile || item.user?.phone || null,
          product: item.category || 'Appliance Service',
          brand: item.brand?.name || bk?.brand || 'Nigam Care',
          status: item.status,
          bucket: STATUS_BUCKET[item.status] || item.status,
          priority: item.priority || 'Medium',
          date: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—',
          dateTime: item.createdAt
            ? new Date(item.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—',
          serviceProvider: item.serviceProvider?.name || 'Unassigned',
          serviceProviderPhone: item.serviceProvider?.phone || null,
          serviceProviderRating: item.serviceProvider?.rating || null,
          description: item.description || '—',
          mode: item.requestMode || 'B2C',
          isInstant: Boolean(item.isInstant || item.instantStatus || bk?.isInstant),
          instantStatus: item.instantStatus || bk?.instantStatus || null,
          warranty: item.warranty || 'Out of Warranty',
          model: item.model || 'Universal',
          serialNo: item.serialNo || null,
          attachments: item.attachments || [],
          timeline: item.timeline || [],

          // Cancellation details
          cancellationReason: item.cancellationReason || bk?.cancellationReason || null,
          searchEndReason: item.searchEndReason || bk?.searchEndReason || null,
          cancelledAt: item.cancelledAt || bk?.cancelledAt || null,

          // Address & Location
          address: addr ? {
            house: addr.house || '',
            area: addr.landmark || addr.area || '',
            city: addr.city || item.zone || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
          } : null,
          formattedAddress: addr
            ? [addr.house, addr.landmark || addr.area, addr.city, addr.pincode].filter(Boolean).join(', ')
            : 'Address on file',
          latitude: lat,
          longitude: lng,

          // Financial & Booking Schedule
          totalPrice: bk?.totalPrice ?? null,
          advanceAmount: bk?.advanceAmount ?? 0,
          advancePaid: Boolean(bk?.advancePaid),
          paymentMode: bk?.paymentMode || 'after',
          scheduledDate: bk?.scheduledDate || null,
          timeSlot: bk?.timeSlot?.time || (item.isInstant ? '⚡ Instant (ASAP)' : '—'),
          timeSlotDate: bk?.timeSlot?.date || 'Today',
        };
      }));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load service requests.');
    }

    try {
      const dash = await apiRequest('/super-admin/analytics/dashboard', { auth: true });
      const dashData = dash;
      setStats(dashData?.requests || { open: 0, assigned: 0, inProgress: 0, completed: 0 });
      setOpenEscalations(dashData?.openEscalations ?? 0);
    } catch (err) {
      console.warn('[requests] Could not load dashboard stats:', err.message);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };


  const priorityOrder = { High: 3, Medium: 2, Low: 1 };

  const filteredRequests = requests
    .filter(r => {
      const cust = String(r?.customer || '');
      const reqId = String(r?.ref || '');
      const prod = String(r?.product || '');
      const brnd = String(r?.brand || '');
      const q = searchQuery.toLowerCase();

      const matchesSearch = cust.toLowerCase().includes(q) ||
                            reqId.toLowerCase().includes(q) ||
                            prod.toLowerCase().includes(q) ||
                            brnd.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === 'All Status'
        || r?.status === selectedStatus
        || r?.bucket === selectedStatus;
      const matchesBrand = selectedBrand === 'All Brands' || r?.brand === selectedBrand;
      const matchesMode = selectedMode === 'All Modes' || r?.mode === selectedMode;
      const matchesInstant = selectedInstantFilter === 'All'
        || (selectedInstantFilter === '⚡ Instant Only' ? r?.isInstant : !r?.isInstant);
      return matchesSearch && matchesStatus && matchesBrand && matchesMode && matchesInstant;
    })
    .sort((a, b) => {
      // The list arrives newest-first from the API; ids are opaque ObjectIds, so
      // ordering keys off the reference number rather than the raw id.
      const aRef = String(a?.ref || '');
      const bRef = String(b?.ref || '');
      if (selectedSort === 'Newest First') return bRef.localeCompare(aRef);
      if (selectedSort === 'Oldest First') return aRef.localeCompare(bRef);
      if (selectedSort === 'Priority (High to Low)') {
        return (priorityOrder[b?.priority] || 0) - (priorityOrder[a?.priority] || 0);
      }
      if (selectedSort === 'Priority (Low to High)') {
        return (priorityOrder[a?.priority] || 0) - (priorityOrder[b?.priority] || 0);
      }
      if (selectedSort === 'Customer (A to Z)') {
        return String(a?.customer || '').localeCompare(String(b?.customer || ''));
      }
      return 0;
    });

  const pendingCount = stats.open;
  const activeCount = stats.assigned + stats.inProgress;
  const completedCount = stats.completed;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Service Requests (Master)" />

        {/* Body */}
        {showDrawer && selectedRequest ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left animate-fade-in">
            {/* Top Back & Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Requests
              </button>

              <div className="flex items-center gap-2">
                {selectedRequest.latitude && selectedRequest.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedRequest.latitude},${selectedRequest.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-extrabold text-white bg-[#0D47A1] hover:bg-[#083679] px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <ExternalLink size={14} /> Open in Google Maps
                  </a>
                )}
                {selectedRequest.bucket === 'Pending' && (
                  <button 
                    onClick={() => {
                      setShowDrawer(false);
                      navigate(`/super-admin/assignment?req=${selectedRequest.id}`);
                    }}
                    className="bg-brand-blue text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <UserPlus size={14} /> Assign Service Provider
                  </button>
                )}
              </div>
            </div>

            {/* ── Main Detail Container ── */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              
              {/* Header Banner */}
              <div className="p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-blue-200/80 text-brand-blue flex items-center justify-center shadow-xs">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">Service Ticket Details</h3>
                      <span className="font-mono text-xs font-extrabold text-[#0D47A1] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-lg">
                        {selectedRequest.ref}
                      </span>
                      {selectedRequest.bookingId && (
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          Booking: {selectedRequest.bookingId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Created on {selectedRequest.dateTime || selectedRequest.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    selectedRequest.bucket === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    selectedRequest.bucket === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    selectedRequest.bucket === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {selectedRequest.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedRequest.priority} Priority
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {selectedRequest.mode || 'B2C'}
                  </span>
                  {selectedRequest.isInstant && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-2xs">
                      ⚡ Instant ASAP
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* ── Prominent Cancellation Reason Banner (If Cancelled) ── */}
                {(selectedRequest.status === 'Cancelled' || selectedRequest.bucket === 'Cancelled') && (
                  <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col gap-2.5 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-rose-900">Service Request Cancelled</h4>
                        <p className="text-xs text-rose-700 font-semibold mt-0.5">
                          {selectedRequest.searchEndReason === 'NO_PROVIDERS_NEARBY'
                            ? 'Search Ended — No verified service provider was available near the customer location within the 15-minute search window.'
                            : selectedRequest.searchEndReason === 'PROVIDERS_NOT_ACCEPTING'
                            ? 'Search Ended — Nearby service partners were busy or did not accept the request within the 15-minute search window.'
                            : selectedRequest.cancellationReason
                            ? `Reason: ${selectedRequest.cancellationReason}`
                            : 'This booking was cancelled by the customer or platform before partner dispatch.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-rose-700 pt-2 border-t border-rose-200/60">
                      <span>
                        <strong>Cancelled At:</strong> {selectedRequest.cancelledAt ? new Date(selectedRequest.cancelledAt).toLocaleString('en-IN') : selectedRequest.dateTime}
                      </span>
                      <span>
                        <strong>Refund Policy:</strong> Any advance amount paid will be auto-refunded to customer original payment source within 5–7 business days.
                      </span>
                    </div>
                  </div>
                )}

                {/* ── 2-Column Content Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* ── LEFT COLUMN ── */}
                  <div className="space-y-6">

                    {/* Customer Contact Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                        <User className="w-4 h-4 text-brand-blue" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Customer Information
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Customer Name</span>
                          <p className="font-extrabold text-slate-900 mt-0.5">{selectedRequest.customer}</p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Phone Number</span>
                          <p className="font-bold text-slate-800 mt-0.5">
                            {selectedRequest.customerPhone ? (
                              <a href={`tel:${selectedRequest.customerPhone}`} className="text-brand-blue hover:underline flex items-center gap-1">
                                <Phone size={12} /> {selectedRequest.customerPhone}
                              </a>
                            ) : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Email Address</span>
                          <p className="font-bold text-slate-800 mt-0.5 truncate">
                            {selectedRequest.customerEmail ? (
                              <a href={`mailto:${selectedRequest.customerEmail}`} className="text-brand-blue hover:underline flex items-center gap-1 truncate">
                                <Mail size={12} /> {selectedRequest.customerEmail}
                              </a>
                            ) : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Request Mode</span>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedRequest.mode === 'B2B' ? 'B2B Enterprise' : 'B2C Direct Customer'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Address & Coordinates Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand-blue" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Service Location & Map
                          </h4>
                        </div>
                        {selectedRequest.latitude && selectedRequest.longitude && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            GPS Pinned
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase block">Full Address</span>
                          <p className="font-bold text-slate-900 mt-0.5 leading-relaxed">
                            {selectedRequest.formattedAddress || 'No address provided'}
                          </p>
                        </div>

                        {selectedRequest.address && (
                          <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/60">
                            <div>
                              <span className="text-[10px] text-slate-400 block">House / Flat</span>
                              <span className="font-bold text-slate-800">{selectedRequest.address.house || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Landmark / Area</span>
                              <span className="font-bold text-slate-800">{selectedRequest.address.area || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">City</span>
                              <span className="font-bold text-slate-800">{selectedRequest.address.city || '—'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Pincode</span>
                              <span className="font-bold text-slate-800">{selectedRequest.address.pincode || '—'}</span>
                            </div>
                          </div>
                        )}

                        {/* Coordinates & Google Maps CTA */}
                        {selectedRequest.latitude && selectedRequest.longitude ? (
                          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-blue block">
                                GPS Coordinates
                              </span>
                              <span className="font-mono text-xs font-black text-slate-900">
                                {Number(selectedRequest.latitude).toFixed(6)}, {Number(selectedRequest.longitude).toFixed(6)}
                              </span>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${selectedRequest.latitude},${selectedRequest.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 bg-brand-blue hover:bg-[#083679] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                            >
                              <ExternalLink size={13} />
                              Open in Google Maps
                            </a>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">
                            Exact GPS coordinates not pinned for this service request.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issue Description Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                        <Wrench className="w-4 h-4 text-brand-blue" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Problem / Work Description
                        </h4>
                      </div>
                      <p className="text-xs font-medium text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                        {selectedRequest.description}
                      </p>
                    </div>

                  </div>

                  {/* ── RIGHT COLUMN ── */}
                  <div className="space-y-6">

                    {/* Service Provider Card */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-brand-blue" />
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            Service Partner Assigned
                          </h4>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          selectedRequest.serviceProvider !== 'Unassigned'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {selectedRequest.serviceProvider !== 'Unassigned' ? 'Partner Linked' : 'Not Assigned'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {selectedRequest.serviceProvider}
                          </p>
                          {selectedRequest.serviceProviderPhone && (
                            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <Phone size={11} /> {selectedRequest.serviceProviderPhone}
                            </p>
                          )}
                          {selectedRequest.serviceProviderRating && (
                            <p className="text-xs text-amber-600 font-bold mt-0.5">
                              ⭐ {selectedRequest.serviceProviderRating} rating
                            </p>
                          )}
                        </div>

                        {selectedRequest.bucket === 'Pending' && (
                          <button
                            onClick={() => {
                              setShowDrawer(false);
                              navigate(`/super-admin/assignment?req=${selectedRequest.id}`);
                            }}
                            className="bg-brand-blue text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <UserPlus size={13} /> Assign
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Booking & Financial Summary */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                        <CreditCard className="w-4 h-4 text-brand-blue" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Booking & Financial Summary
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase block font-semibold">Service Type</span>
                          <span className="font-extrabold text-slate-900 mt-0.5 block">{selectedRequest.product}</span>
                          <span className="text-[10px] text-slate-500">{selectedRequest.brand}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scheduled Timing</span>
                          <span className="font-extrabold text-slate-900 mt-0.5 block">{selectedRequest.timeSlot}</span>
                          <span className="text-[10px] text-slate-500">{selectedRequest.timeSlotDate}</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Price</span>
                          <span className="font-black text-slate-900 text-sm mt-0.5 block">
                            {selectedRequest.totalPrice != null ? `₹${selectedRequest.totalPrice}` : 'Calculated on diagnosis'}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Advance Payment</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">
                            ₹{selectedRequest.advanceAmount || 0}
                          </span>
                          <span className={`text-[10px] font-extrabold ${selectedRequest.advancePaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {selectedRequest.advancePaid ? '✓ Advance Paid' : 'Pay After Service'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Milestones */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                        <Clock className="w-4 h-4 text-brand-blue" />
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Request Lifecycle Timeline
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {selectedRequest.timeline && selectedRequest.timeline.length > 0 ? (
                          selectedRequest.timeline.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-brand-blue mt-1 shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{step.stepLabel}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {step.timestamp ? new Date(step.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                                  </span>
                                </div>
                                {step.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-500 py-2">
                            Ticket created on {selectedRequest.dateTime}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>

              {/* Bottom Footer Bar */}
              <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Showing complete operational record for ticket <strong>{selectedRequest.ref}</strong>
                </span>
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Pending</p>
                <p className="text-2xl font-bold text-[#1E293B]">{pendingCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Active</p>
                <p className="text-2xl font-bold text-[#1E293B]">{activeCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Open Escalations</p>
                <p className="text-2xl font-bold text-[#1E293B]">{openEscalations}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#64748B]">Completed</p>
                <p className="text-2xl font-bold text-[#1E293B]">{completedCount}</p>
              </div>
            </div>
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
                  placeholder="Search Ticket, Customer, Brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Pending</option>
                <option>Assigned</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>

              <select 
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Brands</option>
                <option>LG</option>
                <option>Samsung</option>
                <option>Whirlpool</option>
              </select>

              <select 
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Modes</option>
                <option>B2B</option>
                <option>B2C</option>
              </select>

              <select 
                value={selectedInstantFilter}
                onChange={(e) => setSelectedInstantFilter(e.target.value)}
                className="text-sm font-semibold text-amber-700 border border-amber-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50"
              >
                <option value="All">All Service Types</option>
                <option value="⚡ Instant Only">⚡ Instant / ASAP Only</option>
                <option value="Scheduled Only">Scheduled Only</option>
              </select>

              <select 
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="text-sm font-semibold text-[#0D47A1] border border-[#0D47A1]/30 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F0F4FF]"
              >
                <option>Newest First</option>
                <option>Oldest First</option>
                <option>Priority (High to Low)</option>
                <option>Priority (Low to High)</option>
                <option>Customer (A to Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { loadRequests(); showToast('Service requests refreshed'); }}
                className="bg-white text-[#0D47A1] border border-[#0D47A1]/30 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-[#F0F4FF] transition-colors"
              >
                Refresh
              </button>

              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('All Status');
                  setSelectedBrand('All Brands');
                  setSelectedMode('All Modes');
                  setSelectedSort('Newest First');
                  showToast('Filters reset successfully');
                }}
                className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Ticket ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Service Provider</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredRequests.map((req) => (
                    <tr 
                      key={req.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => { setSelectedRequest(req); setShowDrawer(true); }}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">
                        <div className="flex items-center gap-1.5">
                          <span>{req.ref}</span>
                          {req.isInstant && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white animate-pulse tracking-wider">
                              ⚡ INSTANT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">
                        <div className="flex items-center gap-2">
                          <span>{req.customer}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            req.mode === 'B2B' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-slate-100 text-slate-655'
                          }`}>
                            {req.mode || 'B2C'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.product}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{req.brand}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          req.priority === 'High' ? 'bg-red-50 text-red-600' :
                          req.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          req.bucket === 'Completed' ? 'bg-green-50 text-green-600' :
                          req.bucket === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                          req.bucket === 'Assigned' ? 'bg-indigo-50 text-indigo-600' :
                          req.bucket === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{req.serviceProvider}</td>
                      <td className="px-6 py-4 text-[#64748B]">{req.date}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center w-20 mx-auto">
                          <button 
                            onClick={() => { setSelectedRequest(req); setShowDrawer(true); }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded transition-colors" 
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {req.bucket === 'Pending' ? (
                            <button 
                              onClick={() => {
                                setSuccessCardData({
                                  title: "Initiating Assignment",
                                  message: "Preparing redirection to the serviceProvider assignment console for Ticket ID:",
                                  ticketId: req.ref,
                                  onClose: () => {
                                    navigate(`/super-admin/assignment?req=${req.id}`);
                                  }
                                });
                                setTimeout(() => {
                                  setSuccessCardData(null);
                                  navigate(`/super-admin/assignment?req=${req.id}`);
                                }, 2000);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                              title="Assign Service Provider"
                            >
                              <UserPlus size={16} />
                            </button>
                          ) : (
                            <div className="w-[28px]" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Empty State */}
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 bg-white">
                <ClipboardList size={48} className="text-[#64748B] mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Requests Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Success Toast */}
      {loadError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {loadError}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Success Card Modal */}
      {successCardData && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full p-6 space-y-4 text-center animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-[#1E293B] text-lg">{successCardData.title}</h3>
              <p className="text-sm text-[#64748B] font-semibold">{successCardData.message}</p>
              {successCardData.ticketId && (
                <p className="text-xs font-black text-[#0D47A1] bg-[#EEF4FF] inline-block px-3 py-1 rounded-full">
                  {successCardData.ticketId}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="button"
                onClick={() => {
                  if (successCardData.onClose) {
                    successCardData.onClose();
                  }
                  setSuccessCardData(null);
                }}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                Close / Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
