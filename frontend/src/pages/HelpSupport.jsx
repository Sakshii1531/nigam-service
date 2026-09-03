import React, { useState } from 'react';
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
  Search,
  ChevronDown,
  Clock,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import Footer from '../components/layout/Footer';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const contactChannels = [
    {
      icon: Phone,
      title: 'Toll-Free Helpline',
      desc: '1800-123-6222 (Available 24x7)',
      badge: '24/7 Support',
      bg: 'bg-emerald-50 text-emerald-600',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      actionText: 'Call Now',
      onClick: () => (window.location.href = 'tel:18001236222'),
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp Assistant',
      desc: 'Get instant updates & resolution on WhatsApp',
      badge: 'Instant Reply',
      bg: 'bg-green-50 text-green-600',
      btnBg: 'bg-green-600 hover:bg-green-700 text-white',
      actionText: 'Chat on WhatsApp',
      onClick: () => window.open('https://wa.me/918001236222', '_blank'),
    },
    {
      icon: Ticket,
      title: 'Raise Support Ticket',
      desc: 'Log a formal service ticket with our team',
      badge: 'Guaranteed Reply',
      bg: 'bg-blue-50 text-blue-600',
      btnBg: 'bg-[#0B4EA2] hover:bg-[#072C63] text-white',
      actionText: 'Create Ticket',
      onClick: () => navigate('/partner-warranty/raise-request/General/NCC/General'),
    },
    {
      icon: Mail,
      title: 'Email Support Desk',
      desc: 'support@nccservice.in',
      badge: '24 Hour SLA',
      bg: 'bg-indigo-50 text-indigo-600',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      actionText: 'Send Email',
      onClick: () => (window.location.href = 'mailto:support@nccservice.in'),
    },
  ];

  const faqs = [
    {
      id: 1,
      question: 'How do I track my assigned technician?',
      answer: 'Go to "Bookings" tab in your account. You can view technician contact details, live status, and expected arrival time once assigned.',
    },
    {
      id: 2,
      question: 'What is covered under the 30-Day Service Warranty?',
      answer: 'All repair work done by Nigam Care technicians comes with a free 30-day warranty. If the same issue reoccurs within 30 days, we repair it free of cost.',
    },
    {
      id: 3,
      question: 'How do I cancel or reschedule a service booking?',
      answer: 'Open "Bookings", select your active booking, and click "Reschedule" or "Cancel". Free cancellation is allowed up to 2 hours before your scheduled time slot.',
    },
    {
      id: 4,
      question: 'Are spare parts sold on Nigam Care genuine?',
      answer: 'Yes! All spare parts supplied through our app are 100% authentic OEM parts with original manufacturer warranty.',
    },
    {
      id: 5,
      question: 'How do I purchase a Nigam Premium Club Membership?',
      answer: 'Visit the "Membership Plans" tab to browse Silver, Gold, Diamond, and Platinum plans for zero visiting charges and exclusive discounts.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Sticky Mobile/Desktop Back Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 lg:top-20 z-40 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-black text-slate-900">Help & Support Desk</h1>
      </div>

      <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">
        
        {/* Hero Search Section */}
        <div className="bg-gradient-to-br from-[#051F42] via-[#0B4EA2] to-[#0D47A1] rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl text-center flex flex-col items-center gap-4">
          <div className="absolute -left-16 -top-16 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
            <Zap className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-bold text-slate-100">24x7 Customer Helpdesk</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-white max-w-2xl leading-tight">
            How can we help you today?
          </h2>
          <p className="text-xs md:text-sm text-slate-200 font-medium max-w-lg">
            Search our knowledge base or reach out to our dedicated support channels.
          </p>

          {/* Search Box */}
          <div className="w-full max-w-2xl mt-2 relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for booking, technician, warranty, refund..."
              className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-2xl text-xs md:text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Contact Channels Grid */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-black text-slate-900 text-left">Instant Support Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactChannels.map((channel, idx) => {
              const Icon = channel.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-[24px] p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3.5 rounded-2xl ${channel.bg}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {channel.badge}
                      </span>
                    </div>

                    <div className="text-left mt-1">
                      <h4 className="text-base font-black text-slate-900">{channel.title}</h4>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{channel.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={channel.onClick}
                    className={`w-full py-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 ${channel.btnBg}`}
                  >
                    <span>{channel.actionText}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs Section */}
        <div className="bg-white rounded-[28px] p-6 md:p-8 border border-slate-200/80 shadow-xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-black text-slate-900">Frequently Asked Questions</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Quick answers to common queries</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
              {filteredFaqs.length} Articles
            </span>
          </div>

          <div className="flex flex-col divide-y divide-slate-100">
            {filteredFaqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div key={faq.id} className="py-4 text-left">
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                    className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                  >
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-3 text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage & Assurances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900">30-Min Rapid Slot</span>
              <span className="text-xs text-slate-500 font-medium">Technicians arrive on time</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900">30-Day Warranty</span>
              <span className="text-xs text-slate-500 font-medium">Free re-visit on all repairs</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 text-left">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-900">100% Genuine Parts</span>
              <span className="text-xs text-slate-500 font-medium">OEM certified spare parts</span>
            </div>
          </div>
        </div>

      </div>

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default HelpSupport;
