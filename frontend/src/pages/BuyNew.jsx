import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Shield, ShoppingCart, CheckCircle, ChevronRight, Check, Search, 
  Wrench, Percent, CreditCard, Lock, Landmark, Wallet, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Zap, CheckCircle2, Home as HomeIcon, LayoutGrid, User, Calendar, RefreshCw,
  Heart, Star, ChevronDown, SlidersHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/apiClient';
import { useCart } from '../lib/cartStore';
import { payWithRazorpay } from '../lib/razorpayCheckout';

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

  // Shared with ProductDetails.jsx and mirrored to the server cart once there is
  // a session — see lib/cartStore.js.
  const {
    items: cart,
    addItem: addCartItem,
    adjustQty,
    removeItem: removeCartItem,
    replaceWith: replaceCart,
    clear: clearCart,
  } = useCart();

  // Derived list of products for category step
  const finalCategory = categoryParam || 'Water Purifier';

  // The catalogue is maintained in the admin console and served from /products —
  // it used to be a hardcoded object here, which meant the storefront never
  // reflected anything an admin actually did.
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    apiRequest(`/products?category=${encodeURIComponent(finalCategory)}&limit=100`)
      .then((res) => {
        if (cancelled) return;
        setCategoryProducts(res || []);
        setProductsError('');
      })
      .catch((err) => { if (!cancelled) setProductsError(err.message || 'Could not load products.'); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [finalCategory]);



  // Wishlist, Sort, and Filter States
  const [wishlist, setWishlist] = useState([]);
  useEffect(() => {
    apiRequest('/wishlist', { auth: true })
      .then((res) => setWishlist(res || []))
      .catch((err) => console.warn('[wishlist] Could not load:', err.message));
  }, []);

  // Sort By drawer and Filter page states
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterPage, setShowFilterPage] = useState(false);
  const [sortOption, setSortOption] = useState('relevance'); // 'relevance' | 'popularity' | 'low-to-high' | 'high-to-low' | 'newest'
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [tempSelectedBrands, setTempSelectedBrands] = useState([]);
  const [searchBrandQuery, setSearchBrandQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'discount' | 'inStock'

  const toggleWishlist = async (product, e) => {
    e.stopPropagation();
    const exists = wishlist.some(p => p.id === product.id);
    try {
      const res = await apiRequest(`/wishlist/${product.id}`, {
        method: exists ? 'DELETE' : 'POST',
        auth: true,
      });
      setWishlist(res || []);
    } catch (err) {
      console.error('[wishlist] Could not update:', err.message);
    }
  };

  const sortedAndFilteredProducts = React.useMemo(() => {
    let list = [...categoryProducts];

    // Apply Brand filter
    if (selectedBrands.length > 0) {
      list = list.filter(product => 
        selectedBrands.some(brand => product.name.toLowerCase().includes(brand.toLowerCase()))
      );
    }

    // Both filters read real product fields. They used to select by even/odd
    // index, so "Top Sale Discounts" showed full-price items and the chip state
    // told the customer nothing about the products behind it.
    if (activeFilter === 'discount') {
      list = list.filter((p) => p.originalPrice > p.price);
    } else if (activeFilter === 'inStock') {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    }

    // Apply sorting
    if (sortOption === 'low-to-high') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'high-to-low') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'popularity') {
      list.sort((a, b) => {
        // Real ratings; these were synthesised from `price % 6`, so "sort by
        // rating" was really sorting by an arithmetic quirk of the price.
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
    } else if (sortOption === 'newest') {
      list.reverse();
    }

    return list;
  }, [categoryProducts, sortOption, activeFilter, selectedBrands]);
  
  // Derived selected product for details step
  const finalProduct = categoryProducts.find(p => p.name === productNameParam) || categoryProducts[0];

  // Helper actions for Cart
  const addToCart = (product) => {
    addCartItem(product, { category: finalCategory });
    navigate('/buy-new/cart');
  };

  // Never drops the line: a decrement at qty 1 is a no-op here, same as before —
  // removal is its own explicit action.
  const updateQty = (id, delta) => {
    const existing = cart.find((item) => item.id === id);
    if (existing && existing.qty + delta > 0) adjustQty(id, delta);
  };

  const removeFromCart = (id) => {
    removeCartItem(id);
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
    initializeExchangeConfigs()
      .then(setExchangeConfigs)
      .catch((err) => console.warn('[exchange] Could not load configs:', err.message));
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

  // Cart pricing details.
  //
  // A trade-in is only honoured once a super-admin has physically inspected the
  // device (order.service.js refuses the discount otherwise), so the amount
  // payable today is the full price. This used to subtract the estimate from
  // the total on screen while the order was still priced at full — the customer
  // was quoted less than they would have been charged.
  const cartSubtotalBeforeExchange = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const approvedExchangeSavings = cart.reduce(
    (sum, item) => sum + (item.exchange?.status === 'Inspection Approved' ? item.exchange.totalSavings * item.qty : 0),
    0,
  );
  const pendingExchangeSavings = cart.reduce(
    (sum, item) => sum + (item.exchange && item.exchange.status !== 'Inspection Approved' ? item.exchange.totalSavings * item.qty : 0),
    0,
  );
  const totalExchangeSavings = approvedExchangeSavings;
  const cartSubtotal = cartSubtotalBeforeExchange - approvedExchangeSavings;
  const deliveryCharges = 0;
  const cartTotal = cartSubtotal + deliveryCharges;

  const placedOrder = location.state?.order || null;
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  const handlePlaceOrder = async () => {
    if (!cart.length) return;
    setOrderError('');
    setPlacingOrder(true);

    try {
      const res = await apiRequest('/orders', {
        method: 'POST',
        auth: true,
        body: {
          items: cart.map((item) => ({ productId: item.id, quantity: item.qty || 1 })),
          // Only an inspected-and-approved trade-in is accepted by the server;
          // sending a pending one would 400 the whole checkout.
          exchangeRequestId: cart.find((i) => i.exchange?.status === 'Inspection Approved')?.exchange?.requestId,
          paymentMethod: 'UPI',
        },
      });
      const order = res;

      if (order.razorpay) {
        await payWithRazorpay({
          razorpay: order.razorpay,
          verifyPath: `/orders/${order.id}/verify-payment`,
          description: `${cart.length} item(s)`,
        });
      }

      clearCart();
      navigate('/buy-new/success', { state: { order } });
    } catch (err) {
      setOrderError(err.message || 'The order could not be placed. You have not been charged.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-24 lg:pb-8 relative">
      
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
            className="flex flex-col gap-4 text-left"
          >
            {/* Top Horizontal Scrollable Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {/* Sort Button */}
              <button
                onClick={() => setShowSortModal(true)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  sortOption !== 'relevance' 
                    ? 'bg-blue-50 border-brand-blue text-brand-blue' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Sort <ChevronDown size={13} className={sortOption !== 'relevance' ? "text-brand-blue" : "text-slate-500"} />
              </button>

              {/* Filter Button */}
              <button
                onClick={() => {
                  setTempSelectedBrands([...selectedBrands]);
                  setShowFilterPage(true);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  selectedBrands.length > 0
                    ? 'bg-blue-50 border-brand-blue text-brand-blue'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Filter <SlidersHorizontal size={13} className={selectedBrands.length > 0 ? "text-brand-blue" : "text-slate-500"} />
              </button>

              {/* Top Sale Discounts Filter */}
              <button
                onClick={() => setActiveFilter(activeFilter === 'discount' ? 'all' : 'discount')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeFilter === 'discount'
                    ? 'bg-blue-50 border-brand-blue text-brand-blue'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Top Sale Discounts
              </button>

              {/* In-stock filter — the platform has no per-product delivery
                  speed, so this reports what the stock count actually says. */}
              <button
                onClick={() => setActiveFilter(activeFilter === 'inStock' ? 'all' : 'inStock')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeFilter === 'inStock'
                    ? 'bg-blue-50 border-brand-blue text-brand-blue'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                In Stock
              </button>
            </div>

            {/* Products List (Flipkart Grid Layout) */}
            {productsLoading && (
              <p className="text-center text-xs font-semibold text-slate-400 py-8">Loading products…</p>
            )}
            {productsError && (
              <p className="text-center text-xs font-semibold text-rose-500 py-8">{productsError}</p>
            )}
            {!productsLoading && !productsError && sortedAndFilteredProducts.length === 0 && (
              <p className="text-center text-xs font-semibold text-slate-400 py-8">
                No products available in {finalCategory} yet.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {sortedAndFilteredProducts.map((product) => {
                const isWishlisted = wishlist.some(p => p.id === product.id);
                const rating = product.rating ? product.rating.toFixed(1) : null;
                const originalPrice = product.originalPrice || null;
                const discount = originalPrice && originalPrice > product.price
                  ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
                  : null;

                return (
                  <div 
                    key={product.id}
                    onClick={() => navigate(`/buy-new/details/${encodeURIComponent(finalCategory)}/${encodeURIComponent(product.name)}`)}
                    className="bg-white border border-slate-200/90 hover:border-[#0D47A1]/40 rounded-3xl p-4 md:p-5 flex flex-col gap-4 cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 relative group overflow-hidden"
                  >
                    <div className="flex gap-4 md:gap-5 items-start">
                      {/* Left: Image Container with Floating Heart */}
                      <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shrink-0 overflow-hidden shadow-2xs">
                        <img 
                          src={product.imageUrl || getApplianceImg(finalCategory)} 
                          alt={product.name} 
                          className="w-full h-full object-contain mix-blend-multiply" 
                        />

                        {/* Floating Wishlist Heart */}
                        <button
                          onClick={(e) => toggleWishlist(product, e)}
                          className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-md border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                        >
                          <Heart 
                            size={14} 
                            fill={isWishlisted ? "#EF4444" : "none"} 
                            className={isWishlisted ? "text-red-500" : "text-slate-400"} 
                          />
                        </button>
                      </div>

                      {/* Right: Product Details */}
                      <div className="flex-1 flex flex-col text-left justify-between min-w-0 space-y-2">
                        <div>
                          {/* Brand & Assured Badges Row */}
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {product.brand && (
                              <span className="text-[9px] font-mono font-black text-[#0D47A1] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {product.brand}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[8px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                              ★ Assured
                            </span>
                            {product.warrantyMonths && (
                              <span className="inline-flex items-center text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                🛡️ {product.warrantyMonths}M Warranty
                              </span>
                            )}
                          </div>

                          {/* Product Title */}
                          <h4 className="text-sm md:text-base font-black text-slate-900 leading-snug group-hover:text-[#0D47A1] transition-colors line-clamp-2">
                            {product.name}
                          </h4>

                          {/* Feature Spec Pills (Clean & Uncluttered) */}
                          {product.specs && product.specs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.specs.slice(0, 4).map((spec, sIdx) => (
                                <span 
                                  key={sIdx} 
                                  className="bg-slate-100/80 border border-slate-200/70 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pricing Details */}
                        <div className="pt-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-slate-900 font-black text-base md:text-lg">
                              ₹{product.price.toLocaleString()}
                            </span>
                            {discount !== null && (
                              <>
                                <span className="text-slate-400 line-through text-xs font-bold">
                                  ₹{originalPrice.toLocaleString()}
                                </span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-200">
                                  ↓{discount}% OFF
                                </span>
                              </>
                            )}
                          </div>

                          {/* Shipping & Delivery Footer */}
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px]">
                            <span className="text-[#0D47A1] font-black">
                              ✓ Exchange offer available
                            </span>
                            <span className="text-slate-500 font-semibold">
                              Delivery by <strong className="text-slate-800">Tomorrow</strong> &nbsp;|&nbsp; <strong className="text-emerald-600">Free Shipping</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                    <span className="text-2xl font-black text-green-600">₹{finalProduct.price.toLocaleString()}</span>
                  </div>
                  {/* The estimate is not a discount until the device is
                      inspected, so it is labelled as an estimate rather than
                      struck through the price. */}
                  <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 self-start">
                    {exchangeApplied.status === 'Inspection Approved'
                      ? `Exchange credit ₹${exchangeApplied.totalSavings?.toLocaleString()} approved`
                      : `Trade-in registered · est. ₹${exchangeApplied.totalSavings?.toLocaleString()} after inspection`}
                  </span>
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
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
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
                          <span className="text-xs font-black text-emerald-800 block">
                            {exchangeApplied.status === 'Inspection Approved' ? 'Exchange Approved' : 'Trade-in Registered'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                            {exchangeApplied.brand} {exchangeApplied.model}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#10B981]">
                        {exchangeApplied.status === 'Inspection Approved' ? '- ' : '≈ '}
                        ₹{exchangeApplied.totalSavings?.toLocaleString()}
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
                  addCartItem(finalProduct, {
                    category: finalCategory,
                    ...(productExchange
                      ? { exchange: { ...productExchange, productId: finalProduct.id } }
                      : {}),
                  });
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
                  replaceCart([{ ...finalProduct, qty: 1, category: finalCategory, exchange: productExchange }]);
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

                  {approvedExchangeSavings > 0 && (
                    <div className="flex justify-between items-center text-xs text-green-600 font-bold">
                      <span>Exchange Discount</span>
                      <span>- ₹{approvedExchangeSavings.toLocaleString()}</span>
                    </div>
                  )}

                  {/* A pending trade-in is shown as what it is — an estimate
                      awaiting inspection — not deducted from today's total. */}
                  {pendingExchangeSavings > 0 && (
                    <div className="flex flex-col gap-0.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <div className="flex justify-between items-center text-xs text-amber-800 font-bold">
                        <span>Trade-in (pending inspection)</span>
                        <span>≈ ₹{pendingExchangeSavings.toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-amber-700 leading-snug">
                        Credited after our technician inspects your old device at pickup. Today you pay the full price.
                      </span>
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
              {/* Places a real order and takes the money. This used to clear the
                  cart and jump to the success screen — no order was created and
                  nothing was charged, yet the customer was told it was placed. */}
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || cart.length === 0}
                className="w-full bg-[#FFD400] hover:bg-yellow-400 disabled:opacity-60 text-brand-navy font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {placingOrder ? 'Opening secure checkout…' : `Pay ₹${cartTotal.toLocaleString()} Securely`}
              </button>
              {orderError && (
                <p className="text-[11px] font-bold text-red-600 text-center px-2">{orderError}</p>
              )}
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
                  {/* The real order reference. A random NCCORD###### was shown
                      here, so the number the customer wrote down matched no order. */}
                  <span className="font-mono tracking-wider font-semibold">{placedOrder?.humanId || placedOrder?.id || '—'}</span>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible lg:hidden">
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

      {/* ── SORT BY BOTTOM SHEET DRAWERS ── */}
      {showSortModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end justify-center">
          {/* Click outside to close */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0" 
            onClick={() => setShowSortModal(false)} 
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-white rounded-t-[28px] w-full max-w-md p-5 pb-8 flex flex-col gap-4 text-left relative z-10 shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-slate-100 pb-3">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">SORT BY</span>
            </div>
            
            {/* Options list */}
            <div className="flex flex-col gap-2">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'popularity', label: 'Popularity' },
                { value: 'low-to-high', label: 'Price -- Low to High' },
                { value: 'high-to-low', label: 'Price -- High to Low' },
                { value: 'newest', label: 'Newest First' }
              ].map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    setSortOption(opt.value);
                    setShowSortModal(false);
                  }}
                  className="flex justify-between items-center py-3 cursor-pointer group hover:bg-slate-50 px-2 rounded-xl transition-colors"
                >
                  <span className={`text-[13px] font-bold ${sortOption === opt.value ? 'text-brand-blue' : 'text-slate-800'}`}>
                    {opt.label}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    sortOption === opt.value ? 'border-brand-blue bg-white' : 'border-slate-300'
                  }`}>
                    {sortOption === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── FULL-SCREEN FILTERS PAGE OVERLAY ── */}
      {showFilterPage && (
        <motion.div 
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed inset-0 bg-white z-50 flex flex-col h-full text-left"
        >
          {/* Header Bar */}
          <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilterPage(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </button>
              <h1 className="text-sm font-extrabold text-slate-800">Filters</h1>
            </div>
            <button 
              onClick={() => setTempSelectedBrands([])}
              className="text-xs text-brand-blue font-black hover:text-blue-700 cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          {/* Body Content Pane with Sidebar and Options */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Category Sidebar */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-100 flex flex-col overflow-y-auto">
              {[
                'Brand',
                'Display Technology',
                'Operating System',
                'Resolution',
                'Launch Year',
                'Price',
                'Customer Ratings',
                'Smart Features',
                'Refresh Rate',
                'Number of USB Ports',
                'Number of HDMI Ports'
              ].map((category, idx) => (
                <div 
                  key={idx}
                  className={`p-4 text-[11px] font-extrabold text-left border-l-4 transition-all cursor-pointer ${
                    category === 'Brand' 
                      ? 'bg-white border-brand-blue text-brand-blue font-black shadow-xs' 
                      : 'border-transparent text-slate-600 hover:bg-slate-100/50'
                  }`}
                >
                  {category}
                </div>
              ))}
            </div>

            {/* Right Options List */}
            <div className="flex-1 bg-white p-4 flex flex-col gap-3.5 overflow-y-auto">
              {/* Search Brand input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search Brand"
                  value={searchBrandQuery}
                  onChange={(e) => setSearchBrandQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-brand-blue/50"
                />
              </div>

              {/* Brands Checklist */}
              <div className="flex flex-col gap-3.5">
                {[
                  'SONY', 'Samsung', 'LG', 'TCL', 'XIAOMI', 
                  'MOTOROLA', 'Thomson', 'realme TechLife', 'TOSHIBA', 'iFFALCON'
                ]
                  .filter(brand => brand.toLowerCase().includes(searchBrandQuery.toLowerCase()))
                  .map((brand) => {
                    const isChecked = tempSelectedBrands.includes(brand);
                    return (
                      <div 
                        key={brand}
                        onClick={() => {
                          if (isChecked) {
                            setTempSelectedBrands(tempSelectedBrands.filter(b => b !== brand));
                          } else {
                            setTempSelectedBrands([...tempSelectedBrands, brand]);
                          }
                        }}
                        className="flex items-center gap-3 py-1 cursor-pointer group"
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-[#F95F06] border-[#F95F06]' : 'border-slate-300 group-hover:border-slate-400'
                        }`}>
                          {isChecked && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-[12.5px] font-bold text-slate-700 select-none">
                          {brand}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <span className="text-[11px] text-brand-blue font-black mt-2 cursor-pointer inline-block">
                View More
              </span>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="border-t border-slate-100 p-4 flex items-center justify-between shrink-0 bg-white">
            <span className="text-xs text-slate-500 font-extrabold">
              {tempSelectedBrands.length > 0 ? (
                `${categoryProducts.filter(product => 
                  tempSelectedBrands.some(brand => product.name.toLowerCase().includes(brand.toLowerCase()))
                ).length} products found`
              ) : (
                `${categoryProducts.length} products found`
              )}
            </span>
            <button 
              onClick={() => {
                setSelectedBrands(tempSelectedBrands);
                setShowFilterPage(false);
              }}
              className="bg-[#F95F06] hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl text-xs font-black transition-colors shadow-md cursor-pointer active:scale-97"
            >
              Apply
            </button>
          </div>
        </motion.div>
      )}

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
