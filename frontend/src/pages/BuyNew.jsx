import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingCart,
  ChevronRight,
  Check,
  Search,
  Wrench,
  Percent,
  Lock,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ChevronLeft,
  Zap,
  CheckCircle2,
  Home as HomeIcon,
  User,
  RefreshCw,
  Heart,
  Star,
  ChevronDown,
  SlidersHorizontal,
  Truck,
  Package,
  X,
  UploadCloud,
  Sparkles,
  MapPin,
  Building,
  Briefcase,
  Phone,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomerBottomNav from "../components/CustomerBottomNav";
import { apiRequest } from "../lib/apiClient";
import { useCart } from "../lib/cartStore";
import { payWithRazorpay } from "../lib/razorpayCheckout";
import { useAuth } from "../context/AuthContext";

// Import Exchange Modal & Configs
import { initializeExchangeConfigs } from "../data/exchangeMockData";
import ExchangeModal from "../components/exchange/ExchangeModal";

// Import assets
import fridgeImg from "../assets/appliance_fridge.png";
import washingImg from "../assets/categories/wasing.png";
import splitAcImg from "../assets/categories/split_ac.png";
import waterPurifierImg from "../assets/categories/water_purifier.png";
import tvImg from "../assets/categories/television.png";
import geyserImg from "../assets/icon_3d_geyser.png";
import ovenImg from "../assets/icon_3d_oven.png";
import { uploadImage } from "../lib/uploadImage";

// Helper to map category names to images
function getApplianceImg(category) {
  const n = category?.toLowerCase() || "";
  if (n.includes("television") || n.includes("tv")) return tvImg;
  if (n.includes("refrigerator") || n.includes("fridge")) return fridgeImg;
  if (n.includes("washing") || n.includes("machine")) return washingImg;
  if (n.includes("ac") || n.includes("conditioner") || n.includes("air"))
    return splitAcImg;
  if (n.includes("purifier") || n.includes("water")) return waterPurifierImg;
  if (n.includes("geyser")) return geyserImg;
  if (n.includes("microwave") || n.includes("oven")) return ovenImg;
  return tvImg;
}

const BuyNew = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Derive step from pathname
  const pathname = location.pathname;
  let step = 1;
  if (
    pathname.includes("/buy-new/products") ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/product/")
  )
    step = 2;
  else if (pathname.includes("/buy-new/details")) step = 3;
  else if (pathname.includes("/buy-new/cart")) step = 4;
  else if (
    pathname.includes("/buy-new/checkout") ||
    pathname.includes("/buy-new/address")
  )
    step = 5;
  else if (pathname.includes("/buy-new/payment")) step = 6;
  else if (pathname.includes("/buy-new/success")) step = 7;

  // Retrieve parameters from URL
  const categoryParam = params.category
    ? decodeURIComponent(params.category)
    : null;
  const productNameParam = params.productName
    ? decodeURIComponent(params.productName)
    : null;
  const searchParams = new URLSearchParams(location.search);
  const brandParam = searchParams.get("brand");
  if (brandParam && (pathname === "/buy-new" || pathname === "/buy-new/")) {
    step = 2;
  }

  // Dynamic Categories and Brands from API
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicBrandList, setDynamicBrandList] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  useEffect(() => {
    apiRequest("/product-categories")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDynamicCategories(res);
        }
      })
      .catch(() => {});

    apiRequest("/catalog/brands")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDynamicBrandList(res.map((b) => b.name));
        }
      })
      .catch(() => {});
  }, []);

  // Categories list matching dynamic API categories with asset image fallback
  const categoriesList =
    dynamicCategories.length > 0
      ? dynamicCategories.map((c) => ({
          name: c.name,
          slug: c.slug,
          img: getApplianceImg(c.name),
          icon: c.icon || "📦",
        }))
      : [
          { name: "Television", img: tvImg },
          { name: "Refrigerator", img: fridgeImg },
          { name: "Washing Machine", img: washingImg },
          { name: "Air Conditioner", img: splitAcImg },
          { name: "Water Purifier", img: waterPurifierImg },
          { name: "Geyser", img: geyserImg },
          { name: "Microwave Oven", img: ovenImg },
        ];

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
  const finalCategory =
    categoryParam || (brandParam ? "All" : "Water Purifier");

  // The catalogue is maintained in the admin console and served from /products —
  // it used to be a hardcoded object here, which meant the storefront never
  // reflected anything an admin actually did.
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true);
    const endpoint =
      finalCategory === "All"
        ? "/products?limit=100"
        : `/products?category=${encodeURIComponent(finalCategory)}&limit=100`;
    apiRequest(endpoint)
      .then((res) => {
        if (cancelled) return;
        setCategoryProducts(res || []);
        setProductsError("");
      })
      .catch((err) => {
        if (!cancelled)
          setProductsError(err.message || "Could not load products.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finalCategory]);

  // Wishlist, Sort, and Filter States
  const [wishlist, setWishlist] = useState([]);
  useEffect(() => {
    apiRequest("/wishlist", { auth: true })
      .then((res) => setWishlist(res || []))
      .catch((err) => console.warn("[wishlist] Could not load:", err.message));
  }, []);

  // Sort By drawer and Filter page states
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterPage, setShowFilterPage] = useState(false);
  const [sortOption, setSortOption] = useState("relevance"); // 'relevance' | 'popularity' | 'low-to-high' | 'high-to-low' | 'newest'
  const [selectedBrands, setSelectedBrands] = useState(() =>
    brandParam ? [brandParam] : [],
  );
  const [tempSelectedBrands, setTempSelectedBrands] = useState(() =>
    brandParam ? [brandParam] : [],
  );
  const [searchBrandQuery, setSearchBrandQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'discount' | 'inStock'

  useEffect(() => {
    if (brandParam) {
      setSelectedBrands([brandParam]);
      setTempSelectedBrands([brandParam]);
    }
  }, [brandParam]);

  // Dynamic Product Reviews & Customer Photos State
  const [productReviews, setProductReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    avgRating: 0,
    totalRatings: 0,
    totalReviews: 0,
    starsBreakdown: {},
  });
  const [customerPhotos, setCustomerPhotos] = useState([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newRatingVal, setNewRatingVal] = useState(5);
  const [newCommentVal, setNewCommentVal] = useState("");
  const [newReviewPhoto, setNewReviewPhoto] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Derived selected product for details step
  const decodedProductName = productNameParam
    ? decodeURIComponent(productNameParam)
    : "";
  const finalProduct =
    categoryProducts.find(
      (p) =>
        p.name === decodedProductName ||
        p.name === productNameParam ||
        p.id === productNameParam,
    ) ||
    categoryProducts[0] ||
    null;
  const isFinalProductInCart =
    !!finalProduct && cart.some((item) => item.id === finalProduct.id);

  // All Products state for Recommendations Backfill
  const [allProducts, setAllProducts] = useState([]);
  useEffect(() => {
    apiRequest("/products?limit=100")
      .then((res) => setAllProducts(res || []))
      .catch((err) =>
        console.warn("[all-products] Could not load:", err.message),
      );
  }, []);

  // Dynamic Similar Products Recommendation Calculation
  const similarProducts = React.useMemo(() => {
    if (!finalProduct) return [];
    const sameCat = categoryProducts.filter(
      (p) => p.id !== finalProduct.id && p.name !== finalProduct.name,
    );
    if (sameCat.length >= 4) return sameCat.slice(0, 4);

    const others = allProducts.filter(
      (p) =>
        p.id !== finalProduct.id &&
        p.name !== finalProduct.name &&
        !sameCat.some((sc) => sc.id === p.id),
    );
    return [...sameCat, ...others].slice(0, 4);
  }, [categoryProducts, finalProduct, allProducts]);

  const handleSelectSimilarProduct = (product) => {
    const targetCat = product.category || finalCategory;
    navigate(
      `/buy-new/details/${encodeURIComponent(targetCat)}/${encodeURIComponent(product.name)}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        .catch((err) =>
          console.warn("[product-reviews] Could not load:", err.message),
        );
    }
  }, [finalProduct?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!finalProduct?.id) return;
    setSubmittingReview(true);
    try {
      const res = await apiRequest("/reviews/product", {
        method: "POST",
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
      setNewCommentVal("");
      setNewReviewPhoto(null);
      setNewRatingVal(5);
    } catch (err) {
      alert(err.message || "Could not submit review. Please log in first.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleWishlist = async (product, e) => {
    e.stopPropagation();
    const exists = wishlist.some((p) => p.id === product.id);
    try {
      const res = await apiRequest(`/wishlist/${product.id}`, {
        method: exists ? "DELETE" : "POST",
        auth: true,
      });
      setWishlist(res || []);
    } catch (err) {
      console.error("[wishlist] Could not update:", err.message);
    }
  };

  const sortedAndFilteredProducts = React.useMemo(() => {
    let list = [...categoryProducts];

    // Apply Brand filter
    if (selectedBrands.length > 0) {
      list = list.filter((product) =>
        selectedBrands.some(
          (brand) =>
            (product.name &&
              product.name.toLowerCase().includes(brand.toLowerCase())) ||
            (product.brand &&
              product.brand.toLowerCase().includes(brand.toLowerCase())),
        ),
      );
    }

    // Both filters read real product fields. They used to select by even/odd
    // index, so "Top Sale Discounts" showed full-price items and the chip state
    // told the customer nothing about the products behind it.
    if (activeFilter === "discount") {
      list = list.filter((p) => p.originalPrice > p.price);
    } else if (activeFilter === "inStock") {
      list = list.filter((p) => (p.stock ?? 0) > 0);
    }

    // Apply sorting
    if (sortOption === "low-to-high") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOption === "high-to-low") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOption === "popularity") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === "newest") {
      list.reverse();
    }

    return list;
  }, [categoryProducts, sortOption, activeFilter, selectedBrands]);

  // Never drops the line: a decrement at qty 1 is a no-op here, same as before —
  // removal is its own explicit action.
  const updateQty = (id, delta) => {
    const existing = cart.find((item) => item.id === id);
    if (existing && existing.qty + delta > 0) adjustQty(id, delta);
  };

  const removeFromCart = (id) => {
    removeCartItem(id);
  };

  // Removing an item (or clearing the whole cart) used to happen the instant
  // the trash icon was tapped — a single mis-tap silently wiped the item with
  // no way back. Both actions now go through this shared confirm step:
  // { type: 'remove', item } | { type: 'clear' } | null.
  const [cartRemovalConfirm, setCartRemovalConfirm] = useState(null);

  const [paymentMode, setPaymentMode] = useState("COD"); // 'COD' | 'Online'
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // "Add to Cart" feedback: a toast + an image that flies from the product
  // photo to the header cart icon, instead of immediately navigating to
  // /buy-new/cart (which used to yank the customer off the page they were
  // just looking at every single time).
  const productImageRef = useRef(null);
  const cartIconRef = useRef(null);
  const [addedToastVisible, setAddedToastVisible] = useState(false);
  const [flyImg, setFlyImg] = useState(null);
  const addedToastTimeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(addedToastTimeoutRef.current);
  }, []);

  const triggerAddToCartFeedback = () => {
    if (productImageRef.current && cartIconRef.current) {
      const startRect = productImageRef.current.getBoundingClientRect();
      const endRect = cartIconRef.current.getBoundingClientRect();
      setFlyImg({
        src: productImageRef.current.src,
        startTop: startRect.top,
        startLeft: startRect.left,
        startWidth: startRect.width,
        startHeight: startRect.height,
        endTop: endRect.top + endRect.height / 2 - 10,
        endLeft: endRect.left + endRect.width / 2 - 10,
      });
    }
    setAddedToastVisible(true);
    clearTimeout(addedToastTimeoutRef.current);
    addedToastTimeoutRef.current = setTimeout(
      () => setAddedToastVisible(false),
      2200,
    );
  };

  const handleAddToCart = () => {
    if (!finalProduct) return;
    const productExchange = isCurrentExchangeApplied ? exchangeApplied : null;
    addCartItem(finalProduct, {
      category: finalCategory,
      ...(productExchange
        ? { exchange: { ...productExchange, productId: finalProduct.id } }
        : {}),
    });
    triggerAddToCartFeedback();
  };

  // Exchange states
  const [exchangeConfigs, setExchangeConfigs] = useState({});
  const [exchangeApplied, setExchangeApplied] = useState(() => {
    const saved = localStorage.getItem("nigam_applied_exchange");
    return saved ? JSON.parse(saved) : null;
  });
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  useEffect(() => {
    initializeExchangeConfigs()
      .then(setExchangeConfigs)
      .catch((err) =>
        console.warn("[exchange] Could not load configs:", err.message),
      );
  }, [location.pathname]); // Reload configuration on navigation/renders

  useEffect(() => {
    if (exchangeApplied) {
      localStorage.setItem(
        "nigam_applied_exchange",
        JSON.stringify(exchangeApplied),
      );
    } else {
      localStorage.removeItem("nigam_applied_exchange");
    }
  }, [exchangeApplied]);

  // Active configuration for selected product
  const productExchangeConfig = exchangeConfigs[finalProduct?.id];
  const isExchangeActiveForProduct = productExchangeConfig?.exchangeEnabled;
  const isCurrentExchangeApplied =
    exchangeApplied && exchangeApplied.productId === finalProduct?.id;

  // Cart pricing details.
  //
  // A trade-in is only honoured once a super-admin has physically inspected the
  // device (order.service.js refuses the discount otherwise), so the amount
  // payable today is the full price. This used to subtract the estimate from
  // the total on screen while the order was still priced at full — the customer
  // was quoted less than they would have been charged.
  const cartSubtotalBeforeExchange = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const approvedExchangeSavings = cart.reduce(
    (sum, item) =>
      sum +
      (item.exchange?.status === "Inspection Approved"
        ? item.exchange.totalSavings * item.qty
        : 0),
    0,
  );
  const pendingExchangeSavings = cart.reduce(
    (sum, item) =>
      sum +
      (item.exchange && item.exchange.status !== "Inspection Approved"
        ? item.exchange.totalSavings * item.qty
        : 0),
    0,
  );
  const cartSubtotal = cartSubtotalBeforeExchange - approvedExchangeSavings;
  const deliveryCharges = 0;
  const cartTotal = cartSubtotal + deliveryCharges;

  const placedOrder = location.state?.order || null;
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  // ── Delivery Address & Checkout Management ──
  const { user, updateUser } = useAuth();
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ncc_selected_checkout_address");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [addressForm, setAddressForm] = useState({
    name: "",
    phone: "",
    house: "",
    landmark: "",
    city: "Indore",
    pincode: "",
    type: "Home",
  });
  const [addressFormError, setAddressFormError] = useState("");
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
        const res = await apiRequest("/auth/addresses", { auth: true });
        addrs = Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn(
          "[checkout] Could not fetch saved addresses from API:",
          err.message,
        );
        addrs = user?.addresses || [];
      }

      setSavedAddresses(addrs);

      if (selectedAddress) {
        const match = addrs.find(
          (a) =>
            (a._id && a._id === selectedAddress._id) ||
            (a.id && a.id === selectedAddress.id),
        );
        if (match) {
          setSelectedAddress(match);
          setSelectedAddressId(match._id || match.id);
        } else {
          setSelectedAddressId(
            selectedAddress._id || selectedAddress.id || "custom",
          );
        }
      } else if (addrs.length > 0) {
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        setSelectedAddress(def);
        setSelectedAddressId(def._id || def.id);
        try {
          sessionStorage.setItem(
            "ncc_selected_checkout_address",
            JSON.stringify(def),
          );
        } catch {
          // Storage can be disabled (private mode); remembering the address is optional.
        }
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
        navigate("/buy-new/cart");
      } else if (!selectedAddress) {
        navigate("/buy-new/address");
      }
    }
  }, [step, cart.length, selectedAddress]);

  const handleSelectAddress = (addr) => {
    setSelectedAddress(addr);
    setSelectedAddressId(addr._id || addr.id);
    try {
      sessionStorage.setItem(
        "ncc_selected_checkout_address",
        JSON.stringify(addr),
      );
    } catch {
      // Storage can be disabled (private mode); remembering the address is optional.
    }
    setShowAddAddressForm(false);
    setAddressFormError("");
  };

  const handleSaveNewAddress = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setAddressFormError("");

    if (!addressForm.name.trim()) {
      setAddressFormError("Please enter recipient full name.");
      return;
    }
    const cleanPhone = addressForm.phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setAddressFormError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!addressForm.house.trim()) {
      setAddressFormError("Please enter flat / house no. / building details.");
      return;
    }
    if (!addressForm.city.trim()) {
      setAddressFormError("Please enter city name.");
      return;
    }
    const cleanPincode = addressForm.pincode.replace(/\D/g, "");
    if (!cleanPincode || cleanPincode.length !== 6) {
      setAddressFormError("Please enter a valid 6-digit postal pincode.");
      return;
    }

    setSavingAddress(true);
    const newAddr = {
      type: addressForm.type || "Home",
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
          const res = await apiRequest("/auth/addresses", {
            method: "POST",
            auth: true,
            body: newAddr,
          });
          const list = Array.isArray(res) ? res : [];
          setSavedAddresses(list);
          if (updateUser) updateUser({ addresses: list });
          const created = list[list.length - 1] || newAddr;
          setSelectedAddress(created);
          setSelectedAddressId(created._id || created.id);
          sessionStorage.setItem(
            "ncc_selected_checkout_address",
            JSON.stringify(created),
          );
        } catch (postErr) {
          console.warn(
            "[checkout] Could not persist to profile:",
            postErr.message,
          );
          setSelectedAddress(newAddr);
          setSelectedAddressId("custom");
          sessionStorage.setItem(
            "ncc_selected_checkout_address",
            JSON.stringify(newAddr),
          );
        }
      } else {
        setSelectedAddress(newAddr);
        setSelectedAddressId("custom");
        sessionStorage.setItem(
          "ncc_selected_checkout_address",
          JSON.stringify(newAddr),
        );
      }

      setShowAddAddressForm(false);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedAddress) {
      setAddressFormError(
        "Please select or add a delivery address to proceed.",
      );
      return;
    }
    navigate("/buy-new/payment");
  };

  const handlePlaceOrder = async (method = paymentMode) => {
    if (!cart.length) return;
    if (!selectedAddress) {
      setOrderError(
        "Delivery address is missing. Please select your delivery address.",
      );
      navigate("/buy-new/address");
      return;
    }
    setOrderError("");
    setPlacingOrder(true);

    try {
      const res = await apiRequest("/orders", {
        method: "POST",
        auth: true,
        body: {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.qty || 1,
          })),
          address: {
            name: selectedAddress.name || user?.name || "Customer",
            house: selectedAddress.house || selectedAddress.address || "",
            landmark: selectedAddress.landmark || selectedAddress.detail || "",
            city: selectedAddress.city || "Indore",
            pincode: selectedAddress.pincode || "",
            type: selectedAddress.type || "Home",
          },
          exchangeRequestId: cart.find(
            (i) => i.exchange?.status === "Inspection Approved",
          )?.exchange?.requestId,
          paymentMethod: method, // 'COD' or 'Online' (mapped server-side)
        },
      });
      const order = res;

      if (method === "Online" && order.razorpay) {
        await payWithRazorpay({
          razorpay: order.razorpay,
          verifyPath: `/orders/${order.id}/verify-payment`,
          description: `${cart.length} item(s)`,
          prefill: {
            name:
              selectedAddress.name ||
              order.shippingAddress?.fullName ||
              user?.name ||
              "Customer",
            email: user?.email || "customer@example.com",
            contact: selectedAddress.phone || user?.phone || "9876543210",
          },
        });
      }

      sessionStorage.removeItem("ncc_selected_checkout_address");
      clearCart();
      navigate("/buy-new/success", { state: { order } });
    } catch (err) {
      setOrderError(
        err.message ||
          "The order could not be placed. You have not been charged.",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // Steps 3, 5 and 6 hide CustomerBottomNav (see the render below) and have
  // no fixed bottom bar of their own except step 3's, which already carries
  // its own clearance padding — so the bottom-nav clearance here was pure
  // dead space stacking underneath those steps' content.
  const needsBottomNavClearance = !(step === 3 || step === 5 || step === 6);

  return (
    <div
      className={`min-h-screen bg-bg-light flex flex-col relative ${needsBottomNavClearance ? "pb-24 lg:pb-8" : ""}`}>
      {/* HEADER BAR WITH STYLISH BLUE ACCENTS */}
      <div className="bg-[#0B4EA2] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-blue-900 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 1) navigate("/buy");
              else if (step === 2) {
                if (brandParam) navigate("/buy");
                else navigate("/buy-new");
              } else if (step === 3)
                navigate(
                  `/buy-new/products/${encodeURIComponent(finalCategory)}`,
                );
              else if (step === 4)
                // The cart can hold items from several categories at once, so
                // there's no single "product details" page to reconstruct a
                // URL for here (that used to fall back to a made-up
                // `/buy-new/details/<default category>/` with no product
                // name, which 404'd into the "Page Coming Soon" screen).
                // Going back in history returns to wherever the customer
                // actually came from.
                navigate(-1);
              else if (step === 5) navigate("/buy-new/cart");
              else if (step === 6) navigate("/buy-new/address");
              else if (step === 7) navigate("/buy");
            }}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {step === 1 && "Buy New"}
              {step === 2 &&
                (brandParam ? `${brandParam} Products` : `${finalCategory}s`)}
              {step === 3 && "Product Details"}
              {step === 4 && "My Cart"}
              {step === 5 && "Delivery Address"}
              {step === 6 && "Payment"}
              {step === 7 && "Order Success!"}
            </h1>
            {step < 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">
                BUY BRAND NEW PRODUCT
              </span>
            )}
            {step === 5 && (
              <span className="text-[10px] text-blue-200 block font-medium">
                STEP 2 OF 3 • CHECKOUT
              </span>
            )}
            {step === 6 && (
              <span className="text-[10px] text-blue-200 block font-medium">
                STEP 3 OF 3 • FINAL STEP
              </span>
            )}
          </div>
        </div>
        {step < 6 && (cart.length > 0 || step === 3) && (
          <div
            ref={cartIconRef}
            onClick={() => navigate("/buy-new/cart")}
            className="relative p-1 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-brand-yellow text-brand-navy rounded-full text-[10px] font-black flex items-center justify-center border border-[#0B4EA2]">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col gap-6 overflow-y-auto">
        {/* ── STEP 1: SELECT CATEGORY ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5">
            {/* Header info */}
            <div className="px-1 -mt-1">
              <h2 className="text-base font-black text-brand-navy">
                Buy Brand New Product
              </h2>
              <p className="text-xs text-text-secondary font-semibold">
                Select a category to shop
              </p>
            </div>

            {/* Category Rows */}
            <div className="flex flex-col gap-3">
              {categoriesList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    navigate(
                      `/buy-new/products/${encodeURIComponent(item.name)}`,
                    )
                  }
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-brand-blue/45 shadow-sm hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-brand-navy leading-tight">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-text-secondary mt-0.5 font-semibold">
                        Free delivery & doorstep installation
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-secondary shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: CHOOSE PRODUCT (FLIPKART-STYLE RESPONSIVE EXPERIENCE) ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3 text-left w-full max-w-screen-2xl mx-auto">
            {/* Flipkart Breadcrumbs & Category Bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold overflow-hidden">
                <span
                  onClick={() => navigate("/buy-new")}
                  className="hover:text-brand-blue cursor-pointer truncate">
                  Buy New
                </span>
                <ChevronRight size={13} className="shrink-0 text-slate-400" />
                <span className="text-slate-900 font-extrabold truncate">
                  {brandParam ? `${brandParam} Products` : `${finalCategory}s`}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 shrink-0 ml-1">
                  ({sortedAndFilteredProducts.length} items)
                </span>
              </div>

              {/* View Mode Toggle (Grid vs List) */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                  View:
                </span>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-blue-50 text-brand-blue border-brand-blue shadow-2xs"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="Grid View">
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-blue-50 text-brand-blue border-brand-blue shadow-2xs"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                  title="List View">
                  <ListIcon size={15} />
                </button>
              </div>
            </div>

            {/* Layout Body: Desktop Sticky Left Filter Sidebar + Main Products Grid */}
            <div className="flex items-start gap-4 lg:gap-6 w-full">
              {/* DESKTOP FILTER SIDEBAR (Flipkart style) */}
              <aside className="hidden lg:flex flex-col w-64 bg-white border border-slate-200/80 rounded-2xl p-4 sticky top-24 shrink-0 shadow-2xs gap-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal size={15} className="text-brand-blue" />
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Filters
                    </span>
                  </div>
                  {(selectedBrands.length > 0 ||
                    activeFilter !== "all" ||
                    sortOption !== "relevance") && (
                    <button
                      onClick={() => {
                        setSelectedBrands([]);
                        setTempSelectedBrands([]);
                        setActiveFilter("all");
                        setSortOption("relevance");
                      }}
                      className="text-[11px] font-black text-rose-600 hover:underline cursor-pointer">
                      Clear All
                    </button>
                  )}
                </div>

                {/* Sort Option In Sidebar */}
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Sort By
                  </h4>
                  <div className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                    {[
                      { id: "relevance", label: "Relevance" },
                      { id: "popularity", label: "Popularity / Rating" },
                      { id: "low-to-high", label: "Price: Low to High" },
                      { id: "high-to-low", label: "Price: High to Low" },
                      { id: "newest", label: "Newest Arrivals" },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          name="desktop_sort"
                          checked={sortOption === opt.id}
                          onChange={() => setSortOption(opt.id)}
                          className="accent-brand-blue"
                        />
                        <span
                          className={
                            sortOption === opt.id
                              ? "text-brand-blue font-extrabold"
                              : ""
                          }>
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Offers & Stock
                  </h4>
                  <div className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                    <label className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilter === "discount"}
                        onChange={() =>
                          setActiveFilter(
                            activeFilter === "discount" ? "all" : "discount",
                          )
                        }
                        className="accent-brand-blue rounded"
                      />
                      <span>Top Sale Discounts</span>
                    </label>
                    <label className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilter === "inStock"}
                        onChange={() =>
                          setActiveFilter(
                            activeFilter === "inStock" ? "all" : "inStock",
                          )
                        }
                        className="accent-brand-blue rounded"
                      />
                      <span>In Stock Only</span>
                    </label>
                  </div>
                </div>

                {/* Brands Checklist */}
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Brand
                  </h4>
                  <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1 text-xs font-bold text-slate-600">
                    {Array.from(
                      new Set([
                        ...dynamicBrandList,
                        "LG",
                        "Samsung",
                        "Sony",
                        "Panasonic",
                        "Whirlpool",
                        "Daikin",
                        "Voltas",
                        "Godrej",
                        "Carrier",
                        "Hitachi",
                        "Blue Star",
                        "Haier",
                        "IFB",
                        "Bosch",
                        ...categoryProducts.map((p) => p.brand).filter(Boolean),
                      ]),
                    ).map((brand) => {
                      const isChecked = selectedBrands.includes(brand);
                      return (
                        <label
                          key={brand}
                          className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedBrands(
                                  selectedBrands.filter((b) => b !== brand),
                                );
                              } else {
                                setSelectedBrands([...selectedBrands, brand]);
                              }
                            }}
                            className="accent-brand-blue rounded"
                          />
                          <span
                            className={
                              isChecked ? "text-brand-blue font-extrabold" : ""
                            }>
                            {brand}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {/* MAIN PRODUCTS COLUMN */}
              <div className="flex-1 min-w-0 flex flex-col gap-3 sm:gap-4">
                {/* Mobile / Tablet Horizontal Scrollable Filters */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {/* Sort Button */}
                  <button
                    onClick={() => setShowSortModal(true)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      sortOption !== "relevance"
                        ? "bg-blue-50 border-brand-blue text-brand-blue"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}>
                    Sort{" "}
                    <ChevronDown
                      size={13}
                      className={
                        sortOption !== "relevance"
                          ? "text-brand-blue"
                          : "text-slate-500"
                      }
                    />
                  </button>

                  {/* Filter Button */}
                  <button
                    onClick={() => {
                      setTempSelectedBrands([...selectedBrands]);
                      setShowFilterPage(true);
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      selectedBrands.length > 0
                        ? "bg-blue-50 border-brand-blue text-brand-blue"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}>
                    Filter{" "}
                    <SlidersHorizontal
                      size={13}
                      className={
                        selectedBrands.length > 0
                          ? "text-brand-blue"
                          : "text-slate-500"
                      }
                    />
                  </button>

                  {/* Top Sale Discounts Filter */}
                  <button
                    onClick={() =>
                      setActiveFilter(
                        activeFilter === "discount" ? "all" : "discount",
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      activeFilter === "discount"
                        ? "bg-blue-50 border-brand-blue text-brand-blue"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}>
                    Top Discounts
                  </button>

                  {/* In-stock filter */}
                  <button
                    onClick={() =>
                      setActiveFilter(
                        activeFilter === "inStock" ? "all" : "inStock",
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      activeFilter === "inStock"
                        ? "bg-blue-50 border-brand-blue text-brand-blue"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}>
                    In Stock
                  </button>

                  {/* Active Brand Pills */}
                  {selectedBrands.map((b) => (
                    <button
                      key={b}
                      onClick={() => {
                        const next = selectedBrands.filter(
                          (brand) => brand !== b,
                        );
                        setSelectedBrands(next);
                        setTempSelectedBrands(next);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-blue-50 border border-brand-blue text-brand-blue text-[11px] font-black whitespace-nowrap shrink-0 cursor-pointer">
                      <span>{b}</span>
                      <X
                        size={12}
                        className="text-brand-blue hover:text-blue-900"
                      />
                    </button>
                  ))}
                </div>

                {/* Loading Skeleton */}
                {productsLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 md:gap-4">
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                      <div
                        key={k}
                        className="bg-white rounded-2xl border border-slate-100 p-3 h-64 animate-pulse flex flex-col justify-between">
                        <div className="aspect-square bg-slate-100 rounded-xl mb-2" />
                        <div className="h-3 bg-slate-100 rounded w-3/4 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
                        <div className="h-5 bg-slate-100 rounded w-1/3" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Error Banner */}
                {productsError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold text-center">
                    {productsError}
                  </div>
                )}

                {/* Empty State */}
                {!productsLoading &&
                  !productsError &&
                  sortedAndFilteredProducts.length === 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center flex flex-col items-center gap-3 shadow-2xs">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center">
                        <Package size={28} />
                      </div>
                      <h3 className="text-base font-black text-slate-900">
                        No products found
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {selectedBrands.length > 0
                          ? `No products match "${selectedBrands.join(", ")}" in ${finalCategory}. Try clearing brand filters.`
                          : `No products currently available in ${finalCategory}.`}
                      </p>
                      {(selectedBrands.length > 0 ||
                        activeFilter !== "all") && (
                        <button
                          onClick={() => {
                            setSelectedBrands([]);
                            setTempSelectedBrands([]);
                            setActiveFilter("all");
                          }}
                          className="mt-2 px-4 py-2 rounded-xl bg-[#0D47A1] text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-sm cursor-pointer">
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  )}

                {/* GRID VIEW (Flipkart Style: 2-col mobile, 3-col tablet, 4-col laptop, 5-col 4K) */}
                {!productsLoading &&
                  !productsError &&
                  sortedAndFilteredProducts.length > 0 &&
                  viewMode === "grid" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 min-[380px]:gap-3 sm:gap-4">
                      {sortedAndFilteredProducts.map((product) => {
                        const isWishlisted = wishlist.some(
                          (p) => p.id === product.id,
                        );
                        const originalPrice = product.originalPrice || null;
                        const discount =
                          originalPrice && originalPrice > product.price
                            ? Math.round(
                                ((originalPrice - product.price) /
                                  originalPrice) *
                                  100,
                              )
                            : null;

                        return (
                          <div
                            key={product.id}
                            onClick={() =>
                              navigate(
                                `/buy-new/details/${encodeURIComponent(product.category || (finalCategory === "All" ? "Product" : finalCategory))}/${encodeURIComponent(product.name)}`,
                              )
                            }
                            className="bg-white border border-slate-200/90 hover:border-brand-blue/50 rounded-2xl p-2.5 min-[380px]:p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer shadow-2xs hover:shadow-xl transition-all duration-300 relative group overflow-hidden">
                            {/* Top Image Box */}
                            <div className="relative aspect-square w-full bg-linear-to-br from-slate-50 to-blue-50/20 rounded-xl overflow-hidden flex items-center justify-center p-2.5 sm:p-3 mb-2 shrink-0">
                              <img
                                src={
                                  product.imageUrl ||
                                  getApplianceImg(
                                    product.category || finalCategory,
                                  )
                                }
                                alt={product.name}
                                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                              />

                              {/* Assured Badge */}
                              <span className="absolute top-1.5 left-1.5 text-[8px] min-[360px]:text-[8.5px] font-black bg-linear-to-r from-blue-600 to-indigo-600 text-white px-1.5 py-0.5 rounded-full shadow-2xs">
                                ★ Assured
                              </span>

                              {/* Floating Heart */}
                              <button
                                onClick={(e) => toggleWishlist(product, e)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10">
                                <Heart
                                  size={12}
                                  fill={isWishlisted ? "#EF4444" : "none"}
                                  className={
                                    isWishlisted
                                      ? "text-red-500"
                                      : "text-slate-400"
                                  }
                                />
                              </button>
                            </div>

                            {/* Details Content */}
                            <div className="flex-1 flex flex-col justify-between text-left">
                              <div>
                                {/* Brand */}
                                {product.brand && (
                                  <span className="text-[9px] min-[360px]:text-[9.5px] font-black text-slate-400 uppercase tracking-wider block truncate">
                                    {product.brand}
                                  </span>
                                )}

                                {/* Title */}
                                <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug line-clamp-2 min-h-7.5 sm:min-h-9 group-hover:text-brand-blue transition-colors mt-0.5">
                                  {product.name}
                                </h4>

                                {/* Rating badge */}
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="inline-flex items-center gap-0.5 bg-emerald-600 text-white text-[9px] min-[360px]:text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                                    <span>{product.rating || "4.3"}</span>
                                    <Star
                                      size={9}
                                      fill="white"
                                      className="text-white"
                                    />
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 font-semibold truncate">
                                    (128)
                                  </span>
                                </div>
                              </div>

                              {/* Price & Offer */}
                              <div className="mt-2 pt-1.5 border-t border-slate-100">
                                <div className="flex flex-wrap items-baseline gap-1.5">
                                  <span className="text-xs min-[360px]:text-sm sm:text-base font-black text-slate-900">
                                    ₹{product.price.toLocaleString()}
                                  </span>
                                  {discount !== null && (
                                    <>
                                      <span className="text-[9.5px] sm:text-[10.5px] text-slate-400 line-through font-bold">
                                        ₹{originalPrice.toLocaleString()}
                                      </span>
                                      <span className="text-[9.5px] sm:text-[10.5px] font-black text-emerald-600">
                                        {discount}% off
                                      </span>
                                    </>
                                  )}
                                </div>

                                <p className="text-[9px] min-[360px]:text-[9.5px] text-brand-blue font-extrabold truncate mt-0.5">
                                  ✓ Exchange available
                                </p>
                                <p className="text-[8.5px] min-[360px]:text-[9px] text-slate-400 font-medium truncate">
                                  Free delivery tomorrow
                                </p>

                                {/* Quick Details Button */}
                                <button
                                  type="button"
                                  className="w-full mt-2 py-1.5 rounded-xl text-[10.5px] sm:text-xs font-black bg-blue-50 text-brand-blue hover:bg-brand-blue hover:text-white border border-blue-100/80 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-97">
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* LIST VIEW (Flipkart Style horizontal cards) */}
                {!productsLoading &&
                  !productsError &&
                  sortedAndFilteredProducts.length > 0 &&
                  viewMode === "list" && (
                    <div className="flex flex-col gap-3">
                      {sortedAndFilteredProducts.map((product) => {
                        const isWishlisted = wishlist.some(
                          (p) => p.id === product.id,
                        );
                        const originalPrice = product.originalPrice || null;
                        const discount =
                          originalPrice && originalPrice > product.price
                            ? Math.round(
                                ((originalPrice - product.price) /
                                  originalPrice) *
                                  100,
                              )
                            : null;

                        return (
                          <div
                            key={product.id}
                            onClick={() =>
                              navigate(
                                `/buy-new/details/${encodeURIComponent(product.category || (finalCategory === "All" ? "Product" : finalCategory))}/${encodeURIComponent(product.name)}`,
                              )
                            }
                            className="bg-white border border-slate-200/90 hover:border-brand-blue/40 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 flex flex-col justify-between cursor-pointer shadow-2xs hover:shadow-xl transition-all duration-300 relative group overflow-hidden text-left">
                            <div className="flex gap-3 sm:gap-4 md:gap-5 items-stretch h-full">
                              {/* Left Image */}
                              <div className="relative w-24 h-24 min-[360px]:w-28 min-[360px]:h-28 md:w-36 md:h-36 bg-linear-to-br from-slate-50 to-blue-50/30 border border-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs self-start">
                                <img
                                  src={
                                    product.imageUrl ||
                                    getApplianceImg(
                                      product.category || finalCategory,
                                    )
                                  }
                                  alt={product.name}
                                  className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                                />
                                <button
                                  onClick={(e) => toggleWishlist(product, e)}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs border border-slate-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10">
                                  <Heart
                                    size={12}
                                    fill={isWishlisted ? "#EF4444" : "none"}
                                    className={
                                      isWishlisted
                                        ? "text-red-500"
                                        : "text-slate-400"
                                    }
                                  />
                                </button>
                              </div>

                              {/* Right Info */}
                              <div className="flex-1 flex flex-col text-left justify-between min-w-0 h-full">
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    {product.brand && (
                                      <span className="text-[9px] font-mono font-black text-brand-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {product.brand}
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-[8px] font-black bg-linear-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                                      ★ Assured
                                    </span>
                                    {product.warrantyMonths && (
                                      <span className="inline-flex items-center text-[8px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        🛡️ {product.warrantyMonths}M Warranty
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-snug group-hover:text-brand-blue transition-colors line-clamp-2">
                                    {product.name}
                                  </h4>

                                  {product.specs &&
                                    product.specs.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {product.specs
                                          .slice(0, 3)
                                          .map((spec, sIdx) => (
                                            <span
                                              key={sIdx}
                                              className="bg-slate-100 text-slate-700 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md">
                                              {spec}
                                            </span>
                                          ))}
                                      </div>
                                    )}
                                </div>

                                <div className="pt-2 mt-auto border-t border-slate-100/80">
                                  <div className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="text-sm sm:text-base md:text-lg font-black text-slate-900">
                                      ₹{product.price.toLocaleString()}
                                    </span>
                                    {discount !== null && (
                                      <>
                                        <span className="text-[10px] sm:text-xs text-slate-400 line-through font-bold">
                                          ₹{originalPrice.toLocaleString()}
                                        </span>
                                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
                                          ↓{discount}% OFF
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-1 mt-1 text-[9.5px] sm:text-[10px]">
                                    <span className="text-brand-blue font-bold">
                                      ✓ Exchange available
                                    </span>
                                    <span className="text-slate-400 font-medium">
                                      Free Delivery by Tomorrow
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PRODUCT DETAILS ── */}
        {step === 3 &&
          (!finalProduct ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center shadow-xs my-6 space-y-4">
              {productsLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-slate-500">
                    Loading Product Details...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <Package size={24} />
                  </div>
                  <h3 className="text-base font-black text-slate-800">
                    Appliance Details Unavailable
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    The requested product could not be loaded or is out of
                    stock.
                  </p>
                  <button
                    onClick={() =>
                      navigate(
                        `/buy-new/products/${encodeURIComponent(finalCategory)}`,
                      )
                    }
                    className="mt-2 bg-brand-blue text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs">
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
              className="-mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 pb-20 lg:pb-10 text-left bg-white">
              {/* TOP: GALLERY + BUY BOX — side by side on desktop, stacked on mobile (Flipkart-style), no card box, edge-to-edge */}
              <div className="max-w-7xl mx-auto flex flex-col divide-y divide-slate-100 lg:grid lg:grid-cols-[minmax(0,440px)_1fr] lg:divide-y-0 lg:divide-x">
                {/* LEFT COLUMN (sticky on desktop): 1. HERO MEDIA & BRAND HEADER */}
                <div className="lg:sticky lg:top-16">
                  <div className="p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                    {/* Top Floating Badges & Action Buttons */}
                    <div className="w-full flex items-center justify-between z-10 mb-2">
                      <div className="flex items-center gap-2">
                        {finalProduct?.brand && (
                          <span className="text-[10px] font-mono font-black text-brand-blue bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                            {finalProduct.brand}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[9px] font-black bg-linear-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full shadow-2xs">
                          ★ Assured
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleWishlist(finalProduct, e)}
                          className="w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-xs transition-all cursor-pointer"
                          title="Add to Wishlist">
                          <Heart
                            size={16}
                            fill={
                              wishlist.some((p) => p.id === finalProduct.id)
                                ? "#EF4444"
                                : "none"
                            }
                            className={
                              wishlist.some((p) => p.id === finalProduct.id)
                                ? "text-red-500"
                                : "text-slate-500"
                            }
                          />
                        </button>
                      </div>
                    </div>

                    {/* High Res Larger Product Image & Slide Gallery */}
                    {(() => {
                      const productImagesList = finalProduct?.images?.length
                        ? finalProduct.images
                        : finalProduct?.imageUrl
                          ? [finalProduct.imageUrl]
                          : [getApplianceImg(finalCategory)];

                      const currentIdx =
                        activeImageIdx < productImagesList.length
                          ? activeImageIdx
                          : 0;
                      const currentDisplayImg =
                        productImagesList[currentIdx] || productImagesList[0];

                      const handlePrevImage = (e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) =>
                          prev > 0 ? prev - 1 : productImagesList.length - 1,
                        );
                      };

                      const handleNextImage = (e) => {
                        e.stopPropagation();
                        setActiveImageIdx((prev) =>
                          prev < productImagesList.length - 1 ? prev + 1 : 0,
                        );
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
                                title="Previous Image">
                                <ChevronLeft size={18} />
                              </button>
                            )}

                            {/* Main Larger Product Image with Motion Slide */}
                            <motion.img
                              ref={productImageRef}
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
                                title="Next Image">
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
                                        ? "border-2 border-brand-blue ring-4 ring-blue-100 shadow-md scale-105 opacity-100"
                                        : "border border-slate-200/80 opacity-60 hover:opacity-100 hover:border-slate-300"
                                    }`}>
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
                </div>

                {/* RIGHT COLUMN: buy box + assurance grid — @container so the
                  assurance grid below can size itself off this column's own
                  rendered width instead of the viewport width. Viewport-based
                  md:grid-cols-4 used to force 4 columns as soon as the
                  screen crossed 768px, even once the lg: two-column layout
                  made this column only ~560px wide (e.g. at 1024–1279px
                  viewports), crushing each tile's text into 3 wrapped lines. */}
                <div className="flex flex-col divide-y divide-slate-100 @container">
                  {/* 2. PRODUCT TITLE & RATINGS SUMMARY */}
                  <div className="p-4 sm:p-6 space-y-4">
                    <div className="space-y-2">
                      {/* Top Row: Title & Stock Status Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <h1 className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                          {finalProduct.name}
                        </h1>
                        {Number.isFinite(finalProduct.stock) && (
                          <span
                            className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 border ${
                              finalProduct.stock > 0
                                ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                                : "text-red-700 bg-red-50 border-red-200/80"
                            }`}>
                            {finalProduct.stock > 0
                              ? "✓ In Stock"
                              : "Out of Stock"}
                          </span>
                        )}
                      </div>

                      {/* Ratings & Reviews Row — only shown once real ratings exist */}
                      {reviewStats.totalRatings > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md text-xs font-black shadow-2xs">
                            <span>{reviewStats.avgRating.toFixed(1)}</span>
                            <Star size={10} fill="currentColor" />
                          </div>
                          <span className="text-xs font-bold text-slate-500">
                            {reviewStats.totalRatings} Ratings &{" "}
                            {reviewStats.totalReviews} Customer Reviews
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 3. PRICING & DISCOUNT BREAKDOWN */}
                    <div className="pt-3 border-t border-slate-100">
                      {(() => {
                        const origPrice = finalProduct.originalPrice || null;
                        const discPct =
                          origPrice && origPrice > finalProduct.price
                            ? Math.round(
                                ((origPrice - finalProduct.price) / origPrice) *
                                  100,
                              )
                            : null;
                        const savingsAmount =
                          origPrice && origPrice > finalProduct.price
                            ? origPrice - finalProduct.price
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
                                🎉 You Save ₹{savingsAmount.toLocaleString()} on
                                this order! (Inclusive of all taxes)
                              </p>
                            )}

                            {/* Trade-in Applied Badge */}
                            {isCurrentExchangeApplied && (
                              <div className="mt-2 text-xs font-black text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
                                {exchangeApplied.status ===
                                "Inspection Approved"
                                  ? `✓ Exchange Credit ₹${exchangeApplied.totalSavings?.toLocaleString()} Approved`
                                  : `Trade-in Registered · Estimated savings ₹${exchangeApplied.totalSavings?.toLocaleString()}`}
                              </div>
                            )}

                            {/* Prominent Action Buttons: Add to Cart & Buy Now */}
                            <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                              {isFinalProductInCart ? (
                                <button
                                  type="button"
                                  onClick={() => navigate("/buy-new/cart")}
                                  className="w-full sm:w-1/2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black py-3.5 rounded-2xl transition-all text-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2">
                                  <CheckCircle2 size={16} /> Go to Cart
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleAddToCart}
                                  className="w-full sm:w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black py-3.5 rounded-2xl transition-all text-xs cursor-pointer shadow-2xs active:scale-98 flex items-center justify-center gap-2">
                                  <ShoppingCart size={16} /> Add to Cart
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  const productExchange =
                                    isCurrentExchangeApplied
                                      ? {
                                          ...exchangeApplied,
                                          productId: finalProduct.id,
                                        }
                                      : null;
                                  replaceCart([
                                    {
                                      ...finalProduct,
                                      qty: 1,
                                      category: finalCategory,
                                      exchange: productExchange,
                                    },
                                  ]);
                                  navigate("/buy-new/address");
                                }}
                                className="w-full sm:w-1/2 bg-brand-blue hover:bg-blue-800 text-white font-black py-3.5 rounded-2xl transition-all shadow-md text-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2">
                                <Zap size={16} fill="currentColor" /> Buy Now
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 5. 4-CARD SERVICE ASSURANCE GRID */}
                  <div className="p-4 sm:p-6 grid grid-cols-2 @3xl:grid-cols-4 gap-2.5 sm:gap-3">
                    {[
                      // Per-product services, set in Super Admin → NCC Products
                      // (docs/master-catalogue Phase 20) — these used to be the
                      // same four promises for every product.
                      {
                        title: finalProduct.installationIncluded ? "Free Installation" : "Installation Extra",
                        desc: finalProduct.installationIncluded ? "By an NCC technician" : "Book it as a service",
                        Icon: Wrench,
                        color: "text-blue-600 bg-blue-50 border-blue-100",
                      },
                      {
                        title: finalProduct.warrantyMonths ? `${finalProduct.warrantyMonths}M Brand Warranty` : "No Warranty",
                        desc: finalProduct.warrantySummary || "Genuine Assurance",
                        Icon: ShieldCheck,
                        color:
                          "text-emerald-600 bg-emerald-50 border-emerald-100",
                      },
                      {
                        title: (finalProduct.returnDays ?? 7) > 0 ? `${finalProduct.returnDays ?? 7} Days Replacement` : "Not Returnable",
                        desc: (finalProduct.returnDays ?? 7) > 0 ? "Easy Return Policy" : "All sales final",
                        Icon: RefreshCw,
                        color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                      },
                      {
                        title: finalProduct.codAvailable === false ? "Prepaid Only" : "Pay on Delivery",
                        desc: finalProduct.codAvailable === false ? "Pay online at checkout" : "Cash / UPI Available",
                        Icon: Percent,
                        color: "text-amber-600 bg-amber-50 border-amber-100",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200/80 rounded-lg min-[380px]:rounded-xl p-2 min-[380px]:p-2.5 min-[425px]:p-3.5 flex items-center gap-2 min-[380px]:gap-2.5 min-[425px]:gap-3">
                        <div
                          className={`w-7 h-7 min-[380px]:w-8 min-[380px]:h-8 min-[425px]:w-10 min-[425px]:h-10 rounded-lg min-[425px]:rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
                          <item.Icon className="w-3.5 h-3.5 min-[380px]:w-4 min-[380px]:h-4 min-[425px]:w-4.5 min-[425px]:h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[9.5px] min-[380px]:text-[10.5px] min-[425px]:text-xs font-black text-slate-800 leading-tight">
                            {item.title}
                          </h4>
                          <p className="text-[8px] min-[380px]:text-[8.5px] min-[425px]:text-[10px] font-semibold text-slate-400 mt-0.5 leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. OLD APPLIANCE EXCHANGE OFFER SECTION */}
              {isExchangeActiveForProduct && (
                <div className="max-w-7xl mx-auto border-t border-slate-100 p-4 sm:p-6 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-blue">
                        <RefreshCw size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">
                          Exchange Your Old Device
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          Save big on your appliance upgrade
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-brand-blue bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      Up to ₹{productExchangeConfig?.maxVal?.toLocaleString()}{" "}
                      off
                    </span>
                  </div>

                  {!isCurrentExchangeApplied ? (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setIsExchangeModalOpen(true)}
                        className="w-full bg-white border-2 border-brand-blue hover:bg-blue-50/40 text-brand-blue font-black py-3 rounded-2xl transition-all text-xs cursor-pointer text-center">
                        Check Exchange Value for Old Appliance
                      </button>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        * Pickup and inspection of old device will happen
                        simultaneously at doorstep delivery.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-black text-emerald-900 block">
                              {exchangeApplied.status === "Inspection Approved"
                                ? "Exchange Credit Approved"
                                : "Trade-in Registered"}
                            </span>
                            <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                              {exchangeApplied.brand} {exchangeApplied.model}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-700">
                          {exchangeApplied.status === "Inspection Approved"
                            ? "- "
                            : "≈ "}
                          ₹{exchangeApplied.totalSavings?.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex gap-2.5 border-t border-emerald-200/60 pt-3">
                        <button
                          onClick={() => setIsExchangeModalOpen(true)}
                          className="flex-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Change Exchange
                        </button>
                        <button
                          onClick={() => setExchangeApplied(null)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Remove Exchange
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7. PRODUCT HIGHLIGHTS & SPECIFICATIONS */}
              <div className="max-w-7xl mx-auto border-t border-slate-100 p-4 sm:p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldCheck size={16} className="text-brand-blue" /> Product
                  Highlights & Specifications
                </h3>

                {/* Basic Appliance Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">
                      Appliance Category
                    </span>
                    <span className="text-slate-900 font-black">
                      {finalCategory}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">Brand Name</span>
                    <span className="text-slate-900 font-black">
                      {finalProduct.brand || "Standard"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">
                      Item Condition
                    </span>
                    <span className="text-slate-900 font-black">
                      {finalProduct.condition || "Brand New"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-bold">
                      Warranty Coverage
                    </span>
                    <span className="text-slate-900 font-black">
                      {finalProduct.warrantyMonths
                        ? `${finalProduct.warrantyMonths} Months`
                        : "1 Year"}
                    </span>
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
                        if (/Ton|Litre|Litres|Kg|Inch/i.test(spec))
                          label = "Capacity & Size";
                        else if (/Star/i.test(spec)) label = "Energy Rating";
                        else if (/Inverter|RO|UV|4K|OS/i.test(spec))
                          label = "Technology";
                        else if (/Copper|Door|Mount|Material/i.test(spec))
                          label = "Material & Build";

                        return (
                          <div
                            key={sIdx}
                            className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-slate-500 font-bold">
                              {label}
                            </span>
                            <span className="text-slate-900 font-black flex items-center gap-1.5">
                              <Check size={13} className="text-emerald-600" />{" "}
                              {spec}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {finalProduct.description && (
                  <div className="pt-2">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{finalProduct.description}</p>
                  </div>
                )}

                {finalProduct.specifications?.length > 0 && (
                  <div className="pt-2 space-y-4">
                    {finalProduct.specifications.map((group) => (
                      <div key={group.group}>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{group.group}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 text-xs">
                          {group.items.map((item) => (
                            <div key={item.label} className="flex justify-between gap-4 py-2 border-b border-slate-100">
                              <span className="text-slate-500 font-bold">{item.label}</span>
                              <span className="text-slate-900 font-black text-right">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(finalProduct.inTheBox?.length > 0 || finalProduct.manufacturer || finalProduct.countryOfOrigin) && (
                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {finalProduct.inTheBox?.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">In the Box</h4>
                        <p className="text-slate-700 font-semibold">{finalProduct.inTheBox.join(", ")}</p>
                      </div>
                    )}
                    {(finalProduct.manufacturer || finalProduct.countryOfOrigin) && (
                      <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Manufacturer</h4>
                        {finalProduct.manufacturer && <p className="text-slate-700 font-semibold">{finalProduct.manufacturer}</p>}
                        {finalProduct.countryOfOrigin && <p className="text-slate-500 mt-0.5">Country of origin: {finalProduct.countryOfOrigin}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 8. CUSTOMER RATINGS, REVIEWS & UPLOADED PHOTOS */}
              <div className="max-w-7xl mx-auto border-t border-slate-100 p-4 sm:p-6 space-y-6">
                {/* Header with Write a Review Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Star
                        size={18}
                        fill="#EAB308"
                        className="text-yellow-500"
                      />{" "}
                      Customer Ratings & Reviews
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Verified customer feedback & real appliance photos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWriteReviewOpen(true)}
                    className="bg-brand-blue hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5">
                    <Plus size={14} /> Write a Review
                  </button>
                </div>

                {/* Ratings Summary & Star Distribution Bars — only once real ratings exist */}
                {reviewStats.totalRatings > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/70 p-4 md:p-5 rounded-2xl border border-slate-200/70">
                    {/* Overall Score Box */}
                    <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/80 pb-4 md:pb-0 md:pr-4 text-center">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">
                        {reviewStats.avgRating.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1 text-yellow-500 my-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={16} fill="currentColor" />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        Based on {reviewStats.totalRatings} Ratings
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {reviewStats.totalReviews} Verified Buyer Reviews
                      </span>
                    </div>

                    {/* Rating Distribution Progress Bars */}
                    <div className="col-span-2 space-y-1.5 justify-center flex flex-col">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const pct = reviewStats.starsBreakdown?.[star] ?? 0;
                        return (
                          <div
                            key={star}
                            className="flex items-center gap-3 text-xs">
                            <span className="font-bold text-slate-600 w-10 shrink-0">
                              {star} ★
                            </span>
                            <div className="flex-1 h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-500 w-10 text-right shrink-0">
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs font-semibold text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-200/70">
                    No ratings yet — be the first to rate this product.
                  </div>
                )}

                {/* Customer Uploaded Photos Gallery — only real, submitted photos */}
                {customerPhotos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>
                        Customer Uploaded Photos ({customerPhotos.length})
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Click photo to zoom
                      </span>
                    </h4>

                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar scroll-smooth">
                      {customerPhotos.map((imgUrl, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setActiveLightboxImg(imgUrl)}
                          className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0 overflow-hidden cursor-pointer hover:border-brand-blue hover:scale-105 transition-all shadow-2xs group relative">
                          <img
                            src={imgUrl}
                            className="w-full h-full object-cover rounded-lg"
                            alt="Customer Photo"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Search size={14} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verified Buyer Reviews List — only real, submitted reviews */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Verified Customer Reviews
                  </h4>

                  {productReviews.length > 0 ? (
                    <div className="space-y-3">
                      {productReviews.map((rev, rIdx) => (
                        <div
                          key={rev.id || rIdx}
                          className="p-4 bg-slate-50/60 border border-slate-200/70 rounded-2xl space-y-2.5">
                          {/* Reviewer Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-blue font-black text-xs flex items-center justify-center">
                                {(rev.user?.name || "Customer").charAt(0)}
                              </div>
                              <div>
                                <span className="text-xs font-black text-slate-900 block leading-tight">
                                  {rev.user?.name || "Verified Customer"}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  ✓ Verified Buyer
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-black">
                              <span>{rev.rating}</span>
                              <Star size={9} fill="currentColor" />
                            </div>
                          </div>

                          {/* Comment text */}
                          <p className="text-xs font-medium text-slate-700 leading-relaxed">
                            {rev.comment}
                          </p>

                          {/* Attached Customer Photos */}
                          {Array.isArray(rev.photos) &&
                            rev.photos.length > 0 && (
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
                  ) : (
                    <div className="text-center py-6 text-xs font-semibold text-slate-400 bg-slate-50/60 rounded-2xl border border-slate-200/70">
                      No reviews yet. Be the first to share your experience!
                    </div>
                  )}
                </div>
              </div>

              {/* 9. SIMILAR & RECOMMENDED PRODUCTS */}
              {similarProducts.length > 0 && (
                <div className="max-w-7xl mx-auto border-t border-slate-100 p-4 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                    <div>
                      <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles size={18} className="text-brand-blue" />{" "}
                        Similar & Recommended Products
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Explore top-rated appliances matching your interest
                      </p>
                    </div>
                  </div>

                  {/* Cards Container: Single Horizontal Scroll Row (Hidden Scrollbar) */}
                  <div className="flex flex-row overflow-x-auto gap-3 md:gap-4 scroll-smooth snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {similarProducts.map((p, idx) => {
                      const originalPriceNum =
                        Number(p.originalPrice) || Number(p.mrp) || 0;
                      const discountPercent =
                        originalPriceNum > p.price
                          ? Math.round(
                              ((originalPriceNum - p.price) /
                                originalPriceNum) *
                                100,
                            )
                          : 0;

                      return (
                        <div
                          key={p.id || idx}
                          onClick={() => handleSelectSimilarProduct(p)}
                          className="w-48 sm:w-52 md:w-56 shrink-0 snap-start flex flex-col text-left cursor-pointer group transition-all">
                          {/* Grey Image Container Card with Rating */}
                          <div className="relative w-full h-44 sm:h-48 bg-[#f2f4f7] rounded-2xl p-3 flex items-center justify-center overflow-hidden mb-2.5">
                            {/* Product Image */}
                            <img
                              src={
                                p.imageUrl ||
                                getApplianceImg(p.category || finalCategory)
                              }
                              alt={p.name}
                              className="max-h-full max-w-full object-contain"
                            />

                            {/* Bottom-Left Floating Rating Badge — only for products with a real rating */}
                            {p.rating > 0 && (
                              <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center gap-1">
                                <span className="text-xs font-black text-slate-800">
                                  {p.rating}
                                </span>
                                <Star
                                  size={11}
                                  fill="#059669"
                                  className="text-emerald-600"
                                />
                              </div>
                            )}
                          </div>

                          {/* Details below image card */}
                          <div className="space-y-1 px-0.5">
                            {/* Title */}
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-blue transition-colors line-clamp-1 leading-snug">
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. FIXED STICKY BOTTOM ACTION BAR — mobile/tablet only; desktop buy box already has the buttons in view */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 pt-3 z-40 shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Price
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      ₹{finalProduct.price.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isFinalProductInCart ? (
                      <button
                        onClick={() => navigate("/buy-new/cart")}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black px-5 py-3 rounded-2xl transition-all text-xs cursor-pointer active:scale-98 flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> Go to Cart
                      </button>
                    ) : (
                      <button
                        onClick={handleAddToCart}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-5 py-3 rounded-2xl transition-all text-xs cursor-pointer active:scale-98">
                        Add to Cart
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const productExchange = isCurrentExchangeApplied
                          ? { ...exchangeApplied, productId: finalProduct.id }
                          : null;
                        replaceCart([
                          {
                            ...finalProduct,
                            qty: 1,
                            category: finalCategory,
                            exchange: productExchange,
                          },
                        ]);
                        navigate("/buy-new/address");
                      }}
                      className="bg-brand-blue hover:bg-blue-800 text-white font-black px-6 py-3 rounded-2xl transition-all shadow-md text-xs cursor-pointer active:scale-98">
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>

              {/* "Added to cart" toast + the flying product-image animation
                  — portaled straight to <body> so they render as truly
                  viewport-fixed regardless of any transformed ancestor
                  (framer-motion leaves a `transform` style on this step's
                  own motion.div even at rest, which would otherwise turn
                  position:fixed here into "fixed to that div" instead of
                  the viewport). */}
              {createPortal(
                <>
                  <AnimatePresence>
                    {addedToastVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: -12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-xs font-bold pl-3 pr-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Added to cart
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {flyImg && (
                    <motion.img
                      src={flyImg.src}
                      initial={{
                        top: flyImg.startTop,
                        left: flyImg.startLeft,
                        width: flyImg.startWidth,
                        height: flyImg.startHeight,
                        opacity: 1,
                      }}
                      animate={{
                        top: flyImg.endTop,
                        left: flyImg.endLeft,
                        width: 20,
                        height: 20,
                        opacity: 0.3,
                      }}
                      transition={{ duration: 0.65, ease: [0.32, 0, 0.67, 0] }}
                      onAnimationComplete={() => setFlyImg(null)}
                      style={{
                        position: "fixed",
                        zIndex: 70,
                        pointerEvents: "none",
                        objectFit: "contain",
                      }}
                      className="rounded-xl shadow-xl bg-white"
                    />
                  )}
                </>,
                document.body,
              )}
            </motion.div>
          ))}

        {/* ── STEP 4: MY CART ── */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                <ShoppingCart className="w-16 h-16 text-slate-300" />
                <div>
                  <h3 className="text-base font-black text-brand-navy">
                    Your Cart is Empty
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Explore our product categories to add items.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/buy-new")}
                  className="bg-brand-blue hover:bg-blue-800 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mt-2">
                  Shop Now
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 pb-4">
                  {/* Cart Header */}
                  <div className="flex justify-between items-center px-1">
                    <h2 className="text-sm font-black text-slate-900">
                      My Cart{" "}
                      <span className="text-slate-400 font-bold">
                        ({cart.reduce((sum, item) => sum + item.qty, 0)} item
                        {cart.reduce((sum, item) => sum + item.qty, 0) === 1
                          ? ""
                          : "s"}
                        )
                      </span>
                    </h2>
                    <button
                      onClick={() => setCartRemovalConfirm({ type: "clear" })}
                      className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer">
                      Clear All
                    </button>
                  </div>

                  {/* Cart list items — one card, rows divided, each clickable
                      through to that item's own product page (using the
                      item's own stored category, not the page's fallback
                      category — a cart can mix categories). */}
                  <div className="bg-white border border-slate-200/70 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                    {cart.map((item) => {
                      const goToProduct = () =>
                        navigate(
                          `/buy-new/details/${encodeURIComponent(item.category || finalCategory)}/${encodeURIComponent(item.name)}`,
                        );
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 sm:p-4 flex gap-3 text-left">
                          <button
                            type="button"
                            onClick={goToProduct}
                            className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-2 shrink-0 cursor-pointer">
                            <img
                              src={getApplianceImg(item.category)}
                              alt={item.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                            />
                          </button>

                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={goToProduct}
                              className="text-left cursor-pointer">
                              <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                                {item.name}
                              </h4>
                            </button>

                            {item.exchange ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-black text-brand-blue">
                                    ₹
                                    {(
                                      item.price - item.exchange.totalSavings
                                    ).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-slate-400 line-through font-semibold">
                                    ₹{item.price.toLocaleString()}
                                  </span>
                                </div>
                                <span className="text-[9px] text-emerald-600 font-bold">
                                  🔄 Exchange Applied (-₹
                                  {item.exchange.totalSavings.toLocaleString()})
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm font-black text-brand-blue">
                                ₹{item.price.toLocaleString()}
                              </span>
                            )}

                            <div className="flex items-center justify-between mt-0.5">
                              {/* Quantity controls */}
                              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-md text-slate-500 cursor-pointer transition-colors">
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-black text-slate-800 w-7 text-center">
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-md text-slate-500 cursor-pointer transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Remove item */}
                              <button
                                onClick={() =>
                                  setCartRemovalConfirm({
                                    type: "remove",
                                    item,
                                  })
                                }
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                title="Remove item">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Price Details */}
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-4.5 flex flex-col gap-2.5 shadow-2xs text-left">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      Price Details
                    </h4>

                    <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                      <span>
                        MRP ({cart.reduce((sum, item) => sum + item.qty, 0)}{" "}
                        item
                        {cart.reduce((sum, item) => sum + item.qty, 0) === 1
                          ? ""
                          : "s"}
                        )
                      </span>
                      <span>
                        ₹{cartSubtotalBeforeExchange.toLocaleString()}
                      </span>
                    </div>

                    {approvedExchangeSavings > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                        <span>Exchange Discount</span>
                        <span>
                          - ₹{approvedExchangeSavings.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* A pending trade-in is shown as what it is — an
                        estimate awaiting inspection — not deducted from
                        today's total. */}
                    {pendingExchangeSavings > 0 && (
                      <div className="flex flex-col gap-0.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <div className="flex justify-between items-center text-xs text-amber-800 font-bold">
                          <span>Trade-in (pending inspection)</span>
                          <span>
                            ≈ ₹{pendingExchangeSavings.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-700 leading-snug">
                          Credited after our serviceProvider inspects your old
                          device at pickup. Today you pay the full price.
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-slate-500 font-semibold border-t border-slate-100 pt-2.5">
                      <span>Delivery Charges</span>
                      <span className="text-emerald-600 font-black">Free</span>
                    </div>

                    <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-dashed border-slate-200 pt-2.5">
                      <span>Total Amount</span>
                      <span className="text-brand-blue text-lg">
                        ₹{cartTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sticky checkout bar — sits above the fixed bottom tab bar
                    on mobile (h-16, hidden on lg) so the total and action are
                    always reachable without scrolling through the whole
                    cart. */}
                <div className="sticky bottom-16 lg:bottom-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-3 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                      Total Amount
                    </span>
                    <span className="text-base font-black text-slate-900">
                      ₹{cartTotal.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/buy-new/address")}
                    className="flex-1 max-w-60 bg-brand-blue hover:bg-blue-800 text-white font-black py-3.5 rounded-2xl transition-all shadow-md text-xs cursor-pointer active:scale-98">
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── STEP 5: DELIVERY ADDRESS ── */}
        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5 pb-12 text-left">
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
                <div className="flex items-center gap-1.5 text-brand-blue font-black text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-[10px] ring-4 ring-blue-100">
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
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Select Delivery Address
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Where should we deliver your order?
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full text-[10px] font-black text-brand-blue">
                <Truck size={13} />
                <span>Free Express Delivery</span>
              </div>
            </div>

            {/* Form Error Notice */}
            {addressFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in">
                <span>{addressFormError}</span>
                <button
                  onClick={() => setAddressFormError("")}
                  className="text-red-400 hover:text-red-700 cursor-pointer">
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
                            setAddressFormError("");
                          }}
                          className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer">
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
                                ? "border-brand-blue bg-blue-50/50 shadow-sm ring-2 ring-blue-500/10"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                            }`}>
                            <div className="pt-0.5">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "border-brand-blue bg-brand-blue text-white"
                                    : "border-slate-300 bg-white"
                                }`}>
                                {isSelected && (
                                  <Check size={12} className="stroke-[3]" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">
                                  {addr.name || user?.name || "Customer"}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {addr.type === "Work" ? (
                                    <Briefcase size={10} />
                                  ) : (
                                    <HomeIcon size={10} />
                                  )}
                                  {addr.type || "Home"}
                                </span>
                                {addr.isDefault && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    DEFAULT
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                                {addr.house}
                                {addr.landmark
                                  ? `, ${addr.landmark}`
                                  : ""}, {addr.city} - {addr.pincode}
                              </p>

                              {(addr.phone || user?.phone) && (
                                <p className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center gap-1">
                                  <Phone size={11} className="text-slate-400" />{" "}
                                  {addr.phone || user?.phone}
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
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                          <Plus size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            {savedAddresses.length > 0
                              ? "Add Another Address"
                              : "Add Delivery Address"}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            Enter recipient and delivery location details
                          </p>
                        </div>
                      </div>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAddressForm(false);
                            setAddressFormError("");
                          }}
                          className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <form
                      onSubmit={handleSaveNewAddress}
                      className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            Recipient Full Name *
                          </label>
                          <div className="relative">
                            <User
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Rahul Sharma"
                              value={addressForm.name}
                              onChange={(e) =>
                                setAddressForm({
                                  ...addressForm,
                                  name: e.target.value,
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                            10-Digit Mobile Number *
                          </label>
                          <div className="relative">
                            <Phone
                              size={15}
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              placeholder="e.g. 9876543210"
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm({
                                  ...addressForm,
                                  phone: e.target.value.replace(/\D/g, ""),
                                })
                              }
                              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Flat, House No., Building, Apartment *
                        </label>
                        <div className="relative">
                          <HomeIcon
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Flat 302, Green Valley Apartments"
                            value={addressForm.house}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                house: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Street, Area, Landmark (Optional)
                        </label>
                        <div className="relative">
                          <MapPin
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="text"
                            placeholder="e.g. Near Vijay Nagar Square, AB Road"
                            value={addressForm.landmark}
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                landmark: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
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
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                city: e.target.value,
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
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
                            onChange={(e) =>
                              setAddressForm({
                                ...addressForm,
                                pincode: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono text-slate-800 outline-none focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-blue-500/10"
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
                            { label: "Home", icon: HomeIcon },
                            { label: "Work", icon: Briefcase },
                            { label: "Other", icon: Building },
                          ].map(({ label, icon: Icon }) => {
                            const isSelected = addressForm.type === label;
                            return (
                              <button
                                key={label}
                                type="button"
                                onClick={() =>
                                  setAddressForm({
                                    ...addressForm,
                                    type: label,
                                  })
                                }
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-brand-blue text-white shadow-xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}>
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
                          className="w-4 h-4 text-brand-blue rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
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
                              setAddressFormError("");
                            }}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingAddress}
                          className="px-5 py-2.5 text-xs font-bold bg-brand-blue hover:bg-blue-800 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50">
                          {savingAddress
                            ? "Saving Address…"
                            : "Use This Address"}
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
                <span>
                  Items ({cart.reduce((sum, item) => sum + item.qty, 0)})
                </span>
                <span className="text-slate-900 font-black">
                  ₹{cartTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-bold border-b border-slate-100 pb-2.5">
                <span>Delivery & Handling</span>
                <span className="text-emerald-600 font-black">FREE</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-slate-900">
                <span>Total Payable</span>
                <span className="text-base text-brand-blue">
                  ₹{cartTotal.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={!selectedAddress}
                className="w-full bg-brand-blue hover:bg-blue-800 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm mt-1 cursor-pointer active:scale-98 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
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
            className="flex flex-col gap-5 pb-12 text-left">
            {/* Header */}
            <div className="flex items-center justify-between px-1 -mt-2">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Choose Payment
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Select how you'd like to pay
                </p>
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
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Deliver to:{" "}
                        {selectedAddress.name || user?.name || "Customer"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {selectedAddress.type || "Home"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      {selectedAddress.house}
                      {selectedAddress.landmark
                        ? `, ${selectedAddress.landmark}`
                        : ""}
                      , {selectedAddress.city} - {selectedAddress.pincode}
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
                  onClick={() => navigate("/buy-new/address")}
                  className="text-xs font-black text-brand-blue hover:underline px-2.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors shrink-0 cursor-pointer">
                  Change
                </button>
              </div>
            )}

            {/* Order Summary Mini Card */}
            {cart.length > 0 && (
              <div className="bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-5 shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-blue-300 block">
                        Order Summary
                      </span>
                      <span className="text-xs font-black text-white">
                        {cart.length} Item{cart.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-[#FFD400]">
                    ₹{cartTotal.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs text-slate-300 font-medium">
                      <span className="truncate max-w-50 font-bold text-white">
                        {item.name}
                      </span>
                      <span>
                        ₹{item.price.toLocaleString()} x {item.qty}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                  <span className="flex items-center gap-1">
                    ✓ Free Delivery Included
                  </span>
                  <span className="bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-300">
                    Instant Dispatch
                  </span>
                </div>
              </div>
            )}

            {/* ─── 2-Option Payment Cards ─── */}
            <div className="space-y-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block px-1">
                Select Payment Method
              </span>

              {/* Option 1 — Pay on Delivery */}
              <div
                id="pay-on-delivery-option"
                onClick={() => setPaymentMode("COD")}
                className={`bg-white rounded-3xl p-5 transition-all shadow-xs cursor-pointer border-2 relative overflow-hidden ${
                  paymentMode === "COD"
                    ? "border-[#FF6B35] bg-linear-to-r from-orange-50/80 via-amber-50/40 to-white ring-4 ring-orange-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}>
                {paymentMode === "COD" && (
                  <div className="absolute top-0 right-0 bg-[#FF6B35] text-white text-[9px] font-black px-3 py-1 rounded-bl-2xl">
                    SELECTED
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                        paymentMode === "COD"
                          ? "bg-[#FF6B35] text-white"
                          : "bg-orange-50 text-orange-500"
                      }`}>
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          Pay on Delivery
                        </span>
                        <span className="bg-orange-100 text-orange-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-orange-200">
                          No Advance
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                        Pay cash when your order arrives at your door
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      paymentMode === "COD"
                        ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                        : "border-slate-300 bg-white"
                    }`}>
                    {paymentMode === "COD" && (
                      <Check size={14} className="stroke-[3]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2 — Pay Online */}
              <div
                id="pay-online-option"
                onClick={() => setPaymentMode("Online")}
                className={`bg-white rounded-3xl p-5 transition-all shadow-xs cursor-pointer border-2 relative overflow-hidden ${
                  paymentMode === "Online"
                    ? "border-brand-blue bg-linear-to-r from-blue-50/80 via-indigo-50/40 to-white ring-4 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}>
                {paymentMode === "Online" && (
                  <div className="absolute top-0 right-0 bg-brand-blue text-white text-[9px] font-black px-3 py-1 rounded-bl-2xl">
                    SELECTED
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-colors ${
                        paymentMode === "Online"
                          ? "bg-brand-blue text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                      <Zap
                        className="h-6 w-6"
                        fill={
                          paymentMode === "Online" ? "currentColor" : "none"
                        }
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          Pay Online
                        </span>
                        <span className="bg-blue-100 text-blue-700 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-blue-200">
                          Instant
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                        UPI, Cards, NetBanking via Razorpay
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      paymentMode === "Online"
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-slate-300 bg-white"
                    }`}>
                    {paymentMode === "Online" && (
                      <Check size={14} className="stroke-[3]" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {orderError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl flex items-center justify-between">
                <span>{orderError}</span>
                <button
                  onClick={() => setOrderError("")}
                  className="text-red-400 hover:text-red-700">
                  ✕
                </button>
              </div>
            )}

            {/* Price Details Breakdown */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Price Details
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 font-semibold">
                  <span>
                    Price ({cart.length} item{cart.length > 1 ? "s" : ""})
                  </span>
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
                  <span className="text-brand-blue">
                    ₹{cartTotal.toLocaleString()}
                  </span>
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
                  paymentMode === "COD"
                    ? "bg-linear-to-r from-[#FF6B35] to-[#E85D04] hover:from-[#E85D04] hover:to-[#D94E00]"
                    : "bg-linear-to-r from-brand-blue to-[#1565C0] hover:from-[#0B3C88] hover:to-brand-blue"
                }`}>
                {placingOrder ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing Order…</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>
                      {paymentMode === "COD"
                        ? `Confirm Order • ₹${cartTotal.toLocaleString()}`
                        : `Pay ₹${cartTotal.toLocaleString()} Online`}
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
            className="flex flex-col items-center gap-6 py-6 pb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-md">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-brand-navy leading-tight">
                Order Placed Successfully!
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 font-medium">
                Your brand new product is confirmed and will be shipped soon.
              </p>
            </div>

            {/* Success Details Receipt Card */}
            <div className="w-full bg-linear-to-br from-[#072C63] via-[#0B4EA2] to-[#3B82F6] rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden border border-white/10">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[9px] bg-[#FFD400] text-black font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    NIGAM STORE
                  </span>
                  <h4 className="text-base font-black mt-2.5">
                    Brand New Purchase
                  </h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <ShoppingCart className="h-5 w-5 text-[#FFD400]" />
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-white/10 pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Estimated Delivery:</span>
                  <span className="font-bold text-[#FFD400]">
                    Within 2-3 Days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Order ID:</span>
                  <span className="font-mono tracking-wider font-semibold">
                    {placedOrder?.humanId || placedOrder?.id || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Status:</span>
                  <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-400/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>{" "}
                    Processing
                  </span>
                </div>
                {selectedAddress && (
                  <div className="flex justify-between items-start pt-1 border-t border-white/10">
                    <span className="text-white/60">Delivering To:</span>
                    <span className="font-semibold text-right max-w-50 truncate text-white">
                      {selectedAddress.name || "Customer"},{" "}
                      {selectedAddress.city} ({selectedAddress.pincode})
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
                onClick={() => navigate("/buy")}
                className="w-full bg-[#072C63] hover:bg-blue-900 text-white font-black py-4 rounded-2xl transition-all shadow-md text-sm cursor-pointer active:scale-98">
                Back to Store
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-brand-navy font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer">
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky Bottom Tab Bar */}
      {!(step === 3 || step === 5 || step === 6) && <CustomerBottomNav />}

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
            className="bg-white rounded-t-[28px] w-full max-w-md p-5 pb-8 flex flex-col gap-4 text-left relative z-10 shadow-2xl">
            {/* Header */}
            <div className="border-b border-slate-100 pb-3">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block">
                SORT BY
              </span>
            </div>

            {/* Options list */}
            <div className="flex flex-col gap-2">
              {[
                { value: "relevance", label: "Relevance" },
                { value: "popularity", label: "Popularity" },
                { value: "low-to-high", label: "Price -- Low to High" },
                { value: "high-to-low", label: "Price -- High to Low" },
                { value: "newest", label: "Newest First" },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    setSortOption(opt.value);
                    setShowSortModal(false);
                  }}
                  className="flex justify-between items-center py-3 cursor-pointer group hover:bg-slate-50 px-2 rounded-xl transition-colors">
                  <span
                    className={`text-[13px] font-bold ${sortOption === opt.value ? "text-brand-blue" : "text-slate-800"}`}>
                    {opt.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      sortOption === opt.value
                        ? "border-brand-blue bg-white"
                        : "border-slate-300"
                    }`}>
                    {sortOption === opt.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── FULL-SCREEN FILTERS PAGE OVERLAY ──
          A bare `animate={{ x: 0 }}` with no `transition` picks framer-motion's
          default spring for a transform property, which is what made this
          feel bouncy — an explicit tween with an ease-out curve settles once,
          smoothly. AnimatePresence is what lets `exit` actually play instead
          of the panel just vanishing the instant showFilterPage flips false. */}
      <AnimatePresence>
        {showFilterPage && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 bg-white z-50 flex flex-col h-full text-left">
            {/* Header Bar */}
            <div className="bg-white px-5 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilterPage(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center cursor-pointer">
                  <ArrowLeft className="h-5 w-5 text-slate-700" />
                </button>
                <h1 className="text-sm font-extrabold text-slate-800">
                  Filters
                </h1>
              </div>
              <button
                onClick={() => setTempSelectedBrands([])}
                className="text-xs text-brand-blue font-black hover:text-blue-700 cursor-pointer">
                Clear Filters
              </button>
            </div>

            {/* Body Content Pane with Sidebar and Options */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Category Sidebar */}
              <div className="w-1/3 bg-slate-50 border-r border-slate-100 flex flex-col overflow-y-auto">
                {[
                  "Brand",
                  "Display Technology",
                  "Operating System",
                  "Resolution",
                  "Launch Year",
                  "Price",
                  "Customer Ratings",
                  "Smart Features",
                  "Refresh Rate",
                  "Number of USB Ports",
                  "Number of HDMI Ports",
                ].map((category, idx) => (
                  <div
                    key={idx}
                    className={`p-4 text-[11px] font-extrabold text-left border-l-4 transition-all cursor-pointer ${
                      category === "Brand"
                        ? "bg-white border-brand-blue text-brand-blue font-black shadow-xs"
                        : "border-transparent text-slate-600 hover:bg-slate-100/50"
                    }`}>
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
                  {Array.from(
                    new Set([
                      ...dynamicBrandList,
                      "LG",
                      "Samsung",
                      "Sony",
                      "Panasonic",
                      "Whirlpool",
                      "Daikin",
                      "Voltas",
                      "Godrej",
                      "Carrier",
                      "Hitachi",
                      "Blue Star",
                      "Haier",
                      "IFB",
                      "Bosch",
                      "TCL",
                      "XIAOMI",
                      "MOTOROLA",
                      "Thomson",
                      "TOSHIBA",
                      "iFFALCON",
                      ...tempSelectedBrands,
                      ...categoryProducts.map((p) => p.brand).filter(Boolean),
                    ]),
                  )
                    .filter((brand) =>
                      brand
                        .toLowerCase()
                        .includes(searchBrandQuery.toLowerCase()),
                    )
                    .map((brand) => {
                      const isChecked = tempSelectedBrands.includes(brand);
                      return (
                        <div
                          key={brand}
                          onClick={() => {
                            if (isChecked) {
                              setTempSelectedBrands(
                                tempSelectedBrands.filter((b) => b !== brand),
                              );
                            } else {
                              setTempSelectedBrands([
                                ...tempSelectedBrands,
                                brand,
                              ]);
                            }
                          }}
                          className="flex items-center gap-3 py-1 cursor-pointer group">
                          <div
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? "bg-[#F95F06] border-[#F95F06]"
                                : "border-slate-300 group-hover:border-slate-400"
                            }`}>
                            {isChecked && (
                              <Check size={12} className="text-white" />
                            )}
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
                {tempSelectedBrands.length > 0
                  ? `${
                      categoryProducts.filter((product) =>
                        tempSelectedBrands.some(
                          (brand) =>
                            (product.name &&
                              product.name
                                .toLowerCase()
                                .includes(brand.toLowerCase())) ||
                            (product.brand &&
                              product.brand
                                .toLowerCase()
                                .includes(brand.toLowerCase())),
                        ),
                      ).length
                    } products found`
                  : `${categoryProducts.length} products found`}
              </span>
              <button
                onClick={() => {
                  setSelectedBrands(tempSelectedBrands);
                  setShowFilterPage(false);
                }}
                className="bg-[#F95F06] hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl text-xs font-black transition-colors shadow-md cursor-pointer active:scale-97">
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exchange Wizard Modal */}
      <ExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        product={{ ...finalProduct, category: finalCategory }}
        config={productExchangeConfig}
        onApply={(details) =>
          setExchangeApplied({ ...details, productId: finalProduct.id })
        }
      />

      {/* ── PHOTO LIGHTBOX PREVIEW MODAL ── */}
      {activeLightboxImg && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute -top-12 right-0 text-white bg-white/20 hover:bg-white/30 rounded-full w-10 h-10 flex items-center justify-center transition-colors cursor-pointer">
              <X size={20} />
            </button>
            <img
              src={activeLightboxImg}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              alt="Customer Lightbox Preview"
            />
          </div>
        </div>
      )}

      {/* ── CART REMOVAL CONFIRMATION MODAL ── */}
      {cartRemovalConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              {cartRemovalConfirm.type === "clear"
                ? "Clear your entire cart?"
                : "Remove this item?"}
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
              {cartRemovalConfirm.type === "clear"
                ? "All items will be removed from your cart. This can't be undone."
                : `"${cartRemovalConfirm.item?.name}" will be removed from your cart.`}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setCartRemovalConfirm(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (cartRemovalConfirm.type === "clear") clearCart();
                  else removeFromCart(cartRemovalConfirm.item.id);
                  setCartRemovalConfirm(null);
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-2xl text-xs transition-all cursor-pointer">
                {cartRemovalConfirm.type === "clear" ? "Clear All" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WRITE A REVIEW MODAL ── */}
      {isWriteReviewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-800">
                Write Product Review
              </h3>
              <button
                onClick={() => setIsWriteReviewOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
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
                      className="p-1 hover:scale-110 transition-transform cursor-pointer">
                      <Star
                        size={24}
                        fill={star <= newRatingVal ? "currentColor" : "none"}
                        className={
                          star <= newRatingVal
                            ? "text-yellow-400"
                            : "text-slate-300"
                        }
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
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-brand-blue"
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
                      <img
                        src={newReviewPhoto}
                        className="h-full rounded-lg object-contain"
                        alt="Preview"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setNewReviewPhoto(null);
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={20} className="text-brand-blue mb-1" />
                      <span className="text-xs text-slate-600 font-bold">
                        Click to attach photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Stored on Cloudinary; the review keeps only the URL.
                            uploadImage(file)
                              .then(setNewReviewPhoto)
                              .catch((err) => alert(err.message || "Photo upload failed."));
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
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 text-xs font-bold bg-brand-blue hover:bg-blue-800 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50">
                  {submittingReview ? "Submitting..." : "Submit Review"}
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
