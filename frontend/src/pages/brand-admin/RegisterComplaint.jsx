import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import {
  Search, User, Package, AlertCircle, CheckCircle2,
  Phone, Mail, MapPin, ChevronRight, Edit2, Upload,
  ShieldCheck, ShieldOff, ArrowRight, X, FileText, Plus
} from 'lucide-react';

// ── Mock customer database ──
const mockCustomers = [
  {
    id: 'C001', name: 'Rahul Sharma', mobile: '9876543210',
    alternateMobile: '9123456789', email: 'rahul.sharma@email.com',
    address: '123, Green Park', landmark: 'Near Metro Station',
    pincode: '226010', city: 'Lucknow', state: 'Uttar Pradesh',
    products: [
      { id: 'P1', name: 'Adore LED Downlight', model: 'HVL-DL-12W', serial: 'HVL10112345', brand: 'Havells', category: 'LED & Luminaires', purchaseDate: '2024-06-15', dealer: 'Havells Showroom Lucknow', warranty: 'In Warranty' },
      { id: 'P2', name: 'Stealth Air Ceiling Fan', model: 'HVL-FAN-1200', serial: 'HVL20167890', brand: 'Havells', category: 'Fans & Appliances', purchaseDate: '2023-03-10', dealer: 'Havells Showroom Lucknow', warranty: 'Out of Warranty' },
    ]
  },
  {
    id: 'C002', name: 'Priya Verma', mobile: '9812345678',
    alternateMobile: '', email: 'priya.verma@email.com',
    address: '45, Sector 12, Noida', landmark: 'Near City Mall',
    pincode: '201301', city: 'Noida', state: 'Uttar Pradesh',
    products: [
      { id: 'P3', name: 'Endura Pro Batten', model: 'HVL-BTN-22W', serial: 'HVL30198765', brand: 'Havells', category: 'LED & Luminaires', purchaseDate: '2024-11-20', dealer: 'Havells Noida Store', warranty: 'In Warranty' },
    ]
  },
];

const complaintTypes = ['Breakdown', 'No Power / Dead', 'Noise Issue', 'Performance Degradation', 'Physical Damage', 'Intermittent Fault'];
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

  const handleSearch = () => {
    const found = mockCustomers.find(c => c.mobile === mobileSearch.trim());
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
    const id = `TKT/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}/${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketId(id);
    setSuccessModal(true);
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
            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
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

              {/* Right: Lifecycle preview */}
              <div className="col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Ticket Lifecycle</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Once raised, every ticket follows this workflow</p>
                </div>

                {/* Row 1 */}
                <div className="flex items-center gap-1 flex-wrap">
                  {lifecycleSteps.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border text-center ${s.color}`} style={{minWidth:'72px'}}>
                        <span className="text-base">{s.icon}</span>
                        <span className="text-[9px] font-extrabold uppercase leading-tight">{s.label}</span>
                      </div>
                      {i < lifecycleSteps.length - 1 && <ArrowRight size={13} className="text-slate-300 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Spare path indicator */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">If Spare Parts Needed (Optional)</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {spareSteps.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border text-center ${s.color}`} style={{minWidth:'80px'}}>
                        <span className="text-base">{s.icon}</span>
                        <span className="text-[9px] font-extrabold uppercase leading-tight">{s.label}</span>
                      </div>
                      {i < spareSteps.length - 1 && <ArrowRight size={13} className="text-slate-300 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-widest bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Closing Flow</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {closingSteps.map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl border text-center ${s.color}`} style={{minWidth:'80px'}}>
                        <span className="text-base">{s.icon}</span>
                        <span className="text-[9px] font-extrabold uppercase leading-tight">{s.label}</span>
                      </div>
                      {i < closingSteps.length - 1 && <ArrowRight size={13} className="text-slate-300 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 italic">* Technician will raise a spare part request if needed during diagnosis. Brand panel approves the request.</p>
              </div>
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
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#0D47A1] transition-colors cursor-pointer bg-slate-50/50">
                  <Upload size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-semibold">Click to upload or drag and drop</p>
                  <p className="text-[10px] text-slate-300 mt-1">JPG, PNG, PDF (Max 5MB)</p>
                </div>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] p-6 text-white text-center">
              <CheckCircle2 size={48} className="mx-auto mb-2 text-green-300" />
              <h2 className="text-lg font-extrabold">Ticket Raised Successfully!</h2>
              <p className="text-blue-100 text-xs mt-1">Your service request has been registered</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket ID</p>
                <p className="text-xl font-black text-[#0D47A1] mt-1">{ticketId}</p>
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">
                A technician will be assigned shortly. You can track this ticket in <span className="text-[#0D47A1] font-bold">All Complaints</span>.
              </p>
              {/* Mini lifecycle */}
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Next Steps</p>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-600 flex-wrap">
                  {['New', 'Assigned', 'Engineer Accepted', 'Visit Scheduled', '...', 'Closed'].map((s, i, arr) => (
                    <React.Fragment key={s}>
                      <span className={`px-2 py-0.5 rounded-full ${i === 0 ? 'bg-[#0D47A1] text-white' : 'bg-white border border-slate-200'}`}>{s}</span>
                      {i < arr.length - 1 && <ArrowRight size={10} className="text-slate-300 shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full bg-[#0D47A1] text-white font-bold py-2.5 rounded-xl cursor-pointer hover:bg-blue-800 transition-colors text-sm"
              >
                Raise Another Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterComplaint;
