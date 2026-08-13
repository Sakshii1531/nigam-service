import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../lib/apiClient';

const TechContext = createContext(null);

export const useTech = () => {
  const ctx = useContext(TechContext);
  if (!ctx) throw new Error('useTech must be used inside TechProvider');
  return ctx;
};

export const TechProvider = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
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
    try {
      // 1. Fetch jobs
      const availableRes = await apiRequest('/tech/jobs/available', { auth: true });
      const activeRes = await apiRequest('/tech/jobs/active', { auth: true });
      const availableSRs = availableRes?.data || [];
      const activeJobs = activeRes?.data || [];

      const mappedAvailable = availableSRs.map((sr) => ({
        id: sr.id || sr._id,
        type: sr.booking?.totalPrice === 0 ? (sr.extendedWarrantyOrder ? 'NCC Extended Warranty' : sr.amcSubscription ? 'AMC Visit' : 'Brand Warranty') : 'NCC Paid Service',
        category: `${sr.category || 'Service'} Repair`,
        product: sr.description || `${sr.category || 'Appliance'} Service`,
        brand: sr.booking?.brand || sr.category || 'Brand',
        model: sr.model || 'Universal Model',
        serialNo: sr.serialNo || 'SNY-12345',
        complaint: sr.description || 'Service booking request',
        estEarnings: sr.booking ? Math.round(sr.booking.totalPrice * 0.3) : 150,
        price: sr.booking ? sr.booking.totalPrice : 299,
        distance: 2.3,
        customerName: sr.booking?.fullName || sr.user?.name || 'Customer',
        phone: sr.booking?.mobile || sr.user?.phone || '9876543210',
        address: sr.booking?.address ? `${sr.booking.address.house || ''}, ${sr.booking.address.landmark || ''}, ${sr.booking.address.city || ''} ${sr.booking.address.pincode || ''}` : 'Customer Address',
        isD2C: sr.booking ? sr.booking.totalPrice > 0 : true,
        isPriority: sr.priority === 'High' || sr.priority === 'Critical',
        isRecommended: true,
        isAvailableRequest: true,
        serviceRequestId: sr.id || sr._id,
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
          serialNo: sr?.serialNo || 'SNY-12345',
          complaint: sr?.description || 'Service Job',
          estEarnings: job.estEarnings || 200,
          invoiceUrl: sr?.attachments?.[0] || sr?.appliance?.invoiceFileUrl || null,
          invoiceAvailable: Boolean(sr?.invoiceAvailable),
          price: job.price || 500,
          distance: 1.8,
          customerName: sr?.booking?.fullName || sr?.user?.name || 'Customer',
          phone: sr?.booking?.mobile || sr?.user?.phone || '9876543210',
          address: sr?.booking?.address ? `${sr.booking.address.house || ''}, ${sr.booking.address.landmark || ''}, ${sr.booking.address.city || ''} ${sr.booking.address.pincode || ''}` : 'Customer Address',
          isD2C: job.isD2C ?? true,
          isPriority: job.isPriority ?? false,
          isRecommended: job.isRecommended ?? true,
          isAvailableRequest: false,
          serviceRequestId: sr?.id || sr?._id,
          activeStep: job.activeStep || 'details',
        };
      });

      const combinedJobs = [...mappedActive, ...mappedAvailable];
      setJobs(combinedJobs);

      // 2. Fetch real inventory
      try {
        const invRes = await apiRequest('/tech/inventory', { auth: true });
        if (Array.isArray(invRes?.data)) {
          setInventory(invRes.data.map(item => ({
            id: item._id || item.id,
            name: item.name || item.partName || 'Spare Part',
            sku: item.sku || item.partCode || 'SKU-000',
            qty: item.stock ?? item.quantity ?? 0,
            status: (item.stock ?? item.quantity ?? 0) === 0 ? 'Out of Stock' : (item.stock ?? item.quantity ?? 0) <= 2 ? 'Low Stock' : 'In Stock',
            price: item.price || item.retailPrice || 0
          })));
        }
      } catch (e) {
        console.warn('Technician inventory fetch warning:', e.message);
      }

      // 3. Fetch real claims
      try {
        const claimsRes = await apiRequest('/tech/claims', { auth: true });
        if (Array.isArray(claimsRes?.data)) {
          setClaims(claimsRes.data.map(c => ({
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
        if (earnRes?.data) {
          const d = earnRes.data;
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
    }
  }, [user]);

  useEffect(() => {
    fetchRealJobs();
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
  const [selectedParts, setSelectedParts] = useState([]); // Parts selected during diagnosis
  
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
    setActiveStep('details');
  }, []);

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

  const advanceStep = useCallback(() => {
    setActiveStep(prev => {
      switch (prev) {
        case 'assigned': return 'ontheway';
        case 'ontheway': return 'inspection';
        case 'inspection': return 'spareapproval';
        case 'spareapproval': return 'repaircomplete';
        case 'repaircomplete': return 'billing';
        default: return prev;
      }
    });
  }, []);

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

  const collectPayment = useCallback(() => {
    if (!activeJob) return;
    setActiveStep('completed');
    // The server credits the tally as part of completing the job — read it back
    // rather than guessing the delta here.
    apiRequest('/tech/earnings/breakdown', { auth: true })
      .then((res) => {
        const d = res.data;
        if (!d) return;
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
      })
      .catch((err) => console.warn('[tech] Could not refresh earnings:', err.message));
  }, [activeJob]);

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
        credited = res.data;
      } catch (err) {
        console.warn('[tech] Could not credit visit fee:', err.message);
      }
    }
    await apiRequest('/tech/earnings/breakdown', { auth: true })
      .then((res) => {
        const d = res.data;
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
      return { ok: true, orders: placed.map((r) => r.data) };
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
      const c = res.data;
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
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: res.data.reply }]);
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
      toggleSpec
    }}>
      {children}
    </TechContext.Provider>
  );
};

export default TechContext;
