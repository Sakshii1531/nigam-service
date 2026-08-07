import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Award, CreditCard, Lock, CheckCircle, ChevronRight, Check, Shield, Upload, Search, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';

const ExtendWarranty = () => {
  const navigate = useNavigate();

  // Wizard steps: 'select_appliance', 'plans', 'payment', 'success'
  // (payment method selection is Razorpay Checkout's own screen)
  const [step, setStep] = useState('select_appliance'); 

  // Wizard mode for Step 1
  const [applianceMode, setApplianceMode] = useState('registered'); 

  // Form states for pre-registered appliances
  const [selectedAppliance, setSelectedAppliance] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Form states for new in-warranty appliance registration
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Catalogue and the customer's own records — all server-owned. These were
  // hardcoded arrays, so the screen offered categories and brands the platform
  // did not actually service.
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [existingWarranties, setExistingWarranties] = useState([]);
  const [extendWarrantyPlans, setExtendWarrantyPlans] = useState([]);
  const [loadError, setLoadError] = useState('');


  // Presentation shape for an OwnedAppliance from GET /appliances.
  const toApplianceCard = (a) => ({
    id: a.id,
    humanId: a.humanId || a.id,
    productName: [a.brand, a.model || a.modelNumber].filter(Boolean).join(' ') || a.category,
    category: a.category,
    brand: a.brand,
    purchaseDate: a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded',
    expiryDate: a.warrantyExpiresOn ? new Date(a.warrantyExpiresOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded',
    rawExpiry: a.warrantyExpiresOn || null,
    status: a.warrantyStatus,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, brandRes, appRes, planRes] = await Promise.all([
          apiRequest('/catalog/categories'),
          apiRequest('/catalog/brands').catch(() => ({ data: [] })),
          apiRequest('/appliances', { auth: true }),
          apiRequest('/warranty-amc/extended-warranty/plans', { auth: true }),
        ]);
        if (cancelled) return;
        setCategories((catRes.data || []).map((c) => ({ id: c.key || c.id, name: c.name, icon: c.icon || '🔧' })));
        setBrands((brandRes.data || []).map((b) => b.name || b));
        setExistingWarranties((appRes.data || []).map(toApplianceCard));
        setExtendWarrantyPlans(planRes.data || []);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load your appliances and plans.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getExtendedExpiryDate = (currentExpiryStr, yearsToAdd) => {
    try {
      const d = new Date(currentExpiryStr);
      d.setFullYear(d.getFullYear() + yearsToAdd);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      const d = new Date();
      d.setFullYear(d.getFullYear() + yearsToAdd);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  };

  // Uploads the dealer invoice for real and keeps the returned URL — the
  // previous version animated a progress bar and stored nothing, so a
  // "verified" registration had no invoice behind it.
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    setLoadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiRequest('/uploads', { method: 'POST', auth: true, body: form });
      setInvoiceUrl(res.data.url);
      setUploadProgress(100);
    } catch (err) {
      setInvoiceFile(null);
      setLoadError(err.message || 'Invoice upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Looks the unit up in the customer's own registry and, if it isn't there
  // yet, registers it with the purchase date THEY entered. It used to invent a
  // purchase date six months back and a matching expiry, so every date the
  // customer saw on this screen was fiction.
  const handleVerifyBrandWarranty = async () => {
    if (!modelNo || !serialNo) {
      setLoadError('Please enter both Model Number and Serial Number.');
      return;
    }
    if (!purchaseDate) {
      setLoadError('Please enter the purchase date from your invoice — warranty cover is calculated from it.');
      return;
    }

    setIsVerifying(true);
    setLoadError('');
    try {
      const lookup = await apiRequest(
        `/appliances/lookup?modelNumber=${encodeURIComponent(modelNo)}&serialNumber=${encodeURIComponent(serialNo)}`,
        { auth: true },
      );

      const appliance = lookup.data.found
        ? lookup.data.appliance
        : (await apiRequest('/appliances', {
            method: 'POST',
            auth: true,
            body: {
              category: categories.find((c) => c.id === selectedCategory)?.name || selectedCategory,
              brand: selectedBrand,
              modelNumber: modelNo,
              serialNumber: serialNo,
              purchaseDate,
              invoiceFileUrl: invoiceUrl || undefined,
            },
          })).data;

      setSelectedAppliance(toApplianceCard(appliance));
      setExistingWarranties((prev) => {
        const card = toApplianceCard(appliance);
        return prev.some((a) => a.id === card.id) ? prev.map((a) => (a.id === card.id ? card : a)) : [card, ...prev];
      });
      setStep('plans');
    } catch (err) {
      setLoadError(err.message || 'Could not verify this appliance.');
    } finally {
      setIsVerifying(false);
    }
  };

  // A failed policy purchase must not land on the success screen — the customer
  // would believe they were covered when no policy exists.
  const handlePayment = async () => {
    setPaymentProcessing(true);
    setLoadError('');
    try {
      const res = await apiRequest('/warranty-amc/extended-warranty/orders', {
        method: 'POST',
        auth: true,
        body: {
          plan: selectedPlan?.id,
          appliance: selectedAppliance?.id,
          category: selectedAppliance?.category || categories.find((c) => c.id === selectedCategory)?.name,
          brand: selectedAppliance?.brand || selectedBrand,
          modelName: modelNo || selectedAppliance?.productName,
          purchaseDate: purchaseDate || undefined,
          invoiceFileUrl: invoiceUrl || undefined,
        },
      });

      // The policy is only shown as bought once the gateway has taken the money.
      if (res.data.razorpay) {
        await payWithRazorpay({
          razorpay: res.data.razorpay,
          verifyPath: `/warranty-amc/extended-warranty/orders/${res.data.order.id}/verify-payment`,
          description: selectedPlan?.name,
        });
      }
      setStep('success');
    } catch (err) {
      setLoadError(err.message || 'We could not activate this policy. You have not been charged — please try again.');
      setStep('plans');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {loadError && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-semibold text-red-700">
          {loadError}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => {
            if (step === 'select_appliance') {
              if (applianceMode === 'new_appliance') {
                if (selectedBrand) setSelectedBrand(null);
                else if (selectedCategory) setSelectedCategory(null);
                else setApplianceMode('registered');
              } else {
                navigate('/dashboard/in-warranty');
              }
            }
            else if (step === 'plans') setStep('select_appliance');
            else if (step === 'payment') setStep('plans');
            else if (step === 'success') navigate('/dashboard/in-warranty');
          }}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {step === 'success' ? 'Warranty Extended!' : 'Extend Warranty'}
        </h1>
      </div>

      {/* CONTENT WIZARD */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* PROGRESS INDICATOR */}
        {step !== 'success' && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-border-color">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                {step === 'select_appliance' && 'Step 1/3'}
                {step === 'plans' && 'Step 2/3'}
                {step === 'payment' && 'Step 3/3'}
              </span>
              <span className="text-xs font-semibold text-text-primary">
                {step === 'select_appliance' && 'Select Appliance'}
                {step === 'plans' && 'Select Renewal Plan'}
                {step === 'payment' && 'Secure Checkout'}
              </span>
            </div>
            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-300"
                style={{
                  width: 
                    step === 'select_appliance' ? '33%' : 
                    step === 'plans' ? '66%' : '100%'
                }}
              ></div>
            </div>
          </div>
        )}

        {/* STEP 1: SELECT APPLIANCE */}
        {step === 'select_appliance' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-text-primary">Appliance Details</h3>
              <p className="text-xs text-text-secondary">Provide the appliance to extend coverage for.</p>
            </div>

            {/* Selector Mode Tabs */}
            <div className="flex bg-[#E3ECF9]/30 p-1 rounded-xl border border-border-color/80">
              <button
                onClick={() => setApplianceMode('registered')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  applianceMode === 'registered' 
                    ? 'bg-[#0D47A1] text-white shadow-md' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Registered Appliances
              </button>
              <button
                onClick={() => setApplianceMode('new_appliance')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  applianceMode === 'new_appliance' 
                    ? 'bg-[#0D47A1] text-white shadow-md' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Register & Extend New
              </button>
            </div>
            
            {applianceMode === 'registered' ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {existingWarranties.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAppliance(item)}
                      className={`bg-gradient-to-br p-5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-3 relative ${
                        selectedAppliance?.id === item.id 
                          ? 'border-amber-500 bg-amber-50/10 shadow-sm ring-1 ring-amber-500' 
                          : 'border-slate-200 bg-white hover:border-slate-350'
                      }`}
                    >
                      <span className="absolute top-4 right-4 text-[10px] bg-[#E8F5E9] text-[#2E7D32] font-bold px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wider">
                        {item.status}
                      </span>
                      
                      <div>
                        <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">{item.category}</span>
                        <h4 className="text-base font-bold text-text-primary mt-0.5">{item.productName}</h4>
                      </div>
                      
                      <div className="flex justify-between border-t border-slate-100/50 pt-3 text-xs text-text-secondary">
                        <span>Certificate: <strong className="text-text-primary font-semibold">{item.id}</strong></span>
                        <span>Expires: <strong className="text-red-500 font-semibold">{item.expiryDate}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (!selectedAppliance) {
                      alert('Please select an active appliance to extend its warranty.');
                      return;
                    }
                    setStep('plans');
                  }}
                  className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2 cursor-pointer"
                >
                  Verify & Check Extension Plans
                </button>
              </div>
            ) : (
              /* REGISTER & EXTEND FLOW FOR NEW IN-WARRANTY APPLIANCES */
              <div className="flex flex-col gap-4">
                
                {/* A: SELECT CATEGORY */}
                {!selectedCategory && (
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-text-secondary">Choose Appliance Category</span>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-blue/50 cursor-pointer flex flex-col items-center gap-2.5 transition-all text-center group"
                        >
                          <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                          <span className="text-xs font-bold text-text-primary">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B: SELECT BRAND */}
                {selectedCategory && !selectedBrand && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-text-secondary">Select Brand</span>
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
                      >
                        Change Category
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 h-4 w-4 text-text-secondary" />
                      <input 
                        type="text" 
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        placeholder="Search manufacturer brand..."
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {brands
                        .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                        .map((b) => (
                          <div
                            key={b}
                            onClick={() => setSelectedBrand(b)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50 cursor-pointer text-center transition-all"
                          >
                            <span className="text-xs font-bold text-text-primary block truncate">{b}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* C: DETAILED SPECIFICATIONS & INVOICE UPLOAD */}
                {selectedCategory && selectedBrand && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Registering</span>
                        <strong className="text-xs text-text-primary font-bold">{selectedBrand} • {categories.find(c => c.id === selectedCategory)?.name}</strong>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedBrand(null);
                          setInvoiceFile(null);
                          setUploadProgress(0);
                        }}
                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Reset Selection
                      </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex gap-3 text-amber-800">
                      <Shield className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">Active Manufacturer Warranty Required</span>
                        <span className="text-[10px] text-amber-700 block mt-0.5 leading-relaxed">
                          To extend coverage under the In-Warranty program, the appliance must be purchased within the last 1 year and have valid manufacturer brand protection.
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 bg-white p-5 rounded-2xl border border-slate-200">
                      <div>
                        <label className="text-xs font-semibold text-text-primary mb-1.5 block">Model Number</label>
                        <input 
                          type="text" 
                          value={modelNo}
                          onChange={(e) => setModelNo(e.target.value.toUpperCase())}
                          placeholder="e.g. MS-Q18YNZA"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text-primary mb-1.5 block">Serial Number</label>
                        <input 
                          type="text" 
                          value={serialNo}
                          onChange={(e) => setSerialNo(e.target.value.toUpperCase())}
                          placeholder="e.g. SN-89201948-Z"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-mono"
                        />
                      </div>

                      {/* Warranty cover is measured from this date, so the customer
                          supplies it from their invoice — it is not inferred. */}
                      <div>
                        <label className="text-xs font-semibold text-text-primary mb-1.5 block">Purchase Date (from your invoice)</label>
                        <input
                          type="date"
                          value={purchaseDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-text-primary mb-1.5 block">Dealer Invoice (optional)</label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-blue">
                          <Upload className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          <span className="text-xs text-text-secondary truncate">
                            {isUploading ? `Uploading… ${uploadProgress}%` : invoiceFile ? invoiceFile.name : 'Attach the purchase invoice'}
                          </span>
                          <input type="file" accept="image/*,application/pdf" onChange={handleInvoiceUpload} className="hidden" />
                        </label>
                        {invoiceUrl && (
                          <a href={invoiceUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-blue mt-1.5 inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" /> View uploaded invoice
                          </a>
                        )}
                      </div>

                    </div>

                    <button
                      onClick={handleVerifyBrandWarranty}
                      disabled={isVerifying || isUploading}
                      className="w-full bg-[#0D47A1] hover:bg-blue-900 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer mt-2"
                    >
                      {isVerifying ? 'Verifying…' : 'Verify Active Brand Warranty'}
                    </button>
                  </div>
                )}

              </div>
            )}

            <AnimatePresence>
              {isVerifying && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-amber-500 rounded-full animate-spin"></div>
                  <span className="text-white text-sm font-bold tracking-wide animate-pulse">Verifying Brand Warranty Status...</span>
                  <span className="text-white/60 text-xs font-medium">Checking purchase invoice validity with manufacturer...</span>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

        {/* STEP 2: RENEWAL PLANS */}
        {step === 'plans' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Renewal & Extension Packs</h3>
            <p className="text-sm text-text-secondary -mt-2">Extend coverage for {selectedAppliance?.productName} (Current Expiry: {selectedAppliance?.expiryDate}).</p>
            
            <div className="flex flex-col gap-4">
              {extendWarrantyPlans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all flex flex-col gap-3 relative ${
                    selectedPlan?.id === plan.id 
                      ? 'border-amber-500 shadow-md shadow-amber-500/5 ring-1 ring-amber-500' 
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {plan.durationYears >= 2 && (
                    <span className="absolute top-4 right-4 text-[10px] bg-brand-yellow text-black font-bold px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                  
                  <div>
                    <h4 className="text-base font-bold text-text-primary">{plan.name}</h4>
                    <p className="text-xs text-text-secondary mt-1">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-amber-600">₹{plan.price}</span>
                    <span className="text-xs text-text-secondary">renewal price</span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                    {(plan.features || []).map((feat, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-text-secondary">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (!selectedPlan) {
                  alert('Please select an extension pack.');
                  return;
                }
                setStep('payment');
              }}
              className="w-full bg-brand-yellow hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition-all shadow-md text-sm mt-2 cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}

        {/* STEP 3: SECURE CHECKOUT */}
        {step === 'payment' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Secure Checkout</h3>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Order Summary</h4>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold text-text-primary block">{selectedPlan?.name}</span>
                  <span className="text-xs text-text-secondary">Appliance: {selectedAppliance?.productName}</span>
                </div>
                <span className="font-bold text-amber-600">₹{selectedPlan?.price}</span>
              </div>
              
              {/* The amount charged is the catalogue price the server bills.
                  This used to add an 18% GST line the server never applied, so
                  the customer was quoted more than they were charged. */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between font-bold text-sm text-text-primary pt-1">
                  <span>Amount payable</span>
                  <span className="text-amber-600">₹{Number(selectedPlan?.price || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-3.5 rounded-xl flex gap-3 text-green-700">
              <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold block">100% Encrypted Transactions</span>
                <span className="text-[10px] text-green-600 block mt-0.5">Secure payment verified via PCIDSS banking standards.</span>
              </div>
            </div>

            {/* Razorpay Checkout presents UPI / cards / net-banking itself.
                The two screens that used to sit here drew a decorative QR and a
                card form that collected details nothing ever charged. */}
            <button
              onClick={handlePayment}
              disabled={paymentProcessing}
              className="w-full bg-brand-yellow hover:bg-yellow-400 disabled:opacity-60 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              {paymentProcessing ? 'Opening secure checkout…' : `Pay ₹${Number(selectedPlan?.price || 0).toLocaleString('en-IN')} Securely`}
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS (CERTIFICATE) */}
        {step === 'success' && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col gap-6 items-center"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shadow-md">
              <CheckCircle className="h-10 w-10 animate-bounce" />
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-text-primary">Warranty Extended Successfully!</h3>
              <p className="text-sm text-text-secondary mt-1">Your appliance protection coverage has been successfully renewed.</p>
            </div>

            {/* Parchment Certificate Card */}
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl border-2 border-brand-yellow flex flex-col gap-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                <Award className="h-6 w-6" />
              </div>

              <div className="text-center pb-3 border-b border-amber-100 flex flex-col items-center">
                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Certificate of Coverage</span>
                <h4 className="text-sm font-black text-brand-navy mt-1 tracking-wide">NIGAM SHIELD EXTENDED WARRANTY</h4>
              </div>

              <p className="text-[10px] text-text-secondary italic text-center -mt-1 leading-relaxed">
                This certificate validates that the coverage for the appliance listed below has been extended.
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Appliance Brand & Model:</span>
                  <strong className="text-text-primary font-bold">{selectedAppliance?.productName} (Extended)</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Original Certificate ID:</span>
                  <span className="font-mono text-text-secondary">{selectedAppliance?.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Updated Coverage Expiry:</span>
                  <strong className="text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    {getExtendedExpiryDate(selectedAppliance?.rawExpiry, selectedPlan?.durationYears || 1)}
                  </strong>
                </div>
                <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-200/50">
                  <span className="text-text-secondary">Verification Status:</span>
                  <strong className="text-brand-blue uppercase tracking-wider text-[10px]">OFFICIALLY REGISTERED</strong>
                </div>
              </div>

              <div className="flex justify-between items-end mt-4 pt-3 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-400">SEAL</div>
                  <span className="text-[9px] text-text-secondary font-medium">Official Seal</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-serif font-bold text-brand-navy underline decoration-wavy decoration-blue-500">V. Sharma</span>
                  <span className="text-[9px] text-text-secondary block mt-1">Operations Director</span>
                </div>
              </div>
            </div>

            {/* Extended warranty details table */}
            <div className="w-full max-w-lg bg-slate-50 border border-border-color rounded-2xl p-4 flex flex-col gap-3 text-xs mt-1">
              <div className="flex justify-between text-text-secondary">
                <span>Warranty Status</span>
                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-bold text-[10px]">Extended</span>
              </div>
              <div className="flex justify-between text-text-secondary border-t border-slate-200/50 pt-2">
                <span>Extended Coverage Benefit</span>
                <span className="font-semibold text-text-primary text-right">Comprehensive (Parts + Labor)</span>
              </div>
              <div className="flex justify-between text-[#374151] border-t border-slate-200/50 pt-2">
                <span>Original Expiry Date</span>
                <span className="font-semibold text-text-primary">{selectedAppliance?.expiryDate}</span>
              </div>
              <div className="flex justify-between text-[#374151] border-t border-slate-200/50 pt-2 font-bold">
                <span>Updated Expiry Date</span>
                <span className="text-green-700">
                  {getExtendedExpiryDate(selectedAppliance?.rawExpiry, selectedPlan?.durationYears || 1)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/in-warranty')}
              className="w-full max-w-sm bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-4 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}

      </div>

    </div>
  );
};

export default ExtendWarranty;
