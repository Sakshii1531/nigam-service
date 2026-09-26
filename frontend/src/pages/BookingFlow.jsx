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
  CalendarCheck,
  Crosshair,
  ExternalLink,
  Info,
  Tag,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { apiRequest, getStoredTokens, storeTokens } from "../lib/apiClient";
import {
  submitBookingsForMeta,
  totalPriceFromResults,
} from "../lib/bookingSubmission";
import { useAuth } from "../context/AuthContext";
import { useLocationContext } from "../context/LocationContext";
import MapLocationPickerModal from "../components/booking/MapLocationPickerModal";

import {
  getCategoryTree,
  hasDeepLink,
  selectionFromDeepLink,
  getOffering,
  getQuote,
  pickOffering,
  servicesFor,
  optionsFor,
  standaloneOffering,
  formatRupees,
} from "../lib/catalogueApi";
import { Skeleton } from '../components/common/Skeleton';

// Every price on this screen comes from the Master Catalogue quote API
// (docs/master-catalogue Phase 4) — nothing here adds, multiplies or taxes.

// ─── Step Labels (4 steps) ────────────────────────────────────────────────────
const STEP_LABELS = ["What", "Service", "Schedule", "Payment"];

const rupeesOrMinus = (amount) =>
  amount < 0 ? `−${formatRupees(-amount)}` : formatRupees(amount);

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
const OptionCard = ({ icon, name, desc, note, selected, onClick }) => (
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
        <img
          src={icon}
          alt={name}
          className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
        />
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
    {note && (
      <span className="text-[10px] font-black text-slate-700">{note}</span>
    )}
  </button>
);

// ─── Chip picker (sizes / options) ────────────────────────────────────────────
const ChipPicker = ({ label, items, value, onChange }) => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
      {label} *
    </p>
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={`px-3.5 py-2 rounded-xl border-2 text-[12px] font-black transition-all cursor-pointer flex flex-col items-start ${
              selected
                ? "border-brand-blue bg-blue-50 text-brand-blue"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}>
            <span>{item.label}</span>
            {item.price && (
              <span className={`text-[10px] font-bold ${selected ? "text-brand-blue/80" : "text-slate-400"}`}>
                {item.price}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
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
              {formatRupees(price)}
            </span>
            {breakdown.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="text-[9px] font-bold text-brand-blue underline decoration-dotted cursor-pointer whitespace-nowrap mt-0.5">
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
              <span
                className={
                  row.bold
                    ? "font-black text-slate-900"
                    : "font-semibold text-slate-500"
                }>
                {row.label}
              </span>
              <span
                className={
                  row.bold
                    ? "font-black text-slate-900"
                    : "font-bold text-slate-700"
                }>
                {row.amount != null ? rupeesOrMinus(row.amount) : ""}
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

/** True while a quote for the same lines is being refreshed (not for a different selection). */
function quoteLoading0(quoteKey, quoteState) {
  if (!quoteState.quote || !quoteState.key) return false;
  const lines = (key) => JSON.stringify(JSON.parse(key.split("#")[0]).lines.map((l) => l.offeringId));
  try {
    return lines(quoteKey) === lines(quoteState.key);
  } catch {
    return false;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const BookingFlow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { category } = useParams();

  // The bookable catalogue for this category: product types → sizes,
  // standalone services → options, and the offering (with its price) each
  // combination resolves to. An unconfigured combination is simply not in it.
  const [tree, setTree] = useState(null);
  const [treeError, setTreeError] = useState("");

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

  // Step 1 — what needs service: a product type (+ size) or a standalone
  // service (+ option, e.g. tank size).
  const sel = resumeBooking?.selection || {};
  const [productTypeId, setProductTypeId] = useState(() => sel.productTypeId || "");
  const [variantId, setVariantId] = useState(() => sel.variantId || "");
  const [standaloneServiceId, setStandaloneServiceId] = useState(
    () => sel.standaloneServiceId || "",
  );
  const [optionId, setOptionId] = useState(() => sel.optionId || "");

  // Step 2 — the service (product-linked) and the quantity. Other product
  // types serviced in the same visit (1 Window AC + 2 Split AC) are extra
  // lines: each resolves to its own offering and becomes its own booking.
  const [chosenServiceId, setServiceId] = useState(() => sel.serviceId || "");
  // A deep link's service (?svc=installation) — picked in step 2 as soon as
  // the chosen type / size offers it, unless the customer picks another.
  const [preferredServiceId, setPreferredServiceId] = useState("");
  const [quantity, setQuantity] = useState(() => sel.quantity || 1);
  const [extraLines, setExtraLines] = useState(() => sel.extraLines || []);

  // Step 4 — the offering's required questions, coupon and coins.
  const [answers, setAnswers] = useState(() => sel.answers || {});
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState(() => sel.couponCode || "");
  const [couponMessage, setCouponMessage] = useState("");
  const [useCoins, setUseCoins] = useState(() => Boolean(sel.useCoins));
  const [priceChangedNotice, setPriceChangedNotice] = useState(
    () => location.state?.priceChanged || "",
  );
  const [quoteNonce, setQuoteNonce] = useState(0);

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
  const [fullName, setFullName] = useState(() => resumeBooking?.fullName || "");
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

  const handleLocationPicked = ({
    latitude,
    longitude,
    addressDetails,
    formattedAddress,
  }) => {
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
      const s = resume.selection || {};
      if (s.productTypeId) setProductTypeId(s.productTypeId);
      if (s.variantId) setVariantId(s.variantId);
      if (s.standaloneServiceId) setStandaloneServiceId(s.standaloneServiceId);
      if (s.optionId) setOptionId(s.optionId);
      if (s.serviceId) setServiceId(s.serviceId);
      if (s.quantity) setQuantity(s.quantity);
      if (s.extraLines) setExtraLines(s.extraLines);
      if (s.answers) setAnswers(s.answers);
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
            defaultAddr.landmark || defaultAddr.area || defaultAddr.city || "",
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

  // Ref for hidden native date input & scrollable date pill container
  const dateInputRef = useRef(null);
  const dateScrollContainerRef = useRef(null);

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

  // Auto-scroll date pill container to the beginning when selected date changes
  useEffect(() => {
    if (selectedDate && dateScrollContainerRef.current) {
      dateScrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [selectedDate]);

  // ── Catalogue: load the tree, resolve the selection, get the quote ─────────
  const city = address.city || currentLocation?.city || "";
  const deepLinkApplied = useRef(false);
  const entry = useRef({ search: location.search, resuming: Boolean(resumeBooking) });
  useEffect(() => {
    let alive = true;
    getCategoryTree(category, { city })
      .then((t) => {
        if (!alive) return;
        setTree(t);
        setTreeError("");
        // Search results, home tiles and other entry points open the flow
        // with the selection in the URL; apply it once, on a fresh start.
        if (!deepLinkApplied.current && !entry.current.resuming && hasDeepLink(entry.current.search)) {
          const link = selectionFromDeepLink(t, entry.current.search);
          setProductTypeId(link.productTypeId);
          setVariantId(link.variantId);
          setStandaloneServiceId(link.standaloneServiceId);
          setOptionId(link.optionId);
          setPreferredServiceId(link.preferredServiceId);
          setQuantity(link.quantity);
          setStep(link.step);
        }
        deepLinkApplied.current = true;
      })
      .catch((err) => alive && setTreeError(err.message || "This service isn't available right now."));
    return () => {
      alive = false;
    };
  }, [category, city]);

  const productTypes = tree?.productTypes || [];
  const standaloneServices = tree?.standaloneServices || [];
  const selectedPT = productTypes.find((pt) => pt.id === productTypeId) || null;
  const selectedStandalone = standaloneServices.find((sv) => sv.id === standaloneServiceId) || null;
  const isStandalone = Boolean(selectedStandalone);
  // Only a product-linked booking asks which brand the appliance is
  // (docs/master-catalogue Phase 19) — a standalone service never carries one.
  const bookingBrand = isStandalone ? "" : brand;
  const serviceChoices = selectedPT ? servicesFor(tree, { productTypeId, variantId: variantId || null }) : [];
  const serviceId =
    chosenServiceId ||
    (preferredServiceId && serviceChoices.some((c) => c.service.id === preferredServiceId) ? preferredServiceId : "");
  const optionChoices = selectedStandalone ? optionsFor(tree, standaloneServiceId) : [];

  const primaryOffering = isStandalone
    ? optionChoices.length
      ? optionChoices.find((o) => o.option.id === optionId)?.offering || null
      : standaloneOffering(tree, standaloneServiceId)
    : selectedPT
      ? pickOffering(tree, { productTypeId, variantId: variantId || null, serviceId })
      : null;
  const primaryVariantId = (isStandalone ? optionId : variantId) || null;
  const qtyMin = primaryOffering?.minQty || 1;
  const qtyMax = primaryOffering?.maxQty || 1;
  const qty = Math.min(Math.max(quantity, qtyMin), qtyMax);

  const extraResolved =
    !isStandalone && primaryOffering
      ? extraLines.map((line) => {
          const offering = pickOffering(tree, {
            productTypeId: line.productTypeId,
            variantId: line.variantId || null,
            serviceId,
          });
          return { ...line, offering, qty: offering ? Math.min(Math.max(line.qty, offering.minQty), offering.maxQty) : line.qty };
        })
      : [];
  const lineOfferings = [primaryOffering, ...extraResolved.map((l) => l.offering)].filter(Boolean);
  const expressAvailable = lineOfferings.length > 0 && lineOfferings.every((o) => o.express?.enabled);
  const expressFee = primaryOffering?.express?.fee || 0;
  const isExpress = timeGroup === "ASAP" && expressAvailable;

  const quoteLines = primaryOffering
    ? [
        { offeringId: primaryOffering.id, variantId: primaryVariantId, quantity: qty, isExpress },
        ...extraResolved
          .filter((l) => l.offering)
          .map((l) => ({ offeringId: l.offering.id, variantId: l.variantId || null, quantity: l.qty, isExpress })),
      ]
    : [];
  // Coupon and coins apply to a single-service checkout only — each extra
  // line is its own booking, and splitting them would make the per-booking
  // charge differ from what was shown.
  const singleLine = quoteLines.length === 1;
  const signedIn = Boolean(getStoredTokens().accessToken);
  const quoteKey = quoteLines.length
    ? JSON.stringify({
        lines: quoteLines,
        couponCode: singleLine && couponCode ? couponCode : undefined,
        useCoins: singleLine && signedIn && useCoins ? true : undefined,
        paymentMode,
        location: city ? { city } : undefined,
        // The appliance's brand lets the server detect warranty / AMC / EW
        // coverage for a signed-in customer — the same check the booking
        // runs — so a covered visit shows ₹0 here before confirming.
        warranty: signedIn && bookingBrand ? { brand: bookingBrand } : undefined,
      })
    : "";

  // The offering's own page: required questions, included / not included.
  const [offeringDetail, setOfferingDetail] = useState(null);
  const primaryCode = primaryOffering?.code || "";
  useEffect(() => {
    if (!primaryCode) return undefined;
    let alive = true;
    getOffering(primaryCode, { city })
      .then((d) => alive && setOfferingDetail(d))
      .catch(() => alive && setOfferingDetail(null));
    return () => {
      alive = false;
    };
  }, [primaryCode, city]);
  const detail = offeringDetail && offeringDetail.code === primaryCode ? offeringDetail : null;
  const requiredQuestions = detail?.requiredInfo || [];

  // The quote — re-requested (debounced) whenever the selection changes.
  // Tagged with the request it answers so a stale price never shows.
  const [quoteState, setQuoteState] = useState({ key: "", quote: null, error: null });
  useEffect(() => {
    if (!quoteKey) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      getQuote(JSON.parse(quoteKey), { signedIn })
        .then((q) => alive && setQuoteState({ key: `${quoteKey}#${quoteNonce}`, quote: q, error: null }))
        .catch((err) => {
          if (!alive) return;
          if (err.code === "COUPON_INVALID") {
            setCouponCode("");
            setCouponMessage(err.message);
            return;
          }
          setQuoteState({ key: `${quoteKey}#${quoteNonce}`, quote: null, error: err });
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [quoteKey, signedIn, quoteNonce]);
  const quoteCurrent = quoteState.key === `${quoteKey}#${quoteNonce}`;
  // `quote` is the price for exactly the current selection — the only one a
  // booking can be confirmed on. `shownQuote` keeps the previous price on
  // screen (dimmed) while a refreshed one loads, so totals don't flicker away.
  const quote = quoteKey && quoteCurrent ? quoteState.quote : null;
  const shownQuote = quoteKey ? quote || (quoteLoading0(quoteKey, quoteState) ? quoteState.quote : null) : null;
  const quoteError = quoteKey && quoteCurrent ? quoteState.error : null;
  const quoteLoading = Boolean(quoteKey) && !quoteCurrent;

  if (!tree && !treeError) {
    // Shaped like step 1: header, stepper, the type/size options, bottom bar.
    return (
      <div role="status" aria-busy="true" className="min-h-screen bg-white">
        <span className="sr-only">Loading service details…</span>
        <div aria-hidden="true" className="px-4 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <Skeleton className="w-8 h-8" rounded="rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div aria-hidden="true" className="max-w-3xl mx-auto px-4 py-5 space-y-5">
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-1.5 flex-1" rounded="rounded-full" />
            ))}
          </div>
          <Skeleton className="h-5 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl p-3 space-y-2">
                <Skeleton className="h-16 w-full" rounded="rounded-xl" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 p-4">
          <Skeleton className="h-12 w-full max-w-3xl mx-auto" rounded="rounded-2xl" />
        </div>
      </div>
    );
  }
  if (!tree) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3 p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-black text-slate-800">{treeError}</p>
        <button
          type="button"
          onClick={() => navigate("/services")}
          className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-black cursor-pointer">
          Browse services
        </button>
      </div>
    );
  }

  // A category with nothing bookable yet (no offerings configured in the
  // Master Catalogue) — say so instead of showing an empty step 1.
  if (productTypes.length === 0 && standaloneServices.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3 p-6 text-center">
        <Info className="w-8 h-8 text-brand-blue" />
        <p className="text-sm font-black text-slate-800">
          {tree.category.name} services aren't available to book online yet.
        </p>
        <p className="text-xs font-semibold text-slate-500 max-w-xs">
          Please check back soon, or contact support and we'll arrange a visit.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/services")}
            className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-black cursor-pointer">
            Browse services
          </button>
          <button
            type="button"
            onClick={() => navigate("/help-support")}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-black cursor-pointer">
            Contact support
          </button>
        </div>
      </div>
    );
  }

  const catKey = tree.category.name || tree.category.key;
  const data = {
    brands: isStandalone ? [] : tree.category.brands || [],
    icon: tree.category.icon,
  };

  // ── Display helpers (read the shownQuote, never compute it) ─────────────────────
  const gstLabel = shownQuote && shownQuote.lines.every((l) => l.gstPercent === shownQuote.lines[0].gstPercent)
    ? `GST (${shownQuote.lines[0].gstPercent}%)`
    : "GST";
  const payableTotal = shownQuote ? shownQuote.payableNow + shownQuote.payableAfterService : 0;
  const priceBreakdown = shownQuote
    ? [
        ...shownQuote.lines.map((l) => ({
          label: `${l.name} × ${l.quantity}${shownQuote.lines.length > 1 ? " · separate booking" : ""}`,
          amount: l.baseAmount,
        })),
        ...(shownQuote.totals.coverage > 0 ? [{ label: "Covered by warranty", amount: -shownQuote.totals.coverage }] : []),
        ...(shownQuote.totals.discount > 0 ? [{ label: `Coupon ${shownQuote.couponCode || ""}`.trim(), amount: -shownQuote.totals.discount }] : []),
        ...(shownQuote.totals.expressFee > 0 ? [{ label: "Express fee", amount: shownQuote.totals.expressFee }] : []),
        { label: gstLabel, amount: shownQuote.totals.gst },
        { label: "Total", amount: shownQuote.totals.final, bold: true },
        ...(shownQuote.coinsApplied > 0
          ? [
              { label: "NCC coins", amount: -shownQuote.coinsApplied },
              { label: "To pay", amount: payableTotal, bold: true },
            ]
          : []),
      ]
    : [];
  const unitLabelOf = (offering) => offering?.unitLabel || "per unit";

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

  // Format selected date into full readable string: "Wednesday, 30 September 2026"
  const formatSelectedDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length >= 3) {
      const dayShort = parts[0];
      const dayNum = parts[1];
      const monthShort = parts[2];
      const dayMap = {
        Sun: "Sunday",
        Mon: "Monday",
        Tue: "Tuesday",
        Wed: "Wednesday",
        Thu: "Thursday",
        Fri: "Friday",
        Sat: "Saturday",
      };
      const monthMap = {
        Jan: "January",
        Feb: "February",
        Mar: "March",
        Apr: "April",
        May: "May",
        Jun: "June",
        Jul: "July",
        Aug: "August",
        Sep: "September",
        Oct: "October",
        Nov: "November",
        Dec: "December",
      };
      const fullDay = dayMap[dayShort] || dayShort;
      const currentYear = new Date().getFullYear();
      return `${fullDay}, ${dayNum} ${monthShort} ${currentYear}`;
    }
    return dateStr;
  };

  const isSelectedDateToday =
    upcomingDates.length > 0 && selectedDate === upcomingDates[0]?.full;

  const isCustomDate = Boolean(
    selectedDate && !upcomingDates.some((d) => d.full === selectedDate),
  );

  const customDatePill = isCustomDate
    ? {
        dayName: selectedDate.split(" ")[0] || "Custom",
        dayNum: selectedDate.split(" ")[1] || "",
        month: selectedDate.split(" ")[2] || "",
        full: selectedDate,
        isCustom: true,
      }
    : null;

  // If a custom date was selected, show it at the front so user immediately sees their pick!
  const allVisibleDates = customDatePill
    ? [customDatePill, ...upcomingDates]
    : upcomingDates;

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

  /** What the payment pages and bookingSubmission need — every amount from the quote. */
  const buildBookingMeta = () => ({
    category: tree.category.key,
    categoryName: catKey,
    serviceName: quote.lines[0].name,
    service: quote.lines[0].name,
    lines: quote.lines.map((l) => ({
      offeringId: l.offeringId,
      variantId: l.variant?.id || null,
      quantity: l.quantity,
      isExpress: l.isExpress,
      expectedFinalAmount: l.finalAmount,
      advanceAmount: l.advanceAmount,
      name: l.name,
    })),
    requiredInfo: requiredQuestions
      .filter((q) => String(answers[q.key] || "").trim())
      .map((q) => ({ key: q.key, value: String(answers[q.key]).trim() })),
    couponCode: quote.couponCode || null,
    useCoins: quote.coinsApplied > 0,
    brand: bookingBrand,
    date: selectedDate,
    timeGroup,
    isInstant: isExpress,
    address,
    fullName,
    mobile,
    paymentMode,
    quote,
    selection: {
      productTypeId,
      variantId,
      standaloneServiceId,
      optionId,
      serviceId,
      quantity: qty,
      extraLines,
      answers,
      couponCode,
      useCoins,
    },
  });

  /** The server re-priced a line differently (the rate changed mid-checkout). */
  const handlePriceChanged = (err) => {
    setPriceChangedNotice(err.message || "The price has changed.");
    setQuoteNonce((n) => n + 1);
  };

  const handleConfirmBooking = async () => {
    if (!quote) return;
    const bookingMeta = buildBookingMeta();
    const svcName = bookingMeta.serviceName;

    // Nothing due now (e.g. a warranty-covered visit) → no payment page.
    if (paymentMode === "after" || quote.payableNow === 0) {
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
        // whole visit when more than one line was booked together.
        const primary = results[0];
        const params = new URLSearchParams({
          type: "service",
          serviceRequestId:
            primary.serviceRequest?.id || primary.serviceRequest?._id || "",
          bookingId: primary.booking?.id || "",
          service: svcName,
          category: tree.category.key,
          productType: selectedPT?.name || "",
          brand: bookingBrand,
          quantity: String(qty),
          date: selectedDate || "",
          timeGroup: timeGroup || "",
          totalPrice: String(totalPriceFromResults(results)),
          advanceAmt: "0",
          customerName: fullName || "Customer",
          paymentMode: "after",
          isInstant: isExpress ? "true" : "false",
          bookingCount: String(results.length),
        });
        try {
          sessionStorage.removeItem("ncc_last_booking_flow");
        } catch (_err) {
          // ignore session storage removal errors
        }
        navigate(`/booking-success?${params.toString()}`);
      } catch (err) {
        if (err?.code === "PRICE_CHANGED") {
          handlePriceChanged(err);
        } else {
          console.error("Failed to create booking:", err);
          alert(
            `Booking Notice: ${err.message || "Unable to submit booking. Please verify your details."}`,
          );
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      await ensureCustomerAuth();
      try {
        sessionStorage.setItem(
          "ncc_last_booking_flow",
          JSON.stringify({ category: tree.category.key, bookingMeta }),
        );
      } catch (_err) {
        // ignore session storage write errors
      }
      navigate("/payment", {
        state: {
          productName: svcName,
          price: quote.payableNow,
          bookingMeta,
        },
      });
    }
  };

  // ── Validation per step ────────────────────────────────────────────────────
  const step1Valid = isStandalone
    ? optionChoices.length === 0 || Boolean(optionId)
    : Boolean(selectedPT && (selectedPT.variants.length === 0 || variantId));
  const step2Valid = Boolean(primaryOffering && quote && !quoteError);
  const hasBrands = Boolean(data.brands && data.brands.length > 0);
  const timeSlotValid = Boolean(timeGroup) && (timeGroup !== "ASAP" || expressAvailable);
  const step3Valid = (!hasBrands || !!brand) && !!selectedDate && timeSlotValid && Boolean(quote);

  const isMobileValid = !!mobile?.trim() && /^\d{10}$/.test(mobile.trim());
  const isPincodeValid =
    !address.pincode?.trim() || /^\d{6}$/.test(address.pincode.trim());
  const isAddressValid = Boolean(
    address.house?.trim() && address.city?.trim() && isPincodeValid,
  );
  const isContactValid = !!fullName?.trim() && isMobileValid;
  const answersValid = requiredQuestions.every(
    (q) => !q.required || String(answers[q.key] || "").trim(),
  );
  const step4Valid = isAddressValid && isContactValid && answersValid && Boolean(quote) && !quoteError;

  // ── Step config ────────────────────────────────────────────────────────────
  const stepConfig = {
    1: {
      title: productTypes.length && !standaloneServices.length ? `Select ${catKey} Type` : `What do you need?`,
      subtitle: productTypes.length
        ? "Choose the appliance type and size"
        : "Choose the service you need",
    },
    2: {
      title: isStandalone ? "Confirm Service" : "Select Service",
      subtitle: "Prices are per unit, before GST",
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

  const variantLabel = isStandalone
    ? optionChoices.find((o) => o.option.id === optionId)?.option.label
    : selectedPT?.variants.find((v) => v.id === variantId)?.label;
  const getBarLabel = () => primaryOffering?.name || selectedStandalone?.name || selectedPT?.name || catKey;
  const getBarSublabel = () => {
    const parts = [];
    if (selectedPT) parts.push(selectedPT.name);
    if (variantLabel) parts.push(variantLabel);
    if (qty > 1) parts.push(`${qty} × ${unitLabelOf(primaryOffering).replace(/^per\s+/i, "")}`);
    if (extraResolved.length > 0) {
      parts.push(`+${extraResolved.length} more type${extraResolved.length === 1 ? "" : "s"}`);
    }
    return parts.join(" · ") || `${catKey} service`;
  };
  const getBarBtnLabel = () => {
    if (step === 1) return step1Valid ? "Continue — Select Service" : isStandalone ? "Choose an option" : "Choose type & size";
    if (step === 2) {
      if (!primaryOffering) return "Select a Service";
      if (quoteLoading) return "Getting price…";
      return step2Valid ? "Continue — Schedule Visit" : "Adjust selection";
    }
    if (step === 3)
      return !step3Valid
        ? hasBrands && !brand
          ? "Select Brand, Date & Slot"
          : "Select Date & Time Slot"
        : "Continue — Address & Payment";
    if (submitting) return "Processing Booking...";
    if (!answersValid) return "Answer the service questions";
    if (!step4Valid) return quoteLoading ? "Getting price…" : "Enter Address & Mobile Details";
    if (paymentMode === "after") return "Confirm Booking (Pay After Service)";
    return `Pay ${formatRupees(quote.payableNow)} & Confirm Booking`;
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

            {/* ══ STEP 1: WHAT NEEDS SERVICE ═══════════════════════════════════════ */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {productTypes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                      Select {catKey} Type *
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {productTypes.map((pt) => (
                        <OptionCard
                          key={pt.id}
                          icon={pt.icon}
                          name={pt.name}
                          desc={pt.desc}
                          selected={productTypeId === pt.id}
                          onClick={() => {
                            setProductTypeId(pt.id);
                            setVariantId("");
                            setServiceId("");
                            setExtraLines([]);
                            setStandaloneServiceId("");
                            setOptionId("");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedPT && selectedPT.variants.length > 0 && (
                  <ChipPicker
                    label={selectedPT.variantDimension?.label || "Size"}
                    items={selectedPT.variants}
                    value={variantId}
                    onChange={(id) => {
                      setVariantId(id);
                      setServiceId("");
                    }}
                  />
                )}

                {standaloneServices.length > 0 && (
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                      {productTypes.length > 0 ? "Or book a service directly" : "Select Service *"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {standaloneServices.map((sv) => {
                        const prices = tree.offerings
                          .filter((o) => o.serviceId === sv.id && !o.productTypeId)
                          .map((o) => o.customerPrice);
                        const from = prices.length ? Math.min(...prices) : null;
                        return (
                          <OptionCard
                            key={sv.id}
                            icon={sv.icon}
                            name={sv.name}
                            desc={sv.desc}
                            note={from != null ? `${prices.length > 1 ? "from " : ""}${formatRupees(from)}` : null}
                            selected={standaloneServiceId === sv.id}
                            onClick={() => {
                              setStandaloneServiceId(sv.id);
                              setOptionId("");
                              setProductTypeId("");
                              setVariantId("");
                              setServiceId("");
                              setExtraLines([]);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedStandalone && optionChoices.length > 0 && (
                  <ChipPicker
                    label={selectedStandalone.optionDimension?.label || "Option"}
                    items={optionChoices.map(({ option, offering }) => ({
                      id: option.id,
                      label: option.label,
                      price: `${formatRupees(offering.customerPrice)} ${unitLabelOf(offering)}`,
                    }))}
                    value={optionId}
                    onChange={setOptionId}
                  />
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
                      Verified service partners · Genuine parts · 30-day service
                      warranty
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2: SERVICE, QUANTITY ════════════════════════════════════════ */}
            {step === 2 && (
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {!isStandalone && (
                  <>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-1 mb-0.5">
                      Available services for {[selectedPT?.name, variantLabel].filter(Boolean).join(" · ")} *
                    </p>
                    {serviceChoices.length === 0 && (
                      <p className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">
                        No services are available for this type in your area yet.
                      </p>
                    )}
                    {serviceChoices.map(({ service: svc, offering }) => {
                      const isSelected = serviceId === svc.id;
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setServiceId(svc.id)}
                          className={`group relative flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 active:scale-[0.99] text-left w-full cursor-pointer ${
                            isSelected
                              ? "border-brand-blue bg-linear-to-br from-blue-50/90 via-indigo-50/30 to-white shadow-md shadow-brand-blue/10 ring-1 ring-brand-blue"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
                          }`}>
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <div
                                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-xl overflow-hidden border transition-all ${
                                  isSelected ? "bg-white border-blue-200 shadow-xs" : "bg-slate-50 border-slate-100"
                                }`}>
                                {isImageIcon(svc.icon) ? (
                                  <img src={svc.icon} alt="" className="w-6 h-6 object-contain" />
                                ) : (
                                  svc.icon || "🔧"
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <h3 className={`text-[13px] sm:text-[15px] font-black leading-snug ${isSelected ? "text-brand-blue" : "text-slate-900"}`}>
                                  {svc.name}
                                </h3>
                                {(offering.description || svc.desc) && (
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                                    {offering.description || svc.desc}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 pt-0.5">
                              <div className="flex flex-col items-end">
                                <span className={`text-[15px] sm:text-[16px] font-black ${isSelected ? "text-brand-blue" : "text-slate-900"}`}>
                                  {formatRupees(offering.customerPrice)}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  {unitLabelOf(offering)}
                                </span>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                  isSelected ? "border-brand-blue bg-brand-blue ring-2 ring-brand-blue/20" : "border-slate-300 bg-white group-hover:border-slate-400"
                                }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {isStandalone && primaryOffering && (
                  <div className="bg-white border-2 border-brand-blue rounded-2xl p-4 shadow-2xs flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-black text-slate-900">{primaryOffering.name}</p>
                      {primaryOffering.description && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">{primaryOffering.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[16px] font-black text-brand-blue">{formatRupees(primaryOffering.customerPrice)}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{unitLabelOf(primaryOffering)}</span>
                    </div>
                  </div>
                )}

                {/* Quantity — bounded by the offering; hidden for per-visit services */}
                {primaryOffering && qtyMax > qtyMin && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">Quantity</p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {unitLabelOf(primaryOffering)} · up to {qtyMax}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={qty <= qtyMin}
                        onClick={() => setQuantity(Math.max(qtyMin, qty - 1))}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-brand-blue text-lg font-black hover:bg-blue-50 active:scale-95 transition-all cursor-pointer disabled:opacity-40">
                        –
                      </button>
                      <span className="text-[18px] font-black text-slate-900 w-6 text-center" aria-live="polite">
                        {qty}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={qty >= qtyMax}
                        onClick={() => setQuantity(Math.min(qtyMax, qty + 1))}
                        className="w-9 h-9 rounded-xl bg-brand-blue text-white shadow-2xs flex items-center justify-center text-lg font-black hover:bg-[#1565C0] active:scale-95 transition-all cursor-pointer disabled:opacity-40">
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Same service for another product type in the same visit */}
                {!isStandalone && primaryOffering && productTypes.length > 1 && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">
                        Need {serviceChoices.find((c) => c.service.id === serviceId)?.service.name || "this service"} for another {catKey} type too?
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Each type becomes its own booking, scheduled together with this one.
                      </p>
                    </div>
                    {extraResolved.map((line, idx) => {
                      const pt = productTypes.find((p) => p.id === line.productTypeId);
                      const update = (patch) => setExtraLines(extraLines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
                      return (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              aria-label="Product type"
                              value={line.productTypeId}
                              onChange={(e) => update({ productTypeId: e.target.value, variantId: "" })}
                              className="flex-1 min-w-[8rem] text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-blue bg-slate-50">
                              {productTypes.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            {pt?.variants.length > 0 && (
                              <select
                                aria-label={pt.variantDimension?.label || "Size"}
                                value={line.variantId || ""}
                                onChange={(e) => update({ variantId: e.target.value })}
                                className="text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-blue bg-slate-50">
                                <option value="">{pt.variantDimension?.label || "Size"}…</option>
                                {pt.variants.map((v) => (
                                  <option key={v.id} value={v.id}>{v.label}</option>
                                ))}
                              </select>
                            )}
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                              <button type="button" aria-label="Decrease" onClick={() => update({ qty: Math.max(1, line.qty - 1) })} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand-blue text-sm font-black cursor-pointer">–</button>
                              <span className="text-xs font-black text-slate-900 w-4 text-center">{line.qty}</span>
                              <button type="button" aria-label="Increase" onClick={() => update({ qty: Math.min(line.offering?.maxQty || 10, line.qty + 1) })} className="w-7 h-7 rounded-lg bg-brand-blue text-white flex items-center justify-center text-sm font-black cursor-pointer">+</button>
                            </div>
                            <button type="button" aria-label="Remove" onClick={() => setExtraLines(extraLines.filter((_, i) => i !== idx))} className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {line.offering ? (
                            <p className="text-[10px] font-bold text-slate-500 pl-1">
                              {line.offering.name} · {formatRupees(line.offering.customerPrice)} {unitLabelOf(line.offering)}
                            </p>
                          ) : (
                            <p className="text-[10px] font-bold text-amber-700 pl-1">
                              {pt?.variants.length && !line.variantId ? "Choose a size" : "Not available for this type — it won't be booked"}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const other = productTypes.find((p) => p.id !== productTypeId) || productTypes[0];
                        setExtraLines([...extraLines, { productTypeId: other.id, variantId: "", qty: 1 }]);
                      }}
                      className="text-xs font-black text-brand-blue hover:underline text-left flex items-center gap-1 cursor-pointer">
                      + Add Another Type
                    </button>
                  </div>
                )}

                {/* What the service covers */}
                {detail && (detail.included.length > 0 || detail.excluded.length > 0 || detail.customerInstructions) && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs grid sm:grid-cols-2 gap-3 text-[11px]">
                    {detail.included.length > 0 && (
                      <div>
                        <p className="font-black text-emerald-700 mb-1">Included</p>
                        <ul className="space-y-0.5 text-slate-600 font-medium">
                          {detail.included.map((item) => (
                            <li key={item} className="flex gap-1.5"><Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detail.excluded.length > 0 && (
                      <div>
                        <p className="font-black text-slate-500 mb-1">Not included</p>
                        <ul className="space-y-0.5 text-slate-500 font-medium">
                          {detail.excluded.map((item) => (
                            <li key={item} className="flex gap-1.5"><X className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detail.customerInstructions && (
                      <p className="sm:col-span-2 text-slate-600 font-medium bg-slate-50 rounded-xl p-2.5">
                        <Info className="w-3 h-3 inline mr-1 text-brand-blue" />
                        {detail.customerInstructions}
                      </p>
                    )}
                  </div>
                )}

                {quoteError && (
                  <p role="alert" className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    {quoteError.message}
                  </p>
                )}

                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 mt-1 shadow-2xs">
                  <span className="text-base sm:text-lg leading-none shrink-0 mt-0.5">💡</span>
                  <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                    Prices are before GST, which is added in your total. Spare parts, if needed, are quoted on site and added only with your approval.
                  </p>
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
                        <span>⚠️</span> Please select an appliance brand to
                        proceed
                      </p>
                    )}
                  </div>
                )}

                {/* Date picker */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] sm:text-[13px] font-black text-slate-900">
                          Select Date *
                        </p>
                        {selectedDate && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-100 text-brand-blue border border-blue-200">
                            {selectedDate}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Choose convenient date for visit or pick any other date
                        from calendar
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        dateInputRef.current?.showPicker?.() ||
                        dateInputRef.current?.click()
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/90 hover:bg-blue-100 text-brand-blue font-black text-[11px] transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Choose another date from calendar">
                      <CalendarDays className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      <span>Choose Date</span>
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      className="sr-only"
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [y, m, d] = e.target.value.split("-").map(Number);
                        const dateObj = new Date(y, m - 1, d);
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
                        const label = `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
                        setSelectedDate(label);
                        if (
                          timeGroup === "ASAP" &&
                          label !== upcomingDates[0]?.full
                        ) {
                          setTimeGroup("");
                        }
                      }}
                    />
                  </div>

                  {/* Horizontal Scrollable Date Pills */}
                  <div
                    ref={dateScrollContainerRef}
                    className="flex gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1.5 px-0.5 snap-x">
                    {allVisibleDates.map((d) => {
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
                          className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-16 h-[70px] sm:h-20 rounded-xl sm:rounded-2xl border-2 transition-all shrink-0 cursor-pointer snap-start relative ${
                            isActive
                              ? "border-brand-blue bg-brand-blue text-white shadow-md scale-105 ring-2 ring-brand-blue/20"
                              : "border-slate-200 bg-slate-50 hover:bg-white text-slate-800"
                          }`}>
                          {d.isCustom && (
                            <span
                              className={`absolute -top-2 text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full border shadow-2xs ${
                                isActive
                                  ? "bg-amber-400 text-slate-950 border-amber-300"
                                  : "bg-blue-100 text-brand-blue border-blue-200"
                              }`}>
                              Chosen
                            </span>
                          )}
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

                  {/* Prominent Confirmation Banner for Selected Date */}
                  {selectedDate ? (
                    <div className="mt-3 p-3 sm:p-3.5 bg-linear-to-r from-blue-50/90 via-indigo-50/60 to-white border-2 border-brand-blue/30 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-blue leading-none">
                              Confirmed Visit Date
                            </span>
                            {isSelectedDateToday ? (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800">
                                Today
                              </span>
                            ) : isCustomDate ? (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-amber-100 text-amber-800">
                                Calendar Pick
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[12px] sm:text-[13px] font-black text-slate-900 leading-snug mt-0.5">
                            {formatSelectedDateDisplay(selectedDate)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          dateInputRef.current?.showPicker?.() ||
                          dateInputRef.current?.click()
                        }
                        className="px-2 sm:px-2.5 py-1 bg-white hover:bg-blue-50 text-brand-blue border border-blue-200 hover:border-brand-blue rounded-xl text-[11px] font-black shadow-2xs transition-colors shrink-0 cursor-pointer flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5 text-[11px] text-slate-400 font-semibold italic">
                      Please select a date from above or use the Choose Date
                      button for more dates.
                    </div>
                  )}
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
                    {TIME_GROUPS.filter((tg) => !tg.isInstant || expressAvailable).map((tg) => {
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
                              {tg.isInstant && expressFee > 0 && (
                                <span className="font-black text-amber-700"> · +{formatRupees(expressFee)} express fee</span>
                              )}
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
                    {/* ── Interactive Location Pin Card (Redesigned) ── */}
                    <div
                      className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                        address.latitude && address.longitude
                          ? "bg-linear-to-br from-emerald-50/60 via-blue-50/30 to-white border-emerald-200/90 shadow-2xs"
                          : "bg-linear-to-br from-blue-50/80 via-slate-50/40 to-white border-blue-200/90 shadow-2xs"
                      }`}>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                              address.latitude && address.longitude
                                ? "bg-emerald-600 text-white"
                                : "bg-brand-blue text-white"
                            }`}>
                            {address.latitude && address.longitude ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <MapPin className="w-5 h-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-[13px] sm:text-[14px] font-black text-slate-900 leading-tight">
                                Pin Doorstep Location
                              </h4>
                              {address.latitude && address.longitude ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Pinned
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-brand-blue border border-blue-200">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-normal mt-0.5">
                              {address.latitude && address.longitude
                                ? "Exact doorstep GPS coordinates saved for delivery partner."
                                : "Allows partner to navigate directly to your door with Google Maps."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Pinned Info or Action Buttons */}
                      {address.latitude && address.longitude ? (
                        <div className="flex flex-col gap-2.5 mt-1">
                          <div className="bg-white/90 border border-emerald-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700">
                                  GPS Coordinates
                                </p>
                                <p className="text-[10px] sm:text-[11px] font-mono font-black text-slate-800 truncate">
                                  {Number(address.latitude).toFixed(4)},{" "}
                                  {Number(address.longitude).toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] sm:text-[11px] font-black text-brand-blue hover:text-blue-800 hover:underline flex items-center gap-1 shrink-0 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 transition-colors">
                              <span>View Pin</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowMapPicker(true)}
                              className="flex-1 py-2 px-3 bg-brand-blue hover:bg-[#083679] text-white text-[11px] sm:text-[12px] font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                              <Navigation className="w-3.5 h-3.5" />
                              Change Pin Location
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAddress((prev) => ({
                                  ...prev,
                                  latitude: null,
                                  longitude: null,
                                }))
                              }
                              className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                              title="Remove pin">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setShowMapPicker(true)}
                              className="w-full py-2.5 px-3 bg-brand-blue hover:bg-[#083679] text-white text-[11px] sm:text-[12px] font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]">
                              <Navigation className="w-3.5 h-3.5" />
                              Select on Map
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator?.geolocation) {
                                  navigator.geolocation.getCurrentPosition(
                                    (pos) => {
                                      setAddress((prev) => ({
                                        ...prev,
                                        latitude: pos.coords.latitude,
                                        longitude: pos.coords.longitude,
                                      }));
                                    },
                                    () => {
                                      setShowMapPicker(true);
                                    },
                                    { enableHighAccuracy: true, timeout: 8000 },
                                  );
                                } else {
                                  setShowMapPicker(true);
                                }
                              }}
                              className="w-full py-2.5 px-3 bg-white hover:bg-blue-50/80 text-brand-blue border border-blue-200 hover:border-brand-blue text-[11px] sm:text-[12px] font-black rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                              <Crosshair className="w-3.5 h-3.5" />
                              Current GPS
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span className="text-blue-500">📍</span>
                            <span>
                              Tap <strong>Select on Map</strong> or{" "}
                              <strong>Current GPS</strong> to pin exact door
                              coordinates.
                            </span>
                          </p>
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

                {/* The offering's required questions */}
                {requiredQuestions.length > 0 && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                    <p className="text-[13px] font-black text-slate-900">About the job</p>
                    {requiredQuestions.map((q) => (
                      <label key={q.key} className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-slate-600">
                          {q.label}
                          {q.required ? " *" : ""}
                        </span>
                        {q.type === "select" && q.options?.length ? (
                          <select
                            value={answers[q.key] || ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-brand-blue">
                            <option value="">Choose…</option>
                            {q.options.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={q.type === "number" ? "number" : "text"}
                            value={answers[q.key] || ""}
                            placeholder={q.type === "photo" ? "Describe it — the partner can take a photo on the visit" : ""}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:border-brand-blue"
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {/* Coupon and coins — single-service checkout only */}
                {singleLine && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
                    {couponCode && shownQuote?.couponCode ? (
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="flex items-center gap-1.5 font-black text-emerald-700">
                          <Tag className="w-4 h-4" /> {shownQuote.couponCode} applied · −{formatRupees(shownQuote.totals.discount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponCode("");
                            setCouponInput("");
                          }}
                          className="text-[11px] font-bold text-slate-500 underline cursor-pointer">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          setCouponMessage("");
                          setCouponCode(couponInput.trim().toUpperCase());
                        }}
                        className="flex gap-2">
                        <label className="sr-only" htmlFor="booking-coupon">Coupon code</label>
                        <input
                          id="booking-coupon"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Coupon code"
                          className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-bold uppercase outline-none focus:border-brand-blue"
                        />
                        <button
                          type="submit"
                          disabled={!couponInput.trim()}
                          className="px-4 rounded-xl bg-brand-blue text-white text-xs font-black disabled:opacity-40 cursor-pointer">
                          Apply
                        </button>
                      </form>
                    )}
                    {couponMessage && <p className="text-[11px] font-bold text-rose-600">{couponMessage}</p>}
                    {signedIn && (
                      <label className="flex items-center justify-between gap-2 text-[12px] font-bold text-slate-700 cursor-pointer">
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-500" /> Use NCC coins
                          {useCoins && shownQuote?.coinsApplied > 0 && (
                            <span className="text-emerald-700 font-black"> · −{formatRupees(shownQuote.coinsApplied)}</span>
                          )}
                        </span>
                        <input type="checkbox" checked={useCoins} onChange={(e) => setUseCoins(e.target.checked)} className="w-4 h-4" />
                      </label>
                    )}
                  </div>
                )}

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
                      disabled={Boolean(shownQuote) && payableTotal === 0}
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
                          {shownQuote && payableTotal === 0
                            ? "Nothing to pay — this visit is covered"
                            : paymentMode === "advance" && shownQuote
                              ? `${formatRupees(shownQuote.payableNow)} now · ${formatRupees(shownQuote.payableAfterService)} after service`
                              : "Part payment now · Pay balance after service"}
                        </p>
                      </div>
                      {paymentMode === "advance" && shownQuote && (
                        <span className="text-[16px] font-black shrink-0 text-brand-blue">
                          {formatRupees(shownQuote.payableNow)}
                        </span>
                      )}
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
                          Pay the full amount{shownQuote ? ` (${formatRupees(payableTotal)})` : ""} after service
                          completion
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Total Payable summary — straight from the shownQuote */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPriceExpanded((p) => !p)}
                    aria-expanded={priceExpanded}
                    className="w-full flex items-center justify-between cursor-pointer">
                    <span className="text-[13px] font-black text-slate-900">
                      {paymentMode === "advance" ? "Payable Now" : "Total Payable"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[16px] font-black text-brand-blue transition-opacity ${quoteLoading ? "opacity-40" : ""}`} aria-busy={quoteLoading}>
                        {shownQuote ? formatRupees(paymentMode === "advance" ? shownQuote.payableNow : payableTotal) : quoteLoading ? "…" : "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        View Details {priceExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>
                  {priceExpanded && shownQuote && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                      {priceBreakdown.map((row, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className={row.bold ? "font-black text-slate-900" : "text-slate-500 font-semibold"}>{row.label}</span>
                          <span className="font-black text-slate-900">{rupeesOrMinus(row.amount)}</span>
                        </div>
                      ))}
                      {paymentMode === "advance" && (
                        <>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-brand-blue font-black">Advance now</span>
                            <span className="font-black text-brand-blue">{formatRupees(shownQuote.payableNow)}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-semibold">Balance after service</span>
                            <span className="font-black text-slate-900">{formatRupees(shownQuote.payableAfterService)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {quoteError && (
                    <p role="alert" className="mt-2 text-[11px] font-bold text-rose-700">{quoteError.message}</p>
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
                    {isImageIcon(data.icon) ? (
                      <img src={data.icon} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      data.icon || "🔧"
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

              {/* Pricing breakdown — from the shownQuote */}
              {step >= 2 && shownQuote ? (
                <div className={`flex flex-col gap-2.5 text-xs font-semibold text-slate-600 transition-opacity ${quoteLoading ? "opacity-40" : ""}`} aria-busy={quoteLoading}>
                  {priceBreakdown.map((row, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between gap-3 ${row.bold ? "text-sm font-black text-slate-900 pt-2 border-t border-slate-100" : ""}`}>
                      <span>{row.label}</span>
                      <span className={row.bold ? "" : "font-bold text-slate-900"}>{rupeesOrMinus(row.amount)}</span>
                    </div>
                  ))}
                  {step === 4 && paymentMode === "advance" && (
                    <div className="flex justify-between text-sm font-black text-brand-blue bg-blue-50 p-3 rounded-2xl border border-blue-100">
                      <span>Advance Payable Now</span>
                      <span>{formatRupees(shownQuote.payableNow)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-slate-500">
                    {quoteLoading
                      ? "Getting your price…"
                      : step === 1
                        ? "Your price appears once you pick a service."
                        : "Select a service above to see the price."}
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
          icon={data.icon || "🔧"}
          label={getBarLabel()}
          sublabel={getBarSublabel()}
          price={
            shownQuote
              ? step === 4 && paymentMode === "advance"
                ? shownQuote.payableNow
                : payableTotal
              : 0
          }
          showPrice={step >= 2 && Boolean(shownQuote)}
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
                {shownQuote ? formatRupees(payableTotal) : "—"}
              </span>
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                Total incl. GST
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

      {/* ── The price changed while checking out (409 PRICE_CHANGED) ── */}
      {priceChangedNotice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="price-changed-title" className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <p id="price-changed-title" className="text-[15px] font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Price updated
            </p>
            <p className="text-[12px] text-slate-600 font-medium mt-2">
              {priceChangedNotice} Your total has been refreshed — please review it before confirming.
            </p>
            <button
              type="button"
              onClick={() => setPriceChangedNotice("")}
              className="mt-4 w-full py-2.5 rounded-xl bg-brand-blue text-white text-sm font-black cursor-pointer">
              Review new price
            </button>
          </div>
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
