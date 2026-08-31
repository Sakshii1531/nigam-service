import React from 'react';
import { MessageCircle, Send, Camera, Briefcase, PhoneCall, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="hidden lg:block bg-[#051F42] text-white border-t border-white/10 mt-16 relative z-10">
      <div className="max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-16 xl:px-20 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Company Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-4 pr-6">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => handleNav('/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-white group-hover:scale-105 transition-transform">
                N
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                Nigam <span className="text-[#FFC107]">Care</span>
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              India's trusted smart appliance repair & home services platform. Certified technicians, transparent pricing, and instant doorstep support guaranteed.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => handleNav('/help-support')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button onClick={() => handleNav('/help-support')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                <Send className="h-4 w-4" />
              </button>
              <button onClick={() => handleNav('/help-support')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                <Camera className="h-4 w-4" />
              </button>
              <button onClick={() => handleNav('/help-support')} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer">
                <Briefcase className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Company</h3>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => handleNav('/about-ncc')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">About Us</button>
              </li>
              <li>
                <button onClick={() => handleNav('/dashboard')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Home</button>
              </li>
              <li>
                <button onClick={() => handleNav('/membership-plans')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Membership Plans</button>
              </li>
              <li>
                <button onClick={() => handleNav('/help-support')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Careers & Contact</button>
              </li>
            </ul>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Services</h3>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => handleNav('/book/AC')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">AC Service & Repair</button>
              </li>
              <li>
                <button onClick={() => handleNav('/book/Washing Machine')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Washing Machine</button>
              </li>
              <li>
                <button onClick={() => handleNav('/refrigerator-details')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Refrigerator Service</button>
              </li>
              <li>
                <button onClick={() => handleNav('/cleaning-services')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Home Cleaning</button>
              </li>
              <li>
                <button onClick={() => handleNav('/buy-product')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Spare Parts Store</button>
              </li>
            </ul>
          </div>

          {/* Support & Contact Column */}
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Support & Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <button onClick={() => handleNav('/help-support')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer flex items-center gap-2 font-medium">
                  <PhoneCall className="h-3.5 w-3.5 text-[#FFC107]" />
                  <span>24x7 Customer Support</span>
                </button>
              </li>
              <li>
                <a href="mailto:support@nigamcare.com" className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer flex items-center gap-2 font-medium">
                  <Mail className="h-3.5 w-3.5 text-[#FFC107]" />
                  <span>support@nigamcare.com</span>
                </a>
              </li>
              <li>
                <button onClick={() => handleNav('/terms-and-conditions')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Terms & Conditions</button>
              </li>
              <li>
                <button onClick={() => handleNav('/privacy-policy')} className="text-sm text-slate-300 hover:text-white hover:underline transition-colors cursor-pointer font-medium">Privacy Policy</button>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">© 2026 Nigam Care Company. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
