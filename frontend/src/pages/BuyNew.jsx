import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, ShoppingCart, CheckCircle, ChevronRight, Upload, 
  ShieldAlert, CreditCard, Lock, Check, Search, RefreshCw, Sparkles, FileText,
  Home as HomeIcon, Calendar, LayoutGrid, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BuyNew = () => {
  const navigate = useNavigate();

  // Wizard steps: 'category', 'brand', 'details', 'invoice', 'eligibility', 'plans', 'payment', 'payment_upi', 'payment_card', 'success'
  const [step, setStep] = useState('category'); 

  // Form states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modelNo, setModelNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [eligibilityPassed, setEligibilityPassed] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Payment states
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  // Product categories
  const categories = [
    { id: 'ac', name: 'Air Conditioner', icon: '❄️' },
    { id: 'wm', name: 'Washing Machine', icon: '🧺' },
    { id: 'ref', name: 'Refrigerator', icon: '🧊' },
    { id: 'tv', name: 'Television', icon: '📺' },
    { id: 'mw', name: 'Microwave Oven', icon: '🎛️' },
    { id: 'gy', name: 'Geyser / Water Heater', icon: '🔥' },
  ];

  // Brands
  const brands = [
    'Voltas', 'LG', 'Samsung', 'Whirlpool', 'Daikin', 'Panasonic', 
    'Sony', 'Godrej', 'Haier', 'IFB', 'Blue Star', 'Hitachi'
  ];

  // Plans
  const newWarrantyPlans = [
    {
      id: 'plan_1',
      name: 'Standard Shield',
      duration: '1 Year Coverage',
      price: 999,
      features: ['Free service & repairs', '100% parts & labor covered', 'No hidden charges'],
      badge: 'Basic',
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'plan_2',
      name: 'Premium Secure',
      duration: '2 Years Coverage',
      price: 1799,
      features: ['24-hour turnaround warranty', '100% parts, labor & gas replacement', 'Free annual maintenance checkout'],
      badge: 'Popular',
      badgeColor: 'bg-brand-yellow text-black'
    },
    {
      id: 'plan_3',
      name: 'Comprehensive Platinum',
      duration: '3 Years Coverage',
      price: 2499,
      features: ['Ultimate peace of mind warranty', 'Unlimited free home visits', 'Accidental breakdown protection', 'Priority customer support'],
      badge: 'Best Value',
      badgeColor: 'bg-[#E3F2FD] text-[#0D47A1]'
    }
  ];

  // Handle simulated file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setInvoiceFile(file);
      setIsUploading(true);
      setUploadProgress(0);
      
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 20;
        });
      }, 200);
    }
  };

  // Run eligibility checking
  const runEligibilityCheck = () => {
    setStep('eligibility');
    setTimeout(() => {
      if (purchaseDate) {
        const pDate = new Date(purchaseDate);
        const today = new Date();
        const diffTime = Math.abs(today - pDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 365) {
          setEligibilityPassed(true);
        } else {
          setEligibilityPassed(false);
        }
      } else {
        setEligibilityPassed(true);
      }
    }, 2500);
  };

  // Run payment processing
  const handlePayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setStep('success');
    }, 2000);
  };

  const getFutureDate = (yearsToAdd) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsToAdd);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-32">
      
      {/* HEADER */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => {
            if (step === 'category') navigate('/dashboard/non-warranty');
            else if (step === 'brand') setStep('category');
            else if (step === 'details') setStep('brand');
            else if (step === 'eligibility') setStep('details');
            else if (step === 'plans') setStep('details');
            else if (step === 'payment') setStep('plans');
            else if (step === 'payment_upi' || step === 'payment_card') setStep('payment');
            else if (step === 'success') navigate('/dashboard/non-warranty');
          }}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {step === 'success' ? 'Warranty Issued!' : 'Buy New Warranty'}
        </h1>
      </div>

      {/* CONTENT WIZARD */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* PROGRESS INDICATOR */}
        {(step === 'category' || step === 'brand' || step === 'details') && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-border-color">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-blue bg-[#E3ECF9] px-2 py-1 rounded-full">
                {step === 'category' && 'Step 1/3'}
                {step === 'brand' && 'Step 2/3'}
                {step === 'details' && 'Step 3/3'}
              </span>
              <span className="text-xs font-semibold text-text-primary">
                {step === 'category' && 'Product Category'}
                {step === 'brand' && 'Select Brand'}
                {step === 'details' && 'Appliance Details'}
              </span>
            </div>
            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-brand-blue h-full transition-all duration-300"
                style={{
                  width: 
                    step === 'category' ? '33%' : 
                    step === 'brand' ? '66%' : '100%'
                }}
              ></div>
            </div>
          </div>
        )}

        {/* STEP 1: CATEGORY */}
        {step === 'category' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Select Product Category</h3>
            <p className="text-sm text-text-secondary -mt-2">Choose the type of appliance you want to protect.</p>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setStep('brand');
                  }}
                  className={`p-5 bg-white rounded-2xl shadow-sm border cursor-pointer hover:border-brand-blue transition-all flex flex-col items-center justify-center gap-3 text-center ${
                    selectedCategory?.id === cat.id ? 'border-brand-blue bg-blue-50/20' : 'border-border-color'
                  }`}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className="text-sm font-semibold text-text-primary">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: BRAND */}
        {step === 'brand' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Select Brand</h3>
            <p className="text-sm text-text-secondary -mt-2">Which brand makes your {selectedCategory?.name}?</p>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Search Brand..." 
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-border-color rounded-xl text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {brands
                .filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
                .map((brand) => (
                  <div
                    key={brand}
                    onClick={() => {
                      setSelectedBrand(brand);
                      setStep('details');
                    }}
                    className={`p-3 bg-white rounded-xl shadow-sm border cursor-pointer text-center text-xs font-bold hover:border-brand-blue transition-all truncate ${
                      selectedBrand === brand ? 'border-brand-blue bg-blue-50/30' : 'border-border-color'
                    }`}
                  >
                    {brand}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {step === 'details' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Enter Product Details</h3>
            <p className="text-sm text-text-secondary -mt-2">Provide the specifications of your {selectedBrand} {selectedCategory?.name}.</p>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">Model Number</label>
                <input 
                  type="text" 
                  value={modelNo}
                  onChange={(e) => setModelNo(e.target.value)}
                  placeholder="e.g. MS-1520VX"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">Serial Number (Optional)</label>
                <input 
                  type="text" 
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="e.g. SN-8923412-K"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!modelNo) {
                  alert('Please enter your model number to proceed.');
                  return;
                }
                runEligibilityCheck();
              }}
              className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2 cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}



        {/* STEP 5: ELIGIBILITY CHECK */}
        {step === 'eligibility' && (
          <div className="flex flex-col items-center justify-center text-center gap-6 py-10">
            {eligibilityPassed === null ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-slate-100 border-t-brand-blue rounded-full animate-spin"></div>
                  <Shield className="h-10 w-10 text-brand-blue absolute animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mt-2">Checking Warranty Eligibility</h3>
                <p className="text-sm text-text-secondary max-w-xs">
                  Verifying invoice parameters, purchase date validation, and product registry...
                </p>
              </motion.div>
            ) : eligibilityPassed ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-6 rounded-3xl shadow-xl border border-green-100 w-full flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  Passed Verification
                </span>
                <h3 className="text-xl font-bold text-text-primary">Eligible for Premium Warranty!</h3>
                <p className="text-sm text-text-secondary max-w-xs -mt-1 leading-relaxed">
                  Your {selectedBrand} {selectedCategory?.name} qualifies for instant coverage plans.
                </p>
                <div className="w-full border-t border-dashed border-border-color my-2"></div>
                <button
                  onClick={() => setStep('plans')}
                  className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer"
                >
                  View Available Plans
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-6 rounded-3xl shadow-xl border border-red-100 w-full flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                  <ShieldAlert className="h-10 w-10" />
                </div>
                <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  Verification Failed
                </span>
                <h3 className="text-xl font-bold text-text-primary">Device Ineligible</h3>
                <p className="text-sm text-text-secondary max-w-xs -mt-1 leading-relaxed">
                  We found that the appliance was purchased over 12 months ago ({purchaseDate}) which exceeds the eligibility window.
                </p>
                <div className="w-full flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      setInvoiceFile(null);
                      setStep('details');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-text-primary font-semibold py-3 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/non-warranty')}
                    className="flex-1 bg-brand-navy hover:bg-blue-900 text-white font-semibold py-3 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    Main Menu
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* STEP 6: PLANS LIST */}
        {step === 'plans' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Available Warranty Plans</h3>
            <p className="text-sm text-text-secondary -mt-2">Select the plan that fits your protection needs best.</p>
            
            <div className="flex flex-col gap-4">
              {newWarrantyPlans.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all flex flex-col gap-3 relative ${
                    selectedPlan?.id === plan.id 
                      ? 'border-[#0D47A1] shadow-md shadow-[#0D47A1]/5 ring-1 ring-[#0D47A1]' 
                      : 'border-border-color hover:border-slate-400'
                  }`}
                >
                  <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  
                  <div>
                    <span className="text-xs font-semibold text-text-secondary block">{plan.duration}</span>
                    <h4 className="text-base font-bold text-text-primary mt-0.5">{plan.name}</h4>
                  </div>

                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-[#0D47A1]">₹{plan.price}</span>
                    <span className="text-xs text-text-secondary">one-time payment</span>
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
                  alert('Please select a warranty plan to proceed.');
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

        {/* STEP 7: SECURE CHECKOUT */}
        {step === 'payment' && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-primary">Secure Checkout</h3>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-border-color flex flex-col gap-4">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Plan Details</h4>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-bold text-text-primary block">{selectedPlan?.name}</span>
                  <span className="text-xs text-text-secondary">{selectedBrand} {selectedCategory?.name}</span>
                </div>
                <span className="font-bold text-[#0D47A1]">₹{selectedPlan?.price}</span>
              </div>
              
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Base Plan Price</span>
                  <span>₹{selectedPlan?.price}.00</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>GST (18%)</span>
                  <span>₹{Math.round(selectedPlan?.price * 0.18)}.00</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-text-primary border-t border-slate-100 pt-2.5">
                  <span>Grand Total</span>
                  <span className="text-[#0D47A1]">₹{Math.round(selectedPlan?.price * 1.18)}.00</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-3.5 rounded-xl flex gap-3 text-green-700">
              <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold block">100% Encrypted Transactions</span>
                <span className="text-[10px] text-green-600 block mt-0.5">Payments are processed securely via PCIDSS gateways.</span>
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
                  <span className="text-white text-sm font-bold tracking-wide animate-pulse">Processing secure payment...</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* STEP 7A: UPI PAYMENT SCREEN */}
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

        {/* STEP 7B: CARD DETAILS SCREEN */}
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

        {/* STEP 8: SUCCESS (DIGITAL CARD) */}
        {step === 'success' && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col gap-6 items-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
              <CheckCircle className="h-10 w-10" />
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-bold text-text-primary">Warranty Issued Successfully!</h3>
              <p className="text-sm text-text-secondary mt-1">Your appliance is now covered under Nigam Shield.</p>
            </div>

            {/* Glassmorphic Digital Warranty Card */}
            <div className="w-full max-w-sm bg-gradient-to-br from-brand-navy via-[#0A3D80] to-brand-blue rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand-yellow/10 rounded-full blur-3xl"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] bg-brand-yellow text-black font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Nigam Shield Card
                  </span>
                  <h4 className="text-lg font-bold mt-2 truncate w-48">{selectedBrand} {selectedCategory?.name}</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                  <Shield className="h-5 w-5 text-brand-yellow" />
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Coverage Level:</span>
                  <span className="font-bold text-brand-yellow">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Policy Number:</span>
                  <span className="font-mono tracking-wider font-semibold">WAR-NEW-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span> Active
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Coverage Expiry:</span>
                  <span className="font-bold text-white">
                    {selectedPlan?.id === 'plan_1' ? getFutureDate(1) : selectedPlan?.id === 'plan_2' ? getFutureDate(2) : getFutureDate(3)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard/non-warranty')}
              className="w-full max-w-sm bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm mt-4 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </motion.div>
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-brand-blue"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>

    </div>
  );
};

export default BuyNew;
