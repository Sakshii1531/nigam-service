import React, { useState } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Shield, Check, ChevronRight, ShoppingCart,
  Calendar, Wrench, Sparkles, Zap, PackageOpen,
  MapPin, Bell, Search, ShieldCheck, FileText, CheckCircle2,
  Lock, Landmark, Wallet, Percent, ChevronLeft, Home as HomeIcon, LayoutGrid, User
} from 'lucide-react';
import { motion } from 'framer-motion';

// Import assets
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';
import geyserImg from '../assets/icon_3d_geyser.png';
import ovenImg from '../assets/icon_3d_oven.png';

const Exchange = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Derive step from URL
  const pathname = location.pathname;
  let step = 1;
  if (pathname.includes('/buy/exchange/product')) step = 2;
  else if (pathname.includes('/buy/exchange/offer')) step = 3;
  else if (pathname.includes('/buy/exchange/checkout')) step = 4;
  else if (pathname.includes('/buy/exchange/payment')) step = 5;
  else if (pathname.includes('/buy/exchange/success')) step = 6;

  // Retrieve parameters from URL
  const categoryParam = params.category ? decodeURIComponent(params.category) : null;
  const brandParam = params.brand ? decodeURIComponent(params.brand) : null;
  const modelParam = params.model ? decodeURIComponent(params.model) : null;
  const conditionParam = params.condition ? decodeURIComponent(params.condition) : null;

  // Categories list matching screenshot
  const categoriesList = [
    { name: 'Television', img: tvImg },
    { name: 'Refrigerator', img: fridgeImg },
    { name: 'Washing Machine', img: washingImg },
    { name: 'Air Conditioner', img: splitAcImg },
    { name: 'Water Purifier', img: waterPurifierImg },
    { name: 'Geyser', img: geyserImg },
    { name: 'Microwave Oven', img: ovenImg }
  ];

  // Helper to map category names to images
  const getApplianceImg = (category) => {
    const n = category?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return tvImg;
    if (n.includes('refrigerator') || n.includes('fridge')) return fridgeImg;
    if (n.includes('washing') || n.includes('machine')) return washingImg;
    if (n.includes('ac') || n.includes('conditioner') || n.includes('air')) return splitAcImg;
    if (n.includes('purifier') || n.includes('water')) return waterPurifierImg;
    if (n.includes('geyser')) return geyserImg;
    if (n.includes('microwave') || n.includes('oven')) return ovenImg;
    return tvImg;
  };

  // Brands list by Category
  const getBrandsForCategory = (category) => {
    const n = category?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return ['Samsung', 'LG', 'Sony', 'Panasonic', 'OnePlus', 'Mi'];
    if (n.includes('refrigerator') || n.includes('fridge')) return ['Samsung', 'LG', 'Whirlpool', 'Haier', 'Godrej', 'Voltas'];
    if (n.includes('washing') || n.includes('machine')) return ['Samsung', 'LG', 'Whirlpool', 'IFB', 'Bosch', 'Haier'];
    if (n.includes('ac') || n.includes('conditioner')) return ['Daikin', 'LG', 'Voltas', 'Blue Star', 'Hitachi', 'Carrier'];
    if (n.includes('purifier') || n.includes('water')) return ['Kent', 'Aquaguard', 'Livpure', 'Pureit', 'HUL', 'AO Smith'];
    if (n.includes('geyser')) return ['Havells', 'Bajaj', 'AO Smith', 'Racold', 'Crompton', 'V-Guard'];
    if (n.includes('microwave') || n.includes('oven')) return ['Samsung', 'LG', 'IFB', 'Panasonic', 'Godrej', 'Morphy Richards'];
    return ['Samsung', 'LG', 'Sony', 'Panasonic', 'Whirlpool', 'Daikin'];
  };

  // Models list by Category
  const getModelsForCategory = (category) => {
    const n = category?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return ['32 Inch LED TV', '43 Inch Smart TV', '55 Inch 4K TV', '65 Inch QLED TV'];
    if (n.includes('refrigerator') || n.includes('fridge')) return ['Single Door 190L', 'Double Door 250L', 'Double Door 350L', 'Side by Side 500L'];
    if (n.includes('washing') || n.includes('machine')) return ['Top Load Semi-Automatic', 'Top Load Fully Automatic', 'Front Load Fully Automatic', 'Washer Dryer Combo'];
    if (n.includes('ac') || n.includes('conditioner')) return ['1 Ton Split AC', '1.5 Ton Split AC', '2 Ton Split AC', '1.5 Ton Window AC'];
    if (n.includes('purifier') || n.includes('water')) return ['RO Water Purifier', 'UV Water Purifier', 'Gravity Purifier', 'RO + UV + Alkaline'];
    if (n.includes('geyser')) return ['10L Storage Geyser', '15L Storage Geyser', '25L Storage Geyser', 'Instant 3L Geyser'];
    if (n.includes('microwave') || n.includes('oven')) return ['Solo 20L Microwave', 'Grill 23L Microwave', 'Convection 28L Microwave', 'Convection 32L Microwave'];
    return ['Basic Model A', 'Standard Model B', 'Premium Model C'];
  };

  // Pricing configuration for calculations
  const getBasePrice = (category, model) => {
    const cat = category?.toLowerCase() || '';
    const mod = model?.toLowerCase() || '';

    if (cat.includes('television') || cat.includes('tv')) {
      if (mod.includes('32')) return 2500;
      if (mod.includes('43')) return 4500;
      if (mod.includes('55')) return 7500;
      if (mod.includes('65')) return 11000;
      return 2500;
    }
    if (cat.includes('refrigerator') || cat.includes('fridge')) {
      if (mod.includes('single')) return 2500;
      if (mod.includes('250l')) return 4500;
      if (mod.includes('350l')) return 6000;
      if (mod.includes('side')) return 10000;
      return 2500;
    }
    if (cat.includes('washing') || cat.includes('machine')) {
      if (mod.includes('semi')) return 1800;
      if (mod.includes('top')) return 3200;
      if (mod.includes('front')) return 5500;
      if (mod.includes('washer')) return 8500;
      return 2000;
    }
    if (cat.includes('ac') || cat.includes('conditioner')) {
      if (mod.includes('1 ton')) return 4000;
      if (mod.includes('1.5 ton split')) return 6000;
      if (mod.includes('2 ton')) return 8000;
      if (mod.includes('window')) return 3500;
      return 4000;
    }
    if (cat.includes('purifier') || cat.includes('water')) {
      if (mod.includes('ro water')) return 1500;
      if (mod.includes('uv')) return 800;
      if (mod.includes('gravity')) return 400;
      if (mod.includes('alkaline')) return 2200;
      return 1200;
    }
    if (cat.includes('geyser')) {
      if (mod.includes('10l')) return 1000;
      if (mod.includes('15l')) return 1500;
      if (mod.includes('25l')) return 2000;
      if (mod.includes('instant')) return 800;
      return 1000;
    }
    if (cat.includes('microwave') || cat.includes('oven')) {
      if (mod.includes('solo')) return 1200;
      if (mod.includes('grill')) return 1800;
      if (mod.includes('28l')) return 3000;
      if (mod.includes('32l')) return 4200;
      return 1500;
    }
    return 2000;
  };

  const getNewProductPrice = (category) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('television') || cat.includes('tv')) return 21999;
    if (cat.includes('refrigerator') || cat.includes('fridge')) return 27499;
    if (cat.includes('washing') || cat.includes('machine')) return 19999;
    if (cat.includes('ac') || cat.includes('conditioner')) return 38999;
    if (cat.includes('purifier') || cat.includes('water')) return 14999;
    if (cat.includes('geyser')) return 9499;
    if (cat.includes('microwave') || cat.includes('oven')) return 12999;
    return 21999;
  };

  const getConditionMultiplier = (cond) => {
    const c = cond?.toLowerCase() || '';
    if (c === 'excellent') return 1.25;
    if (c === 'good') return 1.0;
    if (c === 'average') return 0.6;
    if (c === 'not working') return 0.24;
    return 1.0;
  };

  // State values for Step 2 select product form
  const currentBrands = categoryParam ? getBrandsForCategory(categoryParam) : [];
  const currentModels = categoryParam ? getModelsForCategory(categoryParam) : [];
  
  const [selectedBrand, setSelectedBrand] = useState(brandParam || currentBrands[0] || '');
  const [selectedModel, setSelectedModel] = useState(modelParam || currentModels[0] || '');
  const [selectedCondition, setSelectedCondition] = useState(conditionParam || 'Good');
  
  const [paymentMode, setPaymentMode] = useState('UPI');

  // Trigger state updates when category changes
  React.useEffect(() => {
    if (categoryParam) {
      const brandsList = getBrandsForCategory(categoryParam);
      const modelsList = getModelsForCategory(categoryParam);
      if (!brandParam) setSelectedBrand(brandsList[0] || '');
      if (!modelParam) setSelectedModel(modelsList[0] || '');
    }
  }, [categoryParam]);

  // Derived values for offer and checkout steps
  const finalCategory = categoryParam || 'Television';
  const finalBrand = brandParam || selectedBrand || 'Samsung';
  const finalModel = modelParam || selectedModel || '32 Inch LED TV';
  const finalCondition = conditionParam || selectedCondition || 'Good';

  const baseExchangeVal = getBasePrice(finalCategory, finalModel);
  const multiplier = getConditionMultiplier(finalCondition);
  const exchangeValue = Math.round(baseExchangeVal * multiplier);
  const newProductPrice = getNewProductPrice(finalCategory);
  const payableAmount = newProductPrice - exchangeValue;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 relative">
      
      {/* EXCHANGE FLOW MAIN TITLE HEADER */}
      <div className="bg-[#0B4EA2] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (step === 1) navigate('/buy');
              else if (step === 2) navigate('/buy/exchange');
              else if (step === 3) navigate(`/buy/exchange/product/${encodeURIComponent(finalCategory)}`);
              else if (step === 4) navigate(`/buy/exchange/offer/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalBrand)}/${encodeURIComponent(finalModel)}/${encodeURIComponent(finalCondition)}`);
              else if (step === 5) navigate(`/buy/exchange/checkout/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalBrand)}/${encodeURIComponent(finalModel)}/${encodeURIComponent(finalCondition)}`);
              else if (step === 6) navigate('/buy');
            }}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {step === 1 && 'Exchange Option'}
              {step === 2 && 'Select Product'}
              {step === 3 && 'Exchange Offer'}
              {step === 4 && 'Apply Exchange'}
              {step === 5 && 'Secure Payment'}
              {step === 6 && 'Order Placed!'}
            </h1>
            {step < 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">EXCHANGE ANY OLD PRODUCT</span>
            )}
          </div>
        </div>
        {step < 6 && (
          <span className="text-xs font-black bg-white/10 px-2.5 py-1 rounded-lg">
            Step {step}/5
          </span>
        )}
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">

        {/* ── STEP 1: SELECT CATEGORY ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >


            {/* Select a category section header */}
            <div className="px-1 mt-1">
              <h2 className="text-base font-black text-brand-navy">Exchange</h2>
              <p className="text-xs text-text-secondary font-semibold">Select a category to exchange</p>
            </div>

            {/* Categories list */}
            <div className="flex flex-col gap-3">
              {categoriesList.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate(`/buy/exchange/product/${encodeURIComponent(item.name)}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/45 shadow-sm hover:scale-[1.01] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">{item.name}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-semibold">Exchange old for new brand discount</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                </div>
              ))}
            </div>

          </motion.div>
        )}

        {/* ── STEP 2: SELECT PRODUCT & WORKING CONDITION ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-base font-black text-brand-navy">Select Product</h2>
              <p className="text-xs text-text-secondary font-semibold">Tell us about your old {finalCategory}</p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Brand dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Brand *</label>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                  <Sparkles className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent cursor-pointer appearance-none"
                  >
                    {currentBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
              </div>

              {/* Model dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Model *</label>
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                  <PackageOpen className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="text-xs font-bold text-slate-800 w-full outline-none bg-transparent cursor-pointer appearance-none"
                  >
                    {currentModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronRight className="h-4 w-4 text-slate-400 rotate-90" />
                </div>
              </div>

              {/* Working Condition */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Working Condition *</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'Excellent', label: 'Excellent', sub: 'Fully working' },
                    { key: 'Good', label: 'Good', sub: 'Minor issues' },
                    { key: 'Average', label: 'Average', sub: 'Visible issues' },
                    { key: 'Not Working', label: 'Not Working', sub: 'Not turning on' }
                  ].map((cond) => {
                    const isSelected = selectedCondition === cond.key;
                    return (
                      <div
                        key={cond.key}
                        onClick={() => setSelectedCondition(cond.key)}
                        className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                          isSelected
                            ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue'
                            : 'border-slate-200 hover:border-slate-350'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black text-brand-navy block">{cond.label}</span>
                          <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">{cond.sub}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'border-brand-blue bg-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={() => navigate(`/buy/exchange/offer/${encodeURIComponent(finalCategory)}/${encodeURIComponent(selectedBrand)}/${encodeURIComponent(selectedModel)}/${encodeURIComponent(selectedCondition)}`)}
              className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-3 cursor-pointer active:scale-98"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: GET EXCHANGE PRICE (EXCHANGE OFFER) ── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-base font-black text-brand-navy">Exchange Offer</h2>
              <p className="text-xs text-text-secondary font-semibold">Your estimated exchange value</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col items-center gap-5 shadow-md">
              <div className="w-32 h-32 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center p-3">
                <img 
                  src={getApplianceImg(finalCategory)} 
                  alt={finalCategory} 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>

              <div className="text-center">
                <h4 className="text-base font-black text-brand-navy">
                  {finalBrand} {finalModel}
                </h4>
                <span className="inline-block bg-blue-50 text-brand-blue text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wide mt-1">
                  {finalCondition} Condition
                </span>
              </div>

              <div className="w-full border-t border-dashed border-slate-200 pt-4 text-center">
                <span className="text-xs text-text-secondary font-semibold block">Estimated Exchange Price</span>
                <span className="text-3xl font-black text-green-600 block mt-1">₹{exchangeValue.toLocaleString()}</span>
              </div>
            </div>

            {/* How it works section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3.5 shadow-sm">
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider">How it works?</h4>
              
              <div className="flex flex-col gap-3.5">
                {[
                  { step: '1', title: 'Schedule pick up', desc: 'Choose a convenient date & time for pickup.' },
                  { step: '2', title: 'Product inspection', desc: 'Our technician will inspect the working condition at your doorstep.' },
                  { step: '3', title: 'Instant discount on new product', desc: 'Exchange discount is applied directly to your purchase invoice.' }
                ].map((w, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0">
                      {w.step}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 leading-normal">{w.title}</h5>
                      <p className="text-[10px] text-text-secondary mt-0.5 font-medium leading-relaxed">{w.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue to Buy Button */}
            <button
              onClick={() => navigate(`/buy/exchange/checkout/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalBrand)}/${encodeURIComponent(finalModel)}/${encodeURIComponent(finalCondition)}`)}
              className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
            >
              Continue to Buy
            </button>
          </motion.div>
        )}

        {/* ── STEP 4: PROCEED & APPLY DISCOUNT ── */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-base font-black text-brand-navy">Apply Exchange</h2>
              <p className="text-xs text-text-secondary font-semibold">Instant discount on your new purchase</p>
            </div>

            {/* Price details summary box */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-semibold">Selected Product Value</span>
                <span className="font-extrabold text-text-primary">₹{newProductPrice.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                <span className="text-text-secondary font-semibold flex items-center gap-1.5">
                  Exchange Value <span className="text-[9px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-200">{finalCondition}</span>
                </span>
                <span className="font-extrabold text-green-600">- ₹{exchangeValue.toLocaleString()}</span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 flex justify-between items-center border border-slate-200/60 mt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payable Amount</span>
                  <span className="text-xs text-text-secondary font-medium mt-0.5">After instant exchange reduction</span>
                </div>
                <span className="text-xl font-black text-brand-navy">₹{payableAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Exchange product summary card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                <img src={getApplianceImg(finalCategory)} alt={finalCategory} className="w-full h-full object-contain mix-blend-multiply" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Exchanging product</span>
                <h4 className="text-xs font-black text-brand-navy leading-tight mt-0.5">{finalBrand} {finalModel}</h4>
                <p className="text-[10px] text-text-secondary mt-0.5 font-medium">{finalCondition} Condition • Estimated ₹{exchangeValue.toLocaleString()}</p>
              </div>
            </div>

            {/* Continue to Pay Button */}
            <button
              onClick={() => navigate(`/buy/exchange/payment/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalBrand)}/${encodeURIComponent(finalModel)}/${encodeURIComponent(finalCondition)}`)}
              className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
            >
              Continue to Pay
            </button>
          </motion.div>
        )}

        {/* ── STEP 5: SECURE PAYMENT ── */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-8"
          >
            <div className="px-1 -mt-2">
              <h2 className="text-base font-black text-brand-navy">Payment</h2>
              <p className="text-xs text-text-secondary font-semibold">Select a payment method</p>
            </div>

            {/* Recommended payment */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Recommended</span>
              <div
                onClick={() => setPaymentMode('UPI')}
                className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                  paymentMode === 'UPI' ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue flex-shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-brand-navy block">UPI</span>
                    <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">Pay using any UPI app</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  paymentMode === 'UPI' ? 'border-brand-blue bg-white' : 'border-slate-300'
                }`}>
                  {paymentMode === 'UPI' && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                </div>
              </div>
            </div>

            {/* Other Options */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-brand-navy uppercase tracking-wider block px-1">Other Options</span>
              {[
                { id: 'Card', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, Rupay', Icon: Lock },
                { id: 'NetBanking', label: 'Net Banking', sub: 'All major banks', Icon: Landmark },
                { id: 'Wallets', label: 'Wallets', sub: 'Paytm, PhonePe, Amazon Pay', Icon: Wallet },
                { id: 'EMI', label: 'EMI Options', sub: 'Easy EMI available', Icon: Percent },
              ].map(({ id, label, sub, Icon }) => (
                <div
                  key={id}
                  onClick={() => setPaymentMode(id)}
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-sm ${
                    paymentMode === id ? 'border-brand-blue bg-blue-50/10 ring-1 ring-brand-blue' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-brand-navy block">{label}</span>
                      <span className="text-[10px] text-text-secondary font-semibold block mt-0.5">{sub}</span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    paymentMode === id ? 'border-brand-blue bg-white' : 'border-slate-300'
                  }`}>
                    {paymentMode === id && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue"></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Payable Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm mt-2">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Payable</span>
                <span className="text-lg font-black text-brand-navy block mt-0.5">₹{payableAmount.toLocaleString()}</span>
              </div>
              <span className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">View Details</span>
            </div>

            {/* Pay Button */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => navigate(`/buy/exchange/success/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalBrand)}/${encodeURIComponent(finalModel)}/${encodeURIComponent(finalCondition)}`)}
                className="w-full bg-[#FFD400] hover:bg-yellow-400 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Pay ₹{payableAmount.toLocaleString()} Securely
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                100% Secure Payment
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: EXCHANGE ORDER SUCCESS ── */}
        {step === 6 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 py-6 pb-8"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-brand-navy leading-tight">Exchange Request Placed!</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-medium">Our executive will visit for doorstep verification shortly.</p>
            </div>

            {/* Success Summary Receipt Card */}
            <div className="w-full bg-gradient-to-br from-[#072C63] via-[#0B4EA2] to-[#3B82F6] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-[#FFD400] text-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">NIGAM EXCHANGE</span>
                  <h4 className="text-base font-black mt-2.5">{finalCategory} Exchange</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <PackageOpen className="h-5 w-5 text-[#FFD400]" />
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Old Product:</span>
                  <span className="font-bold text-white">{finalBrand} {finalModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Exchange Value:</span>
                  <span className="font-bold text-[#FFD400]">₹{exchangeValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Exchange ID:</span>
                  <span className="font-mono tracking-wider font-semibold">NCCEXC{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Confirmed
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Amount Paid:</span>
                  <span className="font-bold text-white">₹{payableAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Back Buttons */}
            <div className="w-full flex flex-col gap-3 mt-4">
              <button 
                onClick={() => navigate('/buy')} 
                className="w-full bg-[#072C63] hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                View Exchange Details
              </button>
              <button 
                onClick={() => navigate('/dashboard')} 
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-brand-blue cursor-pointer transition-colors"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Account</span>
        </button>
      </div>

    </div>
  );
};

export default Exchange;
