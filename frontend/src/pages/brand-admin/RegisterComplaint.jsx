import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {
  Search, User, Package, AlertCircle, CheckCircle2,
  Phone, Mail, MapPin, ChevronRight, Edit2, Upload,
  ShieldCheck, ShieldOff, ArrowRight, X, FileText, Plus, Copy
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

// ── Customer lookup ──
// Customers are the brand's own (everyone who has raised a request with it).
// The aggregate exposes the appliance categories they've reported against, not
// full per-appliance records — so a "product" here is a category the agent
// picks, with model and serial typed in on the complaint step.
function shapeCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    mobile: c.phone || '',
    alternateMobile: '',
    email: c.email || '',
    address: '',
    landmark: '',
    pincode: '',
    city: '',
    state: '',
    products: (c.categories || []).map((category, i) => ({
      id: `${c.id}-${i}`,
      name: category,
      category,
      model: '',
      serial: '',
      brand: '',
      purchaseDate: '',
      dealer: '',
      warranty: c.warrantyStatus === 'Under Warranty' ? 'In Warranty' : 'Out of Warranty',
    })),
  };
}

const complaintTypes = ['Breakdown', 'No Power / Dead', 'Noise Issue', 'Performance Degradation', 'Physical Damage', 'Intermittent Fault'];

// This screen's labels are friendlier than the API's enums; map rather than
// send the display text, which the schema would reject.
const COMPLAINT_TYPE_MAP = {
  'Breakdown': 'Breakdown',
  'No Power / Dead': 'No Power',
  'Noise Issue': 'Noise',
  'Performance Degradation': 'Performance',
  'Physical Damage': 'Physical Damage',
  'Intermittent Fault': 'Intermittent',
};

const PRIORITY_MAP = { Low: 'Low', Normal: 'Medium', High: 'High', Critical: 'Critical' };
const issueCategories = {
  'LED & Luminaires': ['Flickering', 'Not Turning On', 'Driver Failure', 'Dim Output', 'Remote Not Working'],
  'Fans & Appliances': ['Not Running', 'Noise / Vibration', 'Speed Not Working', 'Capacitor Issue', 'Blade Damage'],
};

// ── Lifecycle Steps ──
const lifecycleSteps = [
  { label: 'New', icon: '📋', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Assigned', icon: '👤', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { label: 'Engineer Accepted', icon: '✅', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { label: 'Visit Scheduled', icon: '📅', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { label: 'Engineer Reached', icon: '📍', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { label: 'Diagnosis Done', icon: '🔍', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];
const spareSteps = [
  { label: 'Spare Required', icon: '⚙️', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Spare Ordered', icon: '🛒', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Spare Received', icon: '📦', color: 'bg-orange-100 text-orange-700 border-orange-200' },
];
const closingSteps = [
  { label: 'Repair Completed', icon: '🔧', color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Customer Confirmation', icon: '✋', color: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'Closed', icon: '✅', color: 'bg-green-200 text-green-800 border-green-300' },
];

const STEPS = [
  { id: 1, label: 'Search Customer', icon: Search },
  { id: 2, label: 'Customer Details', icon: User },
  { id: 3, label: 'Product Details', icon: Package },
  { id: 4, label: 'Complaint Details', icon: AlertCircle },
  { id: 5, label: 'Review & Raise Ticket', icon: CheckCircle2 },
];

const RegisterComplaint = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mobileSearch, setMobileSearch] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null); // 'found' | 'not-found' | null
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [complaint, setComplaint] = useState({
    warranty: 'In Warranty',
    type: '',
    issueCategory: '',
    description: '',
    priority: 'Normal',
    invoiceAvailable: 'Yes',
    attachment: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [editStep, setEditStep] = useState(null);
  const [complaintIds, setComplaintIds] = useState({ brandNo: '', nccId: '' });
  const [copiedId, setCopiedId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCustomers() {
      try {
        const data = await apiRequest('/brand/customers', { auth: true });
        if (!cancelled) setCustomers((data || []).map(shapeCustomer));
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadCustomers();
    return () => { cancelled = true; };
  }, []);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setComplaint(p => ({ ...p, attachment: file }));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setComplaint(p => ({ ...p, attachment: file }));
    }
  };

  const handleSearch = () => {
    const found = customers.find(c => c.mobile === mobileSearch.trim());
    if (found) {
      setSearchResult(found);
      setSearchStatus('found');
    } else {
      setSearchResult(null);
      setSearchStatus('not-found');
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSelectedProduct(null);
    setStep(2);
  };

  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    setComplaint(prev => ({ ...prev, warranty: prod.warranty, issueCategory: '' }));
  };

  const handleRaiseTicket = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;
    const randomBrand = String(Math.floor(100000 + Math.random() * 900000));
    const randomNcc = String(Math.floor(10000 + Math.random() * 90000));
    
    const brandNo = `SOM-GKP-${dateStr}-${randomBrand}`;
    const nccId = `NCC-${dateStr}-${randomNcc}`;
    
    setComplaintIds({ brandNo, nccId });
    setTicketId(nccId);
    setSuccessModal(true);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatRegistrationDate = () => {
    const now = new Date();
    const day = now.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  };


  const handleReset = () => {
    setStep(1);
    setMobileSearch('');
    setSearchResult(null);
    setSearchStatus(null);
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setComplaint({ warranty: 'In Warranty', type: '', issueCategory: '', description: '', priority: 'Normal', invoiceAvailable: 'Yes', attachment: null });
    setSuccessModal(false);
    setTicketId('');
    setComplaintIds({ brandNo: '', nccId: '' });
  };

  const canProceed = () => {
    if (step === 1) return !!selectedCustomer;
    if (step === 2) return !!selectedCustomer;
    if (step === 3) return !!selectedProduct;
    if (step === 4) return complaint.type && complaint.issueCategory && complaint.description.trim();
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Register Complaint / Raise Ticket" />

        <div className="p-6 flex-1 text-left space-y-5">

          {/* Step Progress Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const isActive = step === s.id;
                const isDone = step > s.id;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-black text-xs transition-all ${
                        isDone ? 'bg-[#0D47A1] border-[#0D47A1] text-white' :
                        isActive ? 'bg-[#EEF4FF] border-[#0D47A1] text-[#0D47A1]' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {isDone ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                        isActive ? 'text-[#0D47A1]' : isDone ? 'text-slate-600' : 'text-slate-400'
                      }`}>{s.label}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 max-w-[60px] mx-1 rounded ${step > s.id ? 'bg-[#0D47A1]' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── STEP 1: Search Customer ── */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Search size={15} className="text-[#0D47A1]" /> Search Customer</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Enter the customer's registered mobile number to search</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Mobile Number *</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center border border-[#E2E8F0] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0D47A1] bg-[#F8FAFC]">
                    <span className="px-3 text-slate-400"><Phone size={14} /></span>
                    <input
                      type="tel" maxLength={10}
                      className="flex-1 py-2.5 text-sm font-semibold text-slate-800 outline-none bg-transparent"
                      placeholder="e.g. 9876543210"
                      value={mobileSearch}
                      onChange={e => { setMobileSearch(e.target.value); setSearchStatus(null); setSearchResult(null); }}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors"
                  >Search</button>
                </div>
              </div>

              {searchStatus === 'not-found' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-semibold">
                  ❌ No customer found with this number.
                  <button className="ml-2 underline text-[#0D47A1] font-bold">+ Add New Customer</button>
                </div>
              )}

              {searchStatus === 'found' && searchResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="text-xs font-extrabold text-green-700">Customer Found</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#0D47A1] rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">
                      {searchResult.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">{searchResult.name}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{searchResult.mobile}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{searchResult.address}, {searchResult.city}, {searchResult.state} – {searchResult.pincode}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Previous Products ({searchResult.products.length})</p>
                    <div className="space-y-1.5">
                      {searchResult.products.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-[11px] font-bold text-slate-700">{p.name}</p>
                            <p className="text-[9px] font-mono text-slate-400">Model: {p.model}</p>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${p.warranty === 'In Warranty' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {p.warranty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectCustomer(searchResult)}
                    className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    Continue with {searchResult.name} <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Customer Details ── */}
          {step === 2 && selectedCustomer && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><User size={15} className="text-[#0D47A1]" /> Customer Details</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Customer Name', val: selectedCustomer.name },
                  { label: 'Mobile Number', val: selectedCustomer.mobile },
                  { label: 'Alternate Mobile', val: selectedCustomer.alternateMobile || '—' },
                  { label: 'Email', val: selectedCustomer.email },
                ].map(f => (
                  <div key={f.label}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800">{f.val}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Address Details</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Address', val: selectedCustomer.address },
                    { label: 'Landmark', val: selectedCustomer.landmark },
                    { label: 'Pincode', val: selectedCustomer.pincode },
                    { label: 'City', val: selectedCustomer.city },
                    { label: 'State', val: selectedCustomer.state },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{f.label}</label>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800">{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Product Details ── */}
          {step === 3 && selectedCustomer && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Package size={15} className="text-[#0D47A1]" /> Product Details</h3>
              <p className="text-[11px] text-slate-400 font-medium -mt-2">Select the product the complaint is for</p>

              <div className="space-y-3">
                {selectedCustomer.products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProductSelect(p)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedProduct?.id === p.id ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedProduct?.id === p.id ? 'bg-[#0D47A1]' : 'bg-slate-100'}`}>
                          <Package size={18} className={selectedProduct?.id === p.id ? 'text-white' : 'text-slate-500'} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">Model: {p.model} &nbsp;|&nbsp; S/N: {p.serial}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Purchase Date: {p.purchaseDate} &nbsp;|&nbsp; {p.dealer}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.warranty === 'In Warranty' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {p.warranty === 'In Warranty' ? <span className="flex items-center gap-1"><ShieldCheck size={10} /> In Warranty</span> : <span className="flex items-center gap-1"><ShieldOff size={10} /> Out of Warranty</span>}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">{p.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedProduct && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4 mt-2">
                  {[
                    { label: 'Brand', val: selectedProduct.brand },
                    { label: 'Product Category', val: selectedProduct.category },
                    { label: 'Model Number', val: selectedProduct.model },
                    { label: 'Serial Number', val: selectedProduct.serial },
                    { label: 'Purchase Date', val: selectedProduct.purchaseDate },
                    { label: 'Dealer Name', val: selectedProduct.dealer },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{f.label}</label>
                      <p className="text-xs font-bold text-slate-800">{f.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Complaint Details ── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><AlertCircle size={15} className="text-[#0D47A1]" /> Complaint Details</h3>

              {/* Warranty Status */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Warranty Status *</label>
                <div className="flex gap-4">
                  {['In Warranty', 'Out of Warranty'].map(w => (
                    <label key={w} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="warranty" value={w} checked={complaint.warranty === w} onChange={e => setComplaint(p => ({...p, warranty: e.target.value}))} className="text-[#0D47A1]" />
                      <span className="text-sm font-semibold text-slate-700">{w}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Complaint Type */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Complaint Type *</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm font-semibold text-slate-800 bg-[#F8FAFC]"
                    value={complaint.type}
                    onChange={e => setComplaint(p => ({...p, type: e.target.value}))}
                  >
                    <option value="">Select complaint type</option>
                    {complaintTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Issue Category */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Issue Category *</label>
                  <select
                    className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm font-semibold text-slate-800 bg-[#F8FAFC]"
                    value={complaint.issueCategory}
                    onChange={e => setComplaint(p => ({...p, issueCategory: e.target.value}))}
                  >
                    <option value="">Select issue category</option>
                    {(issueCategories[selectedProduct?.category] || []).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Complaint Description / Remarks *</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm font-semibold text-slate-800 bg-[#F8FAFC] resize-none"
                  placeholder="Describe the issue in detail..."
                  value={complaint.description}
                  onChange={e => setComplaint(p => ({...p, description: e.target.value}))}
                />
              </div>

              {/* Priority + Invoice */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Priority</label>
                  <div className="flex gap-4">
                    {['Normal', 'High', 'Critical'].map(pr => (
                      <label key={pr} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="priority" value={pr} checked={complaint.priority === pr} onChange={e => setComplaint(p => ({...p, priority: e.target.value}))} className="text-[#0D47A1]" />
                        <span className="text-xs font-semibold text-slate-700">{pr}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Invoice Available</label>
                  <div className="flex gap-4">
                    {['Yes', 'No'].map(v => (
                      <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="invoice" value={v} checked={complaint.invoiceAvailable === v} onChange={e => setComplaint(p => ({...p, invoiceAvailable: e.target.value}))} className="text-[#0D47A1]" />
                        <span className="text-xs font-semibold text-slate-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attachment */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Attach Invoice / Photo (Optional)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                />
                {!complaint.attachment ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#0D47A1] transition-colors cursor-pointer bg-slate-50/50"
                  >
                    <Upload size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">Click to upload or drag and drop</p>
                    <p className="text-[10px] text-slate-300 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="border border-green-200 bg-green-50/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-700 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-700">{complaint.attachment.name}</p>
                        <p className="text-[10px] text-slate-400">{(complaint.attachment.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setComplaint(p => ({ ...p, attachment: null }))}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 5: Review & Raise Ticket ── */}
          {step === 5 && selectedCustomer && selectedProduct && (
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-8 space-y-4">

                {/* Customer Details Card */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-[9px] font-black">1</div>
                      <span className="text-xs font-extrabold text-slate-700">Customer Details</span>
                    </div>
                    <button onClick={() => setStep(2)} className="text-[10px] font-bold text-[#0D47A1] flex items-center gap-1 cursor-pointer hover:underline"><Edit2 size={11} /> Edit</button>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Name</p><p className="text-sm font-bold text-slate-800">{selectedCustomer.name}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Mobile</p><p className="text-sm font-bold text-slate-800">{selectedCustomer.mobile}</p></div>
                    <div className="col-span-2"><p className="text-[9px] font-bold text-slate-400 uppercase">Address</p><p className="text-sm font-bold text-slate-800">{selectedCustomer.address}, {selectedCustomer.landmark}, {selectedCustomer.city}, {selectedCustomer.state} – {selectedCustomer.pincode}</p></div>
                  </div>
                </div>

                {/* Product Details Card */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-[9px] font-black">2</div>
                      <span className="text-xs font-extrabold text-slate-700">Product Details</span>
                    </div>
                    <button onClick={() => setStep(3)} className="text-[10px] font-bold text-[#0D47A1] flex items-center gap-1 cursor-pointer hover:underline"><Edit2 size={11} /> Edit</button>
                  </div>
                  <div className="p-5 grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Product</p><p className="text-sm font-bold text-slate-800">{selectedProduct.name}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Model</p><p className="text-sm font-bold text-slate-800">{selectedProduct.model}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Serial No.</p><p className="text-sm font-bold text-slate-800">{selectedProduct.serial}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Purchase Date</p><p className="text-sm font-bold text-slate-800">{selectedProduct.purchaseDate}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Warranty</p><p className={`text-sm font-black ${selectedProduct.warranty === 'In Warranty' ? 'text-green-600' : 'text-red-500'}`}>{selectedProduct.warranty}</p></div>
                  </div>
                </div>

                {/* Complaint Details Card */}
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-[9px] font-black">3</div>
                      <span className="text-xs font-extrabold text-slate-700">Complaint Details</span>
                    </div>
                    <button onClick={() => setStep(4)} className="text-[10px] font-bold text-[#0D47A1] flex items-center gap-1 cursor-pointer hover:underline"><Edit2 size={11} /> Edit</button>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Warranty Status</p><p className="text-sm font-bold text-slate-800">{complaint.warranty}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Type</p><p className="text-sm font-bold text-slate-800">{complaint.type}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Issue</p><p className="text-sm font-bold text-slate-800">{complaint.issueCategory}</p></div>
                    <div><p className="text-[9px] font-bold text-slate-400 uppercase">Priority</p><p className={`text-sm font-black ${complaint.priority === 'Critical' ? 'text-red-600' : complaint.priority === 'High' ? 'text-orange-500' : 'text-slate-700'}`}>{complaint.priority}</p></div>
                    <div className="col-span-2"><p className="text-[9px] font-bold text-slate-400 uppercase">Remarks</p><p className="text-sm font-semibold text-slate-700">{complaint.description}</p></div>
                    {complaint.attachment && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Attachment</p>
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <FileText size={13} className="text-green-600" />
                          {complaint.attachment.name} ({(complaint.attachment.size / 1024).toFixed(1)} KB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Action Panel */}
              <div className="col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-3 sticky top-6">
                  <h4 className="text-sm font-extrabold text-slate-800">Review & Confirm</h4>
                  <p className="text-[10px] text-slate-400 font-medium">Please verify all details before raising the ticket.</p>
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Summary</p>
                    <p className="text-xs font-bold text-slate-700">👤 {selectedCustomer.name}</p>
                    <p className="text-xs font-semibold text-slate-500">📦 {selectedProduct.name}</p>
                    <p className="text-xs font-semibold text-slate-500">🔧 {complaint.type} — {complaint.issueCategory}</p>
                    <p className="text-xs font-semibold text-slate-500">🛡 {complaint.warranty} &nbsp;|&nbsp; ⚡ {complaint.priority}</p>
                  </div>
                  <button
                    onClick={handleRaiseTicket}
                    className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white text-sm font-extrabold py-3 rounded-xl cursor-pointer shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText size={16} /> Raise Ticket
                  </button>
                  <button
                    className="w-full border border-[#0D47A1] text-[#0D47A1] text-xs font-bold py-2.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation Buttons ── */}
          {step > 1 && (
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                ← Back
              </button>
              {step < 5 && (
                <button
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-colors flex items-center gap-2 ${canProceed() ? 'bg-[#0D47A1] hover:bg-blue-800 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                  Next <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Success Modal ── */}
      {successModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-6 border border-slate-100 text-left">
            {/* Header Banner */}
            <div className="bg-[#E8F5E9] border border-[#C8E6C9] rounded-xl p-4 text-center">
              <h2 className="text-base font-extrabold text-[#2E7D32]">Ticket Raised Successfully!</h2>
              <p className="text-slate-600 text-xs font-semibold mt-1">Your complaint has been registered successfully.</p>
            </div>

            {/* IDs Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Brand Complaint No */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Brand Complaint No.</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800">{complaintIds.brandNo}</p>
                  <button
                    onClick={() => handleCopy(complaintIds.brandNo, 'brand')}
                    className="text-slate-400 hover:text-[#0D47A1] p-1 rounded hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === 'brand' ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* NCC Internal Ticket ID */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white relative">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NCC Internal Ticket ID</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800">{complaintIds.nccId}</p>
                  <button
                    onClick={() => handleCopy(complaintIds.nccId, 'ncc')}
                    className="text-slate-400 hover:text-[#0D47A1] p-1 rounded hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === 'ncc' ? <CheckCircle2 size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 px-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</p>
                <span className="bg-[#EEF4FF] text-[#0D47A1] text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-blue-100">
                  New Complaint Registered
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Registered On</p>
                <p className="text-xs font-bold text-slate-800">{formatRegistrationDate()}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => {
                  handleReset();
                  navigate('/brand-admin/complaints');
                }}
                className="flex-1 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-xs text-center"
              >
                View Ticket
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-xs text-center"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterComplaint;
