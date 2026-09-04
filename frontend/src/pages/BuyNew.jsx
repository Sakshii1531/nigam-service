import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Shield, ShoppingCart, CheckCircle, ChevronRight, Check, Search, 
  Wrench, Percent, CreditCard, Lock, Landmark, Wallet, ShieldCheck, Plus, Minus, Trash2,
  ChevronLeft, Zap, CheckCircle2, Home as HomeIcon, LayoutGrid, User, Calendar, RefreshCw,
  Heart, Star, ChevronDown, SlidersHorizontal, Truck, Package, X, UploadCloud, Sparkles,
  MapPin, Building, Briefcase, Phone, Edit2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/apiClient';
import { useCart } from '../lib/cartStore';
import { payWithRazorpay } from '../lib/razorpayCheckout';
import { useAuth } from '../context/AuthContext';

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
  else if (pathname.includes('/buy-new/checkout') || pathname.includes('/buy-new/address')) step = 5;
  else if (pathname.includes('/buy-new/payment')) step = 6;
  else if (pathname.includes('/buy-new/success')) step = 7;

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
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);

  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (pincodeInput.trim().length === 6) {
      setPincodeStatus({
        valid: true,
        pincode: pincodeInput.trim(),
        message: 'Free Express Delivery by Tomorrow • Free Doorstep Installation Available',
      });
    } else {
      setPincodeStatus({ valid: false, message: 'Please enter a valid 6-digit pincode.' });
    }
  };

  // Dynamic Product Reviews & Customer Photos State
  const [productReviews, setProductReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    avgRating: 4.8,
    totalRatings: 128,
    totalReviews: 42,
    starsBreakdown: { 5: 78, 4: 16, 3: 4, 2: 1, 1: 1 },
  });
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newRatingVal, setNewRatingVal] = useState(5);
  const [newCommentVal, setNewCommentVal] = useState('');
  const [newReviewPhoto, setNewReviewPhoto] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Derived selected product for details step
  const decodedProductName = productNameParam ? decodeURIComponent(productNameParam) : '';
  const finalProduct = categoryProducts.find(
    p => p.name === decodedProductName || p.name === productNameParam || p.id === productNameParam
  ) || categoryProducts[0] || null;

  // All Products state for Recommendations Backfill
  const [allProducts, setAllProducts] = useState([]);
  useEffect(() => {
    apiRequest('/products?limit=100')
      .then((res) => setAllProducts(res || []))
      .catch((err) => console.warn('[all-products] Could not load:', err.message));
  }, []);

  // Dynamic Similar Products Recommendation Calculation
  const similarProducts = React.useMemo(() => {
    if (!finalProduct) return [];
    const sameCat = categoryProducts.filter(
      (p) => p.id !== finalProduct.id && p.name !== finalProduct.name
    );
    if (sameCat.length >= 4) return sameCat.slice(0, 4);

    const others = allProducts.filter(
      (p) => p.id !== finalProduct.id && p.name !== finalProduct.name && !sameCat.some((sc) => sc.id === p.id)
    );
    return [...sameCat, ...others].slice(0, 4);
  }, [categoryProducts, finalProduct, allProducts]);

  const handleSelectSimilarProduct = (product) => {
    const targetCat = product.category || finalCategory;
    navigate(`/buy-new/details/${encodeURIComponent(targetCat)}/${encodeURIComponent(product.name)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (finalProduct?.id) {
      apiRequest(`/reviews/product/${finalProduct.id}`)
        .then((res) => {
          if (res) {
            setProductReviews(res.reviews || []);
            if (res.stats) setReviewStats(res.stats);
            if (res.photos) setCustomerPhotos(res.photos);
          }
        })
        .catch((err) => console.warn('[product-reviews] Could not load:', err.message));
    }
  }, [finalProduct?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!finalProduct?.id) return;
    setSubmittingReview(true);
    try {
      const res = await apiRequest('/reviews/product', {
        method: 'POST',
        auth: true,
        body: {
          productId: finalProduct.id,
          rating: newRatingVal,
          comment: newCommentVal,
          photos: newReviewPhoto ? [newReviewPhoto] : [],
        },
      });

      setProductReviews((prev) => [res, ...prev]);
      if (newReviewPhoto) {
        setCustomerPhotos((prev) => [newReviewPhoto, ...prev]);
      }
      setIsWriteReviewOpen(false);
      setNewCommentVal('');
      setNewReviewPhoto(null);
      setNewRatingVal(5);
    } catch (err) {
      alert(err.message || 'Could not submit review. Please log in first.');
    } finally {
      setSubmittingReview(false);
    }
  };

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
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === 'newest') {
      list.reverse();
    }

    return list;
  }, [categoryProducts, sortOption, activeFilter, selectedBrands]);

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

  const [paymentMode, setPaymentMode] = useState('COD'); // 'COD' | 'Online'
  const [selectedProductImg, setSelectedProductImg] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

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

  // ── Delivery Address & Checkout Management ──
  const { user, updateUser } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ncc_selected_checkout_address');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    house: '',
    landmark: '',
    city: 'Indore',
    pincode: '',
    type: 'Home',
  });
  const [addressFormError, setAddressFormError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Sync user info into address form defaults
  useEffect(() => {
    if (user && !addressForm.name) {
      setAddressForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  // Load saved addresses when entering address or payment step
  const loadSavedAddresses = async () => {
    setLoadingAddresses(true);
    try {
      let addrs = [];
      try {
        const res = await apiRequest('/auth/addresses', { auth: true });
        addrs = Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn('[checkout] Could not fetch saved addresses from API:', err.message);
        addrs = user?.addresses || [];
      }

      setSavedAddresses(addrs);

      if (selectedAddress) {
        const match = addrs.find(
          (a) => (a._id && a._id === selectedAddress._id) || (a.id && a.id === selectedAddress.id)
        );
        if (match) {
          setSelectedAddress(match);
          setSelectedAddressId(match._id || match.id);
        } else {
          setSelectedAddressId(selectedAddress._id || selectedAddress.id || 'custom');
        }
      } else if (addrs.length > 0) {
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        setSelectedAddress(def);
        setSelectedAddressId(def._id || def.id);
        try {
          sessionStorage.setItem('ncc_selected_checkout_address', JSON.stringify(def));
        } catch (e) {}
      } else {
        // No saved addresses found, automatically reveal the add address form
        setShowAddAddressForm(true);
      }
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (step === 5 || step === 6) {
      loadSavedAddresses();
    }
  }, [step, user?.id]);

  // Guard: if user lands directly on payment without cart or address, navigate back
  useEffect(() => {
    if (step === 6) {
      if (!cart.length) {
        navigate('/buy-new/cart');
      } else if (!selectedAddress) {
        navigate('/buy-new/address');
      }
    }
  }, [step, cart.length, selectedAddress]);

  const handleSelectAddress = (addr) => {
    setSelectedAddress(addr);
    setSelectedAddressId(addr._id || addr.id);
    try {
      sessionStorage.setItem('ncc_selected_checkout_address', JSON.stringify(addr));
    } catch (e) {}
    setShowAddAddressForm(false);
    setAddressFormError('');
  };

  const handleSaveNewAddress = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setAddressFormError('');

    if (!addressForm.name.trim()) {
      setAddressFormError('Please enter recipient full name.');
      return;
    }
    const cleanPhone = addressForm.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setAddressFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!addressForm.house.trim()) {
      setAddressFormError('Please enter flat / house no. / building details.');
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressFormError('Please enter city name.');
      return;
    }
    const cleanPincode = addressForm.pincode.replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      setAddressFormError('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setSavingAddress(true);
    const newAddr = {
      type: addressForm.type || 'Home',
      house: addressForm.house.trim(),
      landmark: addressForm.landmark.trim(),
      city: addressForm.city.trim(),
      pincode: cleanPincode,
      name: addressForm.name.trim(),
      phone: cleanPhone,
      isDefault: savedAddresses.length === 0,
    };

    try {
      if (saveToProfile) {
        try {
          const res = await apiRequest('/auth/addresses', {
            method: 'POST',
            auth: true,
            body: newAddr,
          });
          const list = Array.isArray(res) ? res : [];
          setSavedAddresses(list);
          if (updateUser) updateUser({ addresses: list });
          const created = list[list.length - 1] || newAddr;
          setSelectedAddress(created);
          setSelectedAddressId(created._id || created.id);
          sessionStorage.setItem('ncc_selected_checkout_address', JSON.stringify(created));
        } catch (postErr) {
          console.warn('[checkout] Could not persist to profile:', postErr.message);
          setSelectedAddress(newAddr);
          setSelectedAddressId('custom');
          sessionStorage.setItem('ncc_selected_checkout_address', JSON.stringify(newAddr));
        }
      } else {
        setSelectedAddress(newAddr);
        setSelectedAddressId('custom');
        sessionStorage.setItem('ncc_selected_checkout_address', JSON.stringify(newAddr));
      }

      setShowAddAddressForm(false);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedAddress) {
      setAddressFormError('Please select or add a delivery address to proceed.');
      return;
    }
    navigate('/buy-new/payment');
  };

  const handlePlaceOrder = async (method = paymentMode) => {
    if (!cart.length) return;
    if (!selectedAddress) {
      setOrderError('Delivery address is missing. Please select your delivery address.');
      navigate('/buy-new/address');
      return;
    }
    setOrderError('');
    setPlacingOrder(true);

    try {
      const res = await apiRequest('/orders', {
        method: 'POST',
        auth: true,
        body: {
          items: cart.map((item) => ({ productId: item.id, quantity: item.qty || 1 })),
          address: {
            name: selectedAddress.name || user?.name || 'Customer',
            house: selectedAddress.house || selectedAddress.address || '',
            landmark: selectedAddress.landmark || selectedAddress.detail || '',
            city: selectedAddress.city || 'Indore',
            pincode: selectedAddress.pincode || '',
            type: selectedAddress.type || 'Home',
          },
          exchangeRequestId: cart.find((i) => i.exchange?.status === 'Inspection Approved')?.exchange?.requestId,
          paymentMethod: method, // 'COD' or 'Online' (mapped server-side)
        },
      });
      const order = res;

      if (method === 'Online' && order.razorpay) {
        await payWithRazorpay({
          razorpay: order.razorpay,
          verifyPath: `/orders/${order.id}/verify-payment`,
          description: `${cart.length} item(s)`,
          prefill: {
            name: selectedAddress.name || order.shippingAddress?.fullName || user?.name || 'Customer',
            email: user?.email || 'customer@example.com',
            contact: selectedAddress.phone || user?.phone || '9876543210',
          },
        });
      }

      sessionStorage.removeItem('ncc_selected_checkout_address');
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
              else if (step === 6) navigate('/buy-new/address');
              else if (step === 7) navigate('/buy');
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
              {step === 5 && 'Delivery Address'}
              {step === 6 && 'Payment'}
              {step === 7 && 'Order Success!'}
            </h1>
            {step < 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">BUY BRAND NEW PRODUCT</span>
            )}
            {step === 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">STEP 2 OF 3 • CHECKOUT</span>
            )}
            {step === 6 && (
              <span className="text-[10px] text-blue-200 block font-medium">STEP 3 OF 3 • FINAL STEP</span>
            )}
          </div>
        </div>
        {step < 6 && cart.length > 0 && (
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
                    className="bg-white border border-slate-200/90 hover:border-[#0D47A1]/40 rounded-3xl p-4 md:p-5 flex flex-col justify-between min-h-[240px] cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 relative group overflow-hidden"
                  >
                    <div className="flex gap-4 md:gap-5 items-stretch h-full">
                      {/* Left: Image Container with Floating Heart */}
                      <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shrink-0 overflow-hidden shadow-2xs self-start">
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
                      <div className="flex-1 flex flex-col text-left justify-between min-w-0 h-full">
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
                        <div className="pt-1 mt-auto">
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
          !finalProduct ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center shadow-xs my-6 space-y-4">
              {productsLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-[#0D47A1] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-slate-500">Loading Product Details...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <Package size={24} />
                  </div>
                  <h3 className="text-base font-black text-slate-800">Appliance Details Unavailable</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">The requested product could not be loaded or is out of stock.</p>
                  <button 
                    onClick={() => navigate(`/buy-new/products/${encodeURIComponent(finalCategory)}`)} 
                    className="mt-2 bg-[#0D47A1] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
                  >
                    Back to Appliance Catalog
                  </button>
                </div>
              )}
            </div>
          ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6 pb-24 text-left"
          >
            {/* 1. HERO MEDIA & BRAND HEADER */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col items-center justify-center shadow-xs relative overflow-hidden group">
              {/* Top Floating Badges & Action Buttons */}
              <div className="w-full flex items-center justify-between z-10 mb-2">
                <div className="flex items-center gap-2">
                  {finalProduct?.brand && (
                    <span className="text-[10px] font-mono font-black text-[#0D47A1] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                      {finalProduct.brand}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[9px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full shadow-2xs">
                    ★ Assured
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => toggleWishlist(finalProduct, e)}
                    className="w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-xs transition-all cursor-pointer"
                    title="Add to Wishlist"
                  >
                    <Heart 
                      size={16} 
                      fill={wishlist.some(p => p.id === finalProduct.id) ? "#EF4444" : "none"} 
                      className={wishlist.some(p => p.id === finalProduct.id) ? "text-red-500" : "text-slate-500"} 
                    />
                  </button>
                </div>
              </div>

              {/* High Res Larger Product Image & Slide Gallery */}
              {(() => {
                const productImagesList = finalProduct?.images?.length
                  ? finalProduct.images
                  : (finalProduct?.imageUrl ? [finalProduct.imageUrl] : [getApplianceImg(finalCategory)]);
                
                const currentIdx = activeImageIdx < productImagesList.length ? activeImageIdx : 0;
                const currentDisplayImg = productImagesList[currentIdx] || productImagesList[0];

                const handlePrevImage = (e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : productImagesList.length - 1));
                };

                const handleNextImage = (e) => {
                  e.stopPropagation();
                  setActiveImageIdx((prev) => (prev < productImagesList.length - 1 ? prev + 1 : 0));
                };

                return (
                  <div className="w-full flex flex-col items-center">
                    {/* Main Image Box with Slide Arrows & Larger Container */}
                    <div className="relative w-full max-w-lg h-64 sm:h-72 md:h-80 lg:h-84 flex items-center justify-center p-2 bg-[#f8fafc] rounded-2xl border border-slate-100 overflow-hidden group">
                      
                      {/* Left Slide Arrow */}
                      {productImagesList.length > 1 && (
                        <button
                          type="button"
                          onClick={handlePrevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-200/80 transition-all z-20 cursor-pointer active:scale-90"
                          title="Previous Image"
                        >
                          <ChevronLeft size={18} />
                        </button>
                      )}

                      {/* Main Larger Product Image with Motion Slide */}
                      <motion.img 
                        key={currentIdx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        src={currentDisplayImg} 
                        alt={`${finalProduct.name} View ${currentIdx + 1}`} 
                        className="max-h-full max-w-full object-contain p-2" 
                      />

                      {/* Right Slide Arrow */}
                      {productImagesList.length > 1 && (
                        <button
                          type="button"
                          onClick={handleNextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white text-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-200/80 transition-all z-20 cursor-pointer active:scale-90"
                          title="Next Image"
                        >
                          <ChevronRight size={18} />
                        </button>
                      )}

                      {/* Floating Image Counter Badge */}
                      {productImagesList.length > 1 && (
                        <span className="absolute bottom-2 right-2 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-md z-20">
                          {currentIdx + 1} / {productImagesList.length}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Selector Row with Strict Index Highlight */}
                    {productImagesList.length > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 w-full overflow-x-auto pb-1 mt-3">
                        {productImagesList.map((imgUrl, idx) => {
                          const isSelected = currentIdx === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveImageIdx(idx)}
                              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1.5 bg-white flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                                isSelected
                                  ? 'border-2 border-[#0D47A1] ring-4 ring-blue-100 shadow-md scale-105 opacity-100'
                                  : 'border border-slate-200/80 opacity-60 hover:opacity-100 hover:border-slate-300'
                              }`}
                            >
                              <img 
                                src={imgUrl} 
                                alt={`${finalProduct.name} Thumbnail ${idx + 1}`} 
                                className="max-h-full max-w-full object-contain"
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 2. PRODUCT TITLE & RATINGS SUMMARY */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <div className="space-y-2">
                {/* Top Row: Title & Stock Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                    {finalProduct.name}
                  </h1>
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shrink-0">
                    ✓ In Stock (Ready to Ship)
                  </span>
                </div>
                
                {/* Ratings & Reviews Row */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md text-xs font-black shadow-2xs">
                    <span>4.5</span>
                    <Star size={10} fill="currentColor" />
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    128 Ratings & 42 Customer Reviews
                  </span>
                </div>
              </div>

              {/* 3. PRICING & DISCOUNT BREAKDOWN */}
              <div className="pt-3 border-t border-slate-100">
                {(() => {
                  const origPrice = finalProduct.originalPrice || null;
                  const discPct = origPrice && origPrice > finalProduct.price
                    ? Math.round(((origPrice - finalProduct.price) / origPrice) * 100)
                    : null;
                  const savingsAmount = origPrice && origPrice > finalProduct.price
                    ? (origPrice - finalProduct.price)
                    : null;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                          ₹{finalProduct.price.toLocaleString()}
                        </span>
                        {origPrice && (
                          <span className="text-sm md:text-base text-slate-400 line-through font-bold">
                            ₹{origPrice.toLocaleString()}
                          </span>
                        )}
                        {discPct && (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-lg border border-emerald-200">
                            ↓{discPct}% OFF
                          </span>
                        )}
                      </div>

                      {savingsAmount && (
                        <p className="text-xs font-bold text-emerald-700">
                          🎉 You Save ₹{savingsAmount.toLocaleString()} on this order! (Inclusive of all taxes)
                        </p>
                      )}

                      {/* Trade-in Applied Badge */}
                      {isCurrentExchangeApplied && (
                        <div className="mt-2 text-xs font-black text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
                          {exchangeApplied.status === 'Inspection Approved'
                            ? `✓ Exchange Credit ₹${exchangeApplied.totalSavings?.toLocaleString()} Approved`
                            : `Trade-in Registered · Estimated savings ₹${exchangeApplied.totalSavings?.toLocaleString()}`}
                        </div>
                      )}

                      {/* Prominent Action Buttons: Add to Cart & Buy Now */}
                      <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                        <button 
                          type="button"
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
                          className="w-full sm:w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-3.5 rounded-2xl transition-all text-xs cursor-pointer shadow-2xs active:scale-98 flex items-center justify-center gap-2"
                        >
                          <ShoppingCart size={16} /> Add to Cart
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            const productExchange = isCurrentExchangeApplied ? { ...exchangeApplied, productId: finalProduct.id } : null;
                            replaceCart([{ ...finalProduct, qty: 1, category: finalCategory, exchange: productExchange }]);
                            navigate('/buy-new/address');
                          }}
                          className="w-full sm:w-1/2 bg-[#0D47A1] hover:bg-blue-800 text-white font-black py-3.5 rounded-2xl transition-all shadow-md text-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2"
                        >
                          <Zap size={16} fill="currentColor" /> Buy Now
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 4. PINCODE DELIVERY & INSTALLATION CHECKER */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={16} className="text-[#0D47A1]" /> Check Delivery & Installation
                </h3>
                <span className="text-[11px] font-bold text-slate-400">Doorstep Delivery</span>
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="Enter 6-digit Pincode (e.g. 110001)"
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] transition-all font-mono"
                  value={pincodeInput}
                  onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  type="submit"
                  className="bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-xs"
                >
                  Check
                </button>
              </form>

              {pincodeStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  pincodeStatus.valid 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {pincodeStatus.message}
                </div>
              )}
            </div>

            {/* 5. 4-CARD SERVICE ASSURANCE GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { title: 'Free Doorstep Setting', desc: 'Certified Installation', Icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { title: `${finalProduct.warrantyMonths || 12}M Brand Warranty`, desc: 'Genuine Assurance', Icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                { title: '7 Days Replacement', desc: 'Easy Return Policy', Icon: RefreshCw, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                { title: 'Pay on Delivery', desc: 'Cash / UPI Available', Icon: Percent, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-2xs">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                    <item.Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-tight">{item.title}</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 6. OLD APPLIANCE EXCHANGE OFFER SECTION */}
            {isExchangeActiveForProduct && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0D47A1]">
                      <RefreshCw size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">Exchange Your Old Device</h4>
                      <span className="text-[10px] font-bold text-slate-400">Save big on your appliance upgrade</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#0D47A1] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    Up to ₹{productExchangeConfig?.maxVal?.toLocaleString()} off
                  </span>
                </div>

                {!isCurrentExchangeApplied ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setIsExchangeModalOpen(true)}
                      className="w-full bg-white border-2 border-[#0D47A1] hover:bg-blue-50/40 text-[#0D47A1] font-black py-3 rounded-2xl transition-all text-xs cursor-pointer text-center"
                    >
                      Check Exchange Value for Old Appliance
                    </button>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      * Pickup and inspection of old device will happen simultaneously at doorstep delivery.
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black text-emerald-900 block">
                            {exchangeApplied.status === 'Inspection Approved' ? 'Exchange Credit Approved' : 'Trade-in Registered'}
                          </span>
                          <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                            {exchangeApplied.brand} {exchangeApplied.model}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-700">
                        {exchangeApplied.status === 'Inspection Approved' ? '- ' : '≈ '}
                        ₹{exchangeApplied.totalSavings?.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2.5 border-t border-emerald-200/60 pt-3">
                      <button
                        onClick={() => setIsExchangeModalOpen(true)}
                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Change Exchange
                      </button>
                      <button
                        onClick={() => setExchangeApplied(null)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Remove Exchange
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. PRODUCT HIGHLIGHTS & SPECIFICATIONS */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck size={16} className="text-[#0D47A1]" /> Product Highlights & Specifications
              </h3>

              {/* Basic Appliance Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">Appliance Category</span>
                  <span className="text-slate-900 font-black">{finalCategory}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">Brand Name</span>
                  <span className="text-slate-900 font-black">{finalProduct.brand || 'Standard'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">Item Condition</span>
                  <span className="text-slate-900 font-black">{finalProduct.condition || 'Brand New'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">Warranty Coverage</span>
                  <span className="text-slate-900 font-black">{finalProduct.warrantyMonths ? `${finalProduct.warrantyMonths} Months` : '1 Year'}</span>
                </div>
              </div>

              {/* User-Friendly Key Feature Highlights */}
              {finalProduct.specs && finalProduct.specs.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
                    Key Feature Highlights
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {finalProduct.specs.map((spec, sIdx) => {
                      let label = "Key Feature";
                      if (/Ton|Litre|Litres|Kg|Inch/i.test(spec)) label = "Capacity & Size";
                      else if (/Star/i.test(spec)) label = "Energy Rating";
                      else if (/Inverter|RO|UV|4K|OS/i.test(spec)) label = "Technology";
                      else if (/Copper|Door|Mount|Material/i.test(spec)) label = "Material & Build";

                      return (
                        <div key={sIdx} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/60">
                          <span className="text-slate-500 font-bold">{label}</span>
                          <span className="text-slate-900 font-black flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600" /> {spec}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 8. CUSTOMER RATINGS, REVIEWS & UPLOADED PHOTOS */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs space-y-6">
              {/* Header with Write a Review Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Star size={18} fill="#EAB308" className="text-yellow-500" /> Customer Ratings & Reviews
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Verified customer feedback & real appliance photos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWriteReviewOpen(true)}
                  className="bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Plus size={14} /> Write a Review
                </button>
              </div>

              {/* Ratings Summary & Star Distribution Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/70 p-4 md:p-5 rounded-2xl border border-slate-200/70">
                {/* Overall Score Box */}
                <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/80 pb-4 md:pb-0 md:pr-4 text-center">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">
                    {reviewStats.avgRating || 4.8}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-500 my-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    Based on {reviewStats.totalRatings || 128} Ratings
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {reviewStats.totalReviews || productReviews.length} Verified Buyer Reviews
                  </span>
                </div>

                {/* Rating Distribution Progress Bars */}
                <div className="col-span-2 space-y-1.5 justify-center flex flex-col">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const pct = reviewStats.starsBreakdown?.[star] ?? (star === 5 ? 78 : star === 4 ? 16 : 4);
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-slate-600 w-10 shrink-0">{star} ★</span>
                        <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-500 w-10 text-right shrink-0">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customer Uploaded Photos Gallery */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Customer Uploaded Photos ({customerPhotos.length > 0 ? customerPhotos.length : 'Real User Photos'})</span>
                  <span className="text-[10px] font-bold text-slate-400">Click photo to zoom</span>
                </h4>

                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
                  {(customerPhotos.length > 0 ? customerPhotos : [
                    finalProduct.imageUrl || getApplianceImg(finalCategory),
                    splitAcImg,
                    fridgeImg,
                    waterPurifierImg
                  ]).map((imgUrl, pIdx) => (
                    <div 
                      key={pIdx}
                      onClick={() => setActiveLightboxImg(imgUrl)}
                      className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden cursor-pointer hover:border-[#0D47A1] hover:scale-105 transition-all shadow-2xs group relative"
                    >
                      <img src={imgUrl} className="w-full h-full object-cover rounded-lg" alt="Customer Photo" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Search size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Buyer Reviews List */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Verified Customer Reviews
                </h4>

                <div className="space-y-3">
                  {(productReviews.length > 0 ? productReviews : [
                    {
                      id: 'demo-1',
                      user: { name: 'Rajesh Sharma' },
                      rating: 5,
                      comment: 'Awesome cooling performance! Delivery was super quick and the certified engineer completed installation within 2 hours of delivery.',
                      photos: [finalProduct.imageUrl || getApplianceImg(finalCategory)],
                      createdAt: new Date().toISOString()
                    },
                    {
                      id: 'demo-2',
                      user: { name: 'Priya Verma' },
                      rating: 5,
                      comment: 'Very quiet operation and low energy consumption. Highly recommended product!',
                      photos: [],
                      createdAt: new Date().toISOString()
                    }
                  ]).map((rev, rIdx) => (
                    <div key={rev.id || rIdx} className="p-4 bg-slate-50/60 border border-slate-200/70 rounded-2xl space-y-2.5">
                      {/* Reviewer Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0D47A1] font-black text-xs flex items-center justify-center">
                            {(rev.user?.name || 'Customer').charAt(0)}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block leading-tight">
                              {rev.user?.name || 'Verified Customer'}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              ✓ Verified Buyer
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-black">
                          <span>{rev.rating || 5}</span>
                          <Star size={9} fill="currentColor" />
                        </div>
                      </div>

                      {/* Comment text */}
                      <p className="text-xs font-medium text-slate-700 leading-relaxed">
                        {rev.comment || 'Great product quality and excellent delivery experience!'}
                      </p>

                      {/* Attached Customer Photos */}
                      {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {rev.photos.map((photo, phIdx) => (
                            <img 
                              key={phIdx} 
                              src={photo} 
                              onClick={() => setActiveLightboxImg(photo)}
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90"
                              alt="Review attachment" 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 9. SIMILAR & RECOMMENDED PRODUCTS */}
            {similarProducts.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Sparkles size={18} className="text-[#0D47A1]" /> Similar & Recommended Products
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Explore top-rated appliances matching your interest
                    </p>
                  </div>
                </div>

                {/* Cards Container: Single Horizontal Scroll Row (Hidden Scrollbar) */}
                <div className="flex flex-row overflow-x-auto gap-3 md:gap-4 scroll-smooth snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {similarProducts.map((p, idx) => {
                    const originalPriceNum = Number(p.originalPrice) || Number(p.mrp) || (p.price ? Math.round(p.price * 1.25) : 0);
                    const discountPercent = originalPriceNum > p.price 
                      ? Math.round(((originalPriceNum - p.price) / originalPriceNum) * 100)
                      : 0;

                    // Dynamic delivery date estimate (e.g. 4 Sep, 8 Sep)
                    const deliverDate = new Date(Date.now() + (idx + 2) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

                    return (
                      <div
                        key={p.id || idx}
                        onClick={() => handleSelectSimilarProduct(p)}
                        className="w-48 sm:w-52 md:w-56 shrink-0 snap-start flex flex-col text-left cursor-pointer group transition-all"
                      >
                        {/* Grey Image Container Card with Badges & Rating */}
                        <div className="relative w-full h-44 sm:h-48 bg-[#f2f4f7] rounded-2xl p-3 flex items-center justify-center overflow-hidden mb-2.5">
                          {/* Top-Left Trending Badge */}
                          {idx % 2 === 1 && (
                            <span className="absolute top-2 left-2 text-[10px] font-black text-white bg-[#F95F06] px-2 py-0.5 rounded-md shadow-xs">
                              Trending
                            </span>
                          )}

                          {/* Top-Right AD Badge */}
                          <span className="absolute top-2 right-2 text-[9px] font-extrabold text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            AD
                          </span>

                          {/* Product Image */}
                          <img
                            src={p.imageUrl || getApplianceImg(p.category || finalCategory)}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                          />

                          {/* Bottom-Left Floating Rating Badge */}
                          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-1">
                            <span className="text-xs font-black text-slate-800">{p.rating || 4.2}</span>
                            <Star size={11} fill="#059669" className="text-emerald-600" />
                          </div>
                        </div>

                        {/* Details below image card */}
                        <div className="space-y-1 px-0.5">
                          {/* Title */}
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0D47A1] transition-colors line-clamp-1 leading-snug">
                            {p.name}
                          </h4>

                          {/* Discount Percentage */}
                          {discountPercent > 0 && (
                            <span className="text-xs font-extrabold text-emerald-700 block leading-tight">
                              {discountPercent}% OFF
                            </span>
                          )}

                          {/* Price Row: Crossed out MRP + Selling Price */}
                          <div className="flex items-center gap-1.5">
                            {originalPriceNum > p.price && (
                              <span className="text-xs text-slate-400 line-through font-medium">
                                ₹{originalPriceNum.toLocaleString()}
                              </span>
                            )}
                            <span className="text-sm font-black text-slate-900">
                              ₹{p.price.toLocaleString()}
                            </span>
                          </div>

                          {/* Hot Deal Tag */}
                          <span className="text-[11px] font-extrabold text-emerald-700 block">
                            Hot Deal
                          </span>

                          {/* Delivery Date Tag */}
                          <span className="text-[11px] font-medium text-slate-500 block">
                            Get it by <strong className="font-bold text-slate-700">{deliverDate}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 8. FIXED STICKY BOTTOM ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-4 z-40 shadow-2xl">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Price</span>
                  <span className="text-xl font-black text-slate-900">₹{finalProduct.price.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3">
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
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-5 py-3 rounded-2xl transition-all text-xs cursor-pointer active:scale-98"
                  >
                    Add to Cart
                  </button>
                  <button 
                    onClick={() => {
                      const productExchange = isCurrentExchangeApplied ? { ...exchangeApplied, productId: finalProduct.id } : null;
                      replaceCart([{ ...finalProduct, qty: 1, category: finalCategory, exchange: productExchange }]);
                      navigate('/buy-new/address');
                    }}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-md text-xs cursor-pointer active:scale-98"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          )
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

                  {/* Checkout Button */}
                  <button 
                    onClick={() => navigate('/buy-new/address')}
                    className="w-full bg-[#0B4EA2] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-2 cursor-pointer active:scale-98"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 5: DELIVERY ADDRESS ── */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-12 text-left"
          >
            {/* Checkout Progress Stepper */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between max-w-sm mx-auto">
                <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Cart</span>
                </div>
                <div className="flex-1 h-0.5 bg-emerald-200 mx-2"></div>
                <div className="flex items-center gap-1.5 text-[#0D47A1] font-black text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-[#0D47A1] text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-blue-100">
                    2
                  </div>
                  <span>Address</span>
                </div>
                <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>
                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">
                    3
                  </div>
                  <span>Payment</span>
                </div>
              </div>
            </div>

            {/* Header & Assurance */}
            <div className="flex items-center justify-between px-1 -mt-1">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Select Delivery Address</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Where should we deliver your order?</p>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full text-[10px] font-black text-[#0D47A1]">
                <Truck size={13} />
                <span>Free Express Delivery</span>
              </div>
            </div>

            {/* Form Error Notice */}
            {addressFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in">
                <span>{addressFormError}</span>
                <button onClick={() => setAddressFormError('')} className="text-red-400 hover:text-red-700 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Saved Addresses List */}
            {loadingAddresses ? (
              <div className="space-y-3">
                <div className="h-24 bg-slate-100 animate-pulse rounded-2xl"></div>
                <div className="h-24 bg-slate-100 animate-pulse rounded-2xl"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Saved Addresses ({savedAddresses.length})
                      </span>
                      {!showAddAddressForm && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAddressForm(true);
                            setAddressFormError('');
                          }}
                          className="text-xs font-bold text-[#0D47A1] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} /> Add New Address
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {savedAddresses.map((addr) => {
                        const addrId = addr._id || addr.id;
                        const isSelected = selectedAddressId === addrId;
                        return (
                          <div
                            key={addrId}
                            onClick={() => handleSelectAddress(addr)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex items-start gap-3.5 ${
                              isSelected
                                ? 'border-[#0D47A1] bg-blue-50/50 shadow-sm ring-2 ring-blue-500/10'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="pt-0.5">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-[#0D47A1] bg-[#0D47A1] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check size={12} className="stroke-[3]" />}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">
                                  {addr.name || user?.name || 'Customer'}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {addr.type === 'Work' ? <Briefcase size={10} /> : <HomeIcon size={10} />}
                                  {addr.type || 'Home'}
                                </span>
                                {addr.isDefault && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    DEFAULT
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                                {addr.house}{addr.landmark ? `, ${addr.landmark}` : ''}, {addr.city} - {addr.pincode}
                              </p>

                              {(addr.phone || user?.phone) && (
                                <p className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                                  <Phone size={11} className="text-slate-400" /> {addr.phone || user?.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add New Address Form */}
                {(!savedAddresses.length || showAddAddressForm) && (
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
                          <Plus size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            {savedAddresses.length > 0 ? 'Add Another Address' : 'Add Delivery Address'}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">Enter recipient and delivery location details</p>
                        </div>
                      </div>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAddressForm(false);
                            setAddressFormError('');
                          }}
                          className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveNewAddress} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Recipient Full Name *
                          </label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rahul Sharma"
                              value={addressForm.name}
                              onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            10-Digit Mobile Number *
                          </label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="e.g. 9876543210"
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Flat, House No., Building, Apartment *
                        </label>
                        <div className="relative">
                          <HomeIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Flat 302, Green Valley Apartments"
                            value={addressForm.house}
                            onChange={(e) => setAddressForm({ ...addressForm, house: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Street, Area, Landmark (Optional)
                        </label>
                        <div className="relative">
                          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. Near Vijay Nagar Square, AB Road"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            City / District *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Indore"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Pincode *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="e.g. 452010"
                            value={addressForm.pincode}
                            onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1] focus:ring-2 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      {/* Address Type Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Address Type
                        </label>
                        <div className="flex gap-2">
                          {[
                            { label: 'Home', icon: HomeIcon },
                            { label: 'Work', icon: Briefcase },
                            { label: 'Other', icon: Building },
                          ].map(({ label, icon: Icon }) => {
                            const isSelected = addressForm.type === label;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setAddressForm({ ...addressForm, type: label })}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#0D47A1] text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <Icon size={13} /> {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Save to profile checkbox */}
                      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={saveToProfile}
                          onChange={(e) => setSaveToProfile(e.target.checked)}
                          className="w-4 h-4 text-[#0D47A1] rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Save this address to my profile for future orders
                        </span>
                      </label>

                      <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAddressForm(false);
                              setAddressFormError('');
                            }}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingAddress}
                          className="px-5 py-2.5 text-xs font-bold bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                          {savingAddress ? 'Saving Address…' : 'Use This Address'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Order Summary & Proceed Action */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-slate-100 pb-2.5">
                <span>Items ({cart.reduce((sum, item) => sum + item.qty, 0)})</span>
                <span className="text-slate-900 font-black">₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-slate-100 pb-2.5">
                <span>Delivery & Handling</span>
                <span className="text-emerald-600 font-black">FREE</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-slate-900">
                <span>Total Payable</span>
                <span className="text-base text-[#0D47A1]">₹{cartTotal.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={!selectedAddress}
                className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-1 cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Deliver Here & Continue to Payment</span>
                <ChevronRight size={17} />
              </button>

              {!selectedAddress && (
                <p className="text-[11px] text-amber-600 font-bold text-center">
                  ⚠️ Please select or add a delivery address above to continue.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: PAYMENT ── */}
        {step === 6 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-12 text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-1 -mt-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Choose Payment</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Select how you'd like to pay</p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full text-[10px] font-black text-emerald-700">
                <ShieldCheck size={13} />
                <span>Secure & Safe</span>
              </div>
            </div>

            {/* Delivery Address Review Card */}
            {selectedAddress && (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Deliver to: {selectedAddress.name || user?.name || 'Customer'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {selectedAddress.type || 'Home'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      {selectedAddress.house}{selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ''}, {selectedAddress.city} - {selectedAddress.pincode}
                    </p>
                    {(selectedAddress.phone || user?.phone) && (
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        Phone: {selectedAddress.phone || user?.phone}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/buy-new/address')}
                  className="text-xs font-black text-[#0D47A1] hover:underline px-2.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            {/* Order Summary Mini Card */}
            {cart.length > 0 && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-blue-300 block">Order Summary</span>
                      <span className="text-xs font-black text-white">{cart.length} Item{cart.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-[#FFD400]">₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-1.5">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-slate-300 font-medium">
                      <span className="truncate max-w-[200px] font-bold text-white">{item.name}</span>
                      <span>₹{item.price.toLocaleString()} x {item.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                  <span className="flex items-center gap-1">✓ Free Delivery Included</span>
                  <span className="bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-300">Instant Dispatch</span>
                </div>
              </div>
            )}

            {/* ─── 2-Option Payment Cards ─── */}
            <div className="space-y-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block px-1">Select Payment Method</span>

              {/* Option 1 — Pay on Delivery */}
              <div
                id="pay-on-delivery-option"
                onClick={() => setPaymentMode('COD')}
                className={`bg-white rounded-3xl p-5 transition-all shadow-xs cursor-pointer border-2 relative overflow-hidden ${
                  paymentMode === 'COD'
                    ? 'border-[#FF6B35] bg-gradient-to-r from-orange-50/80 via-amber-50/40 to-white ring-4 ring-orange-100'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {paymentMode === 'COD' && (
                  <div className="absolute top-0 right-0 bg-[#FF6B35] text-white text-[9px] font-black px-3 py-1 rounded-bl-2xl">SELECTED</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                      paymentMode === 'COD' ? 'bg-[#FF6B35] text-white' : 'bg-orange-50 text-orange-500'
                    }`}>
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">Pay on Delivery</span>
                        <span className="bg-orange-100 text-orange-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-orange-200">No Advance</span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                        Pay cash when your order arrives at your door
                      </span>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    paymentMode === 'COD' ? 'border-[#FF6B35] bg-[#FF6B35] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'COD' && <Check size={14} className="stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Option 2 — Pay Online */}
              <div
                id="pay-online-option"
                onClick={() => setPaymentMode('Online')}
                className={`bg-white rounded-3xl p-5 transition-all shadow-xs cursor-pointer border-2 relative overflow-hidden ${
                  paymentMode === 'Online'
                    ? 'border-[#0D47A1] bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white ring-4 ring-blue-100'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {paymentMode === 'Online' && (
                  <div className="absolute top-0 right-0 bg-[#0D47A1] text-white text-[9px] font-black px-3 py-1 rounded-bl-2xl">SELECTED</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                      paymentMode === 'Online' ? 'bg-[#0D47A1] text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Zap className="h-6 w-6" fill={paymentMode === 'Online' ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">Pay Online</span>
                        <span className="bg-blue-100 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-blue-200">Instant</span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                        UPI, Cards, NetBanking via Razorpay
                      </span>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    paymentMode === 'Online' ? 'border-[#0D47A1] bg-[#0D47A1] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {paymentMode === 'Online' && <Check size={14} className="stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {orderError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl flex items-center justify-between">
                <span>{orderError}</span>
                <button onClick={() => setOrderError('')} className="text-red-400 hover:text-red-700">✕</button>
              </div>
            )}

            {/* Price Details Breakdown */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Price Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Price ({cart.length} item{cart.length > 1 ? 's' : ''})</span>
                  <span>₹{cartSubtotalBeforeExchange.toLocaleString()}</span>
                </div>
                {approvedExchangeSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Trade-in Discount</span>
                    <span>- ₹{approvedExchangeSavings.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>Delivery Charges</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-[#0D47A1]">₹{cartTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <div className="pt-2">
              <button
                id="place-order-btn"
                disabled={placingOrder}
                onClick={() => handlePlaceOrder(paymentMode)}
                className={`w-full py-4 rounded-2xl text-white text-sm font-black shadow-lg transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 ${
                  paymentMode === 'COD'
                    ? 'bg-gradient-to-r from-[#FF6B35] to-[#E85D04] hover:from-[#E85D04] hover:to-[#D94E00]'
                    : 'bg-gradient-to-r from-[#0D47A1] to-[#1565C0] hover:from-[#0B3C88] hover:to-[#0D47A1]'
                }`}
              >
                {placingOrder ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Order…</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>
                      {paymentMode === 'COD' ? `Confirm Order • ₹${cartTotal.toLocaleString()}` : `Pay ₹${cartTotal.toLocaleString()} Online`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: ORDER SUCCESS ── */}
        {step === 7 && (
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
                  <span className="font-mono tracking-wider font-semibold">{placedOrder?.humanId || placedOrder?.id || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Processing
                  </span>
                </div>
                {selectedAddress && (
                  <div className="flex justify-between items-start pt-1 border-t border-white/10">
                    <span className="text-white/60">Delivering To:</span>
                    <span className="font-semibold text-right max-w-[200px] truncate text-white">
                      {selectedAddress.name || 'Customer'}, {selectedAddress.city} ({selectedAddress.pincode})
                    </span>
                  </div>
                )}
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
      <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl overflow-visible lg:hidden ${step === 3 || step === 5 || step === 6 ? 'hidden' : ''}`}>
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

      {/* ── PHOTO LIGHTBOX PREVIEW MODAL ── */}
      {activeLightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-12 right-0 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <img src={activeLightboxImg} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" alt="Customer Lightbox Preview" />
          </div>
        </div>
      )}

      {/* ── WRITE A REVIEW MODAL ── */}
      {isWriteReviewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-800">Write Product Review</h3>
              <button 
                onClick={() => setIsWriteReviewOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-left">
              {/* Star Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Select Rating Score
                </label>
                <div className="flex gap-2 text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRatingVal(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star 
                        size={24} 
                        fill={star <= newRatingVal ? "currentColor" : "none"} 
                        className={star <= newRatingVal ? "text-yellow-400" : "text-slate-300"} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Your Review & Experience
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Share your experience with product quality, cooling, and delivery..."
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-[#0D47A1]"
                  value={newCommentVal}
                  onChange={(e) => setNewCommentVal(e.target.value)}
                />
              </div>

              {/* Upload Photo Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Upload Product Photo (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/20 cursor-pointer relative">
                  {newReviewPhoto ? (
                    <div className="relative w-full h-20 flex items-center justify-center">
                      <img src={newReviewPhoto} className="h-full rounded-lg object-contain" alt="Preview" />
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setNewReviewPhoto(null); }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-[#0D47A1] mb-1" />
                      <span className="text-xs text-slate-600 font-bold">Click to attach photo</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewReviewPhoto(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsWriteReviewOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 text-xs font-bold bg-[#0D47A1] hover:bg-blue-800 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BuyNew;
