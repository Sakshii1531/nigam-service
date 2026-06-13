import React, { createContext, useContext, useState, useCallback } from 'react';

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
    isRecommended: false
  },
  {
    id: '8845',
    type: 'AMC Visit',
    category: 'AC Repair',
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
    isRecommended: true
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
    isRecommended: false
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
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [claims, setClaims] = useState(INITIAL_CLAIMS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [earningsTally, setEarningsTally] = useState({
    today: 2450,
    total: 245600,
    completedToday: 3,
    completedTotal: 154
  });

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

  const acceptJob = useCallback((id) => {
    setActiveJobId(id);
    setActiveStep('assigned');
    // Add a notification
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
  }, [jobs]);

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
      addPartToCart,
      removePartFromCart,
      clearCart,
      placePartsOrder,
      raiseClaim,
      markAllNotificationsRead,
      addChatMessage
    }}>
      {children}
    </TechContext.Provider>
  );
};

export default TechContext;
