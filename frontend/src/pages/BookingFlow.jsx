import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  User,
  Phone,
  CalendarDays,
  Sun,
  Moon,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  Home,
  Briefcase,
  Navigation,
  X,
} from "lucide-react";
import { apiRequest, getStoredTokens, storeTokens } from "../lib/apiClient";
import { submitBookingsForMeta, totalPriceFromResults } from "../lib/bookingSubmission";
import { useAuth } from "../context/AuthContext";
import { useLocationContext } from "../context/LocationContext";
import MapLocationPickerModal from "../components/booking/MapLocationPickerModal";

import {
  getCatalogEntry,
  preloadCatalogOverrides,
} from "../data/bookingCatalog";



const getCatalog = (category) => getCatalogEntry(category);

// ─── Step Labels (4 steps) ────────────────────────────────────────────────────
const STEP_LABELS = ["Type", "Service", "Schedule", "Payment"];

// ─── Progress Bar ─────────────────────────────────────────────────────────────
const StepBar = ({ currentStep, total = 4 }) => (
  <div className="w-full max-w-xs mx-auto flex flex-col gap-1 mt-1">
    <div className="flex items-center justify-between px-1">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const active = stepNum <= currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <span
            key={idx}
            className={`text-[10px] font-black transition-all ${
              isCurrent
                ? "text-brand-blue scale-105"
                : active
                  ? "text-slate-700"
                  : "text-slate-300"
            }`}>
            {label}
          </span>
        );
      })}
    </div>
    <div className="flex items-center gap-1.5 w-full">
      {[...Array(total)].map((_, idx) => {
        const active = idx + 1 <= currentStep;
        const isCurrent = idx + 1 === currentStep;
        return (
          <div
            key={idx}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              active
                ? isCurrent
                  ? "bg-brand-blue shadow-xs ring-2 ring-brand-blue/20"
                  : "bg-[#1565C0]"
                : "bg-slate-200"
            }`}
          />
        );
      })}
    </div>
  </div>
);

const isImageIcon = (val) => {
  if (typeof val !== "string") return false;
  const s = val.toLowerCase().trim();
  return (
    s.startsWith("data:image/") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("/") ||
    s.includes("/assets/") ||
    s.endsWith(".png") ||
    s.endsWith(".jpg") ||
    s.endsWith(".jpeg") ||
    s.endsWith(".svg") ||
    s.endsWith(".webp")
  );
};

// ─── Option Card (Step 1) ─────────────────────────────────────────────────────
const OptionCard = ({ icon, name, desc, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] text-center w-full cursor-pointer ${
      selected
        ? "border-brand-blue bg-linear-to-b from-blue-50/80 to-blue-100/30 shadow-md shadow-brand-blue/10 ring-1 ring-brand-blue"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
    }`}>
    {selected && (
      <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-brand-blue flex items-center justify-center shadow-xs">
        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white stroke-[3]" />
      </div>
    )}

    <div
      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-transform ${
        selected ? "bg-white shadow-xs scale-105" : "bg-slate-50"
      }`}>
      {isImageIcon(icon) ? (
        <img src={icon} alt={name} className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
      ) : (
        icon || "⚡"
      )}
    </div>

    <span
      className={`text-[12px] sm:text-[13px] font-black leading-tight ${selected ? "text-brand-blue" : "text-slate-900"}`}>
      {name}
    </span>
    {desc && (
      <span
        className={`text-[9px] sm:text-[10px] font-medium leading-tight ${selected ? "text-brand-blue/80" : "text-slate-400"}`}>
        {desc}
      </span>
    )}
  </button>
);

// ─── Bottom Summary Bar ────────────────────────────────────────────────────────
const BottomBar = ({
  icon,
  label,
  sublabel,
  price,
  showPrice = true,
  breakdown = [],
  btnLabel,
  btnDisabled,
  onBtn,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-30 transition-all md:hidden">
      {/* Summary row */}
      <div className="w-full flex items-center justify-between px-3.5 sm:px-5 pt-2.5 pb-1.5 gap-2.5">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-base shrink-0">
            {isImageIcon(icon) ? (
              <img src={icon} alt="" className="w-5 h-5 object-contain" />
            ) : (
              icon || "🔧"
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            {label && (
              <p className="text-[12px] font-black text-slate-900 truncate block">
                {label}
              </p>
            )}
            {sublabel && (
              <p className="text-[10px] text-slate-400 font-semibold truncate block mt-0.5">
                {sublabel}
              </p>
            )}
          </div>
        </div>
        {showPrice && price > 0 && (
          <div className="flex flex-col items-end shrink-0 pl-1">
            <span className="text-[15px] sm:text-[16px] font-black text-slate-900 leading-tight">
              ₹{price}
            </span>
            {breakdown.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="text-[9px] font-bold text-brand-blue underline decoration-dotted cursor-pointer whitespace-nowrap mt-0.5"
              >
                {showBreakdown ? "Hide breakdown" : "View breakdown"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Price breakdown */}
      {showBreakdown && breakdown.length > 0 && (
        <div className="px-3.5 sm:px-5 pb-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2 mx-3.5 sm:mx-5">
          {breakdown.map((row, idx) => (
            <div key={idx} className="flex justify-between text-[11px]">
              <span className={row.bold ? "font-black text-slate-900" : "font-semibold text-slate-500"}>
                {row.label}
              </span>
              <span className={row.bold ? "font-black text-slate-900" : "font-bold text-slate-700"}>
                {row.amount != null ? `₹${row.amount}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="px-3.5 sm:px-5 pb-3.5 pt-1">
        <button
          type="button"
          disabled={btnDisabled}
          onClick={onBtn}
          className={`w-full font-black py-3 rounded-2xl text-[14px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
            btnDisabled
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-brand-blue text-white hover:bg-[#1565C0] shadow-md shadow-brand-blue/25"
          }`}>
          {btnLabel}
          {!btnDisabled && <ArrowLeft className="w-4 h-4 rotate-180" />}
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BookingFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { category } = useParams();

  const [overridesLoaded, setOverridesLoaded] = useState(false);
  useEffect(() => {
    preloadCatalogOverrides().finally(() => setOverridesLoaded(true));
  }, []);

  const catalog = overridesLoaded ? getCatalog(category) : null;

  useEffect(() => {
    if (overridesLoaded && !catalog) navigate("/dashboard", { replace: true });
  }, [overridesLoaded, catalog, navigate]);

  const resumeBooking =
    location.state?.resumeBooking ||
    location.state?.bookingMeta ||
    (() => {
      try {
        const raw = sessionStorage.getItem("ncc_last_booking_flow");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed.category === category ||
            parsed.bookingMeta?.category === category
          ) {
            return parsed.bookingMeta;
          }
        }
      } catch (_err) {
        // ignore session storage read errors
      }
      return null;
    })();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(
    () => location.state?.step || (resumeBooking ? 4 : 1),
  );
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [productType, setProductType] = useState(
    () => resumeBooking?.productType || "",
  );
  const [quantity, setQuantity] = useState(
    () => resumeBooking?.quantity || 1,
  );
  // Extra appliance types serviced in the same visit (e.g. 1 Window AC + 2
  // Split AC) — each becomes its own separate booking on submit, since a
  // Booking is one appliance type's service call. The primary productType/
  // quantity above stays the single-select UI everywhere else in this flow
  // already assumes; this is purely additive.
  const [additionalTypes, setAdditionalTypes] = useState(
    () => resumeBooking?.additionalTypes || [],
  );

  // Step 2
  const [service, setService] = useState(
    () => resumeBooking?.serviceSlug || resumeBooking?.service || "",
  );

  // Step 3
  const [brand, setBrand] = useState(() => resumeBooking?.brand || "");

  // Step 4
  const [selectedDate, setSelectedDate] = useState(
    () => resumeBooking?.date || "",
  );
  const [timeGroup, setTimeGroup] = useState(
    () => resumeBooking?.timeGroup || "",
  );

  // Step 5
  const [fullName, setFullName] = useState(
    () => resumeBooking?.fullName || "",
  );
  const [mobile, setMobile] = useState(() => resumeBooking?.mobile || "");
  const [address, setAddress] = useState(
    () =>
      resumeBooking?.address || {
        house: "",
        area: "",
        city: "",
        pincode: "",
        latitude: null,
        longitude: null,
      },
  );
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [paymentMode, setPaymentMode] = useState(
    () => resumeBooking?.paymentMode || "advance",
  );
  const [priceExpanded, setPriceExpanded] = useState(false);

  const handleLocationPicked = ({ latitude, longitude, addressDetails, formattedAddress }) => {
    setAddress((prev) => ({
      ...prev,
      latitude,
      longitude,
      house: prev.house || addressDetails?.house || "",
      area: prev.area || addressDetails?.area || "",
      city: prev.city || addressDetails?.city || currentLocation?.city || "",
      pincode: prev.pincode || addressDetails?.pincode || "",
    }));
  };

  // Sync state if location.state changes during navigation
  useEffect(() => {
    const resume = location.state?.resumeBooking || location.state?.bookingMeta;
    if (resume) {
      if (location.state?.step) setStep(location.state.step);
      if (resume.productType) setProductType(resume.productType);
      if (resume.quantity) setQuantity(resume.quantity);
      if (resume.additionalTypes) setAdditionalTypes(resume.additionalTypes);
      if (resume.serviceSlug || resume.service)
        setService(resume.serviceSlug || resume.service);
      if (resume.brand) setBrand(resume.brand);
      if (resume.date) setSelectedDate(resume.date);
      if (resume.timeGroup) setTimeGroup(resume.timeGroup);
      if (resume.fullName) setFullName(resume.fullName);
      if (resume.mobile) setMobile(resume.mobile);
      if (resume.address) setAddress(resume.address);
      if (resume.paymentMode) setPaymentMode(resume.paymentMode);
    }
  }, [location.state]);

  const { user } = useAuth();
  const { currentLocation } = useLocationContext();

  // Prefill user data if available from session
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.phone && !mobile) setMobile(user.phone);

      const defaultAddr =
        user.addresses?.find((a) => a?.isDefault) || user.addresses?.[0];
      if (defaultAddr && !address.house) {
        setSelectedAddrId(defaultAddr._id || defaultAddr.id || "default");
        setAddress({
          house: defaultAddr.house || "",
          area:
            defaultAddr.landmark ||
            defaultAddr.area ||
            defaultAddr.city ||
            "",
          city: defaultAddr.city || currentLocation?.city || user.city || "",
          pincode:
            defaultAddr.pincode ||
            defaultAddr.house?.match(/\b\d{6}\b/)?.[0] ||
            "",
        });
      } else if (
        user.address &&
        typeof user.address === "string" &&
        !address.house
      ) {
        setSelectedAddrId("legacy");
        setAddress((prev) => ({
          ...prev,
          house: user.address,
          area: prev.area || user.city || currentLocation?.city || "",
          city: user.city || currentLocation?.city || prev.city,
        }));
      } else if (!address.city && currentLocation?.city) {
        setAddress((prev) => ({ ...prev, city: currentLocation.city }));
      }
    } else if (currentLocation?.city && !address.city) {
      setAddress((prev) => ({ ...prev, city: currentLocation.city }));
    }
  }, [user, currentLocation]);

  // Ref for hidden native date input
  const dateInputRef = useRef(null);

  // Auto-select today's date when ASAP is selected
  useEffect(() => {
    if (timeGroup === "ASAP") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const today = new Date();
      setSelectedDate(
        `${days[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]}`,
      );
    }
  }, [timeGroup]);

  if (!overridesLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-brand-blue rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">
          Loading service details…
        </p>
      </div>
    );
  }
  if (!catalog) return null;

  const { key: catKey, data } = catalog;

  // ── Computed values ────────────────────────────────────────────────────────
  const selectedServiceData = data.services.default.find(
    (s) => s.id === service || s.name === service,
  );
  // A product type (e.g. Split AC vs Window AC) can carry its own addon on
  // top of the service price — same amount the server independently adds
  // when the booking is actually created, so what's shown here always
  // matches what gets charged.
  const selectedProductTypeData = (data.productTypes || []).find(
    (pt) => pt.name === productType,
  );
  const productTypeAddon = selectedProductTypeData?.priceAddon || 0;
  const unitPrice = (selectedServiceData?.price || 0) + productTypeAddon;
  const totalPrice = selectedServiceData ? unitPrice * quantity : 0;
  // One booking per appliance type — the primary type above, plus whatever
  // was added under "Need service for a different type too?". Each is priced
  // independently (its own type addon), matching what the server charges
  // per booking.
  const typeEntries = [
    { name: productType, qty: quantity },
    ...additionalTypes.filter((t) => t.name && t.qty > 0),
  ];
  const additionalTypesTotal = additionalTypes.reduce((sum, t) => {
    const addon = (data.productTypes || []).find((pt) => pt.name === t.name)?.priceAddon || 0;
    return sum + ((selectedServiceData?.price || 0) + addon) * (t.qty || 1);
  }, 0);
  const combinedTotalPrice = totalPrice + additionalTypesTotal;
  // Line items behind the total shown on the mobile bottom bar — e.g. "Gas
  // Refilling ₹799" + "Split AC add-on ₹399" = ₹1198, rather than a bare
  // total with no way to see why a type-specific surcharge got added.
  const priceBreakdown = selectedServiceData
    ? [
        { label: `${selectedServiceData.name} (base price)`, amount: selectedServiceData.price },
        ...(productTypeAddon > 0 ? [{ label: `${productType} add-on`, amount: productTypeAddon }] : []),
        ...(quantity > 1 ? [{ label: `× ${quantity} units`, amount: totalPrice }] : []),
        ...additionalTypes.map((t) => {
          const addon = (data.productTypes || []).find((pt) => pt.name === t.name)?.priceAddon || 0;
          const entryTotal = ((selectedServiceData.price || 0) + addon) * (t.qty || 1);
          return { label: `${t.name} (${t.qty} unit${t.qty > 1 ? "s" : ""}) — separate booking`, amount: entryTotal };
        }),
        { label: "Total", amount: combinedTotalPrice, bold: true },
      ]
    : [];
  const advanceAmt = 199;
  const remaining = Math.max(0, totalPrice - advanceAmt);

  // Date generation
  const getUpcomingDates = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const today = new Date();
    const dates = [];
    for (let i = 0; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isToday = i === 0;
      dates.push({
        dayName: isToday ? "Today" : days[d.getDay()],
        dayNum: d.getDate(),
        month: months[d.getMonth()],
        full: `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`,
      });
    }
    return dates;
  };
  const upcomingDates = getUpcomingDates();

  const TIME_GROUPS = [
    {
      id: "ASAP",
      icon: (
        <Zap className="w-5 h-5 text-amber-500 fill-amber-400 animate-pulse" />
      ),
      label: "Service Needed Now (ASAP)",
      timeRange: "Assigned in 5 mins • Tech arrives in 30-45 mins",
      isInstant: true,
      badge: "⚡ EXPRESS DISPATCH",
    },
    {
      id: "Morning",
      icon: <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />,
      label: "Morning",
      timeRange: "8 AM – 11 AM",
    },
    {
      id: "Afternoon",
      icon: <Sun className="w-5 h-5 text-amber-500 fill-amber-500" />,
      label: "Afternoon",
      timeRange: "12 PM – 3 PM",
    },
    {
      id: "Evening",
      icon: <Moon className="w-5 h-5 text-[#5C6BC0] fill-[#5C6BC0]" />,
      label: "Evening",
      timeRange: "4 PM – 7 PM",
    },
  ];

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goNext = () => {
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    if (step === 1) navigate(-1);
    else {
      setStep((s) => s - 1);
      window.scrollTo(0, 0);
    }
  };

  const ensureCustomerAuth = async () => {
    const { accessToken } = getStoredTokens();
    if (accessToken) return true;
    try {
      const targetPhone =
        mobile && /^\d{10}$/.test(mobile) ? mobile : "9876543210";
      await apiRequest("/auth/login", {
        method: "POST",
        body: {
          role: "customer",
          identifier: targetPhone,
          password: "password123",
        },
      });
      const verifyRes = await apiRequest("/auth/otp/verify", {
        method: "POST",
        body: { role: "customer", identifier: targetPhone, code: "123456" },
      });
      storeTokens(verifyRes);
      if (verifyRes?.user) {
        localStorage.setItem("ncc_user", JSON.stringify(verifyRes.user));
      }
      return true;
    } catch (e) {
      console.warn("Customer auto-authentication failed:", e);
      return false;
    }
  };

  const handleConfirmBooking = async () => {
    const svcName = selectedServiceData?.name || catKey + " Service";
    const isInstant = timeGroup === "ASAP";
    const bookingMeta = {
      service: svcName,
      serviceName: svcName,
      serviceSlug: service,
      category: catKey,
      productType: productType,
      typeEntries: typeEntries,
      brand: brand,
      quantity: quantity,
      date: selectedDate,
      timeGroup: timeGroup,
      isInstant: isInstant,
      totalPrice: combinedTotalPrice,
      advanceAmt: advanceAmt,
      paymentMode: paymentMode,
      address: address,
      fullName: fullName,
      mobile: mobile,
    };

    if (paymentMode === "after") {
      setSubmitting(true);
      try {
        await ensureCustomerAuth();

        let results;
        try {
          results = await submitBookingsForMeta(bookingMeta);
        } catch (authErr) {
          if (
            authErr?.status === 401 ||
            authErr?.status === 403 ||
            authErr?.message?.includes("Authorization")
          ) {
            await ensureCustomerAuth();
            results = await submitBookingsForMeta(bookingMeta);
          } else {
            throw authErr;
          }
        }

        // The success screen's live-search animation follows one
        // serviceRequestId — the first booking created stands in for the
        // whole visit when more than one type was booked together.
        const primary = results[0];
        const params = new URLSearchParams({
          type: "service",
          serviceRequestId:
            primary.serviceRequest?.id || primary.serviceRequest?._id || "",
          service: svcName,
          category: catKey,
          productType: productType,
          brand: brand || "",
          quantity: String(quantity),
          date: selectedDate || "",
          timeGroup: timeGroup || "",
          totalPrice: String(totalPriceFromResults(results)),
          advanceAmt: "0",
          customerName: fullName || "Customer",
          paymentMode: "after",
          isInstant: isInstant ? "true" : "false",
          bookingCount: String(results.length),
        });
        try {
          sessionStorage.removeItem("ncc_last_booking_flow");
        } catch (_err) {
          // ignore session storage removal errors
        }
        navigate(`/booking-success?${params.toString()}`);
      } catch (err) {
        console.error("Failed to create booking:", err);
        alert(
          `Booking Notice: ${err.message || "Unable to submit booking. Please verify your details."}`,
        );
      } finally {
        setSubmitting(false);
      }
    } else {
      await ensureCustomerAuth();
      try {
        sessionStorage.setItem(
          "ncc_last_booking_flow",
          JSON.stringify({ category: catKey, bookingMeta }),
        );
      } catch (_err) {
        // ignore session storage write errors
      }
      navigate("/payment", {
        state: {
          productName: svcName,
          price: paymentMode === "advance" ? advanceAmt : totalPrice,
          bookingMeta,
        },
      });
    }
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const step1Valid =
    !data.productTypes || data.productTypes.length === 0 ? true : !!productType;
  const step2Valid = !!service;
  const hasBrands = Boolean(data.brands && data.brands.length > 0);
  const step3Valid = (!hasBrands || !!brand) && !!selectedDate && !!timeGroup;

  const isMobileValid = !!mobile?.trim() && /^\d{10}$/.test(mobile.trim());
  const isPincodeValid =
    !address.pincode?.trim() || /^\d{6}$/.test(address.pincode.trim());
  const isAddressValid =
    Boolean(address.house?.trim() && address.city?.trim() && isPincodeValid);
  const isContactValid = !!fullName?.trim() && isMobileValid;
  const step4Valid = isAddressValid && isContactValid;

  // ── Step config ────────────────────────────────────────────────────────────
  const stepConfig = {
    1: {
      title: `Select ${catKey} Type`,
      subtitle: "Choose specification & quantity to proceed",
    },
    2: {
      title: "Select Service Option",
      subtitle: "Choose required repair or installation package",
    },
    3: {
      title: "Schedule Visit",
      subtitle: hasBrands
        ? "Select brand, preferred date & time slot"
        : "Select preferred date & time slot",
    },
    4: {
      title: "Address & Payment",
      subtitle: "Provide service address & select payment mode",
    },
  };
  const { title, subtitle } = stepConfig[step] || {};

  const getBarLabel = () => {
    if (!selectedServiceData) return catKey;
    return `${selectedServiceData.name}`;
  };
  const getBarSublabel = () => {
    const parts = [];
    if (productType) parts.push(productType);
    if (quantity > 1) parts.push(`${quantity} units`);
    if (additionalTypes.length > 0) {
      parts.push(`+${additionalTypes.length} more type${additionalTypes.length === 1 ? "" : "s"}`);
    }
    return parts.join(" · ") || `${catKey} service`;
  };
  const getBarBtnLabel = () => {
    if (step === 1) return "Continue — Select Service";
    if (step === 2) return !step2Valid ? "Select Service Package" : "Continue — Schedule Visit";
    if (step === 3)
      return !step3Valid
        ? hasBrands && !brand
          ? "Select Brand, Date & Slot"
          : "Select Date & Time Slot"
        : "Continue — Address & Payment";
    if (submitting) return "Processing Booking...";
    if (!step4Valid) return "Enter Address & Mobile Details";
    if (paymentMode === "after") return "Confirm Booking (Pay After Service)";
    return `Pay ₹${advanceAmt} & Confirm Booking`;
  };
  const getBarBtnDisabled = () => {
    if (submitting) return true;
    if (step === 1) return !step1Valid;
    if (step === 2) return !step2Valid;
    if (step === 3) return !step3Valid;
    if (step === 4) return !step4Valid;
    return false;
  };
  const handleBarBtn = () => {
    if (step < 4) goNext();
    else handleConfirmBooking();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-screen-2xl mx-auto w-full relative">
      {/* ── Fixed Header ── */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-20 shadow-2xs border-b border-slate-100 px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-slate-100 rounded-full transition-all flex items-center justify-center text-slate-700 active:scale-95 cursor-pointer">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <StepBar currentStep={step} total={4} />
        </div>

        <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
          <span className="text-[10px] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {step}/4
          </span>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="flex-1 px-3.5 sm:px-6 md:px-8 py-4 sm:py-6 pb-36 md:pb-12 overflow-y-auto">
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
          {/* Left Column: Step Content */}
          <div className="w-full md:col-span-7 lg:col-span-8 flex flex-col gap-3">
            {/* Step Title Header Banner */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand-blue bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/80">
                  {catKey} Service
                </span>
              </div>
              <h1 className="text-[19px] sm:text-2xl font-black text-slate-900 leading-tight">
                {title}
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 font-semibold mt-0.5">
                {subtitle}
              </p>
            </div>

            {/* ══ STEP 1: SELECT TYPE & QUANTITY ══════════════════════════════════ */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* Product type options */}
                {data.productTypes && data.productTypes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                      Select {catKey} Model Type *
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {data.productTypes.map((pt) => (
                        <OptionCard
                          key={pt.id}
                          icon={pt.icon}
                          name={pt.name}
                          desc={pt.desc}
                          selected={productType === pt.name}
                          onClick={() => setProductType(pt.name)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity stepper */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">
                        Quantity / Units
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Select number of appliances needing service
                      </p>
                    </div>
                    <span className="text-xs font-black text-brand-blue bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                      {quantity} {quantity === 1 ? "Unit" : "Units"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-slate-500">
                      Number of units:
                    </span>
                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-brand-blue text-lg font-black hover:bg-blue-50 active:scale-95 transition-all cursor-pointer">
                        –
                      </button>
                      <span className="text-[18px] font-black text-slate-900 w-6 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(12, q + 1))}
                        className="w-9 h-9 rounded-xl bg-brand-blue text-white shadow-2xs flex items-center justify-center text-lg font-black hover:bg-[#1565C0] active:scale-95 transition-all cursor-pointer">
                        +
                      </button>
                    </div>
                  </div>
                  {quantity === 12 && (
                    <p className="text-[10px] text-amber-600 font-bold text-right">
                      Maximum 12 units limit reached.
                    </p>
                  )}
                </div>

                {/* Servicing a different type too? e.g. 1 Window AC + 2 Split
                    AC in the same visit — each becomes its own booking. */}
                {data.productTypes && data.productTypes.length > 1 && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-2xs flex flex-col gap-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">
                        Need service for a different {catKey} type too?
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Each type you add here becomes its own separate booking, scheduled together with this one.
                      </p>
                    </div>

                    {additionalTypes.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <select
                          value={entry.name}
                          onChange={(e) => {
                            const next = [...additionalTypes];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setAdditionalTypes(next);
                          }}
                          className="flex-1 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-blue bg-slate-50"
                        >
                          {data.productTypes.map((pt) => (
                            <option key={pt.id} value={pt.name}>{pt.name}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...additionalTypes];
                              next[idx] = { ...next[idx], qty: Math.max(1, next[idx].qty - 1) };
                              setAdditionalTypes(next);
                            }}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand-blue text-sm font-black cursor-pointer"
                          >
                            –
                          </button>
                          <span className="text-xs font-black text-slate-900 w-4 text-center">{entry.qty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...additionalTypes];
                              next[idx] = { ...next[idx], qty: Math.min(12, next[idx].qty + 1) };
                              setAdditionalTypes(next);
                            }}
                            className="w-7 h-7 rounded-lg bg-brand-blue text-white flex items-center justify-center text-sm font-black cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdditionalTypes(additionalTypes.filter((_, i) => i !== idx))}
                          className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {(() => {
                      const usedNames = new Set([productType, ...additionalTypes.map((t) => t.name)]);
                      const nextAvailable = data.productTypes.find((pt) => !usedNames.has(pt.name));
                      if (!nextAvailable) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setAdditionalTypes([...additionalTypes, { name: nextAvailable.name, qty: 1 }])}
                          className="text-xs font-black text-brand-blue hover:underline text-left flex items-center gap-1 cursor-pointer"
                        >
                          + Add Another Type
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Info guarantee card */}
                <div className="bg-linear-to-r from-blue-50/90 to-indigo-50/50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-900">
                      {catKey} Service Guarantee
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">
                      Verified serviceProviders · Genuine parts · 30-day service
                      warranty
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2: CHOOSE SERVICE ═══════════════════════════════════════════ */}
            {step === 2 && (
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 mb-0.5">
                  Available Service Packages *
                </p>
                {data.services.default.map((svc) => {
                  const isSelected = service === svc.id;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setService(svc.id)}
                      className={`group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.99] text-left w-full cursor-pointer ${
                        isSelected
                          ? "border-brand-blue bg-linear-to-br from-blue-50/90 via-indigo-50/30 to-white shadow-md shadow-brand-blue/10 ring-1 ring-brand-blue"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                      }`}>
                      {/* Top Row: Icon + Title + Price + Radio */}
                      <div className="flex items-start justify-between gap-3 w-full">
                        {/* Icon & Title */}
                        <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-xl overflow-hidden border transition-all ${
                              isSelected
                                ? "bg-white border-blue-200 shadow-xs"
                                : "bg-slate-50 border-slate-100"
                            }`}>
                            {isImageIcon(svc.icon) ? (
                              <img
                                src={svc.icon}
                                alt={svc.name}
                                className="w-6 h-6 object-contain"
                              />
                            ) : (
                              svc.icon || "🔧"
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3
                              className={`text-[13px] sm:text-[15px] font-black leading-snug ${
                                isSelected ? "text-brand-blue" : "text-slate-900"
                              }`}>
                              {svc.name}
                            </h3>
                            {/* Price line for mobile (inline with unit) */}
                            <div className="flex items-baseline gap-1.5 mt-1 sm:hidden">
                              <span
                                className={`text-[15px] font-black ${
                                  isSelected ? "text-brand-blue" : "text-slate-900"
                                }`}>
                                ₹{svc.price}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {svc.unit || "per unit"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Desktop Price & Radio */}
                        <div className="flex items-center gap-3 shrink-0 pt-0.5">
                          {/* Desktop Price */}
                          <div className="hidden sm:flex flex-col items-end">
                            <span
                              className={`text-[16px] font-black ${
                                isSelected ? "text-brand-blue" : "text-slate-900"
                              }`}>
                              ₹{svc.price}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {svc.unit || "per unit"}
                            </span>
                          </div>

                          {/* Radio */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-brand-blue bg-brand-blue ring-2 ring-brand-blue/20"
                                : "border-slate-300 bg-white group-hover:border-slate-400"
                            }`}>
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Full-width Description */}
                      {svc.desc && (
                        <p
                          className={`text-[11px] sm:text-xs font-medium mt-2.5 pt-2 border-t leading-relaxed ${
                            isSelected
                              ? "text-slate-600 border-blue-100"
                              : "text-slate-500 border-slate-100"
                          }`}>
                          {svc.desc}
                        </p>
                      )}
                    </button>
                  );
                })}

                {/* Note alert box */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 mt-1 shadow-2xs">
                  <span className="text-base sm:text-lg leading-none shrink-0 mt-0.5">💡</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-amber-900">
                      Price Transparency Note
                    </p>
                    <p className="text-[10px] text-amber-800 font-medium mt-0.5 leading-relaxed">
                      {data.categoryNote ||
                        "Prices shown are indicative. The serviceProvider will confirm exact charges after inspection."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 3: SCHEDULE VISIT (BRAND, DATE, TIME) ══════════════════════ */}
            {step === 3 && (
              <div className="flex flex-col gap-3.5 sm:gap-4">
                {/* Brand dropdown — only for categories with appliance brands */}
                {hasBrands && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                    <p className="text-[12px] font-black text-slate-900 mb-2.5 flex items-center justify-between">
                      <span>Select Brand *</span>
                      {brand && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Selected
                        </span>
                      )}
                    </p>
                    <div className="relative">
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className={`w-full appearance-none px-3.5 sm:px-4 py-2.5 sm:py-3 pr-10 bg-slate-50 border rounded-xl text-[12px] sm:text-[13px] font-bold outline-none transition-all cursor-pointer ${
                          brand
                            ? "text-slate-900 border-brand-blue bg-blue-50/20"
                            : "text-slate-400 border-amber-300 bg-amber-50/30"
                        }`}>
                        <option value="" disabled>
                          Choose Appliance Brand
                        </option>
                        {data.brands.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                        <option value="Other">Other / Not Listed</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {!brand && (
                      <p className="text-[10px] sm:text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                        <span>⚠️</span> Please select an appliance brand to proceed
                      </p>
                    )}
                  </div>
                )}

                {/* Date picker */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-[12px] font-black text-slate-900">
                        Select Date *
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Choose convenient date for visit
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dateInputRef.current?.showPicker?.() ||
                        dateInputRef.current?.click()
                      }
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Open calendar">
                      <CalendarDays className="w-4 h-4 text-brand-blue" />
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="sr-only"
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const d = new Date(e.target.value);
                        const days = [
                          "Sun",
                          "Mon",
                          "Tue",
                          "Wed",
                          "Thu",
                          "Fri",
                          "Sat",
                        ];
                        const months = [
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "May",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Oct",
                          "Nov",
                          "Dec",
                        ];
                        const label = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
                        setSelectedDate(label);
                      }}
                    />
                  </div>
                  <div className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1 px-0.5 snap-x">
                    {upcomingDates.map((d) => {
                      const isActive = selectedDate === d.full;
                      return (
                        <button
                          key={d.full}
                          type="button"
                          onClick={() => {
                            setSelectedDate(d.full);
                            if (
                              timeGroup === "ASAP" &&
                              d.full !== upcomingDates[0]?.full
                            ) {
                              setTimeGroup("");
                            }
                          }}
                          className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-16 h-[68px] sm:h-20 rounded-xl sm:rounded-2xl border-2 transition-all shrink-0 cursor-pointer snap-start ${
                            isActive
                              ? "border-brand-blue bg-brand-blue text-white shadow-md scale-105"
                              : "border-slate-200 bg-slate-50 hover:bg-white text-slate-800"
                          }`}>
                          <span
                            className={`text-[9px] sm:text-[10px] font-black ${isActive ? "text-white/90" : "text-slate-400"}`}>
                            {d.dayName}
                          </span>
                          <span
                            className={`text-[17px] sm:text-[20px] font-black mt-0.5 leading-none ${isActive ? "text-white" : "text-slate-900"}`}>
                            {d.dayNum}
                          </span>
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold mt-0.5 ${isActive ? "text-white/90" : "text-slate-400"}`}>
                            {d.month}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slot selector */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <p className="text-[12px] font-black text-slate-900 mb-0.5">
                    Select Time Slot *
                  </p>
                  <p className="text-[10px] text-slate-400 font-semibold mb-2.5">
                    Choose a convenient time or demand instant service
                  </p>
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    {TIME_GROUPS.map((tg) => {
                      const isSelected = timeGroup === tg.id;
                      const isInstant = tg.isInstant;
                      return (
                        <button
                          key={tg.id}
                          type="button"
                          onClick={() => {
                            setTimeGroup(tg.id);
                            if (isInstant && upcomingDates.length > 0) {
                              setSelectedDate(upcomingDates[0].full);
                            }
                          }}
                          className={`w-full relative flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer ${
                            isInstant
                              ? isSelected
                                ? "border-amber-500 bg-linear-to-r from-amber-50 to-orange-50 shadow-md ring-1 ring-amber-400"
                                : "border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50"
                              : isSelected
                                ? "border-brand-blue bg-blue-50/30 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300"
                          }`}>
                          <div className="shrink-0">{tg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[12px] sm:text-[13px] font-black text-slate-900 leading-none">
                                {tg.label}
                              </p>
                              {tg.badge && (
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black bg-amber-500 text-white tracking-wide">
                                  {tg.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1">
                              {tg.timeRange}
                            </p>
                          </div>
                          {/* Radio circle */}
                          <div
                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                              isSelected
                                ? isInstant
                                  ? "border-amber-600 bg-amber-600 ring-2 ring-amber-400/20"
                                  : "border-brand-blue bg-brand-blue ring-2 ring-brand-blue/20"
                                : "border-slate-300 bg-white"
                            }`}>
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 4: ADDRESS & PAYMENT ══════════════════════════════════════ */}
            {step === 4 && (
              <div className="flex flex-col gap-4">
                {/* Address Details */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-black text-slate-900">
                      Service Address *
                    </p>
                    <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Step 4 of 4
                    </span>
                  </div>

                  {/* Saved Addresses Picker */}
                  {user?.addresses && user.addresses.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Select From Saved Addresses
                      </span>
                      <div className="flex flex-col gap-2">
                        {user.addresses.map((addr) => {
                          const addrId = addr._id || addr.id || addr.house;
                          const isSelected =
                            selectedAddrId === addrId ||
                            (address.house === addr.house &&
                              (address.city || "").toLowerCase() ===
                                (addr.city || "").toLowerCase());
                          return (
                            <button
                              key={addrId}
                              type="button"
                              onClick={() => {
                                setSelectedAddrId(addrId);
                                setAddress({
                                  house: addr.house || "",
                                  area:
                                    addr.landmark ||
                                    addr.area ||
                                    addr.city ||
                                    "",
                                  city: addr.city || "",
                                  pincode:
                                    addr.pincode ||
                                    addr.house?.match(/\b\d{6}\b/)?.[0] ||
                                    "",
                                  latitude: addr.latitude || null,
                                  longitude: addr.longitude || null,
                                });
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50/80 border-brand-blue ring-1 ring-brand-blue shadow-2xs"
                                  : "bg-slate-50/70 border-slate-200 hover:bg-slate-100/80"
                              }`}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-brand-blue text-white"
                                      : "bg-white text-slate-600 border border-slate-200"
                                  }`}>
                                  {addr.type === "Work" ? (
                                    <Briefcase size={13} />
                                  ) : (
                                    <Home size={13} />
                                  )}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-800">
                                      {addr.type || "Address"}
                                    </span>
                                    {addr.isDefault && (
                                      <span className="text-[9px] font-bold text-brand-blue bg-blue-100 px-1.5 py-0.2 rounded">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {addr.house ? `${addr.house}, ` : ""}
                                    {addr.city}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2
                                  size={16}
                                  className="text-brand-blue shrink-0"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                          <span className="bg-white px-2">
                            Or Edit Address Details Below
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {/* ── Interactive Location Pin Card ── */}
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-brand-blue text-white flex items-center justify-center shadow-2xs">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">Pin Location on Map</h4>
                            <p className="text-[10px] text-slate-500">Allows partner to navigate directly with Google Maps</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="px-3 py-1.5 bg-brand-blue hover:bg-[#083679] text-white text-[11px] font-extrabold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Navigation className="w-3 h-3" />
                          {address.latitude && address.longitude ? "Change Pin" : "Select on Map"}
                        </button>
                      </div>

                      {address.latitude && address.longitude ? (
                        <div className="bg-white px-3 py-2 rounded-xl border border-blue-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                            <span className="text-[11px] font-bold text-slate-700 truncate">
                              Location Pinned: <span className="font-mono text-brand-blue font-extrabold">{Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}</span>
                            </span>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-brand-blue hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                          >
                            View Pin ↗
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="text-blue-600">📍</span>
                          <span>Click <strong>Select on Map</strong> or tap your current location to pin exact door coordinates.</span>
                        </div>
                      )}
                    </div>

                    {/* House / Flat */}
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={address.house}
                        onChange={(e) =>
                          setAddress((p) => ({ ...p, house: e.target.value }))
                        }
                        placeholder="House / Flat / Building No. *"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all"
                      />
                    </div>
                    {/* Area / Landmark */}
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={address.area}
                        onChange={(e) =>
                          setAddress((p) => ({ ...p, area: e.target.value }))
                        }
                        placeholder="Area / Landmark / Street"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3">
                      {/* City */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) =>
                            setAddress((p) => ({ ...p, city: e.target.value }))
                          }
                          placeholder="City *"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all"
                        />
                      </div>
                      {/* Pincode */}
                      <div className="w-32">
                        <input
                          type="text"
                          value={address.pincode}
                          onChange={(e) =>
                            setAddress((p) => ({
                              ...p,
                              pincode: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 6),
                            }))
                          }
                          placeholder="Pincode"
                          maxLength={6}
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all ${
                            address.pincode && address.pincode.length < 6
                              ? "border-rose-400 bg-rose-50/20"
                              : "border-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                    {address.pincode && address.pincode.length < 6 && (
                      <p className="text-[10px] text-rose-500 font-bold -mt-1 ml-1">
                        Pincode must be exactly 6 digits
                      </p>
                    )}
                  </div>
                </div>

                {/* Full Name + Mobile */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-black text-slate-900">
                      Customer Contact Details *
                    </p>
                  </div>
                  {/* Full Name */}
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name *"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all"
                    />
                  </div>
                  {/* Mobile */}
                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) =>
                          setMobile(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder="10-digit Mobile Number *"
                        maxLength={10}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-[12px] font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand-blue outline-none transition-all ${
                          mobile && mobile.length < 10
                            ? "border-rose-400 bg-rose-50/20"
                            : "border-slate-200"
                        }`}
                      />
                    </div>
                    {mobile && mobile.length < 10 && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">
                        Mobile number must be exactly 10 digits
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Options */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <p className="text-[13px] font-black text-slate-900 mb-3">
                    Payment Mode *
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {/* Pay Advance — Recommended */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode("advance")}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                        paymentMode === "advance"
                          ? "border-brand-blue bg-blue-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                          paymentMode === "advance"
                            ? "border-brand-blue bg-brand-blue"
                            : "border-slate-300 bg-white"
                        }`}>
                        {paymentMode === "advance" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[13px] font-black ${paymentMode === "advance" ? "text-brand-blue" : "text-slate-900"}`}>
                            Pay Advance
                          </span>
                          <span className="text-[9px] bg-brand-blue text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                            RECOMMENDED
                          </span>
                        </div>
                        <p
                          className={`text-[10px] font-medium ${paymentMode === "advance" ? "text-brand-blue/80" : "text-slate-500"}`}>
                          ₹{advanceAmt} advance · Pay balance after service
                        </p>
                      </div>
                      <span
                        className={`text-[16px] font-black shrink-0 ${paymentMode === "advance" ? "text-brand-blue" : "text-slate-900"}`}>
                        ₹{advanceAmt}
                      </span>
                    </button>

                    {/* Pay After Service */}
                    <button
                      type="button"
                      onClick={() => setPaymentMode("after")}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left cursor-pointer ${
                        paymentMode === "after"
                          ? "border-brand-blue bg-blue-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}>
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                          paymentMode === "after"
                            ? "border-brand-blue bg-brand-blue"
                            : "border-slate-300 bg-white"
                        }`}>
                        {paymentMode === "after" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-[13px] font-black ${paymentMode === "after" ? "text-brand-blue" : "text-slate-900"}`}>
                          Pay After Service
                        </p>
                        <p
                          className={`text-[10px] font-medium mt-0.5 ${paymentMode === "after" ? "text-brand-blue/80" : "text-slate-500"}`}>
                          Pay full amount (₹{totalPrice}) after service
                          completion
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Total Payable summary */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPriceExpanded((p) => !p)}
                    className="w-full flex items-center justify-between cursor-pointer">
                    <span className="text-[13px] font-black text-slate-900">
                      Total Payable
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-black text-brand-blue">
                        ₹{paymentMode === "advance" ? advanceAmt : totalPrice}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        View Details {priceExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>
                  {priceExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">
                          Service charge ({quantity} unit
                          {quantity > 1 ? "s" : ""})
                        </span>
                        <span className="font-black text-slate-900">
                          ₹{totalPrice}
                        </span>
                      </div>
                      {paymentMode === "advance" && (
                        <>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-brand-blue font-black">
                              Advance (Adjusted)
                            </span>
                            <span className="font-black text-brand-blue">
                              ₹{advanceAmt}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-semibold">
                              Balance after service
                            </span>
                            <span className="font-black text-slate-900">
                              ₹{remaining}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Secure payment note */}
                <div className="flex items-center justify-center gap-2 py-2 text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-[10px] font-bold">
                    100% Secure &amp; Verified Booking
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Order Summary & Primary Action Card */}
          <div className="w-full md:col-span-5 lg:col-span-4 hidden md:flex flex-col gap-5 sticky top-24">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col gap-4 text-left">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl shrink-0">
                    {isImageIcon(selectedServiceData?.icon || data.icon) ? (
                      <img
                        src={selectedServiceData?.icon || data.icon}
                        alt=""
                        className="w-6 h-6 object-contain"
                      />
                    ) : (
                      selectedServiceData?.icon || data.icon || "🔧"
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-black text-slate-900 line-clamp-2 leading-tight">
                      {getBarLabel()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 truncate mt-0.5">
                      {getBarSublabel()}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black text-brand-blue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shrink-0 self-start">
                  Step {step}/4
                </span>
              </div>

              {/* Pricing breakdown */}
              {step >= 2 && selectedServiceData ? (
                <div className="flex flex-col gap-2.5 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      {productType ? `${productType} — ` : ""}
                      {selectedServiceData.name} ({quantity} unit
                      {quantity > 1 ? "s" : ""})
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{totalPrice}
                    </span>
                  </div>
                  {additionalTypes.map((entry, idx) => {
                    const addon = (data.productTypes || []).find((pt) => pt.name === entry.name)?.priceAddon || 0;
                    const entryTotal = ((selectedServiceData?.price || 0) + addon) * (entry.qty || 1);
                    return (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {entry.name} — {selectedServiceData.name} ({entry.qty} unit
                          {entry.qty > 1 ? "s" : ""}) · separate booking
                        </span>
                        <span className="font-bold text-slate-900">₹{entryTotal}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Inspection Fee</span>
                    <span>FREE</span>
                  </div>
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between text-sm font-black text-slate-900">
                    <span>Total{additionalTypes.length > 0 ? ` (${additionalTypes.length + 1} bookings)` : " Estimate"}</span>
                    <span>₹{combinedTotalPrice}</span>
                  </div>
                  {step === 4 && paymentMode === "advance" && (
                    <div className="flex justify-between text-sm font-black text-brand-blue bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <span>Advance Payable Now{additionalTypes.length > 0 ? ` (×${additionalTypes.length + 1} bookings)` : ""}</span>
                      <span>₹{advanceAmt}{additionalTypes.length > 0 ? ` each` : ""}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    {step === 1
                      ? "Service pricing will appear once you select a service package in Step 2."
                      : "Select a service package above to view estimated pricing."}
                  </p>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                disabled={getBarBtnDisabled()}
                onClick={handleBarBtn}
                className={`w-full font-black py-4 rounded-2xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  getBarBtnDisabled()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-brand-blue text-white hover:bg-[#1565C0] shadow-md shadow-brand-blue/20 active:scale-[0.98]"
                }`}>
                <span>{getBarBtnLabel()}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-slate-400 border-t border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-500">
                  100% Verified Service Guarantee
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Bar ── */}
      {step !== 3 ? (
        <BottomBar
          icon={selectedServiceData?.icon || data.icon || "🔧"}
          label={getBarLabel()}
          sublabel={getBarSublabel()}
          price={
            step === 4 && paymentMode === "advance" ? advanceAmt : combinedTotalPrice
          }
          showPrice={
            step >= 2 && Boolean(selectedServiceData && totalPrice > 0)
          }
          breakdown={step >= 2 && step < 4 ? priceBreakdown : []}
          btnLabel={getBarBtnLabel()}
          btnDisabled={getBarBtnDisabled()}
          onBtn={handleBarBtn}
        />
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] z-30 px-3.5 sm:px-4 pb-3.5 pt-2.5 flex flex-col gap-2 md:hidden">
          {/* Summary Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-2xs gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-slate-600 shrink-0">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-brand-blue" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[12px] sm:text-[13px] font-black text-slate-900 leading-tight truncate block">
                  {selectedDate
                    ? selectedDate.split(" ").slice(0, 3).join(" ")
                    : "Select Date"}
                  {brand ? ` • ${brand}` : ""}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate block">
                  {hasBrands && !brand
                    ? "Select Brand, Date & Time Slot"
                    : !selectedDate
                      ? "Select Visit Date"
                      : timeGroup
                        ? TIME_GROUPS.find((t) => t.id === timeGroup)?.timeRange
                        : "Select Time Slot"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0 pl-1">
              <span className="text-[15px] sm:text-[16px] font-black text-slate-900 leading-none">
                ₹{totalPrice}
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                Total Estimate
              </span>
            </div>
          </div>
          {/* Button */}
          <button
            type="button"
            disabled={!step3Valid}
            onClick={goNext}
            className={`w-full font-black py-3 rounded-2xl text-[14px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
              !step3Valid
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-brand-blue text-white hover:bg-[#1565C0] shadow-md shadow-brand-blue/25"
            }`}>
            {hasBrands && !brand
              ? "Choose Brand to Continue"
              : !selectedDate || !timeGroup
                ? "Select Date & Time Slot"
                : "Continue — Address & Payment"}
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* ── Interactive Map Location Picker Modal ── */}
      <MapLocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={handleLocationPicked}
        initialCoordinates={
          address.latitude && address.longitude
            ? { lat: Number(address.latitude), lng: Number(address.longitude) }
            : null
        }
        initialCity={address.city || currentLocation?.city || ""}
      />
    </div>
  );
};

export default BookingFlow;
