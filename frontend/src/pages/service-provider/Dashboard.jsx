import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  ClipboardList,
  Calendar,
  Wrench,
  User,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Clock,
  Shield,
  Star,
  GraduationCap,
  MessageSquare,
  Megaphone,
  CheckCircle,
  RotateCw,
  LogOut,
  Zap,
  Wallet,
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
} from "lucide-react";
import { useTech } from "../../context/ServiceProviderContext";
import { useNotifications } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import ServiceProviderBottomNav from "../../components/ServiceProviderBottomNav";
import { useServiceProviderSummary } from "../../hooks/useServiceProviderSummary";
import { InlineValue } from '../../components/common/Skeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    jobs,
    earningsTally,
    earningsLoading,
    acceptJob,
    selectJobForDetails,
    jobsLoading,
    availability,
    availabilityBusy,
    setAvailability,
    dismissJob,
    respondToReschedule,
  } = useTech();

  const isOnline = availability === "Available";
  // null until the server answers — the pill must not claim "Offline" before we
  // actually know, and tapping it in that window would send the wrong target.
  const availabilityKnown = availability !== null;

  const [showDutyPrompt, setShowDutyPrompt] = useState(false);

  // Automatically prompt the service provider if they are currently offline
  useEffect(() => {
    if (!availabilityKnown) return;
    const promptedInSession = sessionStorage.getItem("ncc_sp_duty_prompted");
    if (!isOnline && !promptedInSession) {
      setShowDutyPrompt(true);
    }
  }, [availabilityKnown, isOnline]);

  const handleConfirmOnline = async () => {
    sessionStorage.setItem("ncc_sp_duty_prompted", "true");
    setShowDutyPrompt(false);
    const res = await setAvailability("Available");
    if (!res.ok) {
      setDutyMessage(res.error || "Could not change your status.");
    } else if (res.assignedCount > 0) {
      setDutyMessage(
        `You're online — ${res.assignedCount} waiting job(s) assigned to you.`,
      );
    } else {
      setDutyMessage("You're now online and accepting new jobs.");
    }
  };

  const handleConfirmOffline = () => {
    sessionStorage.setItem("ncc_sp_duty_prompted", "true");
    setShowDutyPrompt(false);
  };

  const handleToggleDuty = async () => {
    if (!availabilityKnown || availabilityBusy) return;
    if (!isOnline) {
      setShowDutyPrompt(true);
      return;
    }
    const res = await setAvailability("Offline");
    if (!res.ok) {
      setDutyMessage(res.error || "Could not change your status.");
    } else {
      setDutyMessage("You're now offline.");
    }
  };

  const [showAllJobs, setShowAllJobs] = useState(false);
  const [filterTab, setFilterTab] = useState("All"); // an id from JOB_FILTERS
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dutyMessage, setDutyMessage] = useState(null);
  // The job currently shown in the dispatch pop-up — always an entry from
  // `jobs`, so it carries the real earnings/address rather than socket-payload
  // guesses (those hardcoded ₹299 and a flat 30%).
  const [instantAlertJob, setInstantAlertJob] = useState(null);
  const [alertOpenedAt, setAlertOpenedAt] = useState(null);
  const [alertNow, setAlertNow] = useState(() => Date.now());
  const [alertBusy, setAlertBusy] = useState(null); // 'accept' | 'decline' | null
  const [alertError, setAlertError] = useState(null);
  const [dispatchedIds, setDispatchedIds] = useState([]);
  const [suppressedPopupIds, setSuppressedPopupIds] = useState([]);
  const [declinedOfferIds, setDeclinedOfferIds] = useState([]);
  const [acceptedInstantIds, setAcceptedInstantIds] = useState([]);
  const [rescheduleAlertJob, setRescheduleAlertJob] = useState(null);
  const [cancellationAlert, setCancellationAlert] = useState(null);
  const [respondingToReschedule, setRespondingToReschedule] = useState(false);

  const playDispatchChime = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio might be restricted prior to user gesture
    }
  };

  // 1. Real-time dispatch. The context refetches jobs on the same socket
  // event; we just remember which request was announced so the pop-up opens
  // for it as soon as it appears in the list (open city-wide offers included,
  // which are otherwise only listed, not popped up).
  React.useEffect(() => {
    const handleIncomingEvent = (e) => {
      const payload = e.detail;
      const ids = [payload?.serviceRequestId, payload?.bookingId]
        .filter(Boolean)
        .map(String);
      if (ids.length)
        setDispatchedIds((prev) => [...new Set([...prev, ...ids])]);
    };

    window.addEventListener(
      "service-provider:incoming_job",
      handleIncomingEvent,
    );
    return () =>
      window.removeEventListener(
        "service-provider:incoming_job",
        handleIncomingEvent,
      );
  }, []);

  // Listen for real-time customer reschedule and cancellation events
  React.useEffect(() => {
    const handleRescheduleEvent = (e) => {
      const payload = e.detail;
      if (!payload) return;
      setRescheduleAlertJob(payload);
      playDispatchChime();
    };

    const handleCancelledEvent = (e) => {
      const payload = e.detail;
      if (!payload) return;
      setCancellationAlert(payload);
      // Suppress any open alerts for this cancelled job
      const targetId =
        payload.bookingId || payload.serviceRequestId || payload.id;
      if (
        instantAlertJob &&
        (instantAlertJob.id === targetId ||
          instantAlertJob.serviceRequestId === targetId ||
          instantAlertJob.bookingId === targetId)
      ) {
        setInstantAlertJob(null);
      }
      if (
        rescheduleAlertJob &&
        (rescheduleAlertJob.jobId === targetId ||
          rescheduleAlertJob.bookingId === targetId ||
          rescheduleAlertJob.serviceRequestId === targetId)
      ) {
        setRescheduleAlertJob(null);
      }
    };

    window.addEventListener(
      "service-provider:job_rescheduled",
      handleRescheduleEvent,
    );
    window.addEventListener(
      "service-provider:job_cancelled",
      handleCancelledEvent,
    );
    return () => {
      window.removeEventListener(
        "service-provider:job_rescheduled",
        handleRescheduleEvent,
      );
      window.removeEventListener(
        "service-provider:job_cancelled",
        handleCancelledEvent,
      );
    };
  }, [instantAlertJob, rescheduleAlertJob]);

  // Check for any active job with providerRescheduleStatus === 'PENDING'
  React.useEffect(() => {
    const pendingReschedule = jobs.find(
      (j) => j.providerRescheduleStatus === "PENDING",
    );
    if (pendingReschedule && !rescheduleAlertJob) {
      setRescheduleAlertJob({
        jobId: pendingReschedule.id,
        serviceRequestId: pendingReschedule.serviceRequestId,
        bookingId:
          pendingReschedule.booking?.humanId ||
          pendingReschedule.booking?.id ||
          pendingReschedule.id,
        scheduledDate: pendingReschedule.scheduledDate,
        timeSlot: pendingReschedule.timeSlot,
        reason: pendingReschedule.rescheduleReason,
        customerName: pendingReschedule.customerName,
        address: pendingReschedule.address,
        product: pendingReschedule.product,
        category: pendingReschedule.category,
      });
      playDispatchChime();
    }
  }, [jobs, rescheduleAlertJob]);

  // 2. Decide what the pop-up shows. It opens for offers the dispatch engine
  // assigned to this provider, and for anything just announced over the
  // socket. It used to open for any job at step 'assigned' — i.e. jobs already
  // accepted — so "Accept" failed with "A job already exists".
  React.useEffect(() => {
    if (jobsLoading) return;
    const isAnswered = (j) =>
      [j.id, j.serviceRequestId].some(
        (id) =>
          acceptedInstantIds.includes(id) || declinedOfferIds.includes(id),
      );
    const openOffers = jobs.filter(
      (j) => j.isAvailableRequest && !isAnswered(j),
    );

    if (instantAlertJob) {
      if (alertBusy) return;
      // Keep the snapshot fresh, and close it once the offer is gone — taken by
      // someone else, cancelled, or passed on by the server's 60s timeout.
      const latest = openOffers.find(
        (j) => j.serviceRequestId === instantAlertJob.serviceRequestId,
      );
      if (!latest) setInstantAlertJob(null);
      else if (latest !== instantAlertJob) setInstantAlertJob(latest);
      return;
    }

    const isAlertSuppressed = (j) =>
      [j.id, j.serviceRequestId].some((id) => suppressedPopupIds.includes(id));

    // The modal popup only opens for direct assignments assigned to this provider or fresh targeted dispatches,
    // provided the modal hasn't been closed/declined/timed-out already
    const next =
      openOffers.find((j) => j.assignedToMe && !isAlertSuppressed(j)) ||
      openOffers.find(
        (j) =>
          !isAlertSuppressed(j) &&
          (dispatchedIds.includes(String(j.serviceRequestId)) ||
            dispatchedIds.includes(String(j.bookingId))),
      );
    openOffers.find(
      (j) =>
        !isAlertSuppressed(j) &&
        (j.isInstant ||
          dispatchedIds.includes(String(j.serviceRequestId)) ||
          dispatchedIds.includes(String(j.bookingId))),
    );
    if (next) {
      setInstantAlertJob(next);
      setAlertOpenedAt(Date.now());
      setAlertNow(Date.now());
      setAlertError(null);
      setDispatchedIds((prev) =>
        prev.filter(
          (id) =>
            id !== String(next.serviceRequestId) &&
            id !== String(next.bookingId),
        ),
      );
      playDispatchChime();
    }
  }, [
    jobs,
    jobsLoading,
    suppressedPopupIds,
    declinedOfferIds,
    acceptedInstantIds,
    instantAlertJob,
    dispatchedIds,
    alertBusy,
  ]);

  /** Stop the alert re-opening for this job before the refetch lands. */
  const suppressInstantAlert = (jobId) => {
    if (jobId)
      setSuppressedPopupIds((prev) =>
        prev.includes(jobId) ? prev : [...prev, jobId],
      );
    if (
      instantAlertJob &&
      (instantAlertJob.id === jobId ||
        instantAlertJob.serviceRequestId === jobId)
    ) {
      setInstantAlertJob(null);
    }
  };

  /**
   * Decline direct popup assignment. Dismissing the popup releases the direct assignment
   * back to the open pool so it stays visible and open to everyone (first-come, first-served).
   */
  const declineInstantJob = async () => {
    const job = instantAlertJob;
    if (!job) return;
    const id = job.serviceRequestId || job.id;
    setAlertBusy("decline");
    suppressInstantAlert(id);
    await dismissJob(id);
    setAlertBusy(null);
    setDutyMessage(
      "Offer passed — we're finding another partner for this job.",
    );
  };

  /**
   * Reject an open offer card explicitly from the dashboard list.
   */
  const rejectListedJob = async (jobId) => {
    if (jobId)
      setDeclinedOfferIds((prev) =>
        prev.includes(jobId) ? prev : [...prev, jobId],
      );
    const res = await dismissJob(jobId);
    setDutyMessage("Declined job offer.");
    return res;
  };

  const acceptListedJob = async (job) => {
    setAcceptedInstantIds((prev) =>
      [...prev, job.id, job.serviceRequestId].filter(Boolean),
    );
    const res = await acceptJob(job.id, { silent: true });
    if (res?.ok) {
      selectJobForDetails(job.id);
      setDutyMessage("Job accepted! It is now listed under Active Jobs below.");
      setShowAllJobs(false);
      setTimeout(() => {
        const el = document.getElementById("active-jobs-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      setAcceptedInstantIds((prev) =>
        prev.filter((id) => id !== job.id && id !== job.serviceRequestId),
      );
      const errMsg = res?.error || "";
      if (
        errMsg.toLowerCase().includes("already taken") ||
        errMsg.toLowerCase().includes("already been accepted")
      ) {
        setDutyMessage("Another service provider has already taken this job.");
      } else {
        setDutyMessage(errMsg || "Could not accept that job.");
      }
    }
    return res;
  };

  const acceptInstantJob = async () => {
    const job = instantAlertJob;
    if (!job) return;
    setAlertBusy("accept");
    setAlertError(null);
    const res = await acceptJob(job.id, { silent: true });
    if (res?.ok) {
      selectJobForDetails(job.id);
      setAcceptedInstantIds((prev) =>
        [...prev, job.id, job.serviceRequestId].filter(Boolean),
      );
      setAlertBusy(null);
      setInstantAlertJob(null);
      setDutyMessage("Job accepted! It is now listed under Active Jobs below.");
      setShowAllJobs(false);
      setTimeout(() => {
        const el = document.getElementById("active-jobs-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } else {
      setAlertBusy(null);
      setAlertError(res?.error || "Could not accept this job.");
    }
  };

  // Countdown, for offers assigned to this provider only (open offers have no
  // deadline). It runs from the server's assignedAt so it matches the server's
  // own 60s hand-off, instead of restarting at 60 on every reload.
  const OFFER_WINDOW_MS = 60000;
  let alertDeadline = null;
  if (instantAlertJob?.assignedToMe && alertOpenedAt) {
    const assignedMs = new Date(instantAlertJob.assignedAt || 0).getTime();
    const elapsedAtOpen = alertOpenedAt - assignedMs;
    // Fall back to when the pop-up opened if the timestamps look skewed.
    const base =
      Number.isFinite(assignedMs) &&
      elapsedAtOpen >= 0 &&
      elapsedAtOpen < OFFER_WINDOW_MS
        ? assignedMs
        : alertOpenedAt;
    alertDeadline = base + OFFER_WINDOW_MS;
  }
  const countdown = alertDeadline
    ? Math.max(0, Math.ceil((alertDeadline - alertNow) / 1000))
    : null;

  React.useEffect(() => {
    if (!instantAlertJob) return undefined;
    const tick = setInterval(() => setAlertNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [instantAlertJob]);

  // Running out is a decline of the direct assignment: the 60s exclusive window
  // expires, so the job returns to the open pool for everyone on a first-come, first-served basis.
  const autoRejectedRef = React.useRef(null);
  React.useEffect(() => {
    if (!instantAlertJob || countdown !== 0 || alertBusy) return;
    const id = instantAlertJob.serviceRequestId || instantAlertJob.id;
    if (autoRejectedRef.current === id) return;
    autoRejectedRef.current = id;
    suppressInstantAlert(id);
    dismissJob(id).then(() =>
      setDutyMessage(
        "Offer window expired — job is now open to all service providers.",
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instantAlertJob, countdown, alertBusy]);

  // Listen for job claimed in real-time so that if another provider claims the job,
  // it immediately closes the popup if open
  React.useEffect(() => {
    const handleClaimed = (e) => {
      const payload = e.detail;
      const targetId = String(
        payload?.serviceRequestId || payload?.bookingId || "",
      );
      if (
        instantAlertJob &&
        (String(instantAlertJob.id) === targetId ||
          String(instantAlertJob.serviceRequestId) === targetId ||
          String(instantAlertJob.bookingId) === targetId)
      ) {
        setInstantAlertJob(null);
      }
    };
    window.addEventListener("service-provider:job_claimed", handleClaimed);
    return () =>
      window.removeEventListener("service-provider:job_claimed", handleClaimed);
  }, [instantAlertJob]);

  // Was counting ServiceProviderContext's local list, which never fetched — so this badge
  // sat at 0 no matter what the platform had actually sent.
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const { summary, loading: summaryLoading } = useServiceProviderSummary();

  const isDeclinedOffer = (job) =>
    declinedOfferIds.includes(job.id) ||
    declinedOfferIds.includes(job.serviceRequestId);
  const isAcceptedLocally = (job) =>
    acceptedInstantIds.includes(job.id) ||
    acceptedInstantIds.includes(job.serviceRequestId);

  // Open offers the service provider can still accept.
  const offers = jobs.filter(
    (job) =>
      job.isAvailableRequest &&
      !isDeclinedOffer(job) &&
      !isAcceptedLocally(job),
  );
  const availableJobsCount = offers.length;

  const activeJobs = jobs.filter(
    (j) =>
      !j.isAvailableRequest &&
      j.activeStep !== "completed" &&
      j.activeStep !== "cancelled" &&
      j.status !== "Completed" &&
      j.status !== "Customer Confirmation" &&
      j.status !== "Closed",
  );

  const jobKind = (job) => {
    const type = (job.type || "").toLowerCase();
    if (type.includes("amc")) return "amc";
    if (type.includes("extended")) return "ew";
    if (type.includes("warranty")) return "warranty";
    return "paid";
  };

  const JOB_KIND_STYLE = {
    paid: {
      label: "Paid service",
      border: "border-l-[#2E7D32]",
      chip: "bg-[#E8F5E9] text-[#2E7D32]",
      icon: ClipboardList,
    },
    warranty: {
      label: "Warranty",
      border: "border-l-[#1E6BDB]",
      chip: "bg-[#E3F2FD] text-[#1565C0]",
      icon: Shield,
    },
    ew: {
      label: "Ext. warranty",
      border: "border-l-[#7C4DFF]",
      chip: "bg-[#F3E5F5] text-[#6A1B9A]",
      icon: Shield,
    },
    amc: {
      label: "AMC visit",
      border: "border-l-[#FFA000]",
      chip: "bg-[#FFF3E0] text-[#E65100]",
      icon: Calendar,
    },
  };

  const isPriorityJob = (job) =>
    job.isPriority || job.priority === "High" || job.priority === "Critical";

  const JOB_FILTERS = [
    { id: "All", label: "All", test: () => true },
    { id: "Offers", label: "New offers", test: (j) => j.isAvailableRequest },
    { id: "Active", label: "Active", test: (j) => !j.isAvailableRequest },
    { id: "Priority", label: "Priority", test: isPriorityJob },
    { id: "Paid", label: "Paid", test: (j) => jobKind(j) === "paid" },
    {
      id: "Warranty",
      label: "Warranty",
      test: (j) => jobKind(j) === "warranty" || jobKind(j) === "ew",
    },
    { id: "AMC", label: "AMC", test: (j) => jobKind(j) === "amc" },
  ];

  // Full jobs list: offers still open plus accepted work that isn't finished.
  const listableJobs = [...activeJobs, ...offers];
  const activeFilter =
    JOB_FILTERS.find((f) => f.id === filterTab) || JOB_FILTERS[0];
  const filteredJobs = listableJobs.filter(activeFilter.test);

  const nearbyJobs = offers.slice(0, 4);
  const priorityJobsCount = offers.filter(isPriorityJob).length;

  const revisitJobs = activeJobs.filter(
    (job) =>
      job.activeStep === "spare_part_required" ||
      job.activeStep === "spareapproval" ||
      job.activeStep === "revisit_scheduled" ||
      job.activeStep === "revisit_ontheway" ||
      job.activeStep === "revisit_arrived" ||
      job.activeStep === "revisit_complete" ||
      job.activeStep === "revisit_billing" ||
      job.activeStep === "revisit_payment" ||
      job.activeStep === "revisit_otp" ||
      job.status === "Spare Required" ||
      job.status === "Spare Ordered" ||
      job.status === "Spare Received" ||
      Boolean(job.isRevisit),
  );

  const ongoingActiveJobs = activeJobs.filter(
    (job) => !revisitJobs.some((r) => r.id === job.id),
  );

  const formatTimeSlotStr = (slot, fallback = "") => {
    if (!slot) return fallback;
    if (typeof slot === "string") return slot;
    if (typeof slot === "object") {
      return slot.time || slot.slot || slot.date || fallback;
    }
    return fallback;
  };

  const getActiveJobStage = (job) => {
    if (
      job.activeStep === "ontheway" ||
      job.activeStep === "revisit_ontheway"
    ) {
      return {
        label: "On the way",
        tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
        action: "Continue",
      };
    }
    if (job.activeStep === "arrived" || job.activeStep === "revisit_arrived") {
      return {
        label: "Arrived at site",
        tone: "bg-purple-50 text-purple-800 border-purple-200",
        action: "Resume",
      };
    }
    if (
      job.activeStep === "inspection" ||
      job.activeStep === "workinprogress"
    ) {
      return {
        label: "In Progress",
        tone: "bg-amber-50 text-amber-800 border-amber-200",
        action: "Continue",
      };
    }
    if (
      job.activeStep === "spare_part_required" ||
      job.activeStep === "spareapproval"
    ) {
      return {
        label: "Spare Part Pending",
        tone: "bg-amber-50 text-amber-800 border-amber-200",
        action: "View Details",
      };
    }
    if (job.activeStep === "revisit_scheduled" || job.revisitScheduledDate) {
      return {
        label: "Revisit Scheduled",
        tone: "bg-blue-50 text-[#0D47A1] border-blue-200",
        action: "Start revisit",
      };
    }
    return {
      label: "Assigned · Ready to start",
      tone: "bg-blue-50 text-[#0D47A1] border-blue-200",
      action: "Start Job",
    };
  };

  // Header data — all of this used to be fixed: "Good Morning" at any hour,
  // a "5" notification badge, a 4.9 score with five stars and "ELITE PARTNER".
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Partner";
  const initials = (user?.name || "P")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const completedToday =
    summary?.completedToday ?? earningsTally.completedToday ?? 0;

  const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

  const openJob = (job) => {
    selectJobForDetails(job.id);
    navigate("/service-provider/active-job");
  };

  const openJobsList = (filter = "All") => {
    setFilterTab(filter);
    setShowAllJobs(true);
    window.scrollTo({ top: 0 });
  };

  // Brand wordmarks. Only rendered when the booking actually carries a brand —
  // the job mapping falls back to the category name, which isn't a brand.
  const renderBrandLogo = (brandName) => {
    if (!brandName || brandName === "Brand") return null;
    const b = brandName.toLowerCase();
    if (b.includes("lg"))
      return (
        <span className="font-bold text-[#C60C30] text-xs tracking-tight">
          LG
        </span>
      );
    if (b.includes("samsung"))
      return (
        <span className="font-black text-[#0A2C74] text-[11px] tracking-wider">
          SAMSUNG
        </span>
      );
    if (b.includes("voltas"))
      return (
        <span className="font-black text-[#0D47A1] italic text-xs">VOLTAS</span>
      );
    if (b.includes("sony"))
      return (
        <span className="font-extrabold text-slate-800 text-xs tracking-wider">
          SONY
        </span>
      );
    if (b.includes("kent"))
      return (
        <span className="font-bold text-sky-600 text-xs italic">KENT</span>
      );
    if (b.includes("faber"))
      return (
        <span className="font-semibold text-rose-600 text-xs tracking-widest">
          FABER
        </span>
      );
    return (
      <span className="font-semibold text-xs text-slate-600 truncate max-w-27.5">
        {brandName}
      </span>
    );
  };

  return (
    <div className="service-provider-app-container min-h-screen bg-[#F4F7FC] flex flex-col pb-28 lg:pb-8 relative font-sans">
      {showAllJobs ? (
        /* Jobs list header — mobile only */
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur px-2 h-14 flex justify-between items-center border-b border-slate-200 lg:hidden">
          <button
            onClick={() => setShowAllJobs(false)}
            aria-label="Back to dashboard"
            className="p-2 rounded-full hover:bg-slate-100 text-[#052355] cursor-pointer">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-bold text-[#052355]">All Jobs</h1>
          <button
            onClick={() => navigate("/service-provider/notifications")}
            aria-label="Notifications"
            className="p-2 rounded-full hover:bg-slate-100 text-[#052355] relative cursor-pointer">
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E53935] rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>
      ) : (
        /* Navy hero — mobile only */
        <div className="bg-linear-to-b from-[#052355] to-[#0A2F6E] text-white px-4 pt-4 pb-12 rounded-b-[28px] lg:hidden">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-7 px-1.5 rounded-md bg-[#FFD400] flex items-center justify-center">
                <span className="text-[#052355] font-black text-xs tracking-tight">
                  NCC
                </span>
              </div>
              <span className="font-bold tracking-wider text-sm">PARTNER</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate("/service-provider/notifications")}
                aria-label={`Notifications${unreadNotificationsCount ? `, ${unreadNotificationsCount} unread` : ""}`}
                className="p-2 hover:bg-white/10 rounded-full relative cursor-pointer">
                <Bell className="h-5 w-5 text-white" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-4.5 h-4.5 px-1 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-[#052355]">
                    {unreadNotificationsCount > 99
                      ? "99+"
                      : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate("/service-provider/profile")}
                aria-label="Profile"
                className="relative cursor-pointer group">
                <div className="w-9 h-9 rounded-full ring-2 ring-white/30 overflow-hidden bg-white/15 flex items-center justify-center transition-transform group-hover:scale-105">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {initials}
                    </span>
                  )}
                </div>
                {isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 ring-2 ring-[#052355] rounded-full z-10" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-blue-200">{greeting},</p>
            <h2 className="text-2xl font-bold leading-tight text-white">
              {firstName} 👋
            </h2>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Duty toggle. Jobs are only auto-assigned to service providers who
                are online, so this is the switch that puts you in the running. */}
            <button
              onClick={handleToggleDuty}
              disabled={availabilityBusy || !availabilityKnown}
              className={`inline-flex items-center gap-2 h-9 rounded-full pl-2.5 pr-3.5 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer ${
                isOnline
                  ? "bg-green-500/20 text-green-200"
                  : "bg-white/10 text-slate-200"
              }`}>
              <span
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-400" : "bg-slate-400"}`}
              />
              {!availabilityKnown
                ? "Checking status…"
                : availabilityBusy
                  ? "Updating…"
                  : isOnline
                    ? "Online · Accepting jobs"
                    : "Offline · Tap to go online"}
            </button>

            {Boolean(
              summary?.rating != null && (summary?.reviewCount ?? 0) > 0,
            ) && (
              <span className="inline-flex items-center gap-1.5 h-9 rounded-full px-3 bg-white/10 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-[#FFD400] text-[#FFD400]" />
                {summary.rating.toFixed(1)} · {summary.reviewCount} review
                {summary.reviewCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {dutyMessage && (
            <p className="text-xs text-blue-100 mt-2 leading-snug">
              {dutyMessage}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 px-4 pt-4 pb-2 md:px-6 md:py-6 xl:px-8 flex flex-col gap-4 md:gap-5 max-w-screen-xl mx-auto w-full">
        {/* VIEW 1: HOME DASHBOARD */}
        {!showAllJobs && (
          <>
            {/* Stats */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-2 grid grid-cols-2 md:grid-cols-4 gap-1 -mt-10 lg:mt-0 relative z-10">
              {[
                {
                  label: "New offers",
                  value: jobsLoading ? null : availableJobsCount,
                  icon: Briefcase,
                  tone: "bg-[#E3F2FD] text-[#1565C0]",
                  onClick: () => openJobsList("Offers"),
                },
                {
                  label: "Active jobs",
                  value: jobsLoading ? null : activeJobs.length,
                  icon: Wrench,
                  tone: "bg-[#E8F5E9] text-[#2E7D32]",
                  onClick: () => {
                    if (ongoingActiveJobs.length > 0) {
                      const el = document.getElementById("active-jobs-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      else openJobsList("Active");
                    } else if (revisitJobs.length > 0) {
                      const el = document.getElementById("revisits-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      else openJobsList("Active");
                    } else {
                      openJobsList("Active");
                    }
                  },
                },
                {
                  label: "Revisits",
                  value: jobsLoading ? null : revisitJobs.length,
                  icon: RotateCw,
                  tone: "bg-[#FFF3E0] text-[#E65100]",
                  onClick: () => {
                    if (revisitJobs.length > 0) {
                      const el = document.getElementById("revisits-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      else openJobsList("Active");
                    } else {
                      openJobsList("Active");
                    }
                  },
                },
                {
                  label: "Done today",
                  value: summaryLoading && earningsLoading ? null : completedToday,
                  icon: CheckCircle,
                  tone: "bg-[#F3E5F5] text-[#6A1B9A]",
                  onClick: () => navigate("/service-provider/history"),
                },
              ].map((stat) => (
                <button
                  key={stat.label}
                  onClick={stat.onClick}
                  className="flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.tone}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-[#052355] leading-none tabular-nums">
                      <InlineValue value={stat.value} className="h-5 w-7" />
                    </p>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {stat.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Earnings strip */}
            <button
              onClick={() => navigate("/service-provider/earnings")}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-4 text-left hover:border-[#0D47A1]/40 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Earned today</p>
                  <p className="text-base font-bold text-[#052355] tabular-nums">
                    <InlineValue value={earningsLoading ? null : earningsTally.today} className="h-4 w-16">{inr(earningsTally.today)}</InlineValue>
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Wallet balance</p>
                  <p className="text-base font-bold text-[#052355] tabular-nums">
                    <InlineValue value={earningsLoading ? null : earningsTally.available} className="h-4 w-16">{inr(earningsTally.available)}</InlineValue>
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* High priority offers */}
            {priorityJobsCount > 0 && (
              <button
                onClick={() => openJobsList("Priority")}
                className="bg-[#FFF1F2] border border-[#FFD3D6] rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#D32F2F] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#B71C1C]">
                      {priorityJobsCount} high-priority offer
                      {priorityJobsCount === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Time-sensitive jobs that need attention
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#D32F2F] shrink-0" />
              </button>
            )}

            {/* Active Jobs — ongoing accepted and in-progress jobs */}
            {ongoingActiveJobs.length > 0 && (
              <section
                className="flex flex-col gap-2.5"
                id="active-jobs-section">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#052355] flex items-center gap-2">
                      <span>Active Jobs</span>
                      <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {ongoingActiveJobs.length} active
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Accepted jobs currently in progress or assigned to you
                    </p>
                  </div>
                  {ongoingActiveJobs.length > 3 && (
                    <button
                      onClick={() => openJobsList("Active")}
                      className="text-sm font-semibold text-[#0D47A1] flex items-center gap-0.5 cursor-pointer hover:underline">
                      View all <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {ongoingActiveJobs.map((job) => {
                    const kind =
                      JOB_KIND_STYLE[jobKind(job)] || JOB_KIND_STYLE.paid;
                    const KindIcon = kind.icon;
                    const stage = getActiveJobStage(job);
                    const timeDisplay =
                      formatTimeSlotStr(job.scheduledTime) ||
                      formatTimeSlotStr(job.timeSlot) ||
                      (job.revisitTimeSlot
                        ? formatTimeSlotStr(job.revisitTimeSlot)
                        : null);
                    const dateDisplay =
                      job.scheduledDateLabel ||
                      (job.scheduledDate
                        ? new Date(job.scheduledDate).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )
                        : job.revisitScheduledDate
                          ? new Date(
                              job.revisitScheduledDate,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : null);

                    return (
                      <div
                        key={job.id}
                        onClick={() => openJob(job)}
                        className={`bg-white rounded-2xl p-4 border border-slate-200/80 border-l-4 ${kind.border} shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group`}>
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${kind.chip}`}>
                              <KindIcon className="w-3 h-3" /> {kind.label}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${stage.tone}`}>
                              {stage.label}
                            </span>
                            {isPriorityJob(job) && (
                              <span className="text-[9px] font-black text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                                Priority
                              </span>
                            )}
                          </div>
                          {renderBrandLogo(job.brand)}
                        </div>

                        <div className="flex flex-col gap-1 min-w-0">
                          <h4 className="text-sm font-bold text-[#052355] truncate group-hover:text-[#0D47A1] transition-colors">
                            {job.serviceLine || job.product || job.category}
                            {job.isExpress ? " · ⚡ Express" : ""}
                          </h4>
                          <div className="flex flex-col gap-1 text-xs text-slate-600 mt-1">
                            <div className="flex items-center gap-1.5 font-medium">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-900 font-bold truncate">
                                {job.customerName}
                              </span>
                            </div>
                            {job.address && (
                              <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">
                                  {job.address}
                                </span>
                              </div>
                            )}
                            {(dateDisplay || timeDisplay) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-[#0D47A1] shrink-0" />
                                <span>
                                  {[dateDisplay, timeDisplay]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-auto">
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium">
                              You earn
                            </p>
                            <p className="text-sm font-black text-emerald-700 tabular-nums">
                              {inr(job.estEarnings)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openJob(job);
                            }}
                            className="px-3 py-1.5 bg-[#0D47A1] hover:bg-[#0A3F91] text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all shadow-xs group-hover:translate-x-0.5 cursor-pointer">
                            <span>{stage.action}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Revisits — only when there are some; an empty card here pushed new offers below the fold */}
            {revisitJobs.length > 0 && (
              <section className="flex flex-col gap-2.5" id="revisits-section">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#052355]">
                      Revisits
                    </h3>
                    <p className="text-xs text-slate-500">
                      Waiting on spare parts or a follow-up visit
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#0D47A1] bg-blue-50 px-2.5 py-1 rounded-full">
                    {revisitJobs.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {revisitJobs.map((job) => {
                    let stage = {
                      label: "Part dispatch pending",
                      tone: "bg-amber-50 text-amber-800",
                      accent: "border-l-amber-500",
                      action: "Open job",
                    };
                    if (job.activeStep === "revisit_ontheway") {
                      stage = {
                        label: "On the way",
                        tone: "bg-emerald-50 text-emerald-800",
                        accent: "border-l-emerald-600",
                        action: "Continue",
                      };
                    } else if (job.activeStep === "revisit_arrived") {
                      stage = {
                        label: "Arrived",
                        tone: "bg-purple-50 text-purple-700",
                        accent: "border-l-purple-600",
                        action: "Resume",
                      };
                    } else if (
                      job.activeStep === "revisit_scheduled" ||
                      job.revisitScheduledDate
                    ) {
                      stage = {
                        label: "Scheduled",
                        tone: "bg-blue-50 text-[#0D47A1]",
                        accent: "border-l-[#0D47A1]",
                        action: "Start revisit",
                      };
                    }

                    const dateDisplay = job.revisitScheduledDate
                      ? new Date(job.revisitScheduledDate).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" },
                        )
                      : null;

                    const revisitSlot = formatTimeSlotStr(job.revisitTimeSlot);

                    return (
                      <button
                        key={job.id}
                        onClick={() => openJob(job)}
                        className={`bg-white rounded-2xl p-4 border border-slate-200/80 border-l-4 ${stage.accent} flex flex-col gap-3 text-left hover:shadow-sm transition-all cursor-pointer`}>
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="min-w-0">
                            <p className="text-xs text-slate-500 truncate">
                              {job.category}
                            </p>
                            <p className="text-sm font-bold text-[#052355] truncate">
                              {job.product || "Service follow-up"}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stage.tone}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-slate-600 w-full">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {job.customerName}
                          </span>
                          {dateDisplay && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {dateDisplay}
                              {revisitSlot ? ` · ${revisitSlot}` : ""}
                            </span>
                          )}
                        </div>
                        <span className="self-end text-xs font-bold text-[#0D47A1] flex items-center gap-0.5">
                          {stage.action}{" "}
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* New job offers */}
            <section className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-[#052355]">
                  New job offers
                </h3>
                {availableJobsCount > 0 && (
                  <button
                    onClick={() => openJobsList("Offers")}
                    className="text-sm font-semibold text-[#0D47A1] flex items-center gap-0.5 cursor-pointer">
                    View all <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
                {jobsLoading ? (
                  [0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-27 rounded-2xl bg-white border border-slate-100 animate-pulse"
                    />
                  ))
                ) : nearbyJobs.length > 0 ? (
                  nearbyJobs.map((job) => {
                    const kind = JOB_KIND_STYLE[jobKind(job)];
                    const KindIcon = kind.icon;
                    return (
                      <button
                        key={job.id}
                        onClick={() => openJob(job)}
                        className={`bg-white rounded-2xl p-4 border border-slate-200/80 border-l-4 ${kind.border} flex flex-col gap-3 text-left hover:shadow-sm transition-all cursor-pointer`}>
                        <div className="flex justify-between items-center gap-2 w-full">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${kind.chip}`}>
                            <KindIcon className="w-3.5 h-3.5" /> {kind.label}
                          </span>
                          {renderBrandLogo(job.brand)}
                        </div>

                        <div className="flex justify-between items-end gap-3 w-full">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#052355] line-clamp-2 leading-snug">
                              {job.serviceLine || job.product}
                              {job.isExpress ? " · ⚡ Express" : ""}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {job.customerName}
                            </p>
                            {(job.scheduledDateLabel ||
                              job.scheduledTime ||
                              job.timeSlot ||
                              job.distance != null) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                                {(job.scheduledDateLabel ||
                                  job.scheduledTime ||
                                  job.timeSlot) && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {[
                                      job.scheduledDateLabel,
                                      formatTimeSlotStr(job.scheduledTime) ||
                                        formatTimeSlotStr(job.timeSlot),
                                    ]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                )}
                                {job.distance != null && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {job.distance} km
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-500">You earn</p>
                            <p className="text-base font-bold text-emerald-700 tabular-nums">
                              {inr(job.estEarnings)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="md:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-dashed border-slate-300 px-6 py-8 flex flex-col items-center text-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {isOnline ? "No new offers right now" : "You're offline"}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {isOnline
                        ? "New jobs in your service area will show up here."
                        : "Go online to start receiving jobs in your service area."}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Quick links */}
            <div className="grid grid-cols-3 gap-2.5 md:gap-3">
              {[
                {
                  label: "Academy",
                  icon: GraduationCap,
                  tone: "bg-[#E3F2FD] text-[#1565C0]",
                  path: "/service-provider/academy",
                },
                {
                  label: "Get help",
                  icon: MessageSquare,
                  tone: "bg-[#E8F5E9] text-[#2E7D32]",
                  path: "/service-provider/technical-support",
                },
                {
                  label: "Notices",
                  icon: Megaphone,
                  tone: "bg-[#FFF3E0] text-[#E65100]",
                  path: "/service-provider/announcements",
                },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.path)}
                  className="bg-white rounded-2xl p-3 border border-slate-200/80 flex flex-col md:flex-row items-center gap-2 hover:shadow-sm transition-all cursor-pointer">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${link.tone}`}>
                    <link.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-[#052355]">
                    {link.label}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* VIEW 2: FULL JOBS LIST */}
        {showAllJobs && (
          <>
            <button
              onClick={() => setShowAllJobs(false)}
              className="hidden lg:inline-flex items-center gap-1 self-start text-sm font-semibold text-[#052355] cursor-pointer">
              <ChevronLeft className="h-4 w-4" /> Back to dashboard
            </button>

            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
              {JOB_FILTERS.map((f) => {
                const count = listableJobs.filter(f.test).length;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterTab(f.id)}
                    className={`h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      filterTab === f.id
                        ? "bg-[#052355] text-white"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}>
                    {f.label}{" "}
                    <span
                      className={
                        filterTab === f.id ? "text-blue-200" : "text-slate-400"
                      }>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const kind = JOB_KIND_STYLE[jobKind(job)];

                  return (
                    <div
                      key={job.id}
                      onClick={() => {
                        if (job.isAvailableRequest) {
                          setExpandedJobId((prev) =>
                            prev === job.id ? null : job.id,
                          );
                        } else {
                          openJob(job);
                        }
                      }}
                      className={`bg-white rounded-2xl p-4 flex flex-col gap-3 cursor-pointer border-l-4 ${kind.border} transition-all ${
                        isExpanded
                          ? "border border-[#0D47A1]/40 shadow-md"
                          : "border border-slate-200/80 hover:shadow-sm"
                      }`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${kind.chip}`}>
                              {kind.label}
                            </span>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                job.isAvailableRequest
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-blue-50 text-[#0D47A1]"
                              }`}>
                              {job.isAvailableRequest ? "New offer" : "Active"}
                            </span>
                            {isPriorityJob(job) && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                                Priority
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-bold text-[#052355] mt-2 line-clamp-2 leading-snug">
                            {job.serviceLine || job.product}
                            {job.isExpress ? " · ⚡ Express" : ""}
                          </p>

                          <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate">{job.customerName}</span>
                            {job.distance != null && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span>{job.distance} km</span>
                              </>
                            )}
                          </div>
                          {(job.scheduledDateLabel ||
                            job.scheduledTime ||
                            job.timeSlot) && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {[
                                job.scheduledDateLabel,
                                formatTimeSlotStr(job.scheduledTime) ||
                                  formatTimeSlotStr(job.timeSlot),
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500">You earn</p>
                          <p className="text-base font-bold text-emerald-700 tabular-nums">
                            {inr(job.estEarnings)}
                          </p>
                          {job.price > 0 && (
                            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                              Bill {inr(job.price)}
                            </p>
                          )}
                        </div>
                      </div>

                      {job.isAvailableRequest ? (
                        isExpanded ? (
                          <div
                            className="flex gap-2.5"
                            onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => rejectListedJob(job.id)}
                              title="Reject this request — it goes back to the queue for another service provider"
                              className="flex-1 h-11 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm border border-slate-300 cursor-pointer">
                              Decline
                            </button>
                            <button
                              onClick={() => acceptListedJob(job)}
                              className="flex-[2] h-11 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold rounded-xl text-sm cursor-pointer">
                              Accept job
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Tap to accept or decline
                          </p>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openJob(job);
                          }}
                          className="h-11 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold rounded-xl text-sm cursor-pointer">
                          Open job sheet
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="lg:col-span-2 text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 px-4 text-slate-500">
                  <Briefcase className="h-9 w-9 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No jobs here
                  </p>
                  <p className="text-xs mt-1">
                    {filterTab === "All"
                      ? "New offers and active jobs will show up here."
                      : "Try a different filter."}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <ServiceProviderBottomNav activeTab="jobs" />

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[28px] p-6 max-w-xs w-full flex flex-col items-center text-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#052355] mb-1">
                Log Out
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  // Clearing the session is what actually logs the user out;
                  // navigating alone left the tokens in place, so the route
                  // guard saw an authenticated user and sent them straight back.
                  await logout();
                  navigate("/service-provider/login", { replace: true });
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm">
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duty Status Modal: Online vs Keep Offline */}
      {showDutyPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-[100] animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[32px] p-6 sm:p-7 max-w-sm w-full flex flex-col items-center text-center gap-4 shadow-2xl relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-blue-500/15 rounded-full blur-xl pointer-events-none" />

            {/* Close X button */}
            <button
              onClick={handleConfirmOffline}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal">
              <X className="w-5 h-5" />
            </button>

            {/* Graphic Badge */}
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-400/20 via-blue-500/10 to-teal-400/25 border border-emerald-300/40 flex items-center justify-center relative shadow-xs mt-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white absolute -top-1 -right-1 animate-pulse" />
              <Zap className="h-8 w-8 text-emerald-600" />
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 mb-1.5">
                Set Your Duty Status
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-1">
                You are currently offline. Would you like to turn your status{" "}
                <strong className="text-emerald-600 font-bold">Online</strong>{" "}
                to start receiving jobs, or{" "}
                <strong className="text-slate-700 font-bold">
                  Keep Offline
                </strong>
                ?
              </p>
            </div>

            {/* Status preview banner */}
            <div className="w-full bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Current Status:
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> Offline
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full mt-1">
              <button
                type="button"
                onClick={handleConfirmOnline}
                disabled={availabilityBusy}
                className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-black py-3.5 px-4 rounded-2xl transition-all shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" />
                <span>Go Online (Accept Jobs)</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmOffline}
                className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold py-3 px-4 rounded-2xl transition-all text-xs cursor-pointer">
                <span>Keep Offline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job dispatch pop-up — bottom sheet on phones, dialog on desktop */}
      {instantAlertJob &&
        (() => {
          const job = instantAlertJob;
          const kind = JOB_KIND_STYLE[jobKind(job)];
          const when = job.isInstant
            ? "As soon as possible"
            : [job.scheduledDateLabel, job.scheduledTime]
                .filter(Boolean)
                .join(", ") || "Time to be confirmed";
          const address = (job.address || "")
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part && part !== "Customer Address")
            .join(", ");
          const progress = countdown != null ? countdown / 60 : 1;
          const urgent = countdown != null && countdown <= 10;
          const RING = 2 * Math.PI * 22;

          return (
            <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="dispatch-title"
                className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden">
                <div className="bg-linear-to-br from-[#052355] to-[#0D47A1] text-white px-5 pt-5 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        {job.assignedToMe
                          ? "New job for you"
                          : "New job nearby"}
                      </span>
                      <h3
                        id="dispatch-title"
                        className="text-lg font-bold text-white mt-1.5 leading-snug line-clamp-2">
                        {job.serviceLine || job.product}
                        {job.isExpress ? " · ⚡ Express" : ""}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15">
                          {kind.label}
                        </span>
                        {job.isInstant && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFD400] text-[#052355]">
                            <Zap className="w-3 h-3" /> Instant
                          </span>
                        )}
                        {isPriorityJob(job) && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500">
                            Priority
                          </span>
                        )}
                      </div>
                    </div>

                    {countdown != null && (
                      <div
                        className="relative w-14 h-14 shrink-0"
                        aria-label={`${countdown} seconds left to respond`}>
                        <svg
                          viewBox="0 0 56 56"
                          className="w-14 h-14 -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="22"
                            fill="none"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="5"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="22"
                            fill="none"
                            stroke={urgent ? "#FB7185" : "#FFD400"}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={RING}
                            strokeDashoffset={RING * (1 - progress)}
                            style={{
                              transition: "stroke-dashoffset 1s linear",
                            }}
                          />
                        </svg>
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums ${urgent ? "text-rose-300" : "text-white"}`}>
                          {countdown}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-blue-200">You earn</p>
                      <p className="text-3xl font-bold text-[#FFD400] tabular-nums leading-tight">
                        {inr(job.estEarnings)}
                      </p>
                    </div>
                    {job.price > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-blue-200">Customer pays</p>
                        <p className="text-base font-semibold tabular-nums">
                          {inr(job.price)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3.5">
                  {[
                    { icon: Clock, label: "When", value: when },
                    { icon: MapPin, label: "Where", value: address },
                    { icon: User, label: "Customer", value: job.customerName },
                  ]
                    .filter((row) => row.value)
                    .map((row) => (
                      <div key={row.label} className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <row.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500">{row.label}</p>
                          <p className="text-sm font-semibold text-slate-800 leading-snug">
                            {row.value}
                          </p>
                        </div>
                      </div>
                    ))}

                  {!job.assignedToMe && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                      Offered to all partners nearby — the first to accept gets
                      the job.
                    </p>
                  )}
                  {alertError && (
                    <p
                      role="alert"
                      className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                      {alertError}
                    </p>
                  )}
                </div>

                <div className="px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex gap-3">
                  <button
                    onClick={declineInstantJob}
                    disabled={Boolean(alertBusy)}
                    className="flex-1 h-12 rounded-2xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
                    {alertBusy === "decline" ? "Declining…" : "Decline"}
                  </button>
                  <button
                    onClick={acceptInstantJob}
                    disabled={Boolean(alertBusy)}
                    className="flex-[2] h-12 rounded-2xl bg-[#0D47A1] hover:bg-[#0A3F91] active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-lg shadow-[#0D47A1]/25">
                    <CheckCircle className="w-4 h-4" />
                    {alertBusy === "accept" ? "Accepting…" : "Accept job"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* 🔄 Customer Reschedule Request Modal */}
      {rescheduleAlertJob && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[125] animate-fade-in">
          <div className="bg-white border border-purple-100 rounded-[32px] max-w-md w-full flex flex-col shadow-2xl relative overflow-hidden">
            <div className="bg-linear-to-r from-purple-700 via-indigo-700 to-purple-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <RotateCcw className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-purple-200 uppercase block">
                    RESCHEDULE REQUEST
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Customer Changed Time
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4 text-left">
              <div>
                <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1">
                  {rescheduleAlertJob.category || "Appliance Service"}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                  {rescheduleAlertJob.product || "Customer Service Booking"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customer:{" "}
                  <strong className="text-slate-800">
                    {rescheduleAlertJob.customerName || "Customer"}
                  </strong>
                </p>
              </div>

              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">
                    New Requested Date
                  </span>
                  <span className="font-extrabold text-purple-900">
                    {rescheduleAlertJob.scheduledDate
                      ? new Date(
                          rescheduleAlertJob.scheduledDate,
                        ).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Rescheduled Date"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200/50">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">
                    New Time Slot
                  </span>
                  <span className="font-extrabold text-purple-900">
                    {typeof rescheduleAlertJob.timeSlot === "object"
                      ? rescheduleAlertJob.timeSlot?.time ||
                        "10:00 AM - 01:00 PM"
                      : rescheduleAlertJob.timeSlot || "10:00 AM - 01:00 PM"}
                  </span>
                </div>
                {rescheduleAlertJob.reason && (
                  <div className="text-[11px] text-purple-800 pt-1.5 border-t border-purple-200/50">
                    <span className="font-bold">Reason: </span>
                    <span>"{rescheduleAlertJob.reason}"</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Are you available to attend this service at the rescheduled
                time? If you decline, this job will be reassigned to another
                available technician.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={respondingToReschedule}
                  onClick={async () => {
                    setRespondingToReschedule(true);
                    const targetId =
                      rescheduleAlertJob.jobId ||
                      rescheduleAlertJob.serviceRequestId ||
                      rescheduleAlertJob.bookingId;
                    await respondToReschedule(targetId, {
                      action: "reject",
                      reason: "Not available at this time",
                    });
                    setRescheduleAlertJob(null);
                    setRespondingToReschedule(false);
                    setDutyMessage(
                      "Job declined and released to next available service provider.",
                    );
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all cursor-pointer text-center disabled:opacity-50">
                  Decline (Pass to Next Pro)
                </button>

                <button
                  type="button"
                  disabled={respondingToReschedule}
                  onClick={async () => {
                    setRespondingToReschedule(true);
                    const targetId =
                      rescheduleAlertJob.jobId ||
                      rescheduleAlertJob.serviceRequestId ||
                      rescheduleAlertJob.bookingId;
                    await respondToReschedule(targetId, { action: "accept" });
                    setRescheduleAlertJob(null);
                    setRespondingToReschedule(false);
                    setDutyMessage(
                      "Rescheduled time accepted! Job schedule updated.",
                    );
                  }}
                  className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md shadow-purple-600/20 text-center disabled:opacity-50">
                  Accept Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Customer Cancellation Notice Modal */}
      {cancellationAlert && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[125] animate-fade-in">
          <div className="bg-white border border-rose-100 rounded-[32px] max-w-md w-full flex flex-col shadow-2xl relative overflow-hidden">
            <div className="bg-linear-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold tracking-widest text-rose-200 uppercase block">
                    JOB CANCELLED
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Customer Cancelled Booking
                  </h3>
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-4 text-left">
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Booking{" "}
                <strong className="font-mono">
                  {cancellationAlert.bookingId ||
                    cancellationAlert.humanId ||
                    "Order"}
                </strong>{" "}
                has been cancelled by the customer.
                {cancellationAlert.reason && (
                  <span className="block mt-1 text-slate-500">
                    Reason: "{cancellationAlert.reason}"
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                This booking has been removed from your active schedule and
                returned to available queue.
              </p>

              <button
                type="button"
                onClick={() => setCancellationAlert(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer text-center">
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
