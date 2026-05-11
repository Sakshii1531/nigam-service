import React from 'react';
import { Search, MapPin, ShoppingCart, User, ChevronDown } from 'lucide-react';
import logo from '../../assets/nigam-care.png';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-border-color/50 md:bg-transparent bg-black">
      {/* Mobile Header */}
      <div className="block md:hidden p-4">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-white" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm">In 45 minutes</span>
                <ChevronDown className="h-4 w-4" />
              </div>
              <span className="text-xs text-gray-400 truncate w-48">Corporate House - 3- Chhoti Gwaltoli- Indor..</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-black" />
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-3 bg-white rounded-xl flex items-center px-4 py-1.5">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input 
            type="text" 
            placeholder="Search for 'AC ser'" 
            className="bg-transparent border-none outline-none text-sm text-black w-full placeholder-gray-400"
          />
        </div>
      </div>

      {/* Desktop Navbar */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img src={logo} alt="Nigam Care Co." className="h-14 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 ml-8">
            <a href="#" className="text-sm font-medium text-[#014492] hover:opacity-80 transition-opacity">Services</a>
            <a href="#" className="text-sm font-medium text-[#014492] hover:opacity-80 transition-opacity">About</a>
            <a href="#" className="text-sm font-medium text-[#014492] hover:opacity-80 transition-opacity">Contact</a>
          </div>

          {/* Location & Search */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-8 gap-4">
            <div className="flex items-center bg-white border border-border-color rounded-full px-4 py-2 w-1/3 cursor-pointer hover:bg-bg-light transition-colors">
              <MapPin className="h-4 w-4 text-text-secondary mr-2" />
              <span className="text-sm text-text-secondary truncate">Select Location</span>
            </div>
            
            <div className="flex items-center bg-white border border-border-color rounded-full px-4 py-2 flex-1 hover:bg-bg-light transition-colors">
              <Search className="h-4 w-4 text-text-secondary mr-2" />
              <input 
                type="text" 
                placeholder="Search for services..." 
                className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder-text-secondary"
              />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <ShoppingCart className="h-5 w-5 text-text-secondary hover:text-text-primary transition-colors" />
              <span className="absolute -top-2 -right-2 bg-brand-yellow text-text-primary text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">0</span>
            </div>
            
            <button className="hidden md:flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-medium text-sm">
              <User className="h-4 w-4" />
              Login / Signup
            </button>
            
            <button className="bg-brand-blue text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm">
              Book Service
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
