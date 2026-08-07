import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, X, MapPin, User, Edit3, Star, Calendar as CalendarIcon, Clock, CreditCard, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const searchParams = new URLSearchParams(location.search);
  const preSelectedService = searchParams.get('service') || 'Electrician Consultancy';
  const initialPrice = parseInt(searchParams.get('price')) || 149;
  const initialQty = parseInt(searchParams.get('qty')) || 1;

  // Checkout Step State Machine:
  // 0 - Summary with Select Address button
  // 1 - Address Selected, show Select Date & Time button
  // 2 - Address & Date/Time Selected, show Proceed to Pay button
  // 3 - Payment Options Gateway page
  const [checkoutStep, setCheckoutStep] = useState(0);

  // Item quantity state in checkout
  const [qty, setQty] = useState(initialQty);

  // Address drawer state
  const [showAddressDrawer, setShowAddressDrawer] = useState(false);
  const [houseNo, setHouseNo] = useState('102');
  const [landmark, setLandmark] = useState('SSB Camp Road');
  const [name, setName] = useState('Parveen');
  const [saveAs, setSaveAs] = useState('Home');

  // Date and Time selection drawer state
  const [showDateTimeDrawer, setShowDateTimeDrawer] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00 AM');

  // Payment Options page state
  const [upiExpanded, setUpiExpanded] = useState(true);
  const [showOffersDrawer, setShowOffersDrawer] = useState(false);

  // Receipt calculations
  const price = initialPrice;
  const total = price * qty;
  const advance = 49 * qty;
  const remaining = total - advance;

  const isFormValid = houseNo.trim() !== '' && landmark.trim() !== '' && name.trim() !== '';

  const handleSaveAddress = () => {
    if (isFormValid) {
      setCheckoutStep(1);
      setShowAddressDrawer(false);
    }
  };

  const handleScheduleTime = () => {
    if (selectedDate && selectedTimeSlot) {
      setCheckoutStep(2);
      setShowDateTimeDrawer(false);
    }
  };

  const handlePaymentSuccess = () => {
    const params = new URLSearchParams({
      service: preSelectedService,
      totalPrice: String(total),
      advanceAmt: String(advance),
      quantity: String(qty),
      date: selectedDate,
      timeGroup: selectedTimeSlot,
      customerName: name || 'Customer',
      paymentMode: 'advance'
    });
    navigate(`/booking-success?${params.toString()}`);
  };

  // ─── VIEW 2: PAYMENT GATEWAY INTERFACE (checkoutStep === 3) ─────────────────
  if (checkoutStep === 3) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative font-sans">
        {/* Header */}
        <div className="bg-white px-4 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCheckoutStep(2)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <h1 className="text-[16px] font-black text-slate-900">
              Payment Options
            </h1>
          </div>
          {/* Profile / User Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 cursor-pointer">
            <User className="w-4 h-4 text-slate-600" />
          </div>
        </div>

        {/* Scrollable payments list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 pb-24">
          
          {/* Available Offers section */}
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
              Available Offers
            </span>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#EAF4FF] rounded-lg flex items-center justify-center flex-shrink-0">
                  {/* Offers tag */}
                  <svg className="w-4 h-4 text-[#2F80ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-slate-700 leading-snug">
                  Upto 1.5% savings with NeuCard U...
                </span>
              </div>
              <button 
                onClick={() => setShowOffersDrawer(true)}
                className="text-[#0D47A1] text-[11px] font-extrabold flex items-center hover:underline"
              >
                View all
              </button>
            </div>
          </div>

          {/* Recommended Payments section */}
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
              Recommended
            </span>
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              
              {/* Row 1: GPay */}
              <button
                onClick={handlePaymentSuccess}
                className="w-full px-4 py-3.5 flex items-center justify-between border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center flex-shrink-0 bg-[#F8F9FA]">
                    {/* Google Pay color spheres */}
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-full bg-[#EA4335]" />
                      <div className="w-2 h-2 rounded-full bg-[#4285F4]" />
                      <div className="w-2 h-2 rounded-full bg-[#FBBC05]" />
                    </div>
                  </div>
                  <span className="text-[12px] font-extrabold text-slate-800">UPI - Google Pay</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Row 2: Paytm */}
              <button
                onClick={handlePaymentSuccess}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center flex-shrink-0 bg-[#E3F2FD]">
                    <span className="text-[9px] font-black text-[#002E6E] uppercase">Paytm</span>
                  </div>
                  <span className="text-[12px] font-extrabold text-slate-800">UPI - Paytm</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

            </div>
          </div>

          {/* All Payment Options section */}
          <div>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
              All Payment Options
            </span>
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              
              {/* UPI expandable tab */}
              <button
                onClick={() => setUpiExpanded(!upiExpanded)}
                className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center flex-shrink-0 bg-[#E0F2F1]">
                    {/* BHIM / UPI Icon */}
                    <span className="text-[10px] font-black text-[#00796B]">UPI</span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-extrabold text-slate-800">UPI</span>
                    <span className="bg-[#E8F5E9] text-[#2E7D32] text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5">
                      Upto 1.5% savings with NeuCard UPI txns
                    </span>
                  </div>
                </div>
                {upiExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Expanded UPI options */}
              {upiExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-100 flex flex-col pl-14 pr-4">
                  {/* Google Pay */}
                  <button
                    onClick={handlePaymentSuccess}
                    className="w-full py-3.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100/50 transition-colors text-left"
                  >
                    <span className="text-[12px] font-bold text-slate-700">Google Pay</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </button>

                  {/* Paytm */}
                  <button
                    onClick={handlePaymentSuccess}
                    className="w-full py-3.5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-100/50 transition-colors text-left"
                  >
                    <span className="text-[12px] font-bold text-slate-700">PayTM</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </button>

                  {/* Apps & UPI ID */}
                  <button
                    onClick={() => {
                      const id = prompt('Enter your UPI ID (e.g. name@okhdfcbank):');
                      if (id) handlePaymentSuccess();
                    }}
                    className="w-full py-3.5 flex items-center justify-between hover:bg-slate-100/50 transition-colors text-left"
                  >
                    <span className="text-[12px] font-bold text-slate-700">Apps & UPI ID</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Privacy legal notice */}
          <div className="text-center px-4 mt-2">
            <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
              By proceeding, I agree to Razorpay's <span className="text-[#0D47A1] cursor-pointer hover:underline">Privacy Notice</span> • <span className="text-[#0D47A1] cursor-pointer hover:underline">Edit Preferences</span>
            </p>
          </div>

        </div>

        {/* Sticky bottom gateway summary bar */}
        <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-20">
          <div className="flex flex-col">
            <span className="text-[18px] font-black text-slate-900 leading-none">₹{advance}</span>
            <button 
              onClick={() => alert(`Advance charge breakdown:\nItem total: ₹${total}\nAdvance: ₹${advance}\nPayable after service: ₹${remaining}`)}
              className="text-slate-400 text-[10px] font-bold mt-1 flex items-center gap-0.5 hover:underline"
            >
              View Details <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handlePaymentSuccess}
            className="bg-[#111111] text-white font-extrabold px-10 py-3.5 rounded-xl text-[13px] shadow-sm hover:bg-black active:scale-95 transition-all focus:outline-none"
          >
            Continue
          </button>
        </div>

        {/* Offers Modal Drawer */}
        {showOffersDrawer && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl animate-slide-up flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-[14px] font-extrabold text-slate-900">NeuCard & Payment Offers</h3>
                <button
                  onClick={() => setShowOffersDrawer(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Offer 1 */}
                <div className="p-3.5 border border-blue-100 bg-blue-50/50 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#0D47A1] bg-blue-100 px-2 py-0.5 rounded-md uppercase">
                      NeuCard Exclusive
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Code: NEU150</span>
                  </div>
                  <p className="text-[12px] font-bold text-slate-900">Get up to 1.5% savings on all NeuCard UPI transactions</p>
                  <p className="text-[10px] text-slate-500">Applicable automatically on checkout when paying via Tata NeuCard UPI.</p>
                </div>

                {/* Offer 2 */}
                <div className="p-3.5 border border-slate-100 bg-slate-50 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                      UPI Cashback
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Code: UPIPAY</span>
                  </div>
                  <p className="text-[12px] font-bold text-slate-900">Flat ₹50 Instant Cashback on Google Pay / Paytm UPI</p>
                  <p className="text-[10px] text-slate-500">Valid on minimum booking value of ₹299. Once per user.</p>
                </div>

                {/* Offer 3 */}
                <div className="p-3.5 border border-slate-100 bg-slate-50 rounded-2xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md uppercase">
                      First Service
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Code: WELCOME100</span>
                  </div>
                  <p className="text-[12px] font-bold text-slate-900">Save ₹100 on your first Nigambox Service</p>
                  <p className="text-[10px] text-slate-500">Valid across all home service categories.</p>
                </div>
              </div>

              <button
                onClick={() => setShowOffersDrawer(false)}
                className="w-full bg-[#0D47A1] text-white py-3 rounded-2xl text-[13px] font-bold mt-1"
              >
                Close Offers
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ─── VIEW 1: SUMMARY FLOW SCREEN (checkoutSteps 0, 1, 2) ─────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col relative font-sans">
      
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-[15px] font-extrabold text-slate-900">
          Electricians
        </h1>
        <div className="w-8 h-8" />
      </div>

      {/* Main summary list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-28">
        
        {/* Selected Service Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-extrabold text-slate-900 leading-snug block">
              {preSelectedService}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Numbering Selector capsule */}
            <div className="w-20 flex items-center justify-between border border-[#0D47A1] bg-white rounded-xl text-[12px] font-extrabold overflow-hidden h-8">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-7 h-full flex items-center justify-center text-[#0D47A1] hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                -
              </button>
              <span className="text-[#0D47A1] flex-1 text-center select-none">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-7 h-full flex items-center justify-center text-[#0D47A1] hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                +
              </button>
            </div>
            <span className="text-[13px] font-extrabold text-slate-900 w-16 text-right">
              ₹{total}
            </span>
          </div>
        </div>

        {/* Payment Summary receipt */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
          <h3 className="text-[13px] font-extrabold text-slate-900">Payment Summary</h3>
          <div className="flex justify-between text-[11px] font-bold text-slate-500">
            <span>Item total</span>
            <span>₹{total}</span>
          </div>
          <div className="flex justify-between text-[11px] font-bold text-slate-500">
            <span>Taxes and Fee</span>
            <span>₹0</span>
          </div>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex justify-between text-[13px] font-extrabold text-slate-900">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex justify-between text-[13px] font-extrabold text-slate-900">
            <span>Advance Payment</span>
            <span>₹{advance}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold -mt-2.5">
            (₹{remaining} payable after service)
          </span>
        </div>

        {/* Bulleted notes */}
        <div className="bg-[#F4F6F8] rounded-2xl p-4 border border-slate-100 flex flex-col gap-2">
          <h3 className="text-[12px] font-bold text-slate-700">Notes</h3>
          <ul className="flex flex-col gap-1.5 list-disc pl-4 text-[11px] text-slate-500 leading-normal font-semibold">
            <li>The provided cost is an approximate estimate.</li>
            <li>Final estimation will be provided after inspection.</li>
          </ul>
        </div>

        {/* Address saved card details (Visible in step 1 and 2) */}
        {checkoutStep >= 1 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between mt-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                {/* Home SVG Icon */}
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                  {saveAs} - {houseNo}, {landmark}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-0.5">
                  Shashtra Seema Bal (Sashastra Seema Bal), Mehrauli-Gurgaon Rd, Aya Nagar Phase 1, Ghitorni, New Delhi, Delhi, 110047, India
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddressDrawer(true)} 
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 ml-2"
            >
              {/* Edit Icon */}
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}

        {/* Date and Time saved card details (Visible in step 2) */}
        {checkoutStep >= 2 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                {/* Calendar SVG Icon */}
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 flex items-center h-8">
                <p className="text-[11px] font-black text-slate-800">
                  Scheduled on {selectedDate}, {selectedTimeSlot.toLowerCase()}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowDateTimeDrawer(true)} 
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 ml-2"
            >
              {/* Edit Icon */}
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}

      </div>

      {/* Sticky Bottom Summary Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-10">
        {checkoutStep === 0 ? (
          <button
            onClick={() => setShowAddressDrawer(true)}
            className="w-full bg-[#2F80ED] text-white font-extrabold py-3.5 rounded-2xl text-[14px] shadow-md hover:bg-blue-600 active:scale-95 transition-all focus:outline-none"
          >
            Select address
          </button>
        ) : checkoutStep === 1 ? (
          <button
            onClick={() => setShowDateTimeDrawer(true)}
            className="w-full bg-[#2F80ED] text-white font-extrabold py-3.5 rounded-2xl text-[14px] shadow-md hover:bg-blue-600 active:scale-95 transition-all focus:outline-none"
          >
            Select date and time
          </button>
        ) : (
          <button
            onClick={() => setCheckoutStep(3)}
            className="w-full bg-[#2F80ED] text-white font-extrabold py-3.5 rounded-2xl text-[14px] shadow-md hover:bg-blue-600 active:scale-95 transition-all focus:outline-none"
          >
            Proceed to pay
          </button>
        )}
      </div>

      {/* ── Confirm Your Address Bottom Drawer ── */}
      {showAddressDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end"
          onClick={() => setShowAddressDrawer(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl flex flex-col relative transition-all duration-300"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Close Button */}
            <button
              onClick={() => setShowAddressDrawer(false)}
              className="absolute -top-14 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg focus:outline-none z-50 active:scale-90 transition-transform"
            >
              <X className="h-5 w-5 text-slate-800" />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <h2 className="text-[14px] font-extrabold text-slate-900">Confirm Your Address</h2>
              <button 
                onClick={() => navigate('/saved-addresses')}
                className="text-[#0D47A1] text-[12px] font-extrabold hover:underline"
              >
                Change
              </button>
            </div>

            {/* Scrollable address details form */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5 pb-10">
              
              <div className="flex flex-col gap-1">
                <h3 className="text-[13px] font-extrabold text-slate-900">Enter your address</h3>
                <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                  Almost done! Add details to complete your address.
                </span>
              </div>

              {/* Saved Address Box */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-slate-100">
                <p className="text-[11px] font-black text-slate-800 mb-1">
                  Shashtra Seema Bal (Sashastra Seema Bal)
                </p>
                <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                  Shashtra Seema Bal (Sashastra Seema Bal), Mehrauli-Gurgaon Rd, Aya Nagar Phase 1, Ghitorni, New Delhi, Delhi, 110047, India
                </p>
              </div>

              {/* Form Input Fields */}
              <div className="flex flex-col gap-3.5">
                
                {/* House / Flat no */}
                <div className="relative">
                  <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="House / Flat no."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] outline-none transition-all text-[12px] font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* Landmark */}
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Landmark"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] outline-none transition-all text-[12px] font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* Name */}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-[#2F80ED] focus:ring-1 focus:ring-[#2F80ED] outline-none transition-all text-[12px] font-semibold text-slate-800 placeholder-slate-400"
                  />
                </div>

              </div>

              {/* Save As Tags */}
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[11px] font-bold text-slate-500">Save as</span>
                <div className="flex gap-2.5">
                  {['Home', 'Office', 'Other'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSaveAs(tag)}
                      className={`px-5 py-2 rounded-xl text-[11px] font-extrabold border transition-all ${
                        saveAs === tag
                          ? 'bg-[#EAF4FF] text-[#0D47A1] border-[#0D47A1]'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save and Proceed CTA button inside drawer */}
              <div className="mt-4">
                <button
                  onClick={handleSaveAddress}
                  disabled={!isFormValid}
                  className={`w-full font-extrabold py-3.5 rounded-xl text-[13px] shadow-sm transition-all focus:outline-none ${
                    isFormValid
                      ? 'bg-[#2F80ED] text-white hover:bg-blue-600 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Save and proceed
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── When should the professional arrive? Bottom Drawer ── */}
      {showDateTimeDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end"
          onClick={() => setShowDateTimeDrawer(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl shadow-2xl flex flex-col relative transition-all duration-300"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Floating Close Button */}
            <button
              onClick={() => setShowDateTimeDrawer(false)}
              className="absolute -top-14 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg focus:outline-none z-50 active:scale-90 transition-transform"
            >
              <X className="h-5 w-5 text-slate-800" />
            </button>

            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-[14px] font-black text-slate-900">
                When should the professional arrive?
              </h2>
            </div>

            {/* Scrollable time slot selection area */}
            <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5 pb-10">
              
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block -mb-2">
                Professional arrives at your selected time.
              </span>

              {/* Advance payment refundability details card */}
              <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4FF] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4.5 h-4.5 text-[#2F80ED]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-black text-slate-800">
                    Pay ₹{advance} (Refundable)
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    Balance to be paid – ₹{(total - advance).toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Date Card Selector */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {['Wed 27', 'Thu 28', 'Fri 29', 'Sat 30', 'Select custom'].map((dateText) => {
                    const isActive = selectedDate === dateText;
                    const parts = dateText.split(' ');
                    const isCustom = parts.length === 1;
                    return (
                      <button
                        key={dateText}
                        onClick={() => setSelectedDate(dateText)}
                        className={`flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-2xl border transition-all ${
                          isActive
                            ? 'border-[#2F80ED] bg-[#EAF4FF] shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {isCustom ? (
                          <span className={`text-[10px] font-bold text-center leading-tight ${isActive ? 'text-[#0D47A1]' : 'text-slate-600'}`}>
                            Select<br/>custom
                          </span>
                        ) : (
                          <>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{parts[0]}</span>
                            <span className={`text-[14px] font-black ${isActive ? 'text-[#0D47A1]' : 'text-slate-800'} mt-0.5`}>
                              {parts[1]}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots Selector */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12px] font-black text-slate-800">Select time</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM',
                    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
                  ].map((timeText) => {
                    const isActive = selectedTimeSlot === timeText;
                    return (
                      <button
                        key={timeText}
                        onClick={() => setSelectedTimeSlot(timeText)}
                        className={`py-3 rounded-xl border text-[11px] font-bold text-center transition-all ${
                          isActive
                            ? 'border-[#2F80ED] bg-[#EAF4FF] text-[#0D47A1] shadow-sm'
                            : 'border-slate-150 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {timeText}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule and Proceed CTA button inside drawer */}
              <div className="mt-4">
                <button
                  onClick={handleScheduleTime}
                  disabled={!selectedDate || !selectedTimeSlot}
                  className={`w-full font-extrabold py-3.5 rounded-xl text-[13px] shadow-sm transition-all focus:outline-none ${
                    selectedDate && selectedTimeSlot
                      ? 'bg-[#2F80ED] text-white hover:bg-blue-600 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  Schedule and proceed
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Booking;
