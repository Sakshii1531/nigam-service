import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Award, CreditCard, Lock, CheckCircle, ChevronRight, Check, Shield, Upload, Search, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ExtendWarranty = () => {
  const navigate = useNavigate();

  // Wizard steps: 'select_appliance', 'plans', 'payment', 'payment_upi', 'payment_card', 'success'
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

  // Categories & Brands
  const categories = [
    { id: 'ac', name: 'Air Conditioner', icon: '❄️' },
    { id: 'wm', name: 'Washing Machine', icon: '🧺' },
    { id: 'ref', name: 'Refrigerator', icon: '🧊' },
    { id: 'tv', name: 'Television', icon: '📺' }
  ];

  const brands = ['Voltas', 'LG', 'Samsung', 'Daikin', 'Lloyd', 'Panasonic', 'Sony', 'Hitachi', 'Blue Star'];

  // Payment states
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // User's active appliances
  const existingWarranties = [
    {
      id: 'WAR-VOL-19028',
      productName: 'Voltas Split AC 1.5 Ton',
      category: 'Air Conditioner',
      brand: 'Voltas',
      purchaseDate: '15 Aug 2024',
      expiryDate: '15 Aug 2027',
      status: 'Active',
      color: 'from-blue-50 to-indigo-50 border-blue-200'
    },
    {
      id: 'WAR-LG-83021',
      productName: 'LG Front Load Washing Machine',
      category: 'Washing Machine',
      brand: 'LG',
      purchaseDate: '10 Nov 2023',
      expiryDate: '10 Nov 2026',
      status: 'Active',
      color: 'from-purple-50 to-pink-50 border-purple-200'
    }
  ];

  // Renewal plans
  const extendWarrantyPlans = [
    {
      id: 'ext_1',
      name: '1-Year Extension Pack',
      price: 799,
      description: 'Extends coverage by 1 full year from your current expiry date.',
      features: ['Full repair cover', 'Genuine brand parts', 'Zero inspection fee']
    },
    {
      id: 'ext_2',
      name: '2-Year Gold Extension Pack',
      price: 1399,
      description: 'Extends coverage by 2 full years from your current expiry date.',
      features: ['2 Years peace of mind', 'Priority technician booking', 'Comprehensive repair cover', 'Gas charging included']
    }
  ];

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

  const triggerMockUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setInvoiceFile({ name: 'manufacturer_invoice.pdf' });
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 20;
      });
    }, 150);
  };

  const handleInvoiceUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      setIsUploading(true);
      setUploadProgress(0);
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 25;
        });
      }, 200);
    } else {
      triggerMockUpload();
    }
  };

  const handleVerifyBrandWarranty = () => {
    if (!modelNo || !serialNo) {
      alert('Please enter both Model Number and Serial Number.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      
      // Mock purchase date to be 6 months ago dynamically
      const pDate = new Date();
      pDate.setMonth(pDate.getMonth() - 6);
      
      // Auto-generate registered appliance data
      const mockRegisteredAppliance = {
        id: `WAR-${selectedBrand?.toUpperCase().slice(0, 3)}-${Math.floor(10000 + Math.random() * 90000)}`,
        productName: `${selectedBrand} ${selectedCategory === 'ac' ? 'Split AC' : selectedCategory === 'wm' ? 'Front Load Washing Machine' : selectedCategory === 'ref' ? 'Double Door Refrigerator' : 'Smart LED TV'}`,
        category: categories.find(c => c.id === selectedCategory)?.name || 'Appliance',
        brand: selectedBrand,
        purchaseDate: pDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        expiryDate: new Date(new Date(pDate).setFullYear(pDate.getFullYear() + 1)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Active',
        color: 'from-amber-50 to-orange-50 border-amber-200'
      };

      setSelectedAppliance(mockRegisteredAppliance);
      setStep('plans');
    }, 2500);
  };

  const handlePayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setStep('success');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
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
            else if (step === 'payment_upi' || step === 'payment_card') setStep('payment');
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

                    </div>

                    <button
                      onClick={handleVerifyBrandWarranty}
                      className="w-full bg-[#0D47A1] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer mt-2"
                    >
                      Verify Active Brand Warranty
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
                  {plan.id === 'ext_2' && (
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
                    {plan.features.map((feat, i) => (
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
              
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Base Renewal Price</span>
                  <span>₹{selectedPlan?.price}.00</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>GST (18%)</span>
                  <span>₹{Math.round(selectedPlan?.price * 0.18)}.00</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-text-primary border-t border-slate-100 pt-2.5">
                  <span>Grand Total</span>
                  <span className="text-amber-600">₹{Math.round(selectedPlan?.price * 1.18)}.00</span>
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

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-text-secondary">Select Payment Mode</span>
              <div className="bg-white rounded-xl border border-border-color overflow-hidden flex flex-col">
                <div 
                  onClick={() => setStep('payment_upi')}
                  className="p-3.5 border-b border-border-color hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-brand-blue" />
                    <span className="text-xs font-bold text-text-primary">UPI / GooglePay / PhonePe</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </div>
                <div 
                  onClick={() => setStep('payment_card')}
                  className="p-3.5 border-b border-border-color hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-brand-blue" />
                    <span className="text-xs font-bold text-text-primary">Credit / Debit Card</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-secondary" />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {paymentProcessing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center flex-col gap-4">
                  <div className="w-16 h-16 border-4 border-white/20 border-t-brand-yellow rounded-full animate-spin"></div>
                  <span className="text-white text-sm font-bold tracking-wide animate-pulse">Processing secure renewal...</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* STEP 3A: UPI PAYMENT SCREEN */}
        {step === 'payment_upi' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-border-color flex flex-col items-center gap-5">
              {/* Mock QR Code */}
              <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                <div className="w-40 h-40 bg-slate-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <svg className="w-32 h-32 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="0" y="0" width="30" height="30" />
                    <rect x="5" y="5" width="20" height="20" fill="white" />
                    <rect x="10" y="10" width="10" height="10" />
                    
                    <rect x="70" y="0" width="30" height="30" />
                    <rect x="75" y="5" width="20" height="20" fill="white" />
                    <rect x="80" y="10" width="10" height="10" />
                    
                    <rect x="0" y="70" width="30" height="30" />
                    <rect x="5" y="75" width="20" height="20" fill="white" />
                    <rect x="10" y="80" width="10" height="10" />

                    <rect x="40" y="40" width="20" height="20" />
                    <rect x="70" y="70" width="15" height="15" />
                    <rect x="85" y="85" width="15" height="15" />
                    <rect x="50" y="70" width="10" height="10" />
                    <rect x="70" y="50" width="10" height="10" />
                  </svg>
                  <div className="absolute inset-0 bg-[#FFD600]/10 animate-pulse"></div>
                </div>
                <span className="text-[10px] text-text-secondary font-semibold">Scan QR Code using any UPI App</span>
              </div>

              <div className="w-full text-center">
                <span className="text-xs text-text-secondary">OR</span>
              </div>

              <div className="w-full">
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">Enter UPI ID</label>
                <input 
                  type="text" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobileNumber@upi"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <button
              onClick={handlePayment}
              className="w-full bg-brand-yellow hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
            >
              Verify & Pay ₹{Math.round(selectedPlan?.price * 1.18)}
            </button>
          </div>
        )}

        {/* STEP 3B: CARD DETAILS SCREEN */}
        {step === 'payment_card' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
              {/* Virtual Plastic Card Preview */}
              <div className="bg-gradient-to-tr from-[#0D47A1] to-[#3B82F6] rounded-xl p-4 text-white shadow-md flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold italic text-white/80">Premium Shield Debit</span>
                  <div className="w-8 h-6 bg-white/20 rounded-md"></div>
                </div>
                <div className="my-2">
                  <span className="text-sm font-mono tracking-widest block">
                    {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                  </span>
                </div>
                <div className="flex justify-between items-end text-[10px]">
                  <div>
                    <span className="text-white/60 block text-[8px] uppercase">Card Holder</span>
                    <span className="font-semibold">{cardName ? cardName.toUpperCase() : 'YOUR NAME'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block text-[8px] uppercase">Expires</span>
                    <span className="font-semibold">{cardExpiry ? cardExpiry : 'MM/YY'}</span>
                  </div>
                </div>
              </div>

              {/* Form Input fields */}
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">Card Number</label>
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="0000 0000 0000 0000"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-mono"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-text-primary mb-1.5 block">Expiry Date</label>
                  <input 
                    type="text" 
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                    placeholder="MM/YY"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs font-semibold text-text-primary mb-1.5 block">CVV</label>
                  <input 
                    type="password" 
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="***"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">Cardholder Name</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <button
              onClick={handlePayment}
              className="w-full bg-[#0D47A1] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
            >
              Pay Securely ₹{Math.round(selectedPlan?.price * 1.18)}
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
                    {selectedPlan?.id === 'ext_1' ? getExtendedExpiryDate(selectedAppliance?.expiryDate, 1) : getExtendedExpiryDate(selectedAppliance?.expiryDate, 2)}
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
                  {selectedPlan?.id === 'ext_1' ? getExtendedExpiryDate(selectedAppliance?.expiryDate, 1) : getExtendedExpiryDate(selectedAppliance?.expiryDate, 2)}
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
