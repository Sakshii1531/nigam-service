import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User, MessageCircle, Phone, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { useTech } from '../../context/TechContext';

const HelpSupport = () => {
  const navigate = useNavigate();
  const { notifications } = useTech();

  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const faqs = [
    {
      q: "How do I update my bank account or UPI?",
      a: "Go to Profile > Payout Settings to add or switch your primary bank account or UPI ID."
    },
    {
      q: "What happens when a spare part is required?",
      a: "Mark 'Spare Part Required' on the job flow. The request goes to Super Admin/Brand for approval, dispatch, and delivery. Once delivered, your revisit will be scheduled automatically."
    },
    {
      q: "When are technician payouts settled?",
      a: "Quick payouts are credited immediately to your balance upon customer payment. Invoice-based jobs settle with brand cycle."
    },
    {
      q: "How to report an issue or fake job request?",
      a: "Click 'Decline' on the job card before accepting, or connect with our 24/7 technical helpline directly."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">


      {/* Header — mobile only */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 lg:top-16 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Help & Support</h1>
        </div>
        <button onClick={() => navigate('/technician/notifications')} className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 max-w-screen-lg mx-auto w-full">

        {/* Contact Options */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/technician/technical-support')}
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Live Support Chat</span>
            <span className="text-xs text-slate-500">Fastest response</span>
          </button>
          <button 
            onClick={() => { window.location.href = 'tel:18001234567'; }}
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
              <Phone className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Call Support</span>
            <span className="text-xs text-slate-500">1800-123-4567</span>
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
      <TechBottomNav activeTab="profile" />

    </div>
  );
};

export default HelpSupport;
