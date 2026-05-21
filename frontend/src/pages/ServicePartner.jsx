import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import partnerImg from '../assets/working/Gemini_Generated_Image_ahi7orahi7orahi7-removebg-preview (1).png';

const ServicePartner = () => {
  const navigate = useNavigate();

  const benefits = [
    'Regular Service Requests',
    'High Earning Potential',
    'Flexible Working Hours',
    'Training & Support',
    'Grow with NCC',
  ];

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col pb-10">

      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-[#1565C0] uppercase tracking-wide">Join as Service Partner</h1>
      </div>

      <div className="flex flex-col gap-5 px-5 pt-5">

        {/* Main Card */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm relative overflow-hidden">

          {/* Partner Image */}
          <div className="absolute top-0 right-0 h-full w-40 pointer-events-none select-none flex items-center justify-end">
            <img
              src={partnerImg}
              alt="NCC Partner"
              className="h-[85%] object-contain object-right mix-blend-multiply"
            />
          </div>

          {/* Content */}
          <div className="relative z-10 pr-32">
            <h2 className="text-[15px] font-black text-slate-900 leading-tight">
              Become an NCC<br />Service Partner
            </h2>
            <p className="text-[11px] text-slate-500 font-semibold mt-1.5 leading-snug">
              Grow your business. Earn more.
            </p>

            <div className="flex flex-col gap-2.5 mt-4">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#1565C0] flex-shrink-0 fill-[#E3F2FD]" />
                  <span className="text-[11px] font-bold text-slate-700">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Join Now Button */}
          <button
            onClick={() => navigate('/technician/login')}
            className="w-full mt-5 bg-[#1565C0] hover:bg-blue-800 text-white text-sm font-black py-3.5 rounded-2xl transition-all cursor-pointer shadow-md relative z-10"
          >
            Join Now
          </button>
        </div>

        {/* Download Partner App */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h4 className="text-xs font-black text-slate-800">Download Partner App</h4>
            <p className="text-[10px] text-slate-400 font-semibold">Get the NCC Service Partner App</p>
          </div>
          <button
            onClick={() => alert('Redirecting to Google Play Store...')}
            className="flex-shrink-0 cursor-pointer"
          >
            <div className="bg-black rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
              {/* Google Play Icon SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.18 1.53A1.5 1.5 0 0 0 1.5 3v18a1.5 1.5 0 0 0 1.68 1.47l10.5-9-10.5-9z" fill="#EA4335"/>
                <path d="M22.5 12L19.5 10.5 16.5 12l3 1.5 3-1.5z" fill="#FBBC04"/>
                <path d="M19.5 10.5L3.18 1.53l10.5 9L19.5 10.5z" fill="#4285F4"/>
                <path d="M3.18 22.47L19.5 13.5l-5.82-1.5-10.5 9z" fill="#34A853"/>
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-white text-[7px] font-semibold uppercase tracking-wider">GET IT ON</span>
                <span className="text-white text-[11px] font-black leading-tight">Google Play</span>
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ServicePartner;
