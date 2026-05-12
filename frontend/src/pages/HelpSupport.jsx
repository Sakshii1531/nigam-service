import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MessageSquare, ChevronRight } from 'lucide-react';

const HelpSupport = () => {
  const navigate = useNavigate();

  const faqs = [
    { q: "How to track my service?", a: "Go to Dashboard and click on the active booking.", path: "/tracking" },
    { q: "How to cancel a booking?", a: "Go to Bookings and select the booking to cancel.", path: "/bookings" },
    { q: "What is covered under warranty?", a: "Check the Warranty page for details.", path: "/warranty" }
  ];

  return (
    <div className="min-h-screen bg-bg-light flex flex-col pb-20">
      
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>
        <h1 className="text-xl font-bold text-text-primary">Help & Support</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        
        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-4">
          <div 
            onClick={() => window.location.href = 'tel:+919876543210'}
            className="bg-white p-4 rounded-xl shadow-sm text-center flex flex-col items-center gap-2 border border-border-color cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#E3ECF9]/50 rounded-full flex items-center justify-center">
              <Phone className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-xs font-semibold">Call Us</span>
          </div>
          <div 
            onClick={() => window.location.href = 'mailto:support@nigamservice.com'}
            className="bg-white p-4 rounded-xl shadow-sm text-center flex flex-col items-center gap-2 border border-border-color cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#E3ECF9]/50 rounded-full flex items-center justify-center">
              <Mail className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-xs font-semibold">Email</span>
          </div>
          <div 
            onClick={() => navigate('/chat')}
            className="bg-white p-4 rounded-xl shadow-sm text-center flex flex-col items-center gap-2 border border-border-color cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#E3ECF9]/50 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-[#0D47A1]" />
            </div>
            <span className="text-xs font-semibold">Chat</span>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden">
          <div className="p-4 border-b border-border-color">
            <h2 className="text-sm font-bold text-text-primary">Frequently Asked Questions</h2>
          </div>
          {faqs.map((faq, index) => (
            <div 
              key={index}
              onClick={() => navigate(faq.path)}
              className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${index !== faqs.length - 1 ? 'border-b border-border-color' : ''}`}
            >
              <div>
                <span className="text-sm font-semibold text-text-primary block">{faq.q}</span>
                <span className="text-xs text-text-secondary">{faq.a}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-text-secondary" />
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

export default HelpSupport;
