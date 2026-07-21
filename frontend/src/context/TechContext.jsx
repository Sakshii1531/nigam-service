import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../lib/apiClient';

const TechContext = createContext(null);

export const useTech = () => {
  const ctx = useContext(TechContext);
  if (!ctx) throw new Error('useTech must be used inside TechProvider');
  return ctx;
};

const INITIAL_JOBS = [
  {
    id: '8842',
    type: 'NCC Paid Service',
    category: 'AC Repair',
    product: 'Split AC Gas Charging',
    brand: 'Voltas',
    model: 'Voltas Split AC 1.5 Ton Inverter',
    serialNo: 'VLT18GN123348X',
    installDate: '12 Jan 2023',
    warrantyStatus: 'Out of Warranty',
    complaint: 'AC not cooling properly',
    estEarnings: 850,
    price: 2200,
    distance: 1.6,
    customerName: 'Rohit Sharma',
    phone: '9876543210',
    address: '124 Oak Street, Apartment 4B, Lucknow, UP 226001',
    isD2C: true,
    isPriority: true,
    isRecommended: true
  },
  {
    id: '8843',
    type: 'Brand Warranty',
    category: 'Refrigerator Repair',
    product: 'LG Refrigerator',
    brand: 'LG',
    model: 'LG Double Door 260L',
    serialNo: 'LG-REF-99201X',
    installDate: '10 May 2024',
    warrantyStatus: 'In Warranty',
    complaint: 'Noise from freezer compartment',
    estEarnings: 0,
    price: 0,
    distance: 3.1,
    customerName: 'Mrs. Neha Verma',
    phone: '9988776655',
    address: 'Sector 15, Gomti Nagar, Lucknow, UP 226010',
    isPartner: true,
    isPriority: false,
    isRecommended: true
  },
  {
    id: '8844',
    type: 'NCC Extended Warranty',
    category: 'AC Repair',
    product: 'Split AC Claim',
    brand: 'Carrier',
    model: 'Carrier 1.5 Ton 3 Star',
    serialNo: 'CAR-AC-7762X',
    installDate: '22 Feb 2022',
    warrantyStatus: 'Extended Warranty',
    complaint: 'Water leakage from indoor unit',
    estEarnings: 0,
    price: 0,
    distance: 4.2,
    customerName: 'Mr. Anil Mehta',
    phone: '8877665544',
    address: 'Flat 302, Royal Residency, Lucknow, UP 226016',
    isNCCEW: true,
    isPriority: true,
    isRecommended: false,
    // Extended Warranty specific
    ewPlanName: 'NCC Protect Plus',
    ewValidTill: '15 Jan 2028',
    ewClaimsRemaining: 2,
    ewClaimsTotal: 3
  },
  {
    id: '8845',
    type: 'AMC Visit',
    category: 'Washing Machine Repair',
    product: 'Quarterly Service Visit',
    brand: 'Samsung',
    model: 'Samsung Front Load 8kg',
    serialNo: 'SAM-WM-8822X',
    installDate: '15 Sep 2023',
    warrantyStatus: 'In Warranty',
    complaint: 'Vibration during spin cycle',
    estEarnings: 0,
    price: 0,
    distance: 2.8,
    customerName: 'Miss Neha Sen',
    phone: '7766554433',
    address: 'C-42, Aliganj, Lucknow, UP 226024',
    isPartner: true,
    isPriority: false,
    isRecommended: true,
    // AMC specific
    amcPlanName: 'AMC Gold Plan',
    amcId: 'NCCAMC289412',
    amcVisitsTotal: 4,
    amcVisitsRemaining: 3,
    amcVisitNumber: 2,
    amcPlanExpiry: '15 Jan 2027',
    amcPlanType: 'Quarterly'
  },
  {
    id: '8846',
    type: 'NCC Extended Warranty',
    category: 'Microwave Oven Repair',
    product: 'Microwave Oven',
    brand: 'IFB',
    model: 'IFB 30L Convection',
    serialNo: 'IFB-MW-3301X',
    installDate: '01 Nov 2021',
    warrantyStatus: 'Extended Warranty',
    complaint: 'Touch panel not responding',
    estEarnings: 280,
    price: 150,
    distance: 4.7,
    customerName: 'Mrs. Indu Mishra',
    phone: '6655443322',
    address: 'B-10, Indira Nagar, Lucknow, UP 226016',
    isNCCEW: true,
    isPriority: true,
    isRecommended: false,
    ewPlanName: 'NCC Shield Basic',
    ewValidTill: '01 Nov 2027',
    ewClaimsRemaining: 1,
    ewClaimsTotal: 2
  },
  {
    id: '8847',
    type: 'NCC Paid Service',
    category: 'RO',
    product: 'RO Water Purifier Service',
    brand: 'Kent',
    model: 'Kent Grand Plus RO',
    serialNo: 'KNT-RO-88122',
    installDate: '10 Feb 2023',
    warrantyStatus: 'Out of Warranty',
    complaint: 'Water taste is bitter / filter change needed',
    estEarnings: 450,
    price: 950,
    distance: 1.2,
    customerName: 'Sanjay Kumar',
    phone: '9882233445',
    address: 'A-24, Sector 4, Vikas Nagar, Lucknow, UP 226022',
    isD2C: true,
    isPriority: false,
    isRecommended: true
  },
  {
    id: '8848',
    type: 'Brand Warranty',
    category: 'TV',
    product: 'LED TV Panel Repair',
    brand: 'Sony',
    model: 'Sony Bravia 43" 4K Smart LED',
    serialNo: 'SNY-TV-55102',
    installDate: '14 Jun 2025',
    warrantyStatus: 'In Warranty',
    complaint: 'Horizontal line on display screen',
    estEarnings: 650,
    price: 0,
    distance: 3.8,
    customerName: 'Vikram Singh',
    phone: '9443322110',
    address: 'Flat 502, Orchid Heights, Hazratganj, Lucknow, UP 226001',
    isPartner: true,
    isPriority: true,
    isRecommended: false
  },
  {
    id: '8849',
    type: 'NCC Paid Service',
    category: 'Chimney',
    product: 'Kitchen Chimney Deep Cleaning',
    brand: 'Faber',
    model: 'Faber 60cm Auto Clean Chimney',
    serialNo: 'FBR-CH-99321',
    installDate: '05 Sep 2024',
    warrantyStatus: 'Out of Warranty',
    complaint: 'Suction power is low / heavy oil deposition',
    estEarnings: 550,
    price: 1450,
    distance: 2.1,
    customerName: 'Priya Sharma',
    phone: '9556677889',
    address: 'C-12, Sector B, Aliganj, Lucknow, UP 226024',
    isD2C: true,
    isPriority: false,
    isRecommended: true
  }
];

const INITIAL_INVENTORY = [
  { id: 'inv-1', name: 'Capacitor 45/5 MFD', sku: 'CP-45/5', qty: 6, status: 'In Stock', price: 220 },
  { id: 'inv-2', name: 'Gas Refill Kit (R410A)', sku: 'GRK-410', qty: 1, status: 'Low Stock', price: 850 },
  { id: 'inv-3', name: 'Outdoor Fan Motor', sku: 'FM-10W', qty: 0, status: 'Out of Stock', price: 1230 },
  { id: 'inv-4', name: 'PCB Board (Universal)', sku: 'PCB-U01', qty: 3, status: 'In Stock', price: 1500 }
];

const INITIAL_CLAIMS = [
  { id: 'claim-1', brand: 'NCC Warehouse Order', claimId: 'NC10617', item: 'Capacitor 45/5 MFD', status: 'Pending Approval', amount: 220, date: 'Just now' },
  { id: 'claim-2', brand: 'NCC Warehouse Order', claimId: 'NC95345', item: 'Capacitor 45/5 MFD', status: 'Pending Approval', amount: 220, date: 'Just now' },
  { id: 'claim-3', brand: 'LG Partner Warranty', claimId: 'LG88204', item: 'Washing Machine Motor', status: 'Pending Approval', amount: 1850, date: '12 May 2026' },
  { id: 'claim-4', brand: 'Samsung Warranty', claimId: 'SM87712', item: 'PCB Board', status: 'Approved', amount: 2450, date: '10 May 2026' },
  { id: 'claim-5', brand: 'NCC EW Claim', claimId: 'NC00501', item: 'Compressor Coil', status: 'Rejected', amount: 2200, date: '08 May 2026' }
];

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'Jobs', title: 'New job assigned', message: '#8843 has been assigned', time: '2m ago', read: false },
  { id: 2, type: 'Claims', title: 'Claim Approved', message: 'LG Claim LG88421 approved', time: '15m ago', read: false },
  { id: 3, type: 'Payments', title: 'Payment Received', message: '₹2,200 received from Rohit Sharma', time: '1h ago', read: false },
  { id: 4, type: 'Claims', title: 'Low Stock Alert', message: 'Capacitor 45/5 MFD is low', time: '2h ago', read: false },
{ id: 5, type: 'Jobs', title: 'Training Update', message: 'New course available', time: '1d ago', read: false }
];

export const TechProvider = ({ children }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [activeSpecs, setActiveSpecs] = useState(['AC', 'Refrigerator', 'Washing Machine']);
  const toggleSpec = useCallback((spec) => {
    setActiveSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
  }, []);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [earningsTally, setEarningsTally] = useState({
    today: 2450,
    total: 245600,
    completedToday: 3,
    completedTotal: 154
  });

  // Fetch real jobs from backend when logged in as technician
  const fetchRealJobs = useCallback(async () => {
    if (!user || user.role !== 'technician') return;
    try {
      const availableSRs = await apiRequest('/tech/jobs/available', { auth: true }) || [];
      const activeJobs = await apiRequest('/tech/jobs/active', { auth: true }) || [];

      const mappedAvailable = availableSRs.map((sr) => ({
        id: sr.id || sr._id,
        type: sr.booking?.totalPrice === 0 ? (sr.extendedWarrantyOrder ? 'NCC Extended Warranty' : sr.amcSubscription ? 'AMC Visit' : 'Brand Warranty') : 'NCC Paid Service',
        category: `${sr.category} Repair`,
        product: sr.description || `${sr.category} Service`,
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
          type: job.type,
          category: `${sr?.category || 'Service'} Repair`,
          product: sr?.description || 'Service Job',
          brand: sr?.booking?.brand || 'Brand',
          model: sr?.model || 'Universal Model',
          serialNo: sr?.serialNo || 'SNY-12345',
          complaint: sr?.description || 'Service Job',
          estEarnings: job.estEarnings,
          price: job.price,
          distance: 1.8,
          customerName: sr?.booking?.fullName || sr?.user?.name || 'Customer',
          phone: sr?.booking?.mobile || sr?.user?.phone || '9876543210',
          address: sr?.booking?.address ? `${sr.booking.address.house || ''}, ${sr.booking.address.landmark || ''}, ${sr.booking.address.city || ''} ${sr.booking.address.pincode || ''}` : 'Customer Address',
          isD2C: job.isD2C,
          isPriority: job.isPriority,
          isRecommended: job.isRecommended,
          isAvailableRequest: false,
          serviceRequestId: sr?.id || sr?._id,
          activeStep: job.activeStep,
        };
      });

      setJobs([...mappedActive, ...mappedAvailable, ...INITIAL_JOBS.filter(j => !mappedActive.some(ma => ma.serviceRequestId === j.id))]);
    } catch (err) {
      console.error('Failed to fetch real jobs for technician:', err);
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
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hello Alex! I am your AI Assistant. How can I help you today?' }
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
    if (activeJob) {
      setEarningsTally(prev => ({
        ...prev,
        today: prev.today + (activeJob.estEarnings || 850),
        total: prev.total + (activeJob.estEarnings || 850),
        completedToday: prev.completedToday + 1,
        completedTotal: prev.completedTotal + 1
      }));
      // Keep the job in nearby list for mock demo purposes
      // setJobs(prev => prev.filter(j => j.id !== activeJob.id));
      setActiveStep('completed');
    }
  }, [activeJob]);

  const creditTravelFee = useCallback(() => {
    setEarningsTally(prev => ({
      ...prev,
      today: prev.today + 150,
      total: prev.total + 150,
      completedToday: prev.completedToday + 1,
      completedTotal: prev.completedTotal + 1
    }));
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

  const placePartsOrder = useCallback((sourceName) => {
    // Deduct stock or place order logic
    // Add claims or request items
    const claimId = `NC${Math.floor(10000 + Math.random() * 90000)}`;
    partsCart.forEach(item => {
      // Add FOC claims or parts requests
      setClaims(prev => [
        {
          id: `claim-${Date.now()}-${item.id}`,
          brand: 'NCC Warehouse Order',
          claimId: claimId,
          item: item.name,
          status: 'Pending Approval',
          amount: item.price * item.qty,
          date: 'Just now'
        },
        ...prev
      ]);
    });
    setPartsCart([]);
  }, [partsCart]);

  const raiseClaim = useCallback((claimData) => {
    setClaims(prev => [
      {
        id: `claim-${Date.now()}`,
        brand: claimData.brand || 'D2C Claim',
        claimId: `NC${Math.floor(10000 + Math.random() * 90000)}`,
        item: claimData.item || 'Generic Spare Part',
        status: 'Pending Approval',
        amount: Number(claimData.amount) || 500,
        date: 'Just now'
      },
      ...prev
    ]);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addChatMessage = useCallback((text, sender = 'user') => {
    setChatMessages(prev => [
      ...prev,
      { id: Date.now(), sender, text }
    ]);

    if (sender === 'user') {
      // Auto reply simulation after 800ms
      setTimeout(() => {
        let reply = "I can assist you with diagnostics or part locations. What issues are you experiencing?";
        const lowerText = text.toLowerCase();
        if (lowerText.includes('part') || lowerText.includes('capacitor')) {
          reply = "The Capacitor 45/5 MFD (SKU: CP-45/5) is currently in stock at NCC Warehouse Gurugram. Do you want to order it?";
        } else if (lowerText.includes('cool') || lowerText.includes('diagnostic')) {
          reply = "For AC not cooling, check the capacitor ratings and compressor amp draw. These are the top causes (72% probability for capacitor failure).";
        } else if (lowerText.includes('warranty')) {
          reply = "You can verify warranty using the customer's purchase invoice or serial number. Standard brand coverage applies for LG/Samsung/Voltas.";
        }
        setChatMessages(curr => [
          ...curr,
          { id: Date.now() + 1, sender: 'ai', text: reply }
        ]);
      }, 800);
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
      addChatMessage,
      activeSpecs,
      toggleSpec
    }}>
      {children}
    </TechContext.Provider>
  );
};

export default TechContext;
