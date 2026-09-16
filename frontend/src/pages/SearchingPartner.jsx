import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Wrench,
  Sparkles,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Compass,
  Radio,
  ChevronRight,
} from "lucide-react";
import { apiRequest, getStoredTokens } from "../lib/apiClient";
import { io } from "socket.io-client";

const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/api\/v1\/?$/, "");

const SEARCH_MESSAGES = [
  "Broadcasting your service request...",
  "Locating certified technicians nearby...",
  "Checking real-time partner availability...",
  "Contacting top-rated service experts...",
  "Waiting for partner confirmation...",
];

const SearchingPartner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = new URLSearchParams(location.search);

  const serviceRequestId = p.get("serviceRequestId") || p.get("bookingId");
  const serviceParam = p.get("service") || "Home Service";
  const categoryParam = p.get("category") || "";
  const productTypeParam = p.get("productType") || "";
  const brandParam = p.get("brand") || "";
  const quantityParam = p.get("quantity") || "1";
  const dateParam = p.get("date") || "Today";
  const timeGroupParam = p.get("timeGroup") || "09:00 AM";
  const totalPriceParam = p.get("totalPrice") || "299";
  const advanceAmtParam = p.get("advanceAmt") || "0";
  const isInstant =
    p.get("isInstant") === "true" ||
    timeGroupParam === "ASAP" ||
    timeGroupParam.includes("ASAP");

  const [bookingId, setBookingId] = useState("");
  const [city, setCity] = useState(p.get("city") || "");
  const [isAccepted, setIsAccepted] = useState(false);
  const [serviceProvider, setServiceProvider] = useState(null);
  const [instantStatus, setInstantStatus] = useState(
    isInstant ? "SEARCHING" : null,
  );
  const [callLoading, setCallLoading] = useState(false);
  const [searchStepIndex, setSearchStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Cycle search messages every 2.5 seconds
  useEffect(() => {
    if (isAccepted && serviceProvider) return;
    const msgInterval = setInterval(() => {
      setSearchStepIndex((prev) => (prev + 1) % SEARCH_MESSAGES.length);
    }, 2500);

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(msgInterval);
      clearInterval(timer);
    };
  }, [isAccepted, serviceProvider]);

  // Load latest booking data from API
  const loadBookingData = useCallback(async () => {
    if (!serviceRequestId) return;
    try {
      const res = await apiRequest(`/service-requests/${serviceRequestId}`, {
        auth: true,
      });
      if (res?.humanId || res?.id) {
        setBookingId(res.humanId || res.id);
      }
      if (res?.address?.city && !city) {
        setCity(res.address.city);
      }

      const isReqAccepted = Boolean(
        res?.isAccepted ||
        [
          "Engineer Accepted",
          "Visit Scheduled",
          "Engineer Reached",
          "Diagnosis Done",
          "Spare Approval Pending",
          "Work In Progress",
          "Repair Completed",
          "Completed",
        ].includes(res?.status) ||
        ["EN_ROUTE", "IN_PROGRESS", "COMPLETED"].includes(res?.instantStatus),
      );

      let foundAccepted = isReqAccepted;
      let matchedTech =
        isReqAccepted && res?.serviceProvider ? res.serviceProvider : null;

      if (res?.instantStatus) {
        setInstantStatus(res.instantStatus);
      }

      if (res?.booking) {
        const bk =
          typeof res.booking === "object"
            ? res.booking
            : await apiRequest(`/bookings/${res.booking}`, {
                auth: true,
              }).catch(() => null);

        if (bk) {
          if (bk.address?.city && !city) {
            setCity(bk.address.city);
          }
          const bkAccepted = Boolean(
            bk.isAccepted ||
            [
              "Engineer Accepted",
              "Visit Scheduled",
              "Engineer Reached",
              "Diagnosis Done",
              "Spare Approval Pending",
              "Work In Progress",
              "Repair Completed",
              "Completed",
            ].includes(bk.status) ||
            ["EN_ROUTE", "IN_PROGRESS", "COMPLETED"].includes(bk.instantStatus),
          );
          if (bkAccepted) foundAccepted = true;
          if (
            bk.serviceProvider &&
            (foundAccepted || bkAccepted) &&
            !matchedTech
          ) {
            matchedTech = bk.serviceProvider;
          }
          if (bk.instantStatus && !res?.instantStatus) {
            setInstantStatus(bk.instantStatus);
          }
        }
      }

      setIsAccepted(foundAccepted);
      if (foundAccepted && matchedTech) {
        setServiceProvider(
          typeof matchedTech === "object"
            ? matchedTech
            : { name: "Assigned Service Provider" },
        );
      }
    } catch (err) {
      console.error(
        "[searching-partner] Failed to load booking data:",
        err.message,
      );
    }
  }, [serviceRequestId, city]);

  // Polling every 3s
  useEffect(() => {
    loadBookingData();
    const interval = setInterval(loadBookingData, 3000);
    return () => clearInterval(interval);
  }, [loadBookingData]);

  // Real-time Socket.IO events
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
    });

    const handleAccepted = (data) => {
      const match =
        !data ||
        data.serviceRequestId === serviceRequestId ||
        data.bookingId === serviceRequestId ||
        (bookingId &&
          (data.bookingId === bookingId ||
            data.serviceRequestId === bookingId)) ||
        data.isAccepted;

      if (match) {
        setIsAccepted(true);
        if (data.serviceProvider) setServiceProvider(data.serviceProvider);
        if (data.instantStatus) setInstantStatus(data.instantStatus);
        loadBookingData();
      }
    };

    socket.on("booking:accepted", handleAccepted);

    socket.on("instant:status_update", (data) => {
      const match =
        !data ||
        data.serviceRequestId === serviceRequestId ||
        data.bookingId === serviceRequestId ||
        (bookingId &&
          (data.bookingId === bookingId ||
            data.serviceRequestId === bookingId));

      if (match) {
        if (data.instantStatus === "SEARCHING" || data.isAccepted === false) {
          setIsAccepted(false);
          setServiceProvider(null);
        } else if (
          data.serviceProvider &&
          (data.isAccepted ||
            ["EN_ROUTE", "IN_PROGRESS", "COMPLETED"].includes(
              data.instantStatus,
            ))
        ) {
          setIsAccepted(true);
          setServiceProvider(data.serviceProvider);
        }
        if (data.instantStatus) setInstantStatus(data.instantStatus);
        loadBookingData();
      }
    });

    socket.on("service_request:updated", (data) => {
      const match =
        !data ||
        data.serviceRequestId === serviceRequestId ||
        (bookingId && data.serviceRequestId === bookingId);

      if (match) {
        if (
          data.status === "New" ||
          data.isAccepted === false ||
          !data.serviceProvider
        ) {
          setIsAccepted(false);
          setServiceProvider(null);
        } else if (
          data.isAccepted ||
          [
            "Engineer Accepted",
            "Visit Scheduled",
            "Engineer Reached",
            "Diagnosis Done",
            "Work In Progress",
            "Repair Completed",
            "Completed",
          ].includes(data.status)
        ) {
          setIsAccepted(true);
          if (data.serviceProvider) setServiceProvider(data.serviceProvider);
        }
        loadBookingData();
      }
    });

    socket.on("tracking:update", (data) => {
      if (data?.serviceRequestId === serviceRequestId) {
        if (data.serviceProvider) {
          setIsAccepted(true);
          setServiceProvider(data.serviceProvider);
        }
        loadBookingData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serviceRequestId, bookingId, loadBookingData]);

  // Click to call provider
  const handleCallServiceProvider = async () => {
    if (serviceProvider?.phone) {
      window.location.href = `tel:${serviceProvider.phone}`;
      return;
    }
    if (!serviceRequestId) return;
    setCallLoading(true);
    try {
      await apiRequest("/calls/initiate", {
        method: "POST",
        body: { serviceRequestId },
        auth: true,
      });
    } catch (err) {
      console.error("[calls] Click-to-call failed:", err.message);
      if (err.status !== 503) {
        alert(`Call failed: ${err.message}`);
      }
    } finally {
      setCallLoading(false);
    }
  };

  const timeSlotDisplay = isInstant
    ? "⚡ Right Now (Instant ASAP)"
    : {
        Morning: "8 AM – 11 AM",
        Afternoon: "12 PM – 3 PM",
        Evening: "4 PM – 7 PM",
      }[timeGroupParam] || timeGroupParam;

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/my-bookings")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Back to Bookings">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 leading-tight">
                {isAccepted && serviceProvider
                  ? "Service Partner Assigned"
                  : "Searching for Service Partner"}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Booking ID:{" "}
              <span className="font-bold text-slate-700">
                {bookingId || serviceRequestId || "—"}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/my-bookings")}
          className="text-xs font-bold text-brand-blue bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-xl hover:bg-blue-100 transition-all cursor-pointer">
          My Bookings
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6">
        {/* ── SEARCHING RADAR OR ASSIGNED PARTNER HERO ── */}
        {!isAccepted || !serviceProvider ? (
          /* ── RADAR ANIMATION SEARCHING STATE ── */
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-blue-100 flex flex-col items-center text-center relative overflow-hidden">
            {/* Soft background ambient gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-transparent pointer-events-none" />

            {/* Pulsing Sonar / Radar Visual */}
            <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center my-4">
              {/* Outer Wave 1 */}
              <div
                className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full border border-blue-300/40 bg-blue-100/20 animate-ping"
                style={{ animationDuration: "3s" }}
              />
              {/* Outer Wave 2 */}
              <div
                className="absolute w-44 h-44 md:w-48 md:h-48 rounded-full border border-blue-400/50 bg-blue-200/20 animate-pulse"
                style={{ animationDuration: "2s" }}
              />
              {/* Mid Concentric Ring */}
              <div
                className="absolute w-32 h-32 md:w-36 md:h-36 rounded-full border-2 border-dashed border-blue-300 animate-spin"
                style={{ animationDuration: "15s" }}
              />

              {/* Orbiting Partner Beacon 1 */}
              <div
                className="absolute -top-1 right-12 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-full shadow-md border border-blue-100 animate-bounce"
                style={{ animationDuration: "2.5s" }}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-extrabold text-slate-700">
                  Verified Pro
                </span>
              </div>

              {/* Orbiting Partner Beacon 2 */}
              <div className="absolute bottom-4 left-8 flex items-center gap-1 bg-white/95 px-2 py-0.5 rounded-full shadow-md border border-blue-100 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold text-slate-600">
                  Available
                </span>
              </div>

              {/* Center Core Radar Beacon */}
              <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-brand-blue to-blue-500 text-white flex flex-col items-center justify-center shadow-xl shadow-brand-blue/30 ring-8 ring-blue-100">
                <Radio className="w-8 h-8 md:w-10 md:h-10 animate-pulse" />
              </div>
            </div>

            {/* Heading & Live Ticker */}
            <div className="relative z-10 max-w-lg mt-2">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-brand-blue text-xs font-black px-3 py-1 rounded-full border border-blue-200/80 mb-3">
                <Compass className="w-3.5 h-3.5 animate-spin" />
                <span>Live Partner Search • ~60s Avg Match</span>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                Searching for Service Partner...
              </h2>

              <p className="text-xs md:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                We are actively broadcasting your request to verified,
                background-checked service partners near{" "}
                <span className="font-bold text-slate-700">
                  {city || "your area"}
                </span>
                .
              </p>

              {/* Dynamic Step Ticker Box */}
              <div className="mt-5 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping shrink-0" />
                  <span className="text-xs font-black text-slate-800">
                    {SEARCH_MESSAGES[searchStepIndex]}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                  {elapsedSeconds}s elapsed
                </span>
              </div>
            </div>

            {/* Visual 3-Step Indicator */}
            <div className="w-full max-w-md mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <span className="font-bold text-slate-800 text-[11px]">
                  Booking Confirmed
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold animate-pulse shadow-md shadow-blue-500/30">
                  2
                </div>
                <span className="font-black text-brand-blue text-[11px]">
                  Finding Partner
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                  3
                </div>
                <span className="font-medium text-slate-400 text-[11px]">
                  En Route
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── PARTNER FOUND & ASSIGNED STATE ── */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-emerald-500/40 relative overflow-hidden transition-all duration-500 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-base md:text-lg font-black text-emerald-800">
                  Service Partner Assigned!
                </h2>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Accepted
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-blue to-blue-500 text-white text-2xl font-black flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
                  {(serviceProvider.name || "T").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {serviceProvider.name || "Certified Service Provider"}
                    </h3>
                    <span className="text-[10px] bg-blue-50 text-brand-blue font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1 font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {serviceProvider.rating || "4.8"}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {serviceProvider.specs?.[0] ||
                        categoryParam ||
                        "Appliance"}{" "}
                      Specialist
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCallServiceProvider}
                disabled={callLoading}
                className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-brand-blue text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-900/20 hover:bg-[#1565C0] cursor-pointer">
                <Phone className="w-4 h-4" />
                <span>Call Service Partner</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                The partner has accepted your booking and is preparing for
                doorstep service.
              </span>
              <span className="text-brand-blue font-black shrink-0">
                {instantStatus === "EN_ROUTE"
                  ? "🚗 On The Way"
                  : "⚡ Confirmed for You"}
              </span>
            </div>
          </div>
        )}

        {/* ── BOOKING DETAILS CARD ── */}
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xs border border-slate-100 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-brand-blue" />
              Service Details
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {quantityParam} {quantityParam === "1" ? "Unit" : "Units"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">
                Service
              </span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {serviceParam}
              </span>
              {categoryParam && (
                <span className="text-[11px] text-blue-600 font-semibold">
                  {categoryParam} {productTypeParam && `• ${productTypeParam}`}
                </span>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">
                Scheduled Time
              </span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {dateParam}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                {timeSlotDisplay}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 sm:col-span-2 md:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium block">
                Total Estimate
              </span>
              <span className="font-black text-slate-900 text-base mt-0.5 block">
                ₹{totalPriceParam}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {advanceAmtParam && advanceAmtParam !== "0"
                  ? `Advance Paid: ₹${advanceAmtParam}`
                  : "Pay after service"}
              </span>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/my-bookings")}
            className="flex-1 bg-brand-blue text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md shadow-brand-blue/20 hover:bg-[#1565C0] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer">
            <span>Track in My Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="sm:w-auto bg-white text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-sm border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer">
            Return to Home
          </button>
        </div>

        {/* ── SERVICE ASSURANCES FOOTER ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">👨‍🔧</span>
              <span className="text-xs font-black text-slate-800">
                Verified Pros
              </span>
              <span className="text-[10px] text-slate-400">
                100% Background Checked
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">🛡️</span>
              <span className="text-xs font-black text-slate-800">
                7-Day Warranty
              </span>
              <span className="text-[10px] text-slate-400">
                Post service assurance
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">💵</span>
              <span className="text-xs font-black text-slate-800">
                Fixed Pricing
              </span>
              <span className="text-[10px] text-slate-400">
                No hidden charges
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">⏱️</span>
              <span className="text-xs font-black text-slate-800">
                On-Time Arrival
              </span>
              <span className="text-[10px] text-slate-400">
                Fast doorstep dispatch
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SearchingPartner;
