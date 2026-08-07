import React, { useState, useEffect } from 'react';
import { 
  X, Search, Check, ChevronRight, ArrowLeft, Info, 
  AlertCircle, HelpCircle, CheckCircle2, ChevronDown, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializeQuestionSets, initializeCampaigns } from '../../data/exchangeMockData';
import { apiRequest } from '../../lib/apiClient';

const ExchangeModal = ({ 
  isOpen, 
  onClose, 
  product, 
  config, 
  onApply 
}) => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  // Dynamic question set state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: value }
  
  // Calculations
  const [baseValue, setBaseValue] = useState(0);
  const [deductionsAmount, setDeductionsAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [finalPrice, setFinalPrice] = useState(product?.price || 0);

  // Question sets and campaigns come from the super-admin console via the API —
  // the customer's browser has never authored them.
  const [allQuestionSets, setAllQuestionSets] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([initializeQuestionSets(), initializeCampaigns()])
        .then(([qSets, camps]) => { setAllQuestionSets(qSets); setAllCampaigns(camps); })
        .catch((err) => console.error('[exchange] Could not load exchange configuration:', err.message));
      
      const category = product?.category || 'Water Purifier';

      // Reset state
      setStep(2); // Start directly at brand select
      setSelectedCategory(category);
      setBrandSearch('');
      setSelectedBrand('');
      setModelSearch('');
      setSelectedModel('');
      setAnswers({});
      setBaseValue(0);
      setDeductionsAmount(0);
      setBonusAmount(0);
      setEstimatedValue(0);
      setTotalSavings(0);
      setFinalPrice(product?.price || 0);

    }
  }, [isOpen, product]);

  // Question set is chosen once the sets have loaded, not during the open handler.
  useEffect(() => {
    if (!isOpen || allQuestionSets.length === 0) return;
    const category = product?.category || 'Water Purifier';
    const qSet = allQuestionSets.find((set) => set.category === category) || allQuestionSets[0];
    setQuestions(qSet?.questions || []);
  }, [isOpen, product, allQuestionSets]);

  // Derived list of exchange categories supported by the current product configuration
  const supportedCategories = config?.supportedCategories || ['Mobile'];

  // Handle Category selection
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    // Find matching question set for this category
    const qSet = allQuestionSets.find(set => set.category === category) || allQuestionSets[0];
    setQuestions(qSet?.questions || []);
    setStep(2);
  };

  // Brands, models and base values all come from the admin-managed base-value
  // catalogue. They used to be three objects bundled into the customer app, so
  // the trade-in money offered was fixed in the browser build.
  const [catalogue, setCatalogue] = useState([]);
  const [catalogueError, setCatalogueError] = useState('');

  useEffect(() => {
    if (!selectedCategory) return;
    let cancelled = false;
    apiRequest(`/exchange/base-values?category=${encodeURIComponent(selectedCategory)}`, { auth: true })
      .then((res) => { if (!cancelled) { setCatalogue(res.data || []); setCatalogueError(''); } })
      .catch((err) => { if (!cancelled) { setCatalogue([]); setCatalogueError(err.message || 'Could not load exchange values.'); } });
    return () => { cancelled = true; };
  }, [selectedCategory]);

  const availableBrands = [...new Set(catalogue.filter((r) => r.isActive).map((r) => r.brand))];
  const filteredBrands = availableBrands.filter(b => 
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setStep(3);
  };

  // Filter Models based on Brand and Search
  const availableModels = catalogue.filter((r) => r.isActive && r.brand === selectedBrand).map((r) => r.model);
  const filteredModels = availableModels.filter(m => 
    m.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    // No silent 5000 fallback: an unpriced model must not be quoted at all.
    const row = catalogue.find((r) => r.model === model && r.brand === selectedBrand);
    setBaseValue(row ? row.baseValue : 0);
    
    // Initialize default answers
    const initialAnswers = {};
    questions.forEach(q => {
      if (q.type === 'Yes/No' || q.type === 'Toggle') {
        initialAnswers[q.id] = 'Yes';
      } else if (q.type === 'Multiple Choice') {
        initialAnswers[q.id] = [];
      } else {
        initialAnswers[q.id] = q.options[0] || '';
      }
    });
    setAnswers(initialAnswers);
    setStep(4);
  };

  // Handle Question Answer Change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Handle Multiple Choice Answer Toggle
  const handleMultiSelectToggle = (questionId, option) => {
    const currentAnswers = answers[questionId] || [];
    let newAnswers;
    if (currentAnswers.includes(option)) {
      newAnswers = currentAnswers.filter(item => item !== option);
    } else {
      newAnswers = [...currentAnswers, option];
    }
    setAnswers(prev => ({
      ...prev,
      [questionId]: newAnswers
    }));
  };

  // Calculate live value whenever answers, base value, or campaign updates
  useEffect(() => {
    if (!selectedModel || baseValue === 0) return;

    let totalDeductionRatio = 0;

    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans === undefined) return;

      if (q.type === 'Multiple Choice') {
        // Multi-select sum of deductions
        const selectedOptions = ans || [];
        selectedOptions.forEach(opt => {
          if (q.deductions && q.deductions[opt]) {
            totalDeductionRatio += q.deductions[opt];
          }
        });
      } else {
        // Yes/No, Radio, Dropdown, Toggle single deduction
        if (q.deductions && q.deductions[ans] !== undefined) {
          totalDeductionRatio += q.deductions[ans];
        }
      }
    });

    // Clamp deduction ratio between 0 and 0.85 (keep at least 15% value)
    totalDeductionRatio = Math.min(totalDeductionRatio, 0.85);

    const calculatedDeductions = Math.round(baseValue * totalDeductionRatio);
    const calculatedEstValue = Math.max(Math.round(baseValue - calculatedDeductions), 0);

    // Apply campaign bonus if active
    let campaignBonus = 0;
    if (config?.campaignId) {
      const activeCampaign = allCampaigns.find(c => c.id === config.campaignId && c.status === 'Active');
      if (activeCampaign) {
        campaignBonus = activeCampaign.bonusAmount || 0;
      }
    }

    const maxAllowedExchange = config?.maxVal || 15000;
    const finalSavings = Math.min(calculatedEstValue + campaignBonus, maxAllowedExchange);

    setDeductionsAmount(calculatedDeductions);
    setBonusAmount(campaignBonus);
    setEstimatedValue(calculatedEstValue);
    setTotalSavings(finalSavings);
    setFinalPrice(Math.max(product.price - finalSavings, 0));

  }, [answers, baseValue, questions, config, allCampaigns, product]);

  const handleApplyExchange = () => {
    const exchangeDetails = {
      category: selectedCategory,
      brand: selectedBrand,
      model: selectedModel,
      estimatedValue: estimatedValue,
      bonus: bonusAmount,
      totalSavings: totalSavings,
      originalPrice: product.price,
      finalPrice: finalPrice
    };
    onApply(exchangeDetails);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 sm:items-center">
      {/* Overlay backdrop click */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <motion.div 
        initial={{ y: '100%', opacity: 0.9 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white w-full max-w-4xl h-[92vh] sm:h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-100"
      >
        
        {/* LEFT/MAIN PANEL: Step-by-step forms */}
        <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-100">
          
          {/* Modal Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              {step > 2 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div>
                <h3 className="text-sm font-black text-brand-navy uppercase tracking-wider flex items-center gap-1.5 text-left">
                  <RefreshCw className="w-4 h-4 text-brand-blue" />
                  Exchange Your Old {selectedCategory}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">Flipkart SmartBuy Partner</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Form Step Contents */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            
            {/* STEP 1: Select Category */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-extrabold text-brand-navy">Choose old device type</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Select the category of the item you want to exchange</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {supportedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      className="bg-white border border-slate-200 hover:border-brand-blue/50 hover:bg-slate-50/30 p-5 rounded-2xl flex flex-col items-center gap-3 transition-all text-center group cursor-pointer"
                    >
                      <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100/60 rounded-xl flex items-center justify-center text-brand-blue transition-colors">
                        <RefreshCw className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="text-xs font-black text-brand-navy">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: Select Brand */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-extrabold text-brand-navy">Select Brand</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Which brand is your old {selectedCategory}?</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search brand (e.g., Apple, Samsung)..."
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-2">
                  {filteredBrands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleSelectBrand(brand)}
                      className="bg-white border border-slate-200 hover:border-brand-blue/50 rounded-xl py-3 px-4 text-xs font-black text-brand-navy text-center transition-all cursor-pointer hover:bg-slate-50/20"
                    >
                      {brand}
                    </button>
                  ))}
                  {filteredBrands.length === 0 && (
                    <p className="col-span-full text-center text-xs text-slate-400 py-6 font-semibold">No brands match your search.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Select Model */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-extrabold text-brand-navy">Select Model</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Find the exact model of your {selectedBrand} device</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search model (e.g., Galaxy S22)..."
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-brand-blue focus:bg-white transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  {filteredModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => handleSelectModel(model)}
                      className="bg-white border border-slate-200 hover:border-brand-blue/50 rounded-xl py-3.5 px-4 text-xs font-black text-brand-navy text-left flex justify-between items-center transition-all cursor-pointer hover:bg-slate-50/30"
                    >
                      <span>{model}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                  {filteredModels.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-6 font-semibold">
                      {catalogueError || 'No models match your search.'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Dynamic Device Questions */}
            {step === 4 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-base font-extrabold text-brand-navy">Check Device Condition</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Please answer truthfully. Mismatched details during pickup will alter price.</p>
                </div>

                <div className="flex flex-col gap-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4.5 text-left flex flex-col gap-3">
                      <label className="text-xs font-black text-brand-navy flex items-start gap-1.5">
                        <span className="bg-brand-blue/10 text-brand-blue w-5 h-5 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                        {q.text}
                      </label>

                      {/* YES/NO and TOGGLE Types */}
                      {(q.type === 'Yes/No' || q.type === 'Toggle') && (
                        <div className="flex gap-3">
                          {['Yes', 'No'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt)}
                              className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                                answers[q.id] === opt 
                                  ? 'bg-brand-blue border-brand-blue text-white shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* RADIO Type */}
                      {q.type === 'Radio' && (
                        <div className="flex flex-col gap-2">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, opt)}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-left border flex items-center justify-between transition-all cursor-pointer ${
                                answers[q.id] === opt 
                                  ? 'border-brand-blue bg-blue-50/20 text-brand-navy' 
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <span>{opt}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                answers[q.id] === opt ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'
                              }`}>
                                {answers[q.id] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* DROPDOWN Type */}
                      {q.type === 'Dropdown' && (
                        <div className="relative">
                          <select
                            value={answers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-blue appearance-none cursor-pointer"
                          >
                            {q.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      )}

                      {/* MULTIPLE CHOICE Type */}
                      {q.type === 'Multiple Choice' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => {
                            const isChecked = (answers[q.id] || []).includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleMultiSelectToggle(q.id, opt)}
                                className={`py-2.5 px-4 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition-all cursor-pointer ${
                                  isChecked 
                                    ? 'border-brand-blue bg-blue-50/15 text-brand-navy font-bold' 
                                    : 'border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                <span>{opt}</span>
                                <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                                  isChecked ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  ))}
                </div>

                {/* Continue button */}
                <button
                  onClick={() => setStep(5)}
                  className="w-full bg-brand-blue hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-4 cursor-pointer"
                >
                  Continue to Summary
                </button>
              </div>
            )}

            {/* STEP 5: Final Summary Receipt */}
            {step === 5 && (
              <div className="flex flex-col gap-5 text-left">
                <div>
                  <h4 className="text-base font-extrabold text-brand-navy">✅ Exchange Details Summary</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Review your evaluated specifications before applying</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-3.5">
                  <div className="flex justify-between items-center pb-3.5 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-500">Device Category</span>
                    <span className="font-black text-brand-navy">{selectedCategory}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3.5 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-500">Brand</span>
                    <span className="font-black text-brand-navy">{selectedBrand}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3.5 border-b border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-500">Model Name</span>
                    <span className="font-black text-brand-navy">{selectedModel}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-green-600 font-extrabold">
                    <span>Estimated Device Value</span>
                    <span>₹{estimatedValue.toLocaleString()}</span>
                  </div>
                  {bonusAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#10B981] font-extrabold">
                      <span>Exchange Promo Bonus</span>
                      <span>+ ₹{bonusAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-slate-200 pt-3.5 text-sm font-black text-brand-navy">
                    <span>Total Exchange Savings</span>
                    <span className="text-green-600">₹{totalSavings.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 mt-4">
                  <button
                    onClick={handleApplyExchange}
                    className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer"
                  >
                    Apply Exchange
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-black py-4 rounded-2xl transition-all text-sm cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-4 rounded-2xl transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT PANEL: Live Summary Card (Desktop Only) */}
        {step >= 4 && (
          <div className="hidden md:flex w-80 bg-slate-50 h-full p-6 flex-col justify-between border-l border-slate-100 select-none">
            <div className="flex flex-col gap-5 text-left">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">Live Savings Estimate</h4>
              
              <div className="flex flex-col gap-3.5 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm">
                
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Product Price</span>
                  <span className="font-extrabold text-slate-700">₹{product?.price?.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Device Base Value</span>
                  <span className="font-extrabold text-slate-700">₹{baseValue.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-xs font-semibold text-red-500 border-t border-slate-100 pt-3">
                  <span>Device Deductions</span>
                  <span className="font-extrabold">- ₹{deductionsAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-xs font-semibold text-green-600">
                  <span>Evaluated Value</span>
                  <span className="font-extrabold">₹{estimatedValue.toLocaleString()}</span>
                </div>

                {bonusAmount > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-emerald-600">
                    <span>Campaign Bonus</span>
                    <span className="font-extrabold">+ ₹{bonusAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-brand-navy border-t border-slate-200 pt-3">
                  <span>Total Savings</span>
                  <span className="text-green-600">₹{totalSavings.toLocaleString()}</span>
                </div>
              </div>

              {/* Dynamic campaign notice */}
              {config?.campaignId && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 block">Offer Applied!</span>
                    <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">{config.badgeText || 'Exchange Bonus Active'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Final Estimated Checkout Price */}
            <div className="bg-brand-navy text-white rounded-2xl p-4.5 text-left shadow-md">
              <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider block">Estimated Checkout Price</span>
              <motion.span 
                key={finalPrice}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-xl font-black block mt-1"
              >
                ₹{finalPrice.toLocaleString()}
              </motion.span>
              <div className="flex items-center gap-1 mt-2 text-[9px] text-blue-200/70 font-semibold leading-none">
                <AlertCircle className="w-3 h-3 text-[#FFD400]" />
                Subject to physical verification.
              </div>
            </div>

          </div>
        )}

        {/* STICKY BOTTOM SUMMARY (Mobile Only) */}
        {step >= 4 && (
          <div className="md:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between border-t border-slate-800 shrink-0">
            <div className="text-left">
              <span className="text-[9px] text-slate-400 font-semibold uppercase block">Total Exchange Value</span>
              <span className="text-base font-black text-[#10B981]">₹{totalSavings.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-semibold uppercase block">Price After Exchange</span>
              <span className="text-base font-black text-[#FFD400]">₹{finalPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default ExchangeModal;
