import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { apiRequest, getStoredTokens } from '../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const TechContext = createContext(null);

export const useTech = () => {
  const ctx = useContext(TechContext);
  if (!ctx) throw new Error('useTech must be used inside TechProvider');
  return ctx;
};

export const TechProvider = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  // Distinguishes "no jobs" from "jobs not loaded yet". Without it the stat
  // cards rendered a confident 0 for the several seconds the fetch takes,
  // which reads as "the technician has been assigned nothing".
  const [jobsLoading, setJobsLoading] = useState(true);
  // The technician's own online switch. Auto-assignment only ever considers
  // technicians whose availability is 'Available', so until this could be set a
  // technician was never a candidate for any job.
  //
  // null means "not read back from the server yet" — deliberately not 'Offline',
  // because defaulting to a real value made a reload render a confident
  // "Offline" for an technician who was actually online, and the pill kept
  // showing that stale value if the hydrating request failed.
  const [availability, setAvailabilityState] = useState(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [activeSpecs, setActiveSpecs] = useState(['AC', 'Refrigerator', 'Washing Machine']);
  const toggleSpec = useCallback((spec) => {
    setActiveSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
  }, []);
  const [inventory, setInventory] = useState([]);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [earningsTally, setEarningsTally] = useState({
    today: 0,
    total: 0,
    completedToday: 0,
    completedTotal: 0,
    available: 0,
    paidOut: 0,
    lifetimeEarned: 0,
    split: { quick: { amount: 0, jobs: 0 }, invoice: { amount: 0, jobs: 0 } },
  });

  // Fetch real jobs, inventory, claims, and earnings from backend when logged in as technician
  const fetchRealJobs = useCallback(async () => {
    if (!user || user.role !== 'technician') return;
    setJobsLoading(true);
    try {
      // 1. Fetch jobs. In parallel, not one after the other: /jobs/available is
      // the slow one (~3s — it populates user, booking, AMC plan and EW order),
      // and running /jobs/active behind it pushed the job list past ten seconds
      // on a remote database, long enough that the dashboard looked empty.
      const [availableRes, activeRes] = await Promise.all([
        apiRequest('/tech/jobs/available', { auth: true }),
        apiRequest('/tech/jobs/active', { auth: true }),
      ]);
      // apiRequest already returns the envelope's `data` (apiClient.js's
      // rawRequest ends in `return json.data`), so reaching for `.data` again
      // yields undefined and every list here silently rendered empty — the
      // technician saw "0 Available Jobs" while the API was returning five.
      const availableSRs = Array.isArray(availableRes) ? availableRes : [];
      const activeJobs = Array.isArray(activeRes) ? activeRes : [];

      const mappedAvailable = availableSRs.map((sr) => ({
        id: sr.id || sr._id,
        type: sr.booking?.totalPrice === 0 ? (sr.extendedWarrantyOrder ? 'NCC Extended Warranty' : sr.amcSubscription ? 'AMC Visit' : 'Brand Warranty') : 'NCC Paid Service',
        category: `${sr.category || 'Service'} Repair`,
        product: sr.description || `${sr.category || 'Appliance'} Service`,
        brand: sr.booking?.brand || sr.category || 'Brand',
        model: sr.model || 'Universal Model',
        // No fake fallbacks: a fabricated serial confuses warranty/diagnostic
        // lookups, a fabricated distance misleads which job a technician picks
        // to accept, and a fabricated phone number is actively dangerous — it
        // used to be dialled/WhatsApped as if it were the real customer.
        serialNo: sr.serialNo || null,
        complaint: sr.description || 'Service booking request',
        estEarnings: sr.booking ? Math.round(sr.booking.totalPrice * 0.3) : 150,
        price: sr.booking ? sr.booking.totalPrice : 299,
        distance: null,
        customerName: sr.booking?.fullName || sr.user?.name || 'Customer',
        phone: sr.booking?.mobile || sr.user?.phone || null,
        address: sr.booking?.address ? `${sr.booking.address.house || ''}, ${sr.booking.address.landmark || ''}, ${sr.booking.address.city || ''} ${sr.booking.address.pincode || ''}` : 'Customer Address',
        isD2C: sr.booking ? sr.booking.totalPrice > 0 : true,
        isPriority: sr.priority === 'High' || sr.priority === 'Critical',
        isRecommended: true,
        isAvailableRequest: true,
        serviceRequestId: sr.id || sr._id,
        // Real scheduled slot — the dashboard card used to show a fixed
        // "Today, 02:00 PM" under every job regardless of when it was booked.
        scheduledTime: sr.booking?.timeSlot?.time || null,
        scheduledDateLabel: sr.booking?.timeSlot?.date || null,
        amcPlanName: sr.amcSubscription?.plan?.name || null,
        amcVisitsRemaining: sr.amcSubscription?.visitsRemaining ?? null,
        amcVisitsTotal: sr.amcSubscription?.visitsTotal ?? null,
        amcPlanExpiry: sr.amcSubscription?.expiryDate || null,
        ewValidTill: sr.extendedWarrantyOrder?.validTill || null,
        ewClaimsRemaining: sr.extendedWarrantyOrder?.claimsRemaining ?? null,
        ewClaimsTotal: sr.extendedWarrantyOrder?.claimsTotal ?? null,
      }));

      const mappedActive = activeJobs.map((job) => {
        const sr = job.serviceRequest;
        return {
          id: job.id || job._id,
          type: job.type || 'NCC Paid Service',
          category: `${sr?.category || 'Service'} Repair`,
          product: sr?.description || 'Service Job',
          brand: sr?.booking?.brand || 'Brand',
          model: sr?.model || 'Universal Model',
          serialNo: sr?.serialNo || null,
          complaint: sr?.description || 'Service Job',
          estEarnings: job.estEarnings || 200,
          invoiceUrl: sr?.attachments?.[0] || sr?.appliance?.invoiceFileUrl || null,
          invoiceAvailable: Boolean(sr?.invoiceAvailable),
          price: job.price || 500,
          distance: null,
          customerName: sr?.booking?.fullName || sr?.user?.name || 'Customer',
          phone: sr?.booking?.mobile || sr?.user?.phone || null,
          // The real coverage behind an AMC/EW job — see job.service.js's
          // listActiveJobs/listAvailableJobs populate. These cards used to be
          // hardcoded ("AMC Gold Plan", "15 Jan 2027", "3" visits remaining)
          // for every job of that type, regardless of the customer's real plan.
          scheduledTime: sr?.booking?.timeSlot?.time || null,
          scheduledDateLabel: sr?.booking?.timeSlot?.date || null,
          // acceptJob() snapshots the plan onto job.amc/job.ew at accept time —
          // that snapshot is the source once a job exists; sr.amcSubscription
          // (populated on the pre-accept list) is only a fallback for the brief
          // window before a Job document exists.
          amcPlanName: job.amc?.planName || sr?.amcSubscription?.plan?.name || null,
          amcVisitsRemaining: job.amc?.visitsRemaining ?? sr?.amcSubscription?.visitsRemaining ?? null,
          amcVisitsTotal: job.amc?.visitsTotal ?? sr?.amcSubscription?.visitsTotal ?? null,
          amcPlanExpiry: job.amc?.planExpiry || sr?.amcSubscription?.expiryDate || null,
          ewValidTill: job.ew?.validTill || sr?.extendedWarrantyOrder?.validTill || null,
          ewClaimsRemaining: job.ew?.claimsRemaining ?? sr?.extendedWarrantyOrder?.claimsRemaining ?? null,
          ewClaimsTotal: job.ew?.claimsTotal ?? sr?.extendedWarrantyOrder?.claimsTotal ?? null,
          address: sr?.booking?.address ? `${sr.booking.address.house || ''}, ${sr.booking.address.landmark || ''}, ${sr.booking.address.city || ''} ${sr.booking.address.pincode || ''}` : 'Customer Address',
          isD2C: job.isD2C ?? true,
          isPriority: job.isPriority ?? false,
          isRecommended: job.isRecommended ?? true,
          isAvailableRequest: false,
          serviceRequestId: sr?.id || sr?._id,
          activeStep: job.activeStep || 'details',
          isRevisit: Boolean(job.revisit?.scheduledDate || job.activeStep?.startsWith('revisit') || job.activeStep === 'spareapproval'),
          revisitScheduledDate: job.revisit?.scheduledDate || null,
          revisitTimeSlot: job.revisit?.timeSlot || null,
          revisitNotes: job.revisit?.notes || null,
        };
      });

      const combinedJobs = [...mappedActive, ...mappedAvailable];
      setJobs(combinedJobs);
      // Jobs are on screen now; the inventory/claims/earnings calls below are
      // secondary and must not keep the job cards in a loading state.
      setJobsLoading(false);

      // 2. Fetch real inventory
      try {
        const invRes = await apiRequest('/tech/inventory', { auth: true });
        if (Array.isArray(invRes)) {
          setInventory(invRes.map(item => {
            // techInventoryItem stores the count as `qty`. This read only tried
            // `stock`/`quantity`, so every item came back as 0 — the whole
            // inventory showed "Out of Stock" and the job flow's parts picker,
            // which lists only items with qty > 0, was permanently empty.
            const qty = item.qty ?? item.stock ?? item.quantity ?? 0;
            return {
              id: item._id || item.id,
              name: item.name || item.partName || 'Spare Part',
              sku: item.sku || item.partCode || 'SKU-000',
              qty,
              status: qty === 0 ? 'Out of Stock' : qty <= 2 ? 'Low Stock' : 'In Stock',
              price: item.price || item.retailPrice || 0
            };
          }));
        }
      } catch (e) {
        console.warn('Technician inventory fetch warning:', e.message);
      }

      // 3. Fetch real claims
      try {
        const claimsRes = await apiRequest('/tech/claims', { auth: true });
        if (Array.isArray(claimsRes)) {
          setClaims(claimsRes.map(c => ({
            id: c._id || c.id,
            brand: c.brand || 'Partner Warranty',
            claimId: c.humanId || c.id,
            item: c.partName || c.item || 'Part Claim',
            status: c.status || 'Pending Approval',
            amount: c.amount || 0,
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Today'
          })));
        }
      } catch (e) {
        console.warn('Technician claims fetch warning:', e.message);
      }

      // 4. Fetch real earnings summary
      try {
        // The breakdown endpoint carries the tally plus the withdrawable balance
        // and the Quick/Invoice split. The field names here are the API's own —
        // this previously read `totalEarnings`/`todayEarnings`, which the API has
        // never returned, so the tally was permanently zero.
        const earnRes = await apiRequest('/tech/earnings/breakdown', { auth: true });
        if (earnRes) {
          const d = earnRes;
          setEarningsTally({
            today: d.today || 0,
            total: d.lifetimeEarned || 0,
            completedToday: d.completedToday || 0,
            completedTotal: d.completedTotal || 0,
            available: d.available || 0,
            paidOut: d.paidOut || 0,
            lifetimeEarned: d.lifetimeEarned || 0,
            split: d.split || { quick: { amount: 0, jobs: 0 }, invoice: { amount: 0, jobs: 0 } },
          });
        }
      } catch (e) {
        console.warn('Technician earnings summary fetch warning:', e.message);
      }

    } catch (err) {
      console.error('Failed to fetch real jobs for technician:', err.message);
    } finally {
      setJobsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRealJobs();
  }, [fetchRealJobs]);

  /**
   * Live instant-booking feed.
   *
   * The backend has broadcast `instant:new_request` since instant bookings were
   * added (sockets/instantBooking.gateway.js), but nothing on the client ever
   * listened — so an ASAP booking reached a technician only if they happened to
   * reload. Joining the technicians' room and refetching on each event is what
   * makes "right now" actually mean right now.
   *
   * Only while online: an offline technician should not be pulled into a job,
   * which is also why the socket is torn down when they go offline.
   */
  const socketRef = useRef(null);
  useEffect(() => {
    if (!user || user.role !== 'technician' || availability !== 'Available') return undefined;

    const { accessToken } = getStoredTokens();
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-instant-feed', {}));
    socket.on('instant:new_request', () => { fetchRealJobs(); });
    socket.on('instant:status_update', () => { fetchRealJobs(); });
    socket.on('connect_error', (err) => console.warn('[tech] instant feed disconnected:', err.message));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user, availability, fetchRealJobs]);

  /**
   * Claims an instant job over the socket, which is what the gateway's
   * `instant:accept_job` handler expects (it assigns the booking and the
   * service request together, and tells the customer over the same channel).
   */
  const acceptInstantJob = useCallback(async ({ bookingId, serviceRequestId }) => {
    const socket = socketRef.current;
    if (!socket) return { ok: false, error: 'Not connected to the instant feed.' };
    return new Promise((resolve) => {
      socket.emit('instant:accept_job', { bookingId, serviceRequestId }, async (ack) => {
        if (ack?.ok) await fetchRealJobs();
        resolve(ack?.ok ? { ok: true } : { ok: false, error: ack?.error || 'Could not accept the job.' });
      });
    });
  }, [fetchRealJobs]);

  /**
   * Read the technician's online state back from the server.
   *
   * Deliberately its own request/effect rather than a step inside
   * fetchRealJobs: availability lived at the end of that function's try block,
   * so any failure in the job fetches skipped it entirely and the technician
   * was shown as Offline — on every reload — while the server had them online.
   * The switch has to survive a reload, and it must not depend on unrelated
   * calls succeeding.
   */
  const fetchAvailability = useCallback(async () => {
    if (!user || user.role !== 'technician') return;
    try {
      const res = await apiRequest('/tech/profile/profile', { auth: true });
      if (res?.availability) setAvailabilityState(res.availability);
    } catch (err) {
      console.warn('Technician availability fetch warning:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  /**
   * Go online / offline. Going online also drains the backlog server-side —
   * requests booked while nobody was available get assigned on the spot — so
   * the refetch below is what makes them show up in the feed immediately.
   */
  const setAvailability = useCallback(async (next) => {
    setAvailabilityBusy(true);
    try {
      // technicianRouter is mounted at /tech/profile (app.js), so its own
      // '/availability' route lives under that prefix — same shape as the
      // sibling '/tech/profile/payout-methods' calls.
      const res = await apiRequest('/tech/profile/availability', {
        method: 'PATCH',
        auth: true,
        body: { availability: next },
      });
      setAvailabilityState(res?.technician?.availability || next);
      await fetchRealJobs();
      return { ok: true, assignedCount: res?.autoAssigned?.assignedCount || 0 };
    } catch (err) {
      console.error('Failed to change availability:', err.message);
      return { ok: false, error: err.message };
    } finally {
      setAvailabilityBusy(false);
    }
  }, [fetchRealJobs]);

  // Active Job flow states
  // step values: 
  // 'idle' (no accepted job), 
  // 'details' (Screen 3 - view before accept), 
  // 'assigned' (Screen 4: step 1), 
  // 'ontheway' (Screen 4: step 2),
  // 'inspection' (Screen 4: step 3 - details Screen 5, diagnosis Screen 6, parts Screen 7), 
  // 'spareapproval' (Screen 4: step 4), 
  // 'repaircomplete' (Screen 4: step 5), 
  // 'billing' (Screen 12),
  // 'completed' (Success screen after Collect Payment)
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeStep, setActiveStep] = useState('idle');
  const [selectedParts, setSelectedParts] = useState([]);
  // Notes typed during inspection, submitted with the diagnosis when the
  // technician completes that step.
  const [diagnosisNotes, setDiagnosisNotes] = useState(''); // Parts selected during diagnosis
  
  // Signature, photos uploads state
  const [proofs, setProofs] = useState({
    photos: 2, // starts with 2/4 photos uploaded
    videos: 0,
    voiceNote: false,
    signature: null,
    geoLocation: true // starts with geo location captured
  });

  // Cart for ordering parts (Screen 10)
  const [partsCart, setPartsCart] = useState([]);
  
  // AI assistant messages
  // Greets by the signed-in technician's name, not a hardcoded "Alex".
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello! I am your AI assistant. How can I help with this job?' }
  ]);

  const activeJob = jobs.find(j => j.id === activeJobId) || null;

  const selectJobForDetails = useCallback((id) => {
    setActiveJobId(id);
    const job = jobs.find((j) => j.id === id);
    // Resume an in-progress job wherever the server says it actually is.
    // Always opening at 'details' rewound the UI on every reopen, and the next
    // action was then rejected as an illegal step transition.
    setActiveStep(job && !job.isAvailableRequest && job.activeStep ? job.activeStep : 'details');
  }, [jobs]);

  const acceptJob = useCallback(async (id) => {
    const jobObj = jobs.find(j => j.id === id);
    if (jobObj?.isAvailableRequest) {
      try {
        const result = await apiRequest(`/tech/jobs/accept/${jobObj.serviceRequestId}`, {
          method: 'POST',
          body: { type: jobObj.type },
          auth: true,
        });
        await fetchRealJobs();
        setActiveJobId(result.id || result._id);
        setActiveStep('assigned');
      } catch (err) {
        console.error('Failed to accept job on backend:', err);
        alert(`Failed to accept job: ${err.message}`);
      }
    } else {
      setActiveJobId(id);
      setActiveStep('assigned');
      setNotifications(prev => [
        {
          id: Date.now(),
          type: 'Jobs',
          title: 'Job Accepted',
          message: `You accepted job #${id} for ${jobs.find(j => j.id === id)?.customerName}.`,
          time: 'Just now',
          read: false
        },
        ...prev
      ]);
    }
  }, [jobs, fetchRealJobs]);

  /**
   * Each technician-visible step is advanced by exactly one backend call. This
   * table only says which endpoint moves which step — the real state machine
   * (JOB_STEP_TRANSITIONS, server-side) stays the authority, and the step we
   * store is whatever the server reports back.
   *
   * This used to be a local `switch` that moved React state and called nothing:
   * a technician could walk the entire job to completion while, on the server,
   * nothing past diagnosis had happened — no billing, no payment, no earnings,
   * the service request frozen at "Engineer Accepted" and the customer's
   * booking never completing.
   */
  const STEP_ADVANCE = {
    assigned: { path: 'start-travel' },
    ontheway: { path: 'arrive' },
    inspection: { path: 'spare-parts', needsParts: true },
    spareapproval: { path: 'start-travel' },
    revisit_scheduled: { path: 'start-travel' },
    revisit_ontheway: { path: 'arrive' },
    revisit_arrived: { path: 'repair-complete' },
    revisit_complete: { path: 'billing' },
    repaircomplete: { path: 'billing' },
  };

  const [stepBusy, setStepBusy] = useState(false);
  const [stepError, setStepError] = useState(null);

  // `fromStep` lets a caller advance from a step it just read off the server,
  // rather than from React state that may not have flushed yet.
  const advanceStep = useCallback(async (fromStep) => {
    const current = typeof fromStep === 'string' ? fromStep : activeStep;
    const move = STEP_ADVANCE[current];
    if (!move) return { ok: false, error: `Nothing follows "${current}".` };
    if (!activeJobId) return { ok: false, error: 'No active job to update.' };

    setStepBusy(true);
    setStepError(null);
    try {
      const body = move.needsParts
        ? {
            // Only ticked parts are billed (job.service.js filters on `checked`),
            // and the schema wants a plain line item — the inventory rows carry
            // extra display fields.
            parts: selectedParts.map((p) => ({
              name: p.name,
              price: Number(p.price) || 0,
              checked: true,
              ...(p.sku ? { sku: p.sku } : {}),
              source: 'manual',
            })),
            additionalServices: [],
          }
        : undefined;

      // Finishing the inspection is the diagnosis being submitted. The server
      // moves the request Engineer Reached -> Diagnosis Done on that call, and
      // the spare-parts call below then needs it there — sending parts straight
      // from Engineer Reached is rejected as an illegal status transition.
      if (move.needsParts) {
        await apiRequest(`/tech/jobs/${activeJobId}/diagnosis`, {
          method: 'POST',
          auth: true,
          body: { notes: diagnosisNotes || undefined },
        });
      }

      const job = await apiRequest(`/tech/jobs/${activeJobId}/${move.path}`, { method: 'POST', auth: true, body });
      // Trust the server's step over a locally-guessed one.
      setActiveStep(job?.activeStep || current);
      await fetchRealJobs();
      return { ok: true };
    } catch (err) {
      // Leave the UI on the current step — silently moving on after a failed
      // write is how the local-only version drifted from the server.
      setStepError(err.message || 'Could not update this job.');
      return { ok: false, error: err.message };
    } finally {
      setStepBusy(false);
    }
  }, [activeStep, activeJobId, selectedParts, diagnosisNotes, fetchRealJobs]);

  const resetActiveJob = useCallback(() => {
    setActiveJobId(null);
    setActiveStep('idle');
    setSelectedParts([]);
    setProofs({
      photos: 2,
      videos: 0,
      voiceNote: false,
      signature: null,
      geoLocation: true
    });
  }, []);

  // Decrement AMC visits remaining after job completion
  const decrementAmcVisit = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId && j.type === 'AMC Visit'
        ? { ...j, amcVisitsRemaining: Math.max(0, (j.amcVisitsRemaining || 1) - 1), amcVisitNumber: (j.amcVisitNumber || 1) + 1 }
        : j
    ));
  }, []);

  // Decrement EW claims remaining after job completion
  const decrementEwClaim = useCallback((jobId) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId && j.type === 'NCC Extended Warranty'
        ? { ...j, ewClaimsRemaining: Math.max(0, (j.ewClaimsRemaining || 1) - 1) }
        : j
    ));
  }, []);

  /**
   * Walks the server forward until the job reaches `target`.
   *
   * The warranty job screens have a "Generate Invoice" shortcut that used to
   * call setActiveStep('billing') directly. That only moved the UI: the server
   * never ran repair-complete or billing, so no billingEstimate was computed
   * and collecting payment afterwards failed on a job that looked ready to pay.
   * Bounded, and stops at the first refusal so an illegal jump surfaces as an
   * error instead of looping.
   */
  const advanceStepsTo = useCallback(async (target) => {
    for (let i = 0; i < 6; i += 1) {
      const job = await apiRequest(`/tech/jobs/${activeJobId}`, { auth: true }).catch(() => null);
      const current = job?.activeStep;
      if (!current) return { ok: false, error: 'Could not read the job.' };
      if (current === target) { setActiveStep(current); return { ok: true }; }
      const res = await advanceStep(current);
      if (!res.ok) return res;
    }
    return { ok: false, error: `Could not reach "${target}".` };
  }, [activeJobId, advanceStep]);

  /** Single place that maps the earnings payload onto the tally — the same
   *  block was previously copied into four callers, each free to drift. */
  const refreshEarnings = useCallback(async (merge = false) => {
    try {
      const d = await apiRequest('/tech/earnings/breakdown', { auth: true });
      if (!d) return;
      const next = {
        today: d.today || 0,
        total: d.lifetimeEarned || 0,
        completedToday: d.completedToday || 0,
        completedTotal: d.completedTotal || 0,
        available: d.available || 0,
        paidOut: d.paidOut || 0,
        lifetimeEarned: d.lifetimeEarned || 0,
        split: d.split || { quick: { amount: 0, jobs: 0 }, invoice: { amount: 0, jobs: 0 } },
      };
      setEarningsTally((prev) => (merge ? { ...prev, ...next } : next));
    } catch (err) {
      console.warn('[tech] Could not refresh earnings:', err.message);
    }
  }, []);

  /**
   * Closes the job out for real.
   *
   * This used to set the step to 'completed' locally and then read the earnings
   * back, under the assumption that "the server credits the tally as part of
   * completing the job" — but nothing ever told the server the job was done, so
   * it read an unchanged tally and left the service request, the customer's
   * booking and the technician's payout untouched.
   *
   * A Cash job completes synchronously. Anything routed through the gateway
   * comes back as 'awaitingpayment' with a razorpay order, which the caller has
   * to take to Checkout and then verify — so that case is reported, not faked.
   */
  const collectPayment = useCallback(async (paymentMethod = 'Cash') => {
    if (!activeJobId) return { ok: false, error: 'No active job to close.' };
    setStepBusy(true);
    setStepError(null);
    try {
      const res = await apiRequest(`/tech/jobs/${activeJobId}/collect-payment`, {
        method: 'POST',
        auth: true,
        body: { paymentMethod },
      });
      const step = res?.job?.activeStep || 'completed';
      setActiveStep(step);
      await Promise.all([fetchRealJobs(), refreshEarnings()]);
      return { ok: true, step, razorpay: res?.razorpay || null };
    } catch (err) {
      setStepError(err.message || 'Could not collect payment.');
      return { ok: false, error: err.message };
    } finally {
      setStepBusy(false);
    }
  }, [activeJobId, fetchRealJobs, refreshEarnings]);

  // Credits the visit fee for a job the technician travelled to but could not
  // complete. The server owns the amount (PlatformSettings.visitFeeAmount) and
  // the idempotency — an earlier version added ₹150 client-side, showing the
  // technician earnings the platform had no record of. Returns the credited
  // amount so the summary screen can show the real figure.
  const creditTravelFee = useCallback(async (jobId) => {
    let credited = null;
    if (jobId) {
      try {
        const res = await apiRequest(`/tech/earnings/visit-fee/${jobId}`, { method: 'POST', auth: true });
        credited = res;
      } catch (err) {
        console.warn('[tech] Could not credit visit fee:', err.message);
      }
    }
    await apiRequest('/tech/earnings/breakdown', { auth: true })
      .then((d) => {
        if (!d) return;
        setEarningsTally((prev) => ({
          ...prev,
          today: d.today || 0,
          total: d.lifetimeEarned || 0,
          completedToday: d.completedToday || 0,
          completedTotal: d.completedTotal || 0,
          available: d.available || 0,
          paidOut: d.paidOut || 0,
          lifetimeEarned: d.lifetimeEarned || 0,
          split: d.split || prev.split,
        }));
      })
      .catch((err) => console.warn('[tech] Could not refresh earnings:', err.message));
    return credited;
  }, []);

  const addPartToCart = useCallback((part) => {
    setPartsCart(prev => {
      const existing = prev.find(item => item.id === part.id);
      if (existing) {
        return prev.map(item => item.id === part.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...part, qty: 1 }];
    });
  }, []);

  const removePartFromCart = useCallback((id) => {
    setPartsCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setPartsCart([]);
  }, []);

  // Places real part orders. This only pushed rows into browser state with an
  // invented "NC#####" reference, so nothing was ordered and the number the
  // technician quoted matched no record.
  const placePartsOrder = useCallback(async (sourceName) => {
    if (!partsCart.length) return { ok: false, error: 'Your parts cart is empty.' };

    const orderSource = sourceName === 'Partner Brand' || sourceName === 'Nearby Store' ? sourceName : 'NCC Warehouse';

    try {
      const placed = await Promise.all(partsCart.map((item) => apiRequest('/tech/inventory/part-orders', {
        method: 'POST',
        auth: true,
        body: {
          partName: item.name,
          sku: item.sku || undefined,
          qty: item.qty || 1,
          price: item.price,
          orderSource,
        },
      })));

      setPartsCart([]);
      return { ok: true, orders: placed };
    } catch (err) {
      return { ok: false, error: err.message || 'Could not place the parts order.' };
    }
  }, [partsCart]);

  // Raises the claim server-side so the brand can actually see and decide it.
  const raiseClaim = useCallback(async (claimData) => {
    try {
      const res = await apiRequest('/tech/claims', {
        method: 'POST',
        auth: true,
        body: {
          serviceRequest: claimData.serviceRequest || undefined,
          brand: claimData.brand || 'D2C Claim',
          claimType: claimData.claimType || 'D2C',
          item: claimData.item || 'Spare part',
          amount: Number(claimData.amount) || 0,
          reason: claimData.reason || undefined,
        },
      });
      const c = res;
      setClaims((prev) => [{
        id: c.id,
        brand: c.brand,
        claimId: c.humanId || c.id,
        item: c.item,
        status: c.status,
        amount: c.amount,
        date: new Date(c.createdAt).toLocaleDateString(),
      }, ...prev]);
      return { ok: true, claim: c };
    } catch (err) {
      return { ok: false, error: err.message || 'Could not raise the claim.' };
    }
  }, []);

  // Marking read is persisted — the local-only version reverted on next load.
  const dismissJob = useCallback((jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH', auth: true });
    } catch (err) {
      console.warn('[tech] Could not mark notifications read:', err.message);
    }
  }, []);

  // Routes the in-job assistant through the same grounded /tech/assistant
  // endpoint the AIAssistant screen uses. It used to be a keyword matcher that
  // stated a specific SKU as "in stock at NCC Warehouse Gurugram" and a "72%
  // probability" of capacitor failure — figures nothing produced.
  const addChatMessage = useCallback(async (text, sender = 'user') => {
    const entry = { id: Date.now(), sender, text };
    setChatMessages((prev) => [...prev, entry]);
    if (sender !== 'user') return;

    let history = [];
    setChatMessages((prev) => { history = prev; return prev; });

    try {
      const res = await apiRequest('/tech/assistant', {
        method: 'POST',
        auth: true,
        body: {
          messages: [...history, entry]
            .filter((m) => m.text)
            .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        },
      });
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: res.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: err.status === 503
          ? "The assistant isn't available on this deployment. For stock check Inventory, and for anything else contact Technical Support."
          : err.message || 'Could not reach the assistant.',
      }]);
    }
  }, []);

  return (
    <TechContext.Provider value={{
      jobs,
      activeJobId,
      activeStep,
      activeJob,
      selectedParts,
      setSelectedParts,
      diagnosisNotes,
      setDiagnosisNotes,
      proofs,
      setProofs,
      inventory,
      setInventory,
      claims,
      notifications,
      earningsTally,
      partsCart,
      chatMessages,
      selectJobForDetails,
      acceptJob,
      advanceStep,
      setActiveStep,
      resetActiveJob,
      collectPayment,
      advanceStepsTo,
      stepBusy,
      stepError,
      setStepError,
      refreshEarnings,
      creditTravelFee,
      decrementAmcVisit,
      decrementEwClaim,
      addPartToCart,
      removePartFromCart,
      clearCart,
      placePartsOrder,
      raiseClaim,
      markAllNotificationsRead,
    dismissJob,
      addChatMessage,
      activeSpecs,
      toggleSpec,
      availability,
      availabilityBusy,
      setAvailability,
      jobsLoading,
      acceptInstantJob
    }}>
      {children}
    </TechContext.Provider>
  );
};

export default TechContext;
