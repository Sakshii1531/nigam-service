import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, ShieldCheck, CheckCircle2, Lock, Scale, Mail, Clock } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import Footer from '../components/layout/Footer';

const defaultTerms = [
  {
    heading: '1. Service Booking & Technician Dispatch',
    text: 'Nigam Care Center (NCC) acts as a verified home service platform connecting clients with certified technicians for AC repair, appliance servicing, electrical, plumbing, and cleaning tasks. By placing a booking, you agree to provide accurate location details and ensure adult supervision during doorstep appointments.',
  },
  {
    heading: '2. Upfront Pricing & Payment Terms',
    text: 'All visiting charges, diagnostic costs, and spare part prices are displayed upfront prior to job confirmation. Payments can be processed securely online via UPI, Credit/Debit Cards, NetBanking, or directly in cash to the technician upon satisfactory job completion.',
  },
  {
    heading: '3. 30-Day Service Warranty Policy',
    text: 'All repair services completed by NCC technicians include a complimentary 30-day service warranty. If the exact same issue reoccurs within 30 days of service, our team will dispatch a senior technician to rectify the problem free of any additional labor or visiting charge.',
  },
  {
    heading: '4. Cancellation & Refund Policy',
    text: 'Bookings may be cancelled or rescheduled free of penalty up to 2 hours prior to the scheduled slot. If cancelled after technician dispatch, a nominal visiting charge may apply. Approved refunds are processed to the original payment source within 5 to 7 business days.',
  },
  {
    heading: '5. Genuine Parts Guarantee',
    text: 'Spare parts supplied by NCC technicians are 100% original OEM parts. Replacement components carry manufacturer warranty as specified on the billing invoice.',
  },
  {
    heading: '6. Limitation of Liability',
    text: 'NCC carries comprehensive liability coverage for technician property damage during active job execution. For support or dispute resolution, contact support@nccservice.in or call 1800-123-6222.',
  },
];

const defaultPrivacy = [
  {
    heading: '1. Information We Collect',
    text: 'We collect personal information necessary to deliver doorstep services, including your name, contact phone number, service address, email address, and booking history. Payment details are processed through PCI-DSS compliant payment gateways (Razorpay) and are never stored on our servers.',
  },
  {
    heading: '2. How We Use Your Data',
    text: 'Your personal data is strictly utilized for service dispatch, booking updates via SMS/WhatsApp, technician verification, warranty tracking, and customer support resolution.',
  },
  {
    heading: '3. Data Protection & Security Protocols',
    text: 'We implement 256-bit SSL encryption, tokenized authentication, and strict role-based access controls to safeguard your personal details against unauthorized access or disclosure.',
  },
  {
    heading: '4. Sharing Information with Service Technicians',
    text: 'Your contact name and service address are shared exclusively with the assigned background-verified technician solely for the duration of the scheduled job slot.',
  },
  {
    heading: '5. Cookies & Analytics',
    text: 'We use essential session cookies to keep you logged in, save address preferences, and improve app responsiveness. You can manage cookie preferences via your browser settings.',
  },
  {
    heading: '6. Your Data Rights & Contact Desk',
    text: 'You maintain the right to view, update, or request deletion of your account profile at any time. For privacy inquiries or data requests, email privacy@nccservice.in.',
  },
];

const CmsDocViewer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isPrivacy = location.pathname.includes('privacy');
  const slug = isPrivacy ? 'privacy-policy' : 'terms-and-conditions';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms & Conditions';
  const defaultSections = isPrivacy ? defaultPrivacy : defaultTerms;

  const [loading, setLoading] = useState(true);
  const [cmsContent, setCmsContent] = useState('');

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/cms/pages/${slug}`);
      if (res && res.body) {
        setCmsContent(res.body);
      }
    } catch {
      // Fallback cleanly to default structured legal text
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Sticky Header */}
      <div className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 lg:top-20 z-40 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-base font-black text-slate-900">{title}</h1>
      </div>

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-[#051F42] via-[#0B4EA2] to-[#0D47A1] rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-xl flex flex-col gap-3 text-left">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 w-fit">
            {isPrivacy ? <Lock className="h-4 w-4 text-emerald-400" /> : <Scale className="h-4 w-4 text-amber-300" />}
            <span className="text-xs font-bold text-slate-100">Official Policy Document</span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black text-white">{title}</h2>
          <div className="flex items-center gap-4 text-xs text-slate-300 font-medium mt-1">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-400" /> Last Updated: August 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Verified Legal Framework</span>
          </div>
        </div>

        {/* Content Container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-2 bg-white rounded-[28px] border border-slate-200/80">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0D47A1]" />
            <span className="text-xs font-semibold">Loading official documentation...</span>
          </div>
        ) : (
          <div className="bg-white rounded-[28px] p-6 md:p-10 border border-slate-200/80 shadow-xs flex flex-col gap-6 text-left">
            {cmsContent && cmsContent.trim().length > 300 ? (
              <div className="whitespace-pre-line text-xs md:text-sm font-medium text-slate-700 leading-relaxed">
                {cmsContent}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {cmsContent && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 mb-2">
                    {cmsContent}
                  </div>
                )}
                {defaultSections.map((sec, idx) => (
                  <div key={idx} className="flex flex-col gap-2 border-b border-slate-100 pb-6 last:border-b-0 last:pb-0">
                    <h3 className="text-base font-black text-slate-900">{sec.heading}</h3>
                    <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">{sec.text}</p>
                  </div>
                ))}

                <div className="mt-4 p-5 bg-blue-50/70 border border-blue-100 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6 text-[#0B4EA2] flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-900">Have legal or policy questions?</span>
                      <span className="text-[11px] text-slate-500 font-medium">Our legal desk responds within 24 business hours.</span>
                    </div>
                  </div>
                  <a
                    href="mailto:support@nccservice.in"
                    className="px-5 py-2.5 bg-[#0B4EA2] text-white font-bold text-xs rounded-xl hover:bg-[#072C63] transition-colors flex-shrink-0"
                  >
                    Contact Legal Desk
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Desktop Footer */}
      <Footer />
    </div>
  );
};

export default CmsDocViewer;
