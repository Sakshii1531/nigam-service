import React from 'react';
import { MessageCircle, Send, Camera, Briefcase } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-border-color">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="col-span-2">
            <span className="text-xl font-bold flex items-center">
              <span className="text-brand-blue">Nigam Care</span>
              <span className="text-brand-yellow ml-1">Company</span>
            </span>
            <p className="mt-4 text-sm text-text-secondary max-w-sm">
              Smart Appliance & Home Service Platform. We provide expert services right at your doorstep with verified technicians.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-brand-blue hover:text-blue-800 transition-colors"><MessageCircle className="h-5 w-5" /></a>
              <a href="#" className="text-brand-blue hover:text-blue-800 transition-colors"><Send className="h-5 w-5" /></a>
              <a href="#" className="text-brand-blue hover:text-blue-800 transition-colors"><Camera className="h-5 w-5" /></a>
              <a href="#" className="text-brand-blue hover:text-blue-800 transition-colors"><Briefcase className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">About Us</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Careers</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Contact</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Services</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">AC Repair</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Cleaning</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Electrician</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Plumber</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Support</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Terms of Use</a></li>
              <li><a href="#" className="text-sm text-text-secondary hover:text-brand-blue transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border-color mt-6 pt-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-secondary">© 2026 Nigam Care Company. All rights reserved.</p>
          <div className="flex gap-4">
            <button className="bg-text-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="text-xs">Download on the</span>
              <span className="font-semibold">App Store</span>
            </button>
            <button className="bg-text-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span className="text-xs">Get it on</span>
              <span className="font-semibold">Google Play</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
