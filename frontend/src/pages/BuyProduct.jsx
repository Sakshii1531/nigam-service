import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, Check, ChevronRight, ShoppingCart, Star, 
  Home as HomeIcon, Calendar, Wrench, User, Sparkles, Filter, 
  Tag, ShieldCheck, CheckCircle2, FileText, ShoppingBag, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BuyProduct = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForCheckout, setSelectedProductForCheckout] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('none'); // 'none', 'details', 'processing', 'success'
  
  // Checkout address form
  const [fullName, setFullName] = useState('Sakshi Dwivedi');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [address, setAddress] = useState('Flat 402, Royal Residency, Civil Lines, Delhi');

  // Categories definition
  const filterCategories = [
    { id: 'all', label: 'All Appliances' },
    { id: 'ac', label: 'Air Conditioners' },
    { id: 'ref', label: 'Refrigerators' },
    { id: 'wm', label: 'Washing Machines' },
    { id: 'tv', label: 'Televisions' }
  ];

  // Verified Appliances Product Database
  const products = [
    {
      id: 'p1',
      category: 'ac',
      name: 'Daikin 1.5 Ton 5-Star Split AC',
      condition: 'Like New (Refurbished)',
      originalPrice: 42000,
      price: 24999,
      rating: 4.8,
      reviews: 142,
      icon: '❄️',
      specs: ['Copper Condenser', '5-Star Energy Rating', 'PM 2.5 Filter'],
      warranty: '1-Year Nigam Shield Warranty Included',
      mostRelevant: true
    },
    {
      id: 'p2',
      category: 'ref',
      name: 'LG 242L Inverter Double Door Fridge',
      condition: 'Pristine (Certified)',
      originalPrice: 28999,
      price: 16499,
      rating: 4.7,
      reviews: 98,
      icon: '🧊',
      specs: ['Smart Inverter Compressor', 'Convertible Box', 'Auto Defrost'],
      warranty: '1-Year Nigam Shield Warranty Included',
      mostRelevant: true
    },
    {
      id: 'p3',
      category: 'wm',
      name: 'Samsung 7kg Fully Automatic Front Load',
      condition: 'Excellent (Verified)',
      originalPrice: 34999,
      price: 19899,
      rating: 4.9,
      reviews: 215,
      icon: '🧺',
      specs: ['Eco Bubble Tech', 'Hygiene Steam', 'Digital Inverter'],
      warranty: '1-Year Nigam Shield Warranty Included',
      mostRelevant: true
    },
    {
      id: 'p4',
      category: 'tv',
      name: 'Sony Bravia 43" 4K Smart Google TV',
      condition: 'Brand New',
      originalPrice: 48990,
      price: 38499,
      rating: 4.9,
      reviews: 310,
      icon: '📺',
      specs: ['4K HDR Processor X1', 'Dolby Audio', 'Google Assistant'],
      warranty: '1-Year Brand + Nigam Shield Warranty',
      mostRelevant: false
    },
    {
      id: 'p5',
      category: 'ac',
      name: 'Voltas 1 Ton 3-Star Split AC',
      condition: 'Good (Refurbished)',
      originalPrice: 32000,
      price: 18200,
      rating: 4.5,
      reviews: 64,
      icon: '🌬️',
      specs: ['High Ambient Cooling', 'Stabilizer Free Operation', 'Dehumidifier'],
      warranty: '1-Year Nigam Shield Warranty Included',
      mostRelevant: false
    },
    {
      id: 'p6',
      category: 'ref',
      name: 'Samsung 192L Single Door Refrigerator',
      condition: 'Like New (Certified)',
      originalPrice: 16999,
      price: 10899,
      rating: 4.6,
      reviews: 120,
      icon: '📦',
      specs: ['Digital Inverter', 'Runs on Home Inverter', 'Base Stand Drawer'],
      warranty: '1-Year Nigam Shield Warranty Included',
      mostRelevant: false
    }
  ];

  // Filtering & Sorting products (Most Relevant / Best Match first)
  const filteredProducts = products
    .filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.specs.some(spec => spec.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (b.mostRelevant ? 1 : 0) - (a.mostRelevant ? 1 : 0));

  const handleCheckoutSubmit = () => {
    // Navigate to payment page with product details
    navigate('/payment', {
      state: {
        productName: selectedProductForCheckout?.name,
        price: selectedProductForCheckout?.price,
        isApplianceBuy: true
      }
    });
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-32">
      
      {/* HEADER */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/buy')}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <div className="flex-1">
            <span className="text-[10px] bg-brand-yellow text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Nigam Certified Store
            </span>
            <h1 className="text-xl font-bold text-text-primary mt-0.5">Shop Appliances</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search ACs, Fridges, Washing Machines..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-11 pr-4 py-3 rounded-2xl border border-border-color focus:border-brand-blue focus:outline-none text-sm transition-all shadow-inner"
          />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-text-secondary" />
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto px-6 py-4 scrollbar-none">
        {filterCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
              selectedCategory === cat.id 
                ? 'bg-brand-blue text-white shadow-md' 
                : 'bg-white text-text-secondary border border-border-color'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* PRODUCT GRID */}
      <div className="flex-1 px-6 flex flex-col gap-5 overflow-y-auto">
        
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">🔍</span>
            <h3 className="font-bold text-text-primary text-sm">No products found</h3>
            <p className="text-xs text-text-secondary mt-1">Try tweaking your search query or filter tags!</p>
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div 
              key={prod.id}
              onClick={() => navigate(`/product-details?id=${prod.id}`)}
              className="bg-white rounded-2xl p-4 border border-border-color hover:border-brand-blue transition-all duration-300 shadow-sm flex flex-col gap-2.5 relative overflow-hidden group cursor-pointer"
            >
              {/* Product Header Row (Badges + Ratings) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-dashed border-border-color/60 pb-2">
                <div className="flex flex-wrap gap-1">
                  {prod.mostRelevant && (
                    <span className="bg-[#FFF8E1] text-[#FF8F00] text-[8px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 uppercase shadow-sm border border-[#FFE082]">
                      <Sparkles className="h-2 w-2 fill-[#FF8F00] text-[#FF8F00]" /> Best Match
                    </span>
                  )}
                  <span className="bg-[#EBF7EE] text-green-700 text-[8px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 uppercase">
                    <ShieldCheck className="h-2.5 w-2.5" /> {prod.condition}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-bold text-text-primary">{prod.rating}</span>
                  <span className="text-[9px] text-text-secondary">({prod.reviews})</span>
                </div>
              </div>

              {/* Product Info Block */}
              <div className="flex gap-3 items-center">
                <div className="w-11 h-11 bg-[#F8F9FA] rounded-xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-all flex-shrink-0">
                  {prod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-text-primary text-sm leading-tight">{prod.name}</h3>
                </div>
              </div>

              {/* Specs & Features tags */}
              <div className="flex flex-wrap gap-1 pt-0">
                {prod.specs.map((spec, i) => (
                  <span key={i} className="bg-bg-light text-text-secondary text-[9px] font-semibold px-1.5 py-0.5 rounded">
                    {spec}
                  </span>
                ))}
              </div>

              {/* Warranty Card Badge */}
              <div className="bg-[#E3F2FD]/50 p-2 rounded-lg border border-blue-50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse flex-shrink-0"></span>
                <span className="text-[10px] font-bold text-brand-blue leading-none">{prod.warranty}</span>
              </div>

              {/* Pricing & Checkout */}
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-border-color">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary line-through">₹{prod.originalPrice.toLocaleString('en-IN')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-extrabold text-brand-navy">₹{prod.price.toLocaleString('en-IN')}</span>
                    <span className="text-green-600 text-[9px] font-bold">({Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)}% OFF)</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductForCheckout(prod);
                    setCheckoutStep('details');
                  }}
                  className="bg-[#0D47A1] hover:bg-blue-900 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg flex items-center gap-0.5 transition-all shadow-sm cursor-pointer"
                >
                  Buy Now <ChevronRight className="h-3 w-3" />
                </button>
              </div>

            </div>
          ))
        )}

      </div>

      {/* CHECKOUT SYSTEM DIALOGS */}
      <AnimatePresence>
        {checkoutStep !== 'none' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
            
            {/* Modal Dialog Container */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-white rounded-t-[35px] w-full max-w-md p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
            >
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border-color pb-3">
                <h3 className="font-extrabold text-text-primary text-base">Secure checkout</h3>
                <button 
                  onClick={() => setCheckoutStep('none')}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="h-4.5 w-4.5 text-text-secondary" />
                </button>
              </div>

              {/* STEP 1: ENTER DETAILS */}
              {checkoutStep === 'details' && (
                <div className="flex flex-col gap-4">
                  {/* Selected Product Summary */}
                  <div className="bg-[#F8F9FA] p-3 rounded-2xl flex items-center gap-3">
                    <span className="text-2xl">{selectedProductForCheckout?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-text-primary truncate">{selectedProductForCheckout?.name}</h4>
                      <span className="text-[11px] font-bold text-brand-blue">₹{selectedProductForCheckout?.price.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Delivery details form */}
                  <div className="flex flex-col gap-3">
                    <h5 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Delivery Details</h5>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-text-secondary">Full Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-bg-light border border-border-color px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-text-secondary">Phone Number</label>
                      <input 
                        type="text" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-bg-light border border-border-color px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-blue"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-text-secondary">Shipping Address</label>
                      <textarea 
                        rows="2"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full bg-bg-light border border-border-color px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-blue resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleCheckoutSubmit}
                    className="w-full bg-brand-yellow text-black font-extrabold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Confirm Order & Pay ₹{selectedProductForCheckout?.price.toLocaleString('en-IN')}
                  </button>
                </div>
              )}

              {/* STEP 2: PROCESSING (ANIMATED SPINNER) */}
              {checkoutStep === 'processing' && (
                <div className="flex flex-col gap-4 items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-brand-yellow border-t-brand-blue rounded-full animate-spin"></div>
                  <div className="text-center mt-2">
                    <h4 className="font-extrabold text-sm text-text-primary">Processing Payment...</h4>
                    <p className="text-xs text-text-secondary mt-1">Please do not refresh or press back.</p>
                  </div>
                </div>
              )}

              {/* STEP 3: SUCCESS PANEL */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col gap-5 items-center text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-extrabold text-text-primary">Order Confirmed!</h3>
                    <p className="text-xs text-text-secondary mt-1">Thank you! Your appliance delivery has been scheduled.</p>
                  </div>

                  {/* Glassmorphic digital receipt */}
                  <div className="w-full bg-gradient-to-br from-brand-navy via-[#0A3D80] to-brand-blue rounded-3xl p-5 text-white text-left relative overflow-hidden shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-yellow/10 rounded-full blur-2xl"></div>
                    
                    <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[9px] bg-brand-yellow text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Nigam Store Invoice
                        </span>
                        <h4 className="font-bold text-sm mt-1.5">{selectedProductForCheckout?.name}</h4>
                      </div>
                      <span className="text-2xl">{selectedProductForCheckout?.icon}</span>
                    </div>

                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">Order ID:</span>
                        <span className="font-mono font-bold">NIG-ORD-{Math.floor(100000 + Math.random() * 900000)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Amount Paid:</span>
                        <span className="font-bold text-brand-yellow">₹{selectedProductForCheckout?.price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Delivery Address:</span>
                        <span className="font-semibold text-right max-w-[200px] truncate">{address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Warranty Status:</span>
                        <span className="font-bold text-green-400">1-Yr Activated (Active)</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setCheckoutStep('none');
                      navigate('/bookings');
                    }}
                    className="w-full bg-brand-navy hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer mt-2"
                  >
                    Go to Bookings / Orders
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button className="flex flex-col items-center text-brand-blue">
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
          onClick={() => navigate('/services')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue"
        >
          <Wrench className="h-6 w-6" />
          <span className="text-xs font-medium">Services</span>
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

export default BuyProduct;
