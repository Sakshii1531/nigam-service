import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Home as HomeIcon, Calendar, LayoutGrid, User, ShoppingCart } from 'lucide-react';

const BRANDS_LIST = [
  {
    id: 'lg',
    name: 'LG',
    logo: (
      <div className="flex items-center justify-center gap-1.5">
        <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0">
          <circle cx="50" cy="50" r="46" fill="#C30F42" />
          <path d="M 50 22 A 28 28 0 1 0 78 50" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
          <path d="M 50 36 L 50 64 L 64 64" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="39" cy="45" r="4.5" fill="#FFFFFF" />
        </svg>
        <span className="font-sans font-bold text-base text-slate-800 tracking-wide">LG</span>
      </div>
    )
  },
  {
    id: 'samsung',
    name: 'SAMSUNG',
    logo: (
      <svg viewBox="0 0 180 40" className="w-24 h-7 flex-shrink-0">
        <text x="0" y="28" fontFamily="'Arial Black', 'Helvetica', sans-serif" fontWeight="900" fontSize="22" fill="#0A54A6" letterSpacing="0.5">SAMSUNG</text>
      </svg>
    )
  },
  {
    id: 'daikin',
    name: 'DAIKIN',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#00A0E9">DAIKIN</text>
      </svg>
    )
  },
  {
    id: 'whirlpool',
    name: 'Whirlpool',
    logo: (
      <div className="relative flex items-center h-7 justify-center">
        <svg viewBox="0 0 150 40" className="w-24 h-7 flex-shrink-0">
          <ellipse cx="68" cy="20" rx="42" ry="12" fill="none" stroke="#F28E2B" strokeWidth="2.2" transform="rotate(-8, 68, 20)" />
          <text x="12" y="26" fontFamily="'Georgia', serif" fontWeight="bold" fontSize="17" fill="#111" letterSpacing="0.2">Whirlpool</text>
        </svg>
      </div>
    )
  },
  {
    id: 'voltas',
    name: 'VOLTAS',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="0" y="28" fontFamily="'Arial Black', 'Impact', sans-serif" fontWeight="900" fontSize="21" fill="#005691" fontStyle="italic" letterSpacing="0.5">VOLTAS</text>
      </svg>
    )
  },
  {
    id: 'blue-star',
    name: 'Blue Star',
    logo: (
      <svg viewBox="0 0 140 40" className="w-24 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#002D62">BLUE STAR</text>
      </svg>
    )
  },
  {
    id: 'hitachi',
    name: 'HITACHI',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Helvetica', sans-serif" fontWeight="bold" fontSize="22" fill="#D32F2F">HITACHI</text>
      </svg>
    )
  },
  {
    id: 'panasonic',
    name: 'Panasonic',
    logo: (
      <svg viewBox="0 0 140 40" className="w-24 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Helvetica Neue', sans-serif" fontWeight="bold" fontSize="22" fill="#004098">Panasonic</text>
      </svg>
    )
  },
  {
    id: 'haier',
    name: 'Haier',
    logo: (
      <svg viewBox="0 0 120 40" className="w-20 h-7 flex-shrink-0">
        <text x="0" y="28" fontFamily="'Century Gothic', 'Futura', sans-serif" fontWeight="bold" fontSize="22" fill="#005AAB" letterSpacing="-0.5">Haier</text>
      </svg>
    )
  },
  {
    id: 'ifb',
    name: 'IFB',
    logo: (
      <div className="flex items-center gap-1 h-7">
        <span className="font-sans font-black text-2xl text-black tracking-tighter">IFB</span>
        <div className="w-3.5 h-1 bg-[#D32F2F] self-end mb-1.5" />
      </div>
    )
  },
  {
    id: 'godrej',
    name: 'Godrej',
    logo: (
      <svg viewBox="0 0 120 40" className="w-20 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Caveat', cursive, sans-serif" fontWeight="bold" fontSize="24" fill="#E31B23">Godrej</text>
      </svg>
    )
  },
  {
    id: 'kent',
    name: 'KENT',
    logo: (
      <svg viewBox="0 0 100 40" className="w-18 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="24" fill="#0077C0">KENT</text>
      </svg>
    )
  },
  {
    id: 'havells',
    name: 'HAVELLS',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#E53935">HAVELLS</text>
      </svg>
    )
  },
  {
    id: 'ao-smith',
    name: 'A.O. Smith',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontWeight="bold" fontSize="20" fill="#1A1A1A">A.O.Smith</text>
      </svg>
    )
  },
  {
    id: 'v-guard',
    name: 'V-GUARD',
    logo: (
      <svg viewBox="0 0 120 40" className="w-22 h-7 flex-shrink-0">
        <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#FFB300" fontStyle="italic">V-GUARD</text>
      </svg>
    )
  }
];

const AllBrands = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = BRANDS_LIST.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-[#E3ECF9] p-6 rounded-b-[30px] shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">All Partner Brands</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search brands (Samsung, LG...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white pl-11 pr-4 py-3 rounded-2xl border border-border-color focus:border-brand-blue focus:outline-none text-sm transition-all shadow-inner"
          />
          <Search className="absolute left-4 top-3.5 h-4.5 w-4.5 text-text-secondary" />
        </div>
      </div>

      {/* Brands Grid */}
      <div className="flex-1 p-6">
        {filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-2">🔍</span>
            <h3 className="font-bold text-text-primary text-sm">No brands found</h3>
            <p className="text-xs text-text-secondary mt-1">Try typing another brand name.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredBrands.map((brand) => (
              <div
                key={brand.id}
                onClick={() => {
                  navigate(`/service-details?service=${encodeURIComponent('AC Repair')}&brand=${encodeURIComponent(brand.name)}`);
                }}
                className="bg-white border border-slate-200/80 hover:border-brand-blue hover:bg-blue-50/10 p-5 rounded-2xl flex flex-col items-center justify-center h-20 cursor-pointer transition-all hover:scale-[1.03] shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
              >
                {brand.logo}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color p-4 flex justify-around items-center z-40 overflow-visible lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-text-secondary hover:text-brand-blue cursor-pointer transition-colors"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Account</span>
        </button>
      </div>
    </div>
  );
};

export default AllBrands;
