import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, MessageCircle, Phone, FileText, ChevronDown, ChevronUp } from 'lucide-react';

const HelpSupport = () => {
  const navigate = useNavigate();

  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How do I update my bank account?",
      a: "Go to Profile > Payout Settings to update your bank account or UPI ID."
    },
    {
      q: "What to do if a customer cancels?",
      a: "If a customer cancels, you will receive a notification and the job will be removed from your list. You may be eligible for a cancellation fee."
    },
    {
      q: "When do I get my weekly payout?",
      a: "Payouts are processed every Monday for the work completed in the previous week."
    },
    {
      q: "How to report a fake job request?",
      a: "Click on Decline and select 'Fake Request' as the reason, or contact support directly."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Help & Support</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Contact Options */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/technician/technical-support')}
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Chat with Us</span>
            <span className="text-xs text-slate-500">Fastest response</span>
          </button>
          <button 
            onClick={() => { window.location.href = 'tel:+18006228324'; }}
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
              <Phone className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Call Support</span>
            <span className="text-xs text-slate-500">24/7 Available</span>
          </button>
        </div>

        {/* FAQs */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Frequently Asked Questions</h3>
          
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-slate-55 pb-2 last:border-b-0 last:pb-0">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full flex justify-between items-center text-left hover:bg-slate-50 p-1 rounded-md"
                >
                  <span className="text-sm text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {faq.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {openFaq === i && (
                  <p className="text-xs text-slate-500 mt-1 ml-6">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-3.5 flex justify-around items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default HelpSupport;
