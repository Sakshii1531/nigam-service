import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  Ticket,
  Phone,
  MessageCircle,
  Mail,
  MessageSquare,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import CustomerTopNav from '../components/CustomerTopNav';

const HelpSupport = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      icon: <HelpCircle className="h-5 w-5 text-[#1565C0]" />,
      title: 'Browse FAQs',
      sub: null,
      onClick: () => navigate('/faqs'),
    },
    {
      icon: <Ticket className="h-5 w-5 text-[#1565C0]" />,
      title: 'Raise a Ticket',
      sub: null,
      onClick: () => navigate('/partner-warranty/raise-request/General/NCC/General'),
    },
    {
      icon: <Phone className="h-5 w-5 text-[#1565C0]" />,
      title: 'Call Us',
      sub: '1800-123-6222',
      onClick: () => window.location.href = 'tel:18001236222',
    },
    {
      icon: <MessageCircle className="h-5 w-5 text-[#1565C0]" />,
      title: 'WhatsApp Support',
      sub: null,
      onClick: () => window.open('https://wa.me/918001236222', '_blank'),
    },
    {
      icon: <Mail className="h-5 w-5 text-[#1565C0]" />,
      title: 'Email Us',
      sub: 'support@nccservice.in',
      onClick: () => window.location.href = 'mailto:support@nccservice.in',
    },
    {
      icon: <MessageSquare className="h-5 w-5 text-[#1565C0]" />,
      title: 'Live Chat',
      sub: 'We are online',
      onClick: () => navigate('/chat'),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10 lg:pb-8 lg:pt-14">

      {/* Desktop Top Nav */}
      <CustomerTopNav activePage="account" />

      {/* Header — mobile only */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 lg:hidden">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Help & Support</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:px-6 pt-5 max-w-3xl mx-auto w-full">

        {/* Title */}
        <div className="text-center mb-1">
          <p className="text-xs font-black uppercase tracking-[3px] text-[#1565C0]">HELP & SUPPORT</p>
        </div>

        {/* Main Menu List — 2-col on desktop */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col lg:grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:gap-px lg:bg-slate-100">
          {menuItems.map((item, i) => (
            <div
              key={i}
              onClick={item.onClick}
              className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">{item.title}</span>
                  {item.sub && (
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.sub}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </div>
          ))}
        </div>

        {/* Service Areas - separate card */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div
            onClick={() => alert('Service area coverage is not published in the app yet — contact support for your pincode.')}
            className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-[#1565C0]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Service Areas</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Check if we serve in your area</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpSupport;
