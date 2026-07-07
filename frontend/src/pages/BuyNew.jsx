import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Shield, ShoppingCart, CheckCircle, ChevronRight, Check, Search, 
  Wrench, Percent, CreditCard, Lock, Landmark, Wallet, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Zap, CheckCircle2, Home as HomeIcon, LayoutGrid, User, Calendar, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

// Import Exchange Modal & Configs
import { initializeExchangeConfigs } from '../data/exchangeMockData';
import ExchangeModal from '../components/exchange/ExchangeModal';

// Import assets
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';
import geyserImg from '../assets/icon_3d_geyser.png';
import ovenImg from '../assets/icon_3d_oven.png';

const BuyNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Derive step from pathname
  const pathname = location.pathname;
  let step = 1;
  if (pathname.includes('/buy-new/products')) step = 2;
  else if (pathname.includes('/buy-new/details')) step = 3;
  else if (pathname.includes('/buy-new/cart')) step = 4;
  else if (pathname.includes('/buy-new/payment')) step = 5;
  else if (pathname.includes('/buy-new/success')) step = 6;

  // Retrieve parameters from URL
  const categoryParam = params.category ? decodeURIComponent(params.category) : null;
  const productNameParam = params.productName ? decodeURIComponent(params.productName) : null;

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

  // Dataset of products in the app
  const productsData = {
    'Water Purifier': [
      { id: 'wp1', name: 'Kent Grand Plus', price: 15499, specs: ['RO + UV + UF + TDS Control', '8L Storage Capacity', 'Purifies up to 20L/hr', '1 Year Warranty'] },
      { id: 'wp2', name: 'Aquaguard Aura', price: 12999, specs: ['RO + UV + Active Copper', '7L Storage Capacity', 'Purifies up to 15L/hr', '1 Year Warranty'] },
      { id: 'wp3', name: 'Livpure GLO Pro++', price: 13499, specs: ['RO + UV + UF + Taste Enhancer', '7L Storage Capacity', 'Purifies up to 12L/hr', '1 Year Warranty'] },
      { id: 'wp4', name: 'Pureit Copper+ UV', price: 11999, specs: ['RO + UV + Mineral Cartridge', '8L Storage Capacity', 'Purifies up to 15L/hr', '1 Year Warranty'] }
    ],
    'Television': [
      { id: 'tv1', name: 'Samsung 43" Crystal 4K', price: 28990, specs: ['Crystal Processor 4K', 'HDR 10+ Supported', '3 Dolby Digital Plus Speakers', '1 Year Warranty'] },
      { id: 'tv2', name: 'LG 55" NanoCell 4K', price: 44990, specs: ['NanoCell Color Technology', 'α5 Gen5 AI Processor', 'WebOS Smart TV Platform', '1 Year Warranty'] },
      { id: 'tv3', name: 'Sony Bravia 50" 4K Google TV', price: 54900, specs: ['X1 4K Processor', 'Google TV OS with Voice Search', 'Dolby Atmos Audio', '2 Years Warranty'] },
      { id: 'tv4', name: 'OnePlus 32" Y Series HD', price: 12999, specs: ['HD Ready LED Display', 'Android TV 11 with OxygenPlay', '20W Dolby Audio Speakers', '1 Year Warranty'] }
    ],
    'Refrigerator': [
      { id: 'rf1', name: 'Samsung 253L Double Door', price: 24490, specs: ['Digital Inverter Technology', 'Frost Free Operation', 'All Round Cooling', '10 Years Compressor Warranty'] },
      { id: 'rf2', name: 'LG 190L Single Door', price: 16990, specs: ['Smart Inverter Compressor', 'Fast Ice Making', 'Stabilizer Free Operation', '5 Star Rating'] },
      { id: 'rf3', name: 'Whirlpool 340L Triple Door', price: 32990, specs: ['Zeolite Technology', 'Active Fresh Zone', 'Moisture Retention System', '1 Year Warranty'] },
      { id: 'rf4', name: 'Haier 531L Side-by-Side', price: 58990, specs: ['Twin Inverter Technology', 'Deo Fresh Technology', '90 Degree Auto Suspension', '10 Years Compressor Warranty'] }
    ],
    'Washing Machine': [
      { id: 'wm1', name: 'Samsung 7kg Top Load', price: 15990, specs: ['Wobble Technology', 'Magic Filter', 'Eco Tub Clean', '1 Year Warranty'] },
      { id: 'wm2', name: 'LG 8kg Front Load', price: 31990, specs: ['AI DD Technology', 'Steam Wash & Allergen Care', '6 Motion DD Technology', '10 Years Motor Warranty'] },
      { id: 'wm3', name: 'IFB 6.5kg Front Load', price: 26490, specs: ['Aqua Energie System', 'Crescent Moon Drum', '3D Wash System', '4 Years Comprehensive Warranty'] },
      { id: 'wm4', name: 'Bosch 7.5kg Top Load', price: 18990, specs: ['PowerWave Wash System', 'VarioDrum Design', 'Soft Closing Lid', '2 Years Warranty'] }
    ],
    'Air Conditioner': [
      { id: 'ac1', name: 'Voltas 1.5 Ton 3 Star Split', price: 32990, specs: ['High Ambient Cooling', 'Active Humidifier', 'Anti-Dust Filter', '1 Year Warranty'] },
      { id: 'ac2', name: 'Daikin 1.5 Ton 5 Star Inverter', price: 45490, specs: ['Patented Coanda Airflow', 'Neo Swing Compressor', 'Triple Display feature', '5 Years PCB Warranty'] },
      { id: 'ac3', name: 'LG 1 Ton 3 Star Dual Inverter', price: 28990, specs: ['Dual Rotary Compressor', 'Convertible 6-in-1 Cooling', 'HD Filter with Anti-Virus', '10 Years Compressor Warranty'] },
      { id: 'ac4', name: 'Carrier 2 Ton 5 Star Split', price: 52990, specs: ['Super hybrid Jet Cool', 'PM 2.5 Filter', 'Insta Cool mode', '1 Year Warranty'] }
    ],
    'Geyser': [
      { id: 'gy1', name: 'Havells Adonia Spin 25L', price: 11990, specs: ['Feroglas Technology', 'Incoloy Glass Coated Element', 'Digital Temp Indicator', '7 Years Tank Warranty'] },
      { id: 'gy2', name: 'AO Smith SGS 15L', price: 9990, specs: ['Blue Diamond Glass Lining', 'Glass Coated Heating Element', 'Express Fast Heating', '1 Year Warranty'] },
      { id: 'gy3', name: 'Bajaj New Shakti 25L', price: 6499, specs: ['Titanium Armour Technology', 'Swirl Flow Technology', '8 Bar Pressure Rating', '2 Years Warranty'] },
      { id: 'gy4', name: 'Racold CDR Swift 15L', price: 7990, specs: ['Titanium Plus Heating Element', 'Safety Valve included', 'Flexi Pipe Technology', '1 Year Warranty'] }
    ],
    'Microwave Oven': [
      { id: 'mw1', name: 'Samsung 28L Convection', price: 11590, specs: ['Slim Fry Technology', 'Tandoor Technology', 'Ceramic Enamel Cavity', '1 Year Warranty'] },
      { id: 'mw2', name: 'IFB 30L Convection', price: 14990, specs: ['101 Auto-Cook Menus', 'Express Cooking', 'Deodorize & Steam Clean', '3 Years Magnetron Warranty'] },
      { id: 'mw3', name: 'LG 20L Solo Microwave', price: 6290, specs: ['Intellowave Technology', 'Auto Cook Menu', 'Keep Warm feature', '1 Year Warranty'] },
      { id: 'mw4', name: 'Panasonic 23L Convection', price: 10290, specs: ['360 Heat Wrap', 'Auto Cook Menus', 'Compact Design', '1 Year Warranty'] }
    ]
  };

  // State for shopping cart (stored in localStorage to persist across route transitions)
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('nigam_buy_new_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('nigam_buy_new_cart', JSON.stringify(cart));
  }, [cart]);

  // Derived list of products for category step
  const finalCategory = categoryParam || 'Water Purifier';
  const categoryProducts = productsData[finalCategory] || productsData['Water Purifier'];
  
  // Derived selected product for details step
  const finalProduct = categoryProducts.find(p => p.name === productNameParam) || categoryProducts[0];

  // Helper actions for Cart
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1, category: finalCategory }]);
    }
    navigate('/buy-new/cart');
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const [paymentMode, setPaymentMode] = useState('UPI');

  // Exchange states
  const [exchangeConfigs, setExchangeConfigs] = useState({});
  const [exchangeApplied, setExchangeApplied] = useState(() => {
    const saved = localStorage.getItem('nigam_applied_exchange');
    return saved ? JSON.parse(saved) : null;
  });
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  useEffect(() => {
    setExchangeConfigs(initializeExchangeConfigs());
  }, [location.pathname]); // Reload configuration on navigation/renders

  useEffect(() => {
    if (exchangeApplied) {
      localStorage.setItem('nigam_applied_exchange', JSON.stringify(exchangeApplied));
    } else {
      localStorage.removeItem('nigam_applied_exchange');
    }
  }, [exchangeApplied]);

  // Active configuration for selected product
  const productExchangeConfig = exchangeConfigs[finalProduct?.id];
  const isExchangeActiveForProduct = productExchangeConfig?.exchangeEnabled;
  const isCurrentExchangeApplied = exchangeApplied && exchangeApplied.productId === finalProduct?.id;

  // Cart pricing details
  const cartSubtotalBeforeExchange = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalExchangeSavings = cart.reduce((sum, item) => sum + (item.exchange ? item.exchange.totalSavings * item.qty : 0), 0);
  const cartSubtotal = cartSubtotalBeforeExchange - totalExchangeSavings;
  const deliveryCharges = 0;
  const cartTotal = cartSubtotal + deliveryCharges;

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 relative">
      
      {/* HEADER BAR WITH STYLISH BLUE ACCENTS */}
      <div className="bg-[#0B4EA2] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (step === 1) navigate('/buy');
              else if (step === 2) navigate('/buy-new');
              else if (step === 3) navigate(`/buy-new/products/${encodeURIComponent(finalCategory)}`);
              else if (step === 4) navigate(`/buy-new/details/${encodeURIComponent(finalCategory)}/${encodeURIComponent(finalProduct.name)}`);
              else if (step === 5) navigate('/buy-new/cart');
              else if (step === 6) navigate('/buy');
            }}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {step === 1 && 'Buy New'}
              {step === 2 && `${finalCategory}s`}
              {step === 3 && 'Product Details'}
              {step === 4 && 'My Cart'}
              {step === 5 && 'Payment'}
              {step === 6 && 'Order Success!'}
            </h1>
            {step < 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">BUY BRAND NEW PRODUCT</span>
            )}
          </div>
        </div>
        {step < 5 && cart.length > 0 && (
          <div 
            onClick={() => navigate('/buy-new/cart')}
            className="relative p-1 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5 text-white" />
            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-brand-yellow text-brand-navy rounded-full text-[10px] font-black flex items-center justify-center border border-[#0B4EA2]">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          </div>
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
            {/* Header info */}
            <div className="px-1 -mt-1">
              <h2 className="text-base font-black text-brand-navy">Buy Brand New Product</h2>
              <p className="text-xs text-text-secondary font-semibold">Select a category to shop</p>
            </div>

            {/* Category Rows */}
            <div className="flex flex-col gap-3">
              {categoriesList.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => navigate(`/buy-new/products/${encodeURIComponent(item.name)}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/45 shadow-sm hover:scale-[1.01] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                      <img src={item.img} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">{item.name}</h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-semibold">Free delivery & doorstep installation</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: CHOOSE PRODUCT ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Filter Selection (Mocked for style) */}
            <div className="flex justify-between items-center bg-white border border-slate-200/60 rounded-2xl p-3 shadow-sm">
              <span className="text-xs font-bold text-slate-700">Filters</span>
              <span className="text-xs text-brand-blue font-black flex items-center gap-0.5 cursor-pointer">
                All Brands <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </span>
            </div>

            {/* Products List */}
            <div className="flex flex-col gap-4.5">
              {categoryProducts.map((product) => (
                <div 
                  key={product.id}
                  onClick={() => navigate(`/buy-new/details/${encodeURIComponent(finalCategory)}/${encodeURIComponent(product.name)}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/40 shadow-sm transition-all hover:scale-[1.005]"
                >
                  <div className="flex items-center gap-4.5">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                      <img 
                        src={getApplianceImg(finalCategory)} 
                        alt={product.name} 
                        className="w-full h-full object-contain mix-blend-multiply" 
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">{product.name}</h4>
                      <span className="text-sm font-bold text-brand-blue block mt-1.5">₹{product.price.toLocaleString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary flex-shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PRODUCT DETAILS ── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Product image container */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm relative">
              <div className="w-48 h-48 flex items-center justify-center p-4">
                <img 
                  src={getApplianceImg(finalCategory)} 
                  alt={finalProduct.name} 
                  className="w-full h-full object-contain mix-blend-multiply" 
                />
              </div>
            </div>

            {/* Product Details Info */}
            <div className="flex flex-col gap-1.5 px-1 text-left">
              <h2 className="text-xl font-black text-brand-navy">{finalProduct.name}</h2>
              {isCurrentExchangeApplied ? (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-black text-green-600">₹{(finalProduct.price - exchangeApplied.totalSavings).toLocaleString()}</span>
                    <span className="text-sm font-bold text-slate-400 line-through">₹{finalProduct.price.toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start">Exchange Offer Applied</span>
                </div>
              ) : (
                <span className="text-2xl font-black text-green-600">₹{finalProduct.price.toLocaleString()}</span>
              )}
            </div>

            {/* Product Specs List */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
              {finalProduct.specs.map((spec, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-800 leading-normal">{spec}</span>
                </div>
              ))}
            </div>

            {/* Badge features */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { title: 'Free Installation', desc: 'Doorstep setting', Icon: Wrench },
                { title: '1 Year Warranty', desc: 'Brand certified', Icon: ShieldCheck },
                { title: 'No-Cost EMI', desc: 'Easy payments', Icon: Percent }
              ].map((b, idx) => (
                <div key={idx} className="bg-white border border-slate-200/60 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1 shadow-xs">
                  <b.Icon className="w-5 h-5 text-brand-blue" />
                  <span className="text-[10px] font-black text-brand-navy leading-tight mt-1">{b.title}</span>
                  <span className="text-[8px] text-text-secondary font-medium leading-none block">{b.desc}</span>
                </div>
              ))}
            </div>

            {/* EXCHANGE OFFER SECTION */}
            {isExchangeActiveForProduct && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 text-left shadow-sm flex flex-col gap-3.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand-blue">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-brand-navy">Exchange Your Old Device</h4>
                      <span className="text-[10px] font-bold text-slate-400">Save big on your upgrade</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-brand-blue bg-blue-50 px-2.5 py-1 rounded-lg">
                    Get up to ₹{productExchangeConfig?.maxVal?.toLocaleString()} off
                  </span>
                </div>

                {!isCurrentExchangeApplied ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsExchangeModalOpen(true)}
                      className="w-full bg-white border border-brand-blue hover:bg-blue-50/10 text-brand-blue font-black py-2.5 rounded-xl transition-all text-xs cursor-pointer text-center"
                    >
                      Check Exchange Value
                    </button>
                    <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                      * Final exchange value depends on the device model and physical condition during pickup.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3.5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black text-emerald-800 block">Exchange Applied</span>
                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                            {exchangeApplied.brand} {exchangeApplied.model}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#10B981]">
                        - ₹{exchangeApplied.totalSavings?.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2.5 border-t border-slate-100 pt-2.5">
                      <button
                        onClick={() => setIsExchangeModalOpen(true)}
                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Change Exchange
                      </button>
                      <button
                        onClick={() => setExchangeApplied(null)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Remove Exchange
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Buy Buttons */}
            <div className="flex flex-col gap-3.5 mt-2">
              <button 
                onClick={() => {
                  const productExchange = isCurrentExchangeApplied ? exchangeApplied : null;
                  const itemToAdd = { ...finalProduct, qty: 1, category: finalCategory };
                  if (productExchange) {
                    itemToAdd.exchange = { ...productExchange, productId: finalProduct.id };
                  }
                  
                  // Add to cart helper logic directly
                  const existing = cart.find(item => item.id === finalProduct.id);
                  if (existing) {
                    setCart(cart.map(item => item.id === finalProduct.id ? { ...item, qty: item.qty + 1, exchange: itemToAdd.exchange || item.exchange } : item));
                  } else {
                    setCart([...cart, itemToAdd]);
                  }
                  navigate('/buy-new/cart');
                }}
                className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Add to Cart
              </button>
              <button 
                onClick={() => {
                  // Instant Checkout with single item
                  const productExchange = isCurrentExchangeApplied ? { ...exchangeApplied, productId: finalProduct.id } : null;
                  setCart([{ ...finalProduct, qty: 1, category: finalCategory, exchange: productExchange }]);
                  navigate('/buy-new/payment');
                }}
                className="w-full bg-white border-2 border-brand-blue hover:bg-blue-50/20 text-brand-blue font-black py-3.5 rounded-2xl transition-all text-sm cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: MY CART ── */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                <ShoppingCart className="w-16 h-16 text-slate-300" />
                <div>
                  <h3 className="text-base font-black text-brand-navy">Your Cart is Empty</h3>
                  <p className="text-xs text-text-secondary mt-1">Explore our product categories to add items.</p>
                </div>
                <button 
                  onClick={() => navigate('/buy-new')}
                  className="bg-brand-blue hover:bg-blue-800 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                >
                  Shop Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Cart Header */}
                <div className="flex justify-between items-center px-1 -mt-2">
                  <h2 className="text-base font-black text-brand-navy">My Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})</h2>
                  <button 
                    onClick={clearCart}
                    className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Cart list items */}
                <div className="flex flex-col gap-3.5">
                  {cart.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white border border-slate-200/80 rounded-2xl p-4 flex justify-between items-center shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 text-left">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0">
                          <img src={getApplianceImg(item.category)} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-brand-navy leading-snug">{item.name}</h4>
                          {item.exchange ? (
                            <div className="flex flex-col gap-0.5 mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-brand-blue">₹{(item.price - item.exchange.totalSavings).toLocaleString()}</span>
                                <span className="text-[10px] text-slate-400 line-through">₹{item.price.toLocaleString()}</span>
                              </div>
                              <span className="text-[9px] text-[#10B981] font-bold">🔄 Exchange Applied (-₹{item.exchange.totalSavings.toLocaleString()})</span>
                            </div>
                          ) : (
                            <span className="text-xs font-extrabold text-brand-blue block mt-1">₹{item.price.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3.5">
                        {/* Quantity controls */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-xs">
                          <button 
                            onClick={() => updateQty(item.id, -1)}
                            className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-slate-800 px-2.5">{item.qty}</span>
                          <button 
                            onClick={() => updateQty(item.id, 1)}
                            className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Details */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 flex flex-col gap-3 shadow-sm mt-1 text-left">
                  <h4 className="text-xs font-black text-brand-navy uppercase tracking-wider mb-0.5">Price Details</h4>
                  
                  <div className="flex justify-between items-center text-xs text-text-secondary font-medium">
                    <span>MRP</span>
                    <span>₹{cartSubtotalBeforeExchange.toLocaleString()}</span>
                  </div>

                  {totalExchangeSavings > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-600 font-bold">
                      <span>Exchange Discount</span>
                      <span>- ₹{totalExchangeSavings.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-text-secondary font-medium border-t border-slate-100 pt-3">
                    <span>Delivery</span>
                    <span className="text-green-600 font-bold">Free</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-brand-navy border-t border-slate-100 pt-3">
                    <span>Total Amount</span>
                    <span className="text-brand-blue text-base">₹{cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button 
                  onClick={() => navigate('/buy-new/payment')}
                  className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
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
                <span className="text-lg font-black text-brand-navy block mt-0.5">₹{cartTotal.toLocaleString()}</span>
              </div>
              <span className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">View Details</span>
            </div>

            {/* Pay Button */}
            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => {
                  clearCart();
                  navigate('/buy-new/success');
                }}
                className="w-full bg-[#FFD400] hover:bg-yellow-400 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Pay ₹{cartTotal.toLocaleString()} Securely
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                100% Secure Payment
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: ORDER SUCCESS ── */}
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
              <h3 className="text-lg font-black text-brand-navy leading-tight">Order Placed Successfully!</h3>
              <p className="text-xs text-text-secondary mt-1.5 font-medium">Your brand new product is confirmed and will be shipped soon.</p>
            </div>

            {/* Success Details Receipt Card */}
            <div className="w-full bg-gradient-to-br from-[#072C63] via-[#0B4EA2] to-[#3B82F6] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-[#FFD400] text-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">NIGAM STORE</span>
                  <h4 className="text-base font-black mt-2.5">Brand New Purchase</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <ShoppingCart className="h-5 w-5 text-[#FFD400]" />
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Estimated Delivery:</span>
                  <span className="font-bold text-[#FFD400]">Within 2-3 Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Order ID:</span>
                  <span className="font-mono tracking-wider font-semibold">NCCORD{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Processing
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Installation Fee:</span>
                  <span className="font-bold text-green-400">Free</span>
                </div>
              </div>
            </div>

            {/* Back Buttons */}
            <div className="w-full flex flex-col gap-3 mt-4">
              <button 
                onClick={() => navigate('/buy')} 
                className="w-full bg-[#072C63] hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98"
              >
                Back to Store
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

      {/* Exchange Wizard Modal */}
      <ExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        product={{ ...finalProduct, category: finalCategory }}
        config={productExchangeConfig}
        onApply={(details) => setExchangeApplied({ ...details, productId: finalProduct.id })}
      />

    </div>
  );
};

export default BuyNew;
