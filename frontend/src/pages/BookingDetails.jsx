import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Star,
  ExternalLink,
} from "lucide-react";
import { apiRequest, getStoredTokens } from "../lib/apiClient";
import { goBack } from '../lib/navigation';
import { io } from "socket.io-client";
import CancelBookingModal from "../components/booking/CancelBookingModal";
import RescheduleBookingModal from "../components/booking/RescheduleBookingModal";

// 3D Category icons
import iconAc from "../assets/icon_3d_ac.png";
import iconGeyser from "../assets/icon_3d_geyser.png";
import iconRo from "../assets/icon_3d_ro.png";
import iconTv from "../assets/icon_3d_tv.png";
import iconChimney from "../assets/icon_3d_chimney.png";
import iconOven from "../assets/icon_3d_oven.png";
import iconFridge from "../assets/icon_3d_fridge.png";
import iconWm from "../assets/icon_3d_wm.png";
import electricianImg from "../assets/categories/electrician_fixed.png";
import plumberImg from "../assets/categories/plumber_fixed.png";
import cleaningImg from "../assets/categories/cleaning.png";

const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/api\/v1\/?$/, "");

const STATUS_BADGES = {
  Upcoming: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  Ongoing: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
  "Parts Pending": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  Rescheduled: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  Completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  Cancelled: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

const getCategoryIcon = (category, serviceName) => {
  const cat = (category || "").toLowerCase();
  const sName = (serviceName || "").toLowerCase();
  if (cat.includes("ac") || sName.includes("ac")) return iconAc;
  if (
    cat.includes("fridge") ||
    cat.includes("refrigerator") ||
    sName.includes("fridge") ||
    sName.includes("refrigerator")
  )
    return iconFridge;
  if (cat.includes("washing") || sName.includes("washing")) return iconWm;
  if (
    cat.includes("ro") ||
    cat.includes("purifier") ||
    sName.includes("purifier")
  )
    return iconRo;
  if (cat.includes("tv") || sName.includes("tv")) return iconTv;
  if (cat.includes("chimney") || sName.includes("chimney")) return iconChimney;
  if (cat.includes("geyser") || sName.includes("geyser")) return iconGeyser;
  if (cat.includes("oven") || sName.includes("oven") || sName.includes("gas"))
    return iconOven;
  if (cat.includes("electrician") || sName.includes("electrician"))
    return electricianImg;
  if (cat.includes("plumber") || sName.includes("plumber")) return plumberImg;
  if (cat.includes("cleaning") || sName.includes("cleaning"))
    return cleaningImg;
  return iconAc;
};

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const loadBooking = useCallback(
    async (isSilent = false) => {
      if (!id) return;
      if (isSilent) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await apiRequest(`/bookings/${id}`, { auth: true });
        setBooking(res);
        setError("");
      } catch (err) {
        setError(err.message || "Could not find booking.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Real-time socket updates
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    const handleUpdate = () => {
      loadBooking(true);
    };

    socket.on("connect", () => {
      socket.emit("join:booking", {
        bookingId: booking?._id || booking?.id,
        humanId: id,
      });
    });

    socket.on("booking:completed", handleUpdate);
    socket.on("booking:updated", handleUpdate);
    socket.on("booking:accepted", handleUpdate);
    socket.on("booking:rescheduled", handleUpdate);
    socket.on("booking:cancelled", handleUpdate);
    socket.on("booking:reschedule_accepted", handleUpdate);
    socket.on("booking:reschedule_rejected", handleUpdate);
    socket.on("instant:status_update", handleUpdate);
    socket.on("service_request:updated", handleUpdate);
    socket.on("job:completed", handleUpdate);
    socket.on("job:updated", handleUpdate);
    socket.on("tracking:update", handleUpdate);

    return () => {
      socket.emit("leave:booking", {
        bookingId: booking?._id || booking?.id,
        humanId: id,
      });
      socket.disconnect();
    };
  }, [loadBooking, booking?._id, booking?.id, id]);

  const handleCopy = (text, type = "id") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedOtp(true);
      setTimeout(() => setCopiedOtp(false), 2000);
    }
  };

  const handleCancelBooking = async (reason) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiRequest(`/bookings/${booking.id || booking.humanId}/cancel`, {
        method: "POST",
        body: { reason },
        auth: true,
      });
      setShowCancelModal(false);
      setToastMessage("Booking cancelled successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      await loadBooking(true);
    } catch (err) {
      setError(err.message || "Failed to cancel booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleBooking = async ({
    scheduledDate,
    timeSlot,
    reason,
  }) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiRequest(
        `/bookings/${booking.id || booking.humanId}/reschedule`,
        {
          method: "POST",
          body: { scheduledDate, timeSlot, reason },
          auth: true,
        },
      );
      setShowRescheduleModal(false);
      setToastMessage("Appointment rescheduled successfully.");
      setTimeout(() => setToastMessage(""), 4000);
      await loadBooking(true);
    } catch (err) {
      setError(err.message || "Failed to reschedule booking.");
    } finally {
      setActionLoading(false);
    }
  };

  // The technician's part request never reaches the super-admin queue until
  // this fires — see backend booking.service.js's respondToPartRequest.
  const handleRespondPartRequest = async (approve) => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiRequest(
        `/bookings/${booking.id || booking.humanId}/respond-part-request`,
        {
          method: "POST",
          body: { approve },
          auth: true,
        },
      );
      setToastMessage(
        approve ? "Part request approved." : "Part request declined.",
      );
      setTimeout(() => setToastMessage(""), 4000);
      await loadBooking(true);
    } catch (err) {
      setError(err.message || "Could not record your response.");
    } finally {
      setActionLoading(false);
    }
  };

  // Undoes an earlier decline: re-approves the same part request and reopens
  // the booking/job exactly where they were before the rejection — see
  // backend booking.service.js's reRaisePartRequest.
  const handleReRaisePartRequest = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      await apiRequest(
        `/bookings/${booking.id || booking.humanId}/re-raise-part-request`,
        { method: "POST", auth: true },
      );
      setToastMessage("Spare part re-approved — your service is back on.");
      setTimeout(() => setToastMessage(""), 4000);
      await loadBooking(true);
    } catch (err) {
      setError(err.message || "Could not re-raise the spare part request.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-600">
          Loading booking details…
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Booking Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
          {error || "We couldn't retrieve the details for this booking ID."}
        </p>
        <button
          onClick={() => navigate("/my-bookings")}
          className="bg-brand-blue text-white text-xs font-bold py-3 px-6 rounded-2xl shadow-sm hover:bg-[#083679] cursor-pointer">
          Return to My Bookings
        </button>
      </div>
    );
  }

  const orderId = booking.humanId || booking.id;
  const isCancelled = booking.status === "Cancelled";
  const isCompleted = booking.status === "Completed";
  const badge = STATUS_BADGES[booking.status] || STATUS_BADGES.Upcoming;

  const scheduledDateStr = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Scheduled Date";

  const timeStr =
    typeof booking.timeSlot === "object"
      ? booking.timeSlot?.time ||
        booking.timeSlot?.date ||
        "10:00 AM – 01:00 PM"
      : booking.timeSlot || "10:00 AM – 01:00 PM";

  const otpCode =
    booking.completionOtp || booking.serviceRequest?.completionOtp || "";

  const sr = booking.serviceRequest;
  const tl = sr?.timeline || [];
  const hasTl = (label) =>
    tl.some(
      (t) =>
        t.stepLabel?.toLowerCase().includes(label.toLowerCase()) ||
        t.description?.toLowerCase().includes(label.toLowerCase()),
    );

  const isAssigned = Boolean(booking.serviceProvider);
  const isSpareReq =
    hasTl("Spare") ||
    booking.instantStatus === "PARTS_PENDING" ||
    booking.status === "Parts Pending";

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col font-sans pb-28 sm:pb-12 text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack(navigate, "/my-bookings")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Back to Bookings">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 leading-tight">
                Booking Details
              </h1>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                {booking.status || "Upcoming"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono font-bold text-slate-600">
                {orderId}
              </span>
              <button
                onClick={() => handleCopy(orderId, "id")}
                className="text-slate-400 hover:text-brand-blue p-0.5"
                title="Copy Order ID">
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadBooking(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50">
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-brand-blue" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </header>

      {/* Toast alert */}
      {toastMessage && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-4 py-5 flex flex-col gap-4">
        {/* OTP Banner (Shown for all active bookings) */}
        {!isCancelled && !isCompleted && (
          <div className="bg-linear-to-r from-brand-navy to-[#0F3460] rounded-3xl p-4.5 text-white shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  Service Verification OTP
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Share with engineer only upon job completion
                </p>
              </div>
            </div>

            <button
              onClick={() => handleCopy(otpCode, "otp")}
              className="bg-white text-brand-navy font-mono font-black text-lg px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
              title="Click to copy OTP">
              <span>{otpCode}</span>
              {copiedOtp ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        )}

        {/* Cancellation Notice if Cancelled */}
        {isCancelled && (
          <div className="bg-rose-50 border border-rose-200/80 rounded-3xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-900">
                Booking Cancelled
              </p>
              <p className="text-xs text-rose-700/90 mt-0.5 leading-relaxed">
                Reason:{" "}
                {booking.cancellationReason ||
                  (booking.searchEndReason === "no_providers_found"
                    ? "No service partners were available in your area within 15 minutes."
                    : booking.searchEndReason) ||
                  "Cancelled"}
                . If any advance amount was paid, it will be refunded within 5-7
                working days.
              </p>
              {booking.partApproval?.status === "Rejected" && (
                <button
                  onClick={handleReRaisePartRequest}
                  disabled={actionLoading}
                  className="mt-3 bg-white border border-rose-300 hover:bg-rose-50 disabled:opacity-60 text-rose-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer">
                  {actionLoading
                    ? "Re-approving…"
                    : "Re-approve Spare Part & Reschedule"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Appliance & Service Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF4FF] flex items-center justify-center p-2 shrink-0 border border-blue-100">
              <img
                src={getCategoryIcon(booking.category, booking.service?.name)}
                alt={booking.category}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase text-brand-blue tracking-wider">
                  {booking.category || "Appliance Service"}
                </span>
                <span className="text-base font-black text-slate-900">
                  ₹{booking.totalPrice ?? 499}
                </span>
              </div>
              <h2 className="text-sm md:text-base font-black text-slate-900 mt-0.5 truncate">
                {booking.service?.name || booking.service || "Service Repair"}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {booking.brand && (
                  <span className="bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                    Brand: {booking.brand}
                  </span>
                )}
                {booking.productType && (
                  <span className="bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                    Type: {booking.productType}
                  </span>
                )}
                <span className="bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                  Qty: {booking.quantity || 1}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Schedule Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Appointment Schedule
              </h3>
            </div>
            {!isCancelled && !isCompleted && (
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl transition-colors cursor-pointer border border-indigo-200">
                Reschedule
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Scheduled Date
              </span>
              <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{scheduledDateStr}</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Time Slot
              </span>
              <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{timeStr}</span>
              </p>
            </div>
          </div>

          {booking.rescheduledAt && (
            <p className="text-[11px] text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
              Rescheduled on{" "}
              {new Date(booking.rescheduledAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              : {booking.rescheduleReason || "Customer requested new slot"}
            </p>
          )}
        </div>

        {/* Service Partner Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-blue" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Assigned Service Partner
            </h3>
          </div>

          {booking.serviceProvider ? (
            <div className="bg-[#EAF4FF]/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue text-white font-black text-base flex items-center justify-center shadow-xs">
                  {booking.serviceProvider.name?.charAt(0) || "T"}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black text-slate-900 leading-tight">
                      {booking.serviceProvider.name}
                    </p>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Certified Appliance Specialist
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs font-bold text-amber-600">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>
                      {booking.serviceProvider.rating || "4.9"} • 100+ Jobs
                      Completed
                    </span>
                  </div>
                </div>
              </div>

              {booking.serviceProvider.phone &&
                !isCancelled &&
                !isCompleted && (
                  <a
                    href={`tel:${booking.serviceProvider.phone}`}
                    className="bg-brand-blue hover:bg-[#083679] text-white p-3 rounded-2xl flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    title="Call Technician">
                    <Phone className="w-4 h-4" />
                  </a>
                )}
            </div>
          ) : (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-600">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping shrink-0" />
              <p>
                <strong className="text-slate-800">
                  Assigning nearest certified expert…
                </strong>{" "}
                We match technicians based on territory proximity and brand
                specialization.
              </p>
            </div>
          )}
        </div>

        {/* Location & Address Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Service Location
              </h3>
            </div>
            {((booking.address?.latitude && booking.address?.longitude) ||
              booking.address?.formattedAddress ||
              booking.address?.area) && (
              <a
                href={
                  booking.address?.latitude && booking.address?.longitude
                    ? `https://www.google.com/maps/search/?api=1&query=${booking.address.latitude},${booking.address.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([booking.address?.house, booking.address?.area, booking.address?.city, booking.address?.pincode].filter(Boolean).join(", "))}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-brand-blue text-[11px] font-bold rounded-xl transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                Google Maps
              </a>
            )}
          </div>
          <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <p className="font-extrabold text-slate-900">
              {booking.fullName || booking.address?.name || "Customer"}
              {booking.mobile && ` (${booking.mobile})`}
            </p>
            <p className="mt-1">
              {[
                booking.address?.house,
                booking.address?.area,
                booking.address?.landmark && `Near ${booking.address.landmark}`,
                booking.address?.city,
                booking.address?.pincode,
              ]
                .filter(Boolean)
                .join(", ") || "Address on file"}
            </p>
            {booking.address?.latitude && booking.address?.longitude && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>
                  GPS: {Number(booking.address.latitude).toFixed(5)},{" "}
                  {Number(booking.address.longitude).toFixed(5)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Progress Timeline */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Live Progress Tracking
            </h3>
          </div>

          <div className="flex flex-col gap-4 pl-2 border-l-2 border-blue-200 ml-3">
            {/* Placed */}
            <div className="relative pl-5">
              <div className="absolute -left-4.75 top-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
              <p className="text-xs font-black text-slate-900">
                Booking Placed & Confirmed
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {booking.createdAt
                  ? new Date(booking.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Confirmed"}
              </p>
            </div>

            {/* Assigned */}
            <div className="relative pl-5">
              <div
                className={`absolute -left-4.75 top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${isAssigned ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              <p className="text-xs font-black text-slate-900">
                {isAssigned
                  ? "Service Partner Allocated"
                  : "Allocating Nearest Partner"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAssigned
                  ? `${booking.serviceProvider.name} is scheduled for your visit`
                  : "Broadcasting request to active technicians"}
              </p>
            </div>

            {/* Spares if any */}
            {isSpareReq && (
              <div className="relative pl-5">
                <div className="absolute -left-4.75 top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                <p className="text-xs font-black text-amber-900">
                  Spare Parts In Transit
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Genuine parts requested from warehouse; technician will
                  revisit to complete installation.
                </p>
              </div>
            )}

            {/* Final status */}
            <div className="relative pl-5">
              <div
                className={`absolute -left-4.75 top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${isCompleted ? "bg-emerald-500" : isCancelled ? "bg-rose-500" : "bg-slate-300"}`}
              />
              <p className="text-xs font-black text-slate-900">
                {isCompleted
                  ? "Service Completed & Verified"
                  : isCancelled
                    ? "Booking Cancelled"
                    : "Doorstep Service Completion"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isCompleted
                  ? "Warranty active for 7 days"
                  : isCancelled
                    ? "Booking terminated"
                    : "Verified with OTP upon finishing"}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Breakdown Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-blue" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Payment & Billing Details
            </h3>
          </div>

          <div className="flex flex-col gap-2 text-xs divide-y divide-slate-100 mt-1">
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500 font-medium">
                Standard Service Charge
              </span>
              <span className="font-bold text-slate-800">
                ₹{booking.totalPrice ?? 499}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-500 font-medium">Payment Mode</span>
              <span className="font-bold text-brand-blue uppercase text-[11px]">
                {booking.paymentMode === "advance"
                  ? "Advance Paid Online"
                  : "Pay After Service (Cash / UPI)"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 text-sm">
              <span className="font-black text-slate-900">Total Payable</span>
              <span className="font-black text-slate-900">
                ₹{booking.totalPrice ?? 499}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Area */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isCompleted && !isCancelled && (
            <>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="flex-1 py-3.5 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl border border-rose-200 transition-colors cursor-pointer text-center">
                Cancel Booking
              </button>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(true)}
                className="flex-1 py-3.5 px-5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-2xl border border-indigo-200 transition-colors cursor-pointer text-center">
                Reschedule Slot
              </button>
            </>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex-1 py-3.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-200 transition-colors cursor-pointer text-center">
              Go to Home
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/services")}
            className="flex-1 py-3.5 px-5 bg-brand-blue hover:bg-[#083679] text-white font-bold text-xs rounded-2xl shadow-sm transition-all cursor-pointer text-center">
            Book Another Service
          </button>
        </div>
      </main>

      {/* Spare Part Approval Popup — the customer must sign off on this cost
          before it's ever sent to the super-admin queue. */}
      {booking.partApproval?.status === "Pending" && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Spare Part Approval Needed
              </h3>
              <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-relaxed">
                Your service partner has requested{" "}
                <span className="font-black text-slate-900">
                  {(booking.partApproval.partNames || []).join(", ") ||
                    "a spare part"}
                </span>{" "}
                worth{" "}
                <span className="font-black text-brand-blue">
                  ₹{booking.partApproval.amount ?? 0}
                </span>
                . Did you approve this request? It won't be ordered until you
                do.
              </p>
            </div>
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespondPartRequest(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all disabled:opacity-60 cursor-pointer">
                Decline
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespondPartRequest(true)}
                className="flex-1 bg-brand-blue hover:bg-[#083679] text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-sm disabled:opacity-60 cursor-pointer">
                {actionLoading ? "Submitting…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        booking={booking}
        isLoading={actionLoading}
      />

      {/* Reschedule Booking Modal */}
      <RescheduleBookingModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onConfirm={handleRescheduleBooking}
        booking={booking}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default BookingDetails;
