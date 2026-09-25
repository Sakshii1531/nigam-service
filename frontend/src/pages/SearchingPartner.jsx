import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, Star, ShieldCheck, CheckCircle2, Wrench, AlertCircle, ArrowRight, Radio, ChevronRight, ChevronLeft, RotateCcw,
  Lightbulb, AlertTriangle, Users, MapPinOff, Clock, PlusCircle, Loader2
} from 'lucide-react';
import { apiRequest, getStoredTokens } from '../lib/apiClient';
import { goBack } from '../lib/navigation';
import { io } from 'socket.io-client';
import CancelBookingModal from '../components/booking/CancelBookingModal';
import RescheduleBookingModal from '../components/booking/RescheduleBookingModal';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/api\/v1\/?$/, '');

// The server stops searching after this long (booking.service.js
// SEARCH_WINDOW_MS) and cancels the booking with a reason.
const SEARCH_WINDOW_SECONDS = 15 * 60;

const SEARCH_END_COPY = {
  PROVIDERS_NOT_ACCEPTING: {
    title: 'Service providers are busy',
    message: 'Sorry, our service providers are not accepting service requests right now. Please retry after a few minutes.',
  },
  NO_PROVIDERS_NEARBY: {
    title: 'No service provider near you',
    message: 'There is no service provider near you right now. Kindly retry after some time.',
  },
};

// Search stages across the 15-minute window
const SEARCH_STAGES = [
  {
    maxSeconds: 30,
    title: 'Scanning Nearby Verified Partners',
    message: 'Broadcasting your service request to certified technicians nearby...',
    stageName: 'Local Scan',
  },
  {
    maxSeconds: 90,
    title: 'Expanding Search Territory',
    message: 'Expanding radius to 15 km area to find available specialists...',
    stageName: 'Territory Expansion',
  },
  {
    maxSeconds: 240,
    title: 'Priority Partner Fleet Broadcast',
    message: 'Contacting top-rated & high-demand certified partners in your city...',
    stageName: 'Priority Broadcast',
  },
  {
    maxSeconds: 420,
    title: 'Matching Active Technicians',
    message: 'Checking route schedules of engineers completing jobs nearby...',
    stageName: 'Schedule Matching',
  },
  {
    maxSeconds: 900,
    title: 'Final Dispatch Queue',
    message: 'Matching with available reserve partners in your zone...',
    stageName: 'Reserve Fleet',
  },
];

// Rotating Pro-Tips & Appliance Care Knowledge Carousel
const APPLIANCE_TIPS = [
  {
    id: 1,
    tag: 'Energy Saving Tip',
    icon: '⚡',
    title: 'Optimal AC Temperature Setting',
    desc: 'Setting your AC to 24°C instead of 18°C can reduce monthly power consumption by up to 24% while extending compressor lifespan.',
    benefit: 'Lower power bills',
  },
  {
    id: 2,
    tag: 'Water Purifier Care',
    icon: '💧',
    title: 'Sediment & Carbon Filter Life',
    desc: 'Replace pre-filters every 6 months. Clogged filters force the RO pump to work harder and degrade the expensive RO membrane prematurely.',
    benefit: 'Doubles RO membrane life',
  },
  {
    id: 3,
    tag: 'Refrigerator Maintenance',
    icon: '❄️',
    title: 'Clean Back Condenser Coils',
    desc: 'Keep at least 2 inches clearance behind your fridge. Dusty coils force the motor to run continuously, increasing electricity bills by 15%.',
    benefit: 'Prevents overheating',
  },
  {
    id: 4,
    tag: 'Washing Machine Tip',
    icon: '🧺',
    title: 'Monthly Tub Clean Routine',
    desc: 'Run an empty hot water cycle with descaler once a month to remove detergent scum, calcium deposits, and prevent musty odors.',
    benefit: 'Cleaner clothes & odor-free drum',
  },
  {
    id: 5,
    tag: 'Electrical Safety',
    icon: '🛡️',
    title: 'Proper 16A Sockets for Heavy Loads',
    desc: 'Geysers, microwaves, and room heaters must always run on dedicated 16A sockets with proper earthing to prevent switch melting.',
    benefit: '100% fire-safe homes',
  },
  {
    id: 6,
    tag: 'Nigam Service Promise',
    icon: '⭐',
    title: '7-Day Post-Service Warranty',
    desc: 'Every repair conducted by our background-verified service partner is backed by genuine spare parts and a hassle-free service warranty.',
    benefit: 'Zero risk guarantee',
  },
];

const SearchingPartner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const p = new URLSearchParams(location.search);

  const serviceRequestId = p.get('serviceRequestId') || p.get('bookingId');
  const serviceParam = p.get('service') || 'Home Service';
  const categoryParam = p.get('category') || '';
  const productTypeParam = p.get('productType') || '';
  const quantityParam = p.get('quantity') || '1';
  const dateParam = p.get('date') || 'Today';
  const timeGroupParam = p.get('timeGroup') || '09:00 AM';
  const totalPriceParam = p.get('totalPrice') || '299';
  const advanceAmtParam = p.get('advanceAmt') || '0';
  const isInstant = p.get('isInstant') === 'true' || timeGroupParam === 'ASAP' || timeGroupParam.includes('ASAP');

  const [bookingId, setBookingId] = useState('');
  const [city, setCity] = useState(p.get('city') || '');
  const [isAccepted, setIsAccepted] = useState(false);
  const [serviceProvider, setServiceProvider] = useState(null);
  const [instantStatus, setInstantStatus] = useState(isInstant ? 'SEARCHING' : null);
  const [callLoading, setCallLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [rawBooking, setRawBooking] = useState(null);
  // Set when the server gave up searching (15 minutes, nobody accepted).
  const [searchEndReason, setSearchEndReason] = useState(null);
  const [showSearchEnded, setShowSearchEnded] = useState(false);

  // Modals & Actions
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Retry Search / New Booking State
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [isRetryingSearch, setIsRetryingSearch] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Carousel State
  const [tipIndex, setTipIndex] = useState(0);

  // Search Timer (1-second tick)
  useEffect(() => {
    if (isAccepted && serviceProvider) return;
    if (isCancelled) return;

    const timer = setInterval(() => {
      setElapsedSeconds((s) => Math.min(SEARCH_WINDOW_SECONDS, s + 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isAccepted, serviceProvider, isCancelled]);

  // Auto-advance tips carousel every 6 seconds
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % APPLIANCE_TIPS.length);
    }, 6000);

    return () => clearInterval(tipTimer);
  }, []);

  // Determine Current Search Stage
  const currentStage = SEARCH_STAGES.find((st) => elapsedSeconds < st.maxSeconds) || {
    maxSeconds: SEARCH_WINDOW_SECONDS,
    title: 'High Demand in Your Area',
    message: 'Technicians are currently occupied on active jobs. You can wait, choose another time slot, or cancel.',
    stageName: 'Extended Wait',
  };

  const isTimeoutReached = elapsedSeconds >= 600; // 10 minutes in — warn before the 15-minute cut-off
  const remainingSeconds = Math.max(0, SEARCH_WINDOW_SECONDS - elapsedSeconds);

  // The pop-up opens once per booking. Polling and socket events report the
  // ended search again and again; this used to re-open it every 3 seconds
  // after the customer closed it. Closing is remembered for this booking so
  // a reload doesn't bring it back either (the cancelled card still explains).
  const dismissedKey = `ncc_search_ended_dismissed_${serviceRequestId}`;
  const searchEndedShownRef = useRef(false);
  const endSearch = useCallback((reason) => {
    if (!reason) return;
    setSearchEndReason(reason);
    if (searchEndedShownRef.current) return;
    searchEndedShownRef.current = true;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(dismissedKey) === '1';
    } catch {
      // Storage unavailable (private mode) — just show it this once.
    }
    if (!dismissed) setShowSearchEnded(true);
  }, [dismissedKey]);

  const closeSearchEnded = () => {
    setShowSearchEnded(false);
    try {
      sessionStorage.setItem(dismissedKey, '1');
    } catch {
      // Storage unavailable — it still stays closed for this visit.
    }
  };

  // Latest booking loader, shared with the socket handlers and action buttons.
  // Defined inside the polling effect (not a useCallback) so React Compiler can
  // optimise this component; callers go through the ref.
  const loadBookingDataRef = useRef(async () => {});
  const loadBookingData = () => loadBookingDataRef.current();

  // Load latest booking data from API, polling every 3s
  useEffect(() => {
    let interval = null;
    // A cancelled booking can't change any more, so stop polling it.
    const stopPolling = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const load = async () => {
      if (!serviceRequestId) return;
      try {
        const res = await apiRequest(`/service-requests/${serviceRequestId}`, {
          auth: true,
        });
        if (res?.humanId || res?.id) {
          setBookingId(res.humanId || res.id);
        }
        if (res?.address?.city) {
          setCity((current) => current || res.address.city);
        }

        if (res?.status === 'Cancelled' || res?.instantStatus === 'CANCELLED') {
          setIsCancelled(true);
          stopPolling();
        } else {
          setIsCancelled(false);
          setSearchEndReason(null);
        }

        const isReqAccepted = Boolean(
          res?.isAccepted ||
          [
            'Engineer Accepted',
            'Visit Scheduled',
            'Engineer Reached',
            'Diagnosis Done',
            'Spare Approval Pending',
            'Work In Progress',
            'Repair Completed',
            'Completed',
          ].includes(res?.status) ||
          ['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(res?.instantStatus)
        );

        let foundAccepted = isReqAccepted;
        let matchedTech = isReqAccepted && res?.serviceProvider ? res.serviceProvider : null;

        if (res?.instantStatus) {
          setInstantStatus(res.instantStatus);
        }

        if (res?.booking) {
          const bk = typeof res.booking === 'object'
            ? res.booking
            : await apiRequest(`/bookings/${res.booking}`, { auth: true }).catch(() => null);

          if (bk) {
            setRawBooking(bk);
            if (bk.status === 'Cancelled' || bk.instantStatus === 'CANCELLED') {
              setIsCancelled(true);
              if (bk.searchEndReason) endSearch(bk.searchEndReason);
            } else {
              setIsCancelled(false);
              setSearchEndReason(null);
            }
            // The clock comes from the server, so a reload doesn't restart it at 0:00.
            if (bk.searchExpiresAt) {
              const secondsLeft = Math.round((new Date(bk.searchExpiresAt).getTime() - Date.now()) / 1000);
              setElapsedSeconds(Math.min(SEARCH_WINDOW_SECONDS, Math.max(0, SEARCH_WINDOW_SECONDS - secondsLeft)));
            }
            if (bk.address?.city) {
              setCity((current) => current || bk.address.city);
            }
            const bkAccepted = Boolean(
              bk.isAccepted ||
              [
                'Engineer Accepted',
                'Visit Scheduled',
                'Engineer Reached',
                'Diagnosis Done',
                'Spare Approval Pending',
                'Work In Progress',
                'Repair Completed',
                'Completed',
              ].includes(bk.status) ||
              ['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(bk.instantStatus)
            );
            if (bkAccepted) foundAccepted = true;
            if (bk.serviceProvider && (foundAccepted || bkAccepted) && !matchedTech) {
              matchedTech = bk.serviceProvider;
            }
            if (bk.instantStatus && !res?.instantStatus) {
              setInstantStatus(bk.instantStatus);
            }
          }
        } else if (res) {
          setRawBooking(res);
        }

        setIsAccepted(foundAccepted);
        if (foundAccepted && matchedTech) {
          setServiceProvider(typeof matchedTech === 'object' ? matchedTech : { name: 'Assigned Service Provider' });
        }
      } catch (err) {
        console.error('[searching-partner] Failed to load booking data:', err.message);
      }
    };

    loadBookingDataRef.current = load;
    interval = setInterval(load, 3000);
    load();
    return stopPolling;
  }, [serviceRequestId, endSearch, retryCount]);


  // Real-time Socket.IO events
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socket.on('booking:cancelled', (data) => {
      const match = !data || data.serviceRequestId === serviceRequestId || data.bookingId === serviceRequestId ||
        (bookingId && (data.bookingId === bookingId || data.serviceRequestId === bookingId));

      if (match) {
        setIsCancelled(true);
        if (data?.searchEndReason) endSearch(data.searchEndReason);
      }
    });

    const handleAccepted = (data) => {
      const match = !data || data.serviceRequestId === serviceRequestId || data.bookingId === serviceRequestId ||
        (bookingId && (data.bookingId === bookingId || data.serviceRequestId === bookingId)) || data.isAccepted;

      if (match) {
        setIsAccepted(true);
        if (data.serviceProvider) setServiceProvider(data.serviceProvider);
        if (data.instantStatus) setInstantStatus(data.instantStatus);
        loadBookingData();
      }
    };

    socket.on('booking:accepted', handleAccepted);

    const handleStatusUpdate = (data) => {
      const match = !data || data.serviceRequestId === serviceRequestId || data.bookingId === serviceRequestId ||
        (bookingId && (data.bookingId === bookingId || data.serviceRequestId === bookingId));

      if (match) {
        if (data.instantStatus === 'CANCELLED' || data.status === 'Cancelled') {
          setIsCancelled(true);
          if (data.searchEndReason) endSearch(data.searchEndReason);
        } else if (data.instantStatus === 'SEARCHING' || data.isAccepted === false) {
          setIsAccepted(false);
          setServiceProvider(null);
          setIsCancelled(false);
          setSearchEndReason(null);
        } else if (data.serviceProvider && (data.isAccepted || ['EN_ROUTE', 'IN_PROGRESS', 'COMPLETED'].includes(data.instantStatus))) {
          setIsAccepted(true);
          setServiceProvider(data.serviceProvider);
          setIsCancelled(false);
          setSearchEndReason(null);
        }
        if (data.instantStatus) setInstantStatus(data.instantStatus);
        loadBookingData();
      }
    };

    socket.on('instant:status_update', handleStatusUpdate);
    socket.on('booking:status_update', handleStatusUpdate);

    socket.on('service_request:updated', (data) => {
      const match = !data || data.serviceRequestId === serviceRequestId || (bookingId && data.serviceRequestId === bookingId);

      if (match) {
        if (data.status === 'Cancelled' || data.instantStatus === 'CANCELLED') {
          setIsCancelled(true);
        } else if (data.status === 'New' || data.isAccepted === false || !data.serviceProvider) {
          setIsAccepted(false);
          setServiceProvider(null);
          setIsCancelled(false);
          setSearchEndReason(null);
        } else if (data.isAccepted || ['Engineer Accepted', 'Visit Scheduled', 'Engineer Reached', 'Diagnosis Done', 'Work In Progress', 'Repair Completed', 'Completed'].includes(data.status)) {
          setIsAccepted(true);
          if (data.serviceProvider) setServiceProvider(data.serviceProvider);
          setIsCancelled(false);
          setSearchEndReason(null);
        }
        loadBookingData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serviceRequestId, bookingId, endSearch]);

  // Click to call provider
  const handleCallServiceProvider = async () => {
    if (serviceProvider?.phone) {
      window.location.href = `tel:${serviceProvider.phone}`;
      return;
    }
    if (!serviceRequestId) return;
    setCallLoading(true);
    try {
      await apiRequest('/calls/initiate', {
        method: 'POST',
        body: { serviceRequestId },
        auth: true,
      });
    } catch (err) {
      console.error('[calls] Click-to-call failed:', err.message);
      if (err.status !== 503) {
        alert(`Call failed: ${err.message}`);
      }
    } finally {
      setCallLoading(false);
    }
  };

  const handleCancelBooking = async (reason) => {
    const targetId = bookingId || serviceRequestId;
    if (!targetId) return;
    setIsCancelling(true);
    try {
      await apiRequest(`/bookings/${targetId}/cancel`, {
        method: 'POST',
        body: { reason },
        auth: true,
      });
      setShowCancelModal(false);
      setIsCancelled(true);
      loadBookingData();
    } catch (err) {
      console.error('[searching-partner] Cancel failed:', err.message);
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleBooking = async ({ scheduledDate, timeSlot, reason }) => {
    const targetId = bookingId || serviceRequestId;
    if (!targetId) return;
    setIsRescheduling(true);
    try {
      await apiRequest(`/bookings/${targetId}/reschedule`, {
        method: 'POST',
        body: { scheduledDate, timeSlot, reason },
        auth: true,
      });
      setShowRescheduleModal(false);
      setToastMessage('Booking rescheduled successfully!');
      setTimeout(() => setToastMessage(''), 4000);
      loadBookingData();
    } catch (err) {
      console.error('[searching-partner] Reschedule failed:', err.message);
      alert(err.message || 'Failed to reschedule booking');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCreateNewBooking = () => {
    setShowRetryModal(false);
    setShowSearchEnded(false);
    const cat = categoryParam || rawBooking?.category || (rawBooking?.service?.category) || 'AC';
    navigate(`/book/${encodeURIComponent(cat)}`);
  };

  const handleRetrySearch = async () => {
    const targetId = rawBooking?._id || rawBooking?.id || rawBooking?.humanId || bookingId || serviceRequestId;
    if (!targetId) return;
    setIsRetryingSearch(true);
    try {
      const res = await apiRequest(`/bookings/${targetId}/retry-search`, {
        method: 'POST',
        auth: true,
      });

      try {
        sessionStorage.removeItem(dismissedKey);
      } catch {
        // ignore sessionStorage unavailable in private browsing
      }
      searchEndedShownRef.current = false;

      setIsCancelled(false);
      setSearchEndReason(null);
      setShowSearchEnded(false);
      setShowRetryModal(false);
      setElapsedSeconds(0);
      setInstantStatus('SEARCHING');
      setIsAccepted(false);
      setServiceProvider(null);

      // Re-trigger polling
      setRetryCount((prev) => prev + 1);

      setToastMessage('Search restarted! Searching for available verified partners for the next 15 minutes...');
      setTimeout(() => setToastMessage(''), 5000);

      if (res?.booking) {
        setRawBooking(res.booking);
      }
    } catch (err) {
      console.error('[searching-partner] Retry search failed:', err.message);
      alert(err.message || 'Failed to restart search. Please try again.');
    } finally {
      setIsRetryingSearch(false);
    }
  };

  const timeSlotDisplay = isInstant
    ? '⚡ Right Now (Instant ASAP)'
    : {
        Morning: '8 AM – 11 AM',
        Afternoon: '12 PM – 3 PM',
        Evening: '4 PM – 7 PM',
      }[timeGroupParam] || timeGroupParam;

  // Format Elapsed Time (MM:SS)
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col font-sans pb-12 text-slate-800">
      
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goBack(navigate, '/my-bookings')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Back to Bookings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isCancelled ? 'bg-rose-500' : isAccepted ? 'bg-emerald-500' : 'bg-blue-600 animate-ping'}`} />
              <h1 className="text-sm md:text-base font-extrabold text-slate-900 leading-tight">
                {isCancelled
                  ? (searchEndReason ? 'No Service Partner Found' : 'Booking Cancelled')
                  : isAccepted && serviceProvider
                  ? 'Service Partner Assigned'
                  : 'Searching for Service Partner'}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Booking ID: <span className="font-bold text-slate-700 font-mono">{bookingId || serviceRequestId || '—'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/my-bookings')}
          className="text-xs font-bold text-brand-blue bg-blue-50 border border-blue-200/80 px-3.5 py-1.5 rounded-xl hover:bg-blue-100 transition-all cursor-pointer"
        >
          My Bookings
        </button>
      </header>

      {/* ── Toast Alert ── */}
      {toastMessage && (
        <div className="max-w-3xl mx-auto w-full px-4 mt-4 animate-fade-in">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-6">

        {/* ── CANCELLED STATE ── */}
        {isCancelled ? (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xs border border-rose-100 flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-200">
              <AlertCircle className="w-8 h-8" />
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
              Cancelled
            </span>
            <h2 className="text-xl font-black text-slate-900">
              {searchEndReason ? SEARCH_END_COPY[searchEndReason]?.title : 'Booking Cancelled'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
              {searchEndReason
                ? `${SEARCH_END_COPY[searchEndReason]?.message} We stopped searching after 15 minutes. If any advance amount was paid, it will be refunded to your original payment mode within 5–7 business days.`
                : 'This booking has been cancelled. If any advance amount was paid, it will be automatically refunded to your original payment mode within 5–7 business days.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowRetryModal(true)}
                className="bg-brand-blue text-white font-extrabold py-3 px-6 rounded-2xl text-xs hover:bg-[#083679] transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/my-bookings')}
                className="bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-2xl text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Go to My Bookings
              </button>
            </div>
          </div>
        ) : !isAccepted || !serviceProvider ? (
          /* ── ACTIVE SEARCH RADAR HERO WITH 10-MIN TIMELINE ── */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-blue-100 flex flex-col items-center text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-linear-to-b from-blue-50/50 via-white to-transparent pointer-events-none" />

            {/* Radar Animation */}
            <div className="relative w-52 h-52 md:w-60 md:h-60 flex items-center justify-center my-3">
              {/* Outer Wave 1 */}
              <div
                className="absolute w-52 h-52 md:w-60 md:h-60 rounded-full border border-blue-300/40 bg-blue-100/20 animate-ping"
                style={{ animationDuration: '3s' }}
              />
              {/* Outer Wave 2 */}
              <div
                className="absolute w-40 h-40 md:w-46 md:h-46 rounded-full border border-blue-400/50 bg-blue-200/20 animate-pulse"
                style={{ animationDuration: '2s' }}
              />
              {/* Spinning Dashed Ring */}
              <div
                className="absolute w-28 h-28 md:w-32 md:h-32 rounded-full border-2 border-dashed border-blue-300 animate-spin"
                style={{ animationDuration: '14s' }}
              />

              {/* Orbiting Partner Beacon */}
              <div
                className="absolute -top-1 right-8 flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full shadow-md border border-blue-100 animate-bounce"
                style={{ animationDuration: '2.5s' }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-extrabold text-slate-700">Verified Pro</span>
              </div>

              {/* Center Core Radar Beacon */}
              <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-tr from-brand-blue to-blue-500 text-white flex flex-col items-center justify-center shadow-xl shadow-brand-blue/30 ring-8 ring-blue-100">
                <Radio className="w-8 h-8 md:w-10 md:h-10 animate-pulse" />
              </div>
            </div>

            {/* Stage Title & Subtitle */}
            <div className="relative z-10 max-w-lg mt-3">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {currentStage.title}
              </h2>

              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
                {currentStage.message} Near{' '}
                <span className="font-bold text-slate-700">{city || 'your area'}</span>.
              </p>

              {/* 10-Minute Timeout Warning Banner (if nearing or exceeded 10 mins) */}
              {isTimeoutReached ? (
                <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Search taking longer than expected</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Certified technicians in your area are currently occupied with ongoing jobs. We'll keep looking for another {formatTime(remainingSeconds)}, after which this search stops automatically. You can also reschedule for a preferred time slot at zero extra charge.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setShowRescheduleModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                    >
                      Reschedule Slot
                    </button>
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              ) : (
                /* Search Progress Bar */
                <div className="w-full bg-slate-100 h-2 rounded-full mt-5 overflow-hidden">
                  <div 
                    className="bg-brand-blue h-full transition-all duration-1000 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((elapsedSeconds / SEARCH_WINDOW_SECONDS) * 100))}%` }}
                  />
                </div>
              )}
            </div>

            {/* 3-Step Milestone Indicator */}
            <div className="w-full max-w-md mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <span className="font-bold text-slate-800 text-[11px]">Booking Placed</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold animate-pulse shadow-md shadow-blue-500/30">
                  2
                </div>
                <span className="font-black text-brand-blue text-[11px]">Finding Partner</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
                  3
                </div>
                <span className="font-medium text-slate-400 text-[11px]">Doorstep Visit</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── PARTNER ASSIGNED HERO ── */
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border-2 border-emerald-500/40 relative overflow-hidden transition-all text-left">
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
                <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-brand-blue to-blue-500 text-white text-2xl font-black flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
                  {(serviceProvider.name || 'T').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {serviceProvider.name || 'Certified Service Provider'}
                    </h3>
                    <span className="text-[10px] bg-blue-50 text-brand-blue font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1 font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {serviceProvider.rating || '4.8'}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {serviceProvider.specs?.[0] || categoryParam || 'Appliance'} Specialist
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCallServiceProvider}
                disabled={callLoading}
                className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-brand-blue text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-900/20 hover:bg-[#083679] cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Service Partner</span>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Partner has accepted and is preparing for your scheduled appointment.
              </span>
              <span className="text-brand-blue font-black shrink-0">
                {instantStatus === 'EN_ROUTE' ? '🚗 On The Way' : '⚡ Confirmed'}
              </span>
            </div>
          </div>
        )}

        {/* ── ROTATING APPLIANCE CARE & GK FACTS CAROUSEL ── */}
        {!isAccepted && !isCancelled && (
          <div className="bg-linear-to-r from-blue-900 to-indigo-950 text-white rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{APPLIANCE_TIPS[tipIndex].icon}</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                  {APPLIANCE_TIPS[tipIndex].tag}
                </span>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTipIndex((prev) => (prev - 1 + APPLIANCE_TIPS.length) % APPLIANCE_TIPS.length)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Previous Tip"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setTipIndex((prev) => (prev + 1) % APPLIANCE_TIPS.length)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="Next Tip"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
              {APPLIANCE_TIPS[tipIndex].title}
            </h3>
            <p className="text-xs text-blue-100/90 mt-1 leading-relaxed">
              {APPLIANCE_TIPS[tipIndex].desc}
            </p>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {APPLIANCE_TIPS[tipIndex].benefit}
              </span>

              {/* Dots */}
              <div className="flex items-center gap-1">
                {APPLIANCE_TIPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTipIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === tipIndex ? 'bg-white w-4' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BOOKING DETAILS CARD ── */}
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xs border border-slate-100 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-brand-blue" />
              Service Appointment Details
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {quantityParam} {quantityParam === '1' ? 'Unit' : 'Units'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Service</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                {serviceParam}
              </span>
              {categoryParam && (
                <span className="text-[11px] text-blue-600 font-semibold">
                  {categoryParam} {productTypeParam && `• ${productTypeParam}`}
                </span>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium block">Scheduled Slot</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {dateParam}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                {timeSlotDisplay}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 sm:col-span-2 md:col-span-1">
              <span className="text-[11px] text-slate-400 font-medium block">Total Estimate</span>
              <span className="font-black text-slate-900 text-base mt-0.5 block">
                ₹{totalPriceParam}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">
                {advanceAmtParam && advanceAmtParam !== '0'
                  ? `Advance Paid: ₹${advanceAmtParam}`
                  : 'Pay after service'}
              </span>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/bookings/${bookingId || serviceRequestId}`)}
            className="flex-1 bg-brand-blue text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm shadow-md shadow-brand-blue/20 hover:bg-[#083679] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Full Booking Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isCancelled && (
            <>
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="sm:w-auto bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold py-3.5 px-5 rounded-2xl text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4 text-purple-600" />
                <span>Reschedule</span>
              </button>

              <button
                onClick={() => setShowCancelModal(true)}
                className="sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold py-3.5 px-5 rounded-2xl text-sm transition-all cursor-pointer"
              >
                Cancel Booking
              </button>
            </>
          )}
        </div>

        {/* ── SERVICE ASSURANCES FOOTER ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">👨‍🔧</span>
              <span className="text-xs font-black text-slate-800">Verified Pros</span>
              <span className="text-[10px] text-slate-400">100% Background Checked</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">🛡️</span>
              <span className="text-xs font-black text-slate-800">7-Day Warranty</span>
              <span className="text-[10px] text-slate-400">Post service assurance</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">💵</span>
              <span className="text-xs font-black text-slate-800">Fixed Pricing</span>
              <span className="text-[10px] text-slate-400">No hidden charges</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2">
              <span className="text-xl">⏱️</span>
              <span className="text-xs font-black text-slate-800">On-Time Arrival</span>
              <span className="text-[10px] text-slate-400">Fast doorstep dispatch</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Reschedule Booking Modal ── */}
      <RescheduleBookingModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        onConfirm={handleRescheduleBooking}
        booking={rawBooking || {
          id: bookingId || serviceRequestId,
          humanId: bookingId || serviceRequestId,
          service: { name: serviceParam },
          category: categoryParam,
          scheduledDate: dateParam,
          timeSlot: timeGroupParam,
        }}
        isLoading={isRescheduling}
      />

      {/* ── Cancel Booking Modal ── */}
      {/* Search ended pop-up — the server stopped looking after 15 minutes */}
      {showSearchEnded && searchEndReason && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="search-ended-title"
            aria-describedby="search-ended-message"
            className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center text-center"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              searchEndReason === 'NO_PROVIDERS_NEARBY' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {searchEndReason === 'NO_PROVIDERS_NEARBY' ? <MapPinOff className="w-8 h-8" /> : <Users className="w-8 h-8" />}
            </div>
            <h2 id="search-ended-title" className="text-lg font-black text-slate-900">
              {SEARCH_END_COPY[searchEndReason]?.title}
            </h2>
            <p id="search-ended-message" className="text-sm text-slate-600 mt-2 leading-relaxed">
              {SEARCH_END_COPY[searchEndReason]?.message}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Your booking has been cancelled{Number(advanceAmtParam) > 0 ? ' and any advance paid will be refunded' : ''}.
            </p>
            <div className="w-full flex flex-col gap-2.5 mt-6">
              <button
                onClick={handleRetrySearch}
                disabled={isRetryingSearch}
                className="w-full h-12 rounded-2xl bg-brand-blue hover:bg-[#083679] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60 transition-colors"
              >
                {isRetryingSearch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restarting Search...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Search Again (Next 15 Mins)</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCreateNewBooking}
                className="w-full h-12 rounded-2xl bg-blue-50 hover:bg-blue-100 text-brand-blue text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Booking (Step 1)</span>
              </button>
              <button
                onClick={closeSearchEnded}
                className="w-full h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Again vs Create New Booking Selection Modal ── */}
      {showRetryModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center border border-blue-100">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-900">How would you like to proceed?</h3>
                  <p className="text-xs text-slate-500">Choose an option for your service booking</p>
                </div>
              </div>
              <button
                onClick={() => setShowRetryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 my-5">
              {/* Option 1: Search Again */}
              <div
                onClick={!isRetryingSearch ? handleRetrySearch : undefined}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer text-left flex flex-col gap-2 ${
                  isRetryingSearch
                    ? 'border-brand-blue bg-blue-50/50 cursor-wait'
                    : 'border-blue-200 bg-blue-50/40 hover:border-brand-blue hover:bg-blue-50 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-blue text-white">
                    <Clock className="w-3 h-3" /> Same Booking
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Recommended
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <RotateCcw className={`w-4 h-4 text-brand-blue ${isRetryingSearch ? 'animate-spin' : ''}`} />
                  Search Again (Next 15 Mins)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Search again for available verified partners for another 15 minutes using your current booking details without re-entering anything.
                </p>
                <button
                  type="button"
                  disabled={isRetryingSearch}
                  className="mt-1 w-full h-10 rounded-xl bg-brand-blue hover:bg-[#083679] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {isRetryingSearch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Restarting Partner Search...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Search Again for 15 Mins
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: Create New Booking */}
              <div
                onClick={handleCreateNewBooking}
                className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white hover:shadow-xs transition-all cursor-pointer text-left flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                    <PlusCircle className="w-3 h-3" /> New Booking
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Step 1
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-slate-700" />
                  Create Another Booking
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Start fresh from Step 1 to choose different service items, select another time slot, or modify your address details.
                </p>
                <button
                  type="button"
                  className="mt-1 w-full h-10 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Go to Booking Step 1
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowRetryModal(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <CancelBookingModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelBooking}
        booking={rawBooking || {
          id: bookingId || serviceRequestId,
          humanId: bookingId || serviceRequestId,
          service: { name: serviceParam },
          advanceAmount: advanceAmtParam,
        }}
        isLoading={isCancelling}
      />

    </div>
  );
};

export default SearchingPartner;
