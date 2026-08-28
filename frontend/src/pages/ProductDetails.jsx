import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, ShoppingCart, Star, ShieldCheck, Check, 
  Trash2, CreditCard, ShoppingBag, Truck, Info, ChevronRight, X
} from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ProductDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Extract product ID from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  // No fallback id: 'p1' was a leftover mock identifier, so opening this page
  // without ?id= fetched a product that cannot exist and rendered the driver's
  // cast error as the page body.
  const productId = queryParams.get('id');

  // State variables
  const [cartCount, setCartCount] = useState(0);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showAddedToast, setShowAddedToast] = useState(false);
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('details'); // 'details', 'processing', 'success'
  const [checkoutError, setCheckoutError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.addresses?.find(a => a.isDefault)?.house || user.addresses?.[0]?.house || '');
    }
  }, [user]);

  // Product Database matching BuyProduct.jsx but with extra detailed specifications

  // The product comes from the real catalogue; it used to be looked up in a
  // hardcoded object here, whose ids ('p1') no order could ever reference.
  const [product, setProduct] = useState(null);
  const [productError, setProductError] = useState('');

  // Icon and card tint are presentation, not catalogue data — derived from the
  // product's category rather than stored per product.
  const CATEGORY_STYLE = {
    ac: { icon: '❄️', colorTheme: 'from-blue-50 to-indigo-50 border-blue-200' },
    refrigerator: { icon: '🧊', colorTheme: 'from-cyan-50 to-blue-50 border-cyan-200' },
    television: { icon: '📺', colorTheme: 'from-slate-50 to-gray-50 border-slate-200' },
    'washing machine': { icon: '🧺', colorTheme: 'from-teal-50 to-emerald-50 border-teal-200' },
    'water purifier': { icon: '💧', colorTheme: 'from-sky-50 to-cyan-50 border-sky-200' },
  };

  useEffect(() => {
    if (!productId) { setProductError('No product selected.'); return; }
    apiRequest(`/products/${productId}`)
      .then((res) => setProduct(res))
      .catch((err) => setProductError(err.message || 'Could not load this product.'));
  }, [productId]);

  // Load cart from LocalStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('nigam_cart');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      setCartCount(items.reduce((total, item) => total + item.quantity, 0));
    }
  }, []);

  // Sync cart helper
  const updateCart = (newItems) => {
    setCartItems(newItems);
    setCartCount(newItems.reduce((total, item) => total + item.quantity, 0));
    localStorage.setItem('nigam_cart', JSON.stringify(newItems));
  };

  // Add to Cart handler
  const handleAddToCart = () => {
    const existingIndex = cartItems.findIndex(item => item.id === product.id);
    let updatedCart = [...cartItems];

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += 1;
    } else {
      updatedCart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        icon: style.icon,
        condition: product.condition,
        quantity: 1
      });
    }

    updateCart(updatedCart);
    setShowAddedToast(true);
    setTimeout(() => {
      setShowAddedToast(false);
    }, 2500);
  };

  // Remove from Cart
  const handleRemoveFromCart = (id) => {
    const updated = cartItems.filter(item => item.id !== id);
    updateCart(updated);
  };

  // Places a real order. This previously just waited two seconds and showed a
  // success screen — no order, no payment, nothing recorded.
  const handleCheckoutSubmit = async () => {
    setCheckoutStep('processing');
    try {
      const orderRes = await apiRequest('/orders', {
        method: 'POST',
        auth: true,
        body: {
          items: cartItems.map((i) => ({ productId: i.id, quantity: i.quantity })),
          address: { name: fullName, house: address },
          paymentMethod: 'Cash',
        },
      });
      setPlacedOrder(orderRes || null);
      updateCart([]);
      setCheckoutStep('success');
    } catch (err) {
      setCheckoutError(err.message || 'Could not place your order.');
      setCheckoutStep('details');
    }
  };

  if (productError) {
    return (
      <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center p-6 text-center gap-3">
        <p className="text-sm font-semibold text-rose-600">{productError}</p>
        <p className="text-xs text-slate-500 max-w-[260px]">
          Pick a product from the store to see its details, pricing and reviews.
        </p>
        <button
          onClick={() => navigate('/buy')}
          className="mt-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors"
        >
          Browse Products
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <p className="text-sm font-semibold text-text-secondary">Loading product…</p>
      </div>
    );
  }

  const style = CATEGORY_STYLE[(product.category || '').toLowerCase()]
    || { icon: '📦', colorTheme: 'from-slate-50 to-gray-50 border-slate-200' };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-28 lg:pb-8 font-sans">
      
      {/* HEADER BAR */}
      <div className="bg-[#E3ECF9] p-4 flex items-center justify-between rounded-b-[25px] shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-[#0D47A1]" />
          </button>
          <span className="font-extrabold text-sm text-[#0D47A1]">Product Details</span>
        </div>
        
        {/* Shopping Cart Trigger Icon */}
        <button 
          onClick={() => setShowCartDrawer(true)}
          className="p-2.5 bg-white rounded-full shadow-sm hover:bg-slate-50 relative transition-all cursor-pointer"
        >
          <ShoppingCart className="h-4.5 w-4.5 text-[#0D47A1]" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* TOAST NOTIFICATION FOR ADDED PRODUCT */}
      <AnimatePresence>
        {showAddedToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between z-50 border border-green-500"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 bg-white/20 p-0.5 rounded-full text-white" />
              <span className="text-xs font-bold">{product.name} added to cart!</span>
            </div>
            <button 
              onClick={() => setShowCartDrawer(true)}
              className="text-xs font-extrabold underline hover:text-green-100"
            >
              View Cart
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENT AREA */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* PRODUCT HERO IMAGE BOX */}
        <div className={`bg-gradient-to-br ${style.colorTheme} border rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden h-52 group`}>
          <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/30 rounded-full blur-2xl group-hover:bg-white/45 transition-all"></div>
          <span className="text-7xl drop-shadow-md select-none transform group-hover:scale-110 transition-transform duration-300">
            {style.icon}
          </span>
          <span className="absolute bottom-3 right-4 bg-white/80 backdrop-blur-sm text-[9px] font-bold text-text-primary border px-2 py-0.5 rounded-full uppercase">
            Certified Inspected
          </span>
        </div>

        {/* BASIC SPECS & TITLES */}
        <div className="flex flex-col gap-2">
          {/* Grade Badge */}
          <div className="flex justify-between items-center">
            <span className="bg-[#EBF7EE] text-green-700 text-[10px] font-extrabold px-3 py-1 rounded-full border border-green-150 uppercase shadow-sm">
              {product.condition}
            </span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-xs font-extrabold text-text-primary">{product.rating}</span>

            </div>
          </div>

          <h2 className="text-xl font-black text-text-primary leading-tight mt-1">{product.name}</h2>
          
          <span className="text-[10px] text-slate-500 font-semibold italic block -mt-1 leading-relaxed">
            {product.conditionGrade}
          </span>
        </div>

        {/* PRICING BLOCK */}
        <div className="bg-white border border-slate-200/60 p-4.5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-secondary font-medium">Original Retail Price</span>
            <span className="text-xs text-text-secondary line-through">₹{product.originalPrice.toLocaleString('en-IN')}.00</span>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-green-600 font-bold bg-[#EBF7EE] px-2 py-0.5 rounded-full border border-green-100">
              You Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-brand-navy">₹{product.price.toLocaleString('en-IN')}</span>
              <span className="text-green-600 text-xs font-bold">({Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF)</span>
            </div>
          </div>
        </div>

        {/* WARRANTY BOX */}
        <div className="bg-gradient-to-r from-blue-500 to-[#0A3D80] text-white p-4.5 rounded-2xl shadow-sm border border-blue-600/10 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="bg-[#FFD600] text-[#0D47A1] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Warranty Active
              </span>
            </div>
            <h4 className="text-sm font-extrabold mt-1.5">{product.warranty}</h4>
            <p className="text-[10px] text-white/85 leading-relaxed mt-0.5">100% replacement & service warranty by Nigam Shield.</p>
          </div>
          <span className="text-3xl font-black">🛡️</span>
        </div>

        {/* DETAILED DESCRIPTION */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Product Overview</h3>
          <p className="text-xs text-text-primary leading-relaxed bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
            {product.description}
          </p>
        </div>

        {/* KEY HIGHLIGHTS */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Purchase Benefits</h3>
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4.5 flex flex-col gap-3 shadow-sm">
            {product.benefits.map((benefit, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className="w-[18px] h-[18px] bg-green-50 rounded-full flex items-center justify-center text-green-600 mt-0.5 flex-shrink-0">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-xs font-semibold text-text-primary leading-tight">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* DETAILED SPECIFICATIONS TABLE */}
        <div className="flex flex-col gap-2 mb-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Technical Specifications</h3>
          <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(product.fullSpecs).map(([key, val], index) => (
                  <tr 
                    key={key} 
                    className={`border-b border-slate-100 last:border-0 ${
                      index % 2 === 0 ? 'bg-[#F8F9FA]/40' : 'bg-white'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-text-secondary w-1/3 border-r border-slate-100">{key}</td>
                    <td className="p-3.5 font-semibold text-text-primary">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* STICKY BOTTOM BUTTONS BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-border-color p-4.5 flex gap-3 z-20 shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(100%,48rem)] md:rounded-t-2xl">
        {/* Add to Cart button */}
        <button 
          onClick={handleAddToCart}
          className="flex-1 bg-slate-100 hover:bg-[#E3ECF9] text-[#0D47A1] font-extrabold py-3.5 rounded-xl border border-[#0D47A1]/10 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <ShoppingBag className="h-4.5 w-4.5 text-[#0D47A1]" /> Add to Cart
        </button>

        {/* Buy Now button */}
        <button 
          onClick={() => setShowCheckoutModal(true)}
          className="flex-1 bg-[#FFD600] hover:bg-yellow-400 text-[#0D47A1] font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <CreditCard className="h-4.5 w-4.5" /> Buy Now
        </button>
      </div>

      {/* SHOPPING CART DRAWER (OVERLAY) */}
      <AnimatePresence>
        {showCartDrawer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
            {/* Drawer Backdrop closer */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setShowCartDrawer(false)}></div>
            
            {/* Drawer Body Container */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col relative z-10"
            >
              
              {/* Drawer Header */}
              <div className="bg-[#E3ECF9] p-5 flex items-center justify-between border-b border-border-color">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#0D47A1]" />
                  <h3 className="font-extrabold text-sm text-[#0D47A1]">Your Shopping Cart</h3>
                </div>
                <button 
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1.5 bg-white/80 rounded-full hover:bg-white text-text-primary transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Cart Items */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                    <span className="text-5xl">🛒</span>
                    <h4 className="font-extrabold text-xs text-text-primary mt-2">Your cart is empty!</h4>
                    <p className="text-[10px] text-text-secondary leading-relaxed max-w-[200px]">Add Nigam certified appliances to secure your home comfort.</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center gap-3 relative"
                    >
                      <span className="text-3xl bg-white p-2 rounded-lg border shadow-inner flex-shrink-0">
                        {item.icon}
                      </span>
                      
                      <div className="flex-1 min-w-0 pr-6">
                        <h4 className="font-extrabold text-xs text-text-primary truncate">{item.name}</h4>
                        <span className="text-[9px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-extrabold uppercase mt-1 inline-block">
                          {item.condition.split(' ')[0]}
                        </span>
                        
                        <div className="flex items-baseline gap-2 mt-1.5">
                          <span className="text-xs font-bold text-[#0D47A1]">₹{item.price.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-text-secondary">Qty: {item.quantity}</span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button 
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer Checkout Summary */}
              {cartItems.length > 0 && (
                <div className="p-5 border-t border-border-color bg-slate-50 flex flex-col gap-4">
                  <div className="flex justify-between items-baseline text-xs text-text-secondary">
                    <span>Subtotal ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                    <strong className="text-sm font-black text-text-primary">
                      ₹{cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateCart([])}
                      className="px-3 bg-white hover:bg-red-50 text-red-500 border border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm"
                      title="Clear Cart"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowCartDrawer(false);
                        setShowCheckoutModal(true);
                      }}
                      className="flex-1 bg-[#0D47A1] hover:bg-blue-900 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Checkout Order <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL SYSTEM FOR BUY NOW */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center">
            {/* Modal Dialog */}
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
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="h-4.5 w-4.5 text-text-secondary" />
                </button>
              </div>

              {/* Step 1: Details */}
              {checkoutStep === 'details' && (
                <div className="flex flex-col gap-4">
                  {checkoutError && (
                    <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      {checkoutError}
                    </p>
                  )}
                  {/* Summary */}
                  <div className="bg-[#F8F9FA] p-4.5 rounded-2xl flex items-center gap-3 border border-slate-150 shadow-inner">
                    <span className="text-3xl">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-text-primary truncate">{product.name}</h4>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold text-brand-blue">₹{product.price.toLocaleString('en-IN')}</span>
                        <span className="text-[8px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-extrabold uppercase">{product.condition}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
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
                    className="w-full bg-brand-yellow text-[#0D47A1] font-extrabold py-3.5 rounded-xl transition-all shadow-md text-sm mt-2 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                  >
                    Confirm Order & Pay ₹{product.price.toLocaleString('en-IN')}
                  </button>
                </div>
              )}

              {/* Step 2: Processing */}
              {checkoutStep === 'processing' && (
                <div className="flex flex-col gap-4 items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-brand-yellow border-t-brand-blue rounded-full animate-spin"></div>
                  <div className="text-center mt-2">
                    <h4 className="font-extrabold text-sm text-text-primary animate-pulse">Processing Payment...</h4>
                    <p className="text-xs text-text-secondary mt-1">Verifying credentials and transaction security.</p>
                  </div>
                </div>
              )}

              {/* Step 3: Success */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col gap-5 items-center text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
                    <Check className="h-8 w-8 stroke-[3]" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-extrabold text-text-primary">Order Confirmed!</h3>
                    <p className="text-xs text-text-secondary mt-1">Thank you! Your appliance delivery has been scheduled.</p>
                  </div>

                  {/* Receipt */}
                  <div className="w-full bg-gradient-to-br from-brand-navy via-[#0A3D80] to-brand-blue rounded-3xl p-5 text-white text-left relative overflow-hidden shadow-xl">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-yellow/10 rounded-full blur-2xl"></div>
                    
                    <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[9px] bg-brand-yellow text-black font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Nigam Store Receipt
                        </span>
                        <h4 className="font-bold text-sm mt-1.5">{product.name}</h4>
                      </div>
                      <span className="text-2xl">{style.icon}</span>
                    </div>

                    <div className="flex flex-col gap-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">Order ID:</span>
                        <span className="font-mono font-bold">{placedOrder?.humanId || placedOrder?.id || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Amount Paid:</span>
                        <span className="font-bold text-brand-yellow">₹{(placedOrder?.total ?? product.price).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Delivery Address:</span>
                        <span className="font-semibold text-right max-w-[200px] truncate">{address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Status:</span>
                        <span className="font-bold text-green-400">{placedOrder?.status || 'Placed'}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setCheckoutStep('details');
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

    </div>
  );
};

export default ProductDetails;
