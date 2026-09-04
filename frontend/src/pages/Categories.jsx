import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home as HomeIcon, ShoppingCart, Calendar, User, LayoutGrid, Search, X, Sparkles, ChevronRight } from 'lucide-react';

// Import images for Sidebar
import handymanSidebar from '../assets/categories/plumber_fixed.png';
import applianceSidebar from '../assets/categories/ac.png';
import cleaningSidebar from '../assets/categories/cleaning.png';
import paintingSidebar from '../assets/categories/spa.png';
import moversSidebar from '../assets/categories/security_system.png';

// Import images for Subcategories
import electricianImg from '../assets/categories/electrician_fixed.png';
import plumberImg from '../assets/categories/plumber_fixed.png';
import sofaImg from '../assets/cleaning_sofa.png';
import tileImg from '../assets/cleaning_bathroom_1.png';
import tvImg from '../assets/categories/television.png';
import cleaningKitchen from '../assets/cleaning_kitchen.png';
import cleaningCarpet from '../assets/cleaning_carpet.png';

// 3D premium icon assets
import iconAc from '../assets/icon_3d_ac.png';
import iconGeyser from '../assets/icon_3d_geyser.png';
import iconRo from '../assets/icon_3d_ro.png';
import iconTv from '../assets/icon_3d_tv.png';
import iconChimney from '../assets/icon_3d_chimney.png';
import iconOven from '../assets/icon_3d_oven.png';
import iconFridge from '../assets/icon_3d_fridge.png';
import iconWm from '../assets/icon_3d_wm.png';

const CATEGORY_DATA = {
  handyman: [
    {
      title: 'Maintenance',
      items: [
        { name: 'Electrician', img: electricianImg, route: '/service-details?service=Electrician' },
        { name: 'Carpenter', img: plumberImg, route: '/service-details?service=Carpenter' },
        { name: 'Plumber', img: plumberImg, route: '/service-details?service=Plumber' },
        { name: 'Sofa Repair', img: sofaImg, route: '/service-details?service=Sofa%20Repair' },
        { name: 'Tile Grouting', img: tileImg, route: '/service-details?service=Tile%20Grouting' }
      ]
    },
    {
      title: 'Installation',
      items: [
        { name: 'Furniture Assembly', img: plumberImg, route: '/service-details?service=Furniture%20Assembly' },
        { name: 'TV Installation', img: tvImg, route: '/service-details?service=TV%20Installation' },
        { name: 'Hanger Installation', img: plumberImg, route: '/service-details?service=Hanger%20Installation' },
        { name: 'Mosquito Mesh', img: electricianImg, route: '/service-details?service=Mosquito%20Mesh' },
        { name: 'Safety Net', img: electricianImg, route: '/service-details?service=Safety%20Net' }
      ]
    },
    {
      title: 'AC & Appliance Repair',
      items: [
        { name: 'AC Repair & Services', img: iconAc, route: '/book/AC' },
        { name: 'Geyser Repair & Services', img: iconGeyser, route: '/book/Geyser' },
        { name: 'Water Purifier & Services', img: iconRo, route: '/book/RO%20Water%20Purifier' },
        { name: 'TV Repair & Services', img: iconTv, route: '/book/TV' }
      ]
    },
    {
      title: 'Kitchen and Appliance',
      items: [
        { name: 'Chimney Repair & Services', img: iconChimney, route: '/book/Chimney' },
        { name: 'Gas Stove & Hob Services', img: iconOven, route: '/service-details?service=Gas%20Stove%20%26%20Hob%20Services' },
        { name: 'Microwave Repair & Services', img: iconOven, route: '/book/Microwave' },
        { name: 'Refrigerator Repair & Services', img: iconFridge, route: '/book/Refrigerator' },
        { name: 'Washing Machine Repair', img: iconWm, route: '/book/Washing%20Machine' },
        { name: 'Gas Pipeline Installation', img: iconOven, route: '/service-details?service=Gas%20Pipeline%20Installation' }
      ]
    },
    {
      title: 'Cleaning',
      items: [
        { name: 'Full house cleaning', img: cleaningSidebar, route: '/service-details?service=Full%20house%20cleaning' },
        { name: 'Bathroom cleaning', img: tileImg, route: '/service-details?service=Bathroom%20cleaning' },
        { name: 'Kitchen Cleaning', img: cleaningKitchen, route: '/service-details?service=Kitchen%20Cleaning' }
      ]
    }
  ],
  appliance: [
    {
      title: 'AC & Appliance Repair',
      items: [
        { name: 'AC Repair & Services', img: iconAc, route: '/book/AC' },
        { name: 'Geyser Repair & Services', img: iconGeyser, route: '/book/Geyser' },
        { name: 'Water Purifier & Services', img: iconRo, route: '/book/RO%20Water%20Purifier' },
        { name: 'TV Repair & Services', img: iconTv, route: '/book/TV' }
      ]
    },
    {
      title: 'Kitchen and Appliance',
      items: [
        { name: 'Chimney Repair & Services', img: iconChimney, route: '/book/Chimney' },
        { name: 'Gas Stove & Hob Services', img: iconOven, route: '/service-details?service=Gas%20Stove%20%26%20Hob%20Services' },
        { name: 'Microwave Repair & Services', img: iconOven, route: '/book/Microwave' },
        { name: 'Refrigerator Repair & Services', img: iconFridge, route: '/book/Refrigerator' },
        { name: 'Washing Machine Repair', img: iconWm, route: '/book/Washing%20Machine' },
        { name: 'Gas Pipeline Installation', img: iconOven, route: '/service-details?service=Gas%20Pipeline%20Installation' }
      ]
    }
  ],
  cleaning: [
    {
      title: 'Cleaning',
      items: [
        { name: 'Full house cleaning', img: cleaningSidebar, route: '/service-details?service=Full%20house%20cleaning' },
        { name: 'Bathroom cleaning', img: tileImg, route: '/service-details?service=Bathroom%20cleaning' },
        { name: 'Kitchen Cleaning', img: cleaningKitchen, route: '/service-details?service=Kitchen%20Cleaning' },
        { name: 'Sofa, Carpet & Mattress Cleaning', img: sofaImg, route: '/service-details?service=Sofa%2C%20Carpet%20%26%20Mattress%20Cleaning' },
        { name: 'Water Tank & Sump Cleaning', img: tileImg, route: '/service-details?service=Water%20Tank%20%26%20Sump%20Cleaning' },
        { name: 'Marble Polishing', img: cleaningCarpet, route: '/service-details?service=Marble%20Polishing' }
      ]
    },
    {
      title: 'Pest Control',
      items: [
        { name: 'Pest control', img: cleaningSidebar, route: '/service-details?service=Pest%20control' },
        { name: 'Cockroach Control Treatment', img: cleaningSidebar, route: '/service-details?service=Cockroach%20Control%20Treatment' },
        { name: 'Bed Bug Control Treatment', img: cleaningSidebar, route: '/service-details?service=Bed%20Bug%20Control%20Treatment' },
        { name: 'Rodent Control Treatment', img: cleaningSidebar, route: '/service-details?service=Rodent%20Control%20Treatment' },
        { name: 'Termite Control', img: cleaningSidebar, route: '/service-details?service=Termite%20Control' }
      ]
    },
    {
      title: 'Painting & Water proofing',
      items: [
        { name: 'Wall Painting', img: electricianImg, route: '/service-details?service=Wall%20Painting' },
        { name: 'Waterproofing', img: plumberImg, route: '/service-details?service=Waterproofing' }
      ]
    }
  ],
  painting: [
    {
      title: 'Painting & Water proofing',
      items: [
        { name: 'Wall Painting', img: electricianImg, route: '/service-details?service=Wall%20Painting' },
        { name: 'Waterproofing', img: plumberImg, route: '/service-details?service=Waterproofing' }
      ]
    }
  ],
  movers: [
    {
      title: 'Movers & Storage',
      items: [
        { name: 'Home Shifting', img: moversSidebar, route: '/service-details?service=Home%20Shifting' },
        { name: 'Office Relocation', img: moversSidebar, route: '/service-details?service=Office%20Relocation' }
      ]
    }
  ],
  renovation: [
    {
      title: 'Renovation',
      items: [
        { name: 'Home Renovation', img: moversSidebar, route: '/service-details?service=Home%20Renovation' },
        { name: 'Kitchen Renovation', img: moversSidebar, route: '/service-details?service=Kitchen%20Renovation' },
        { name: 'Bathroom Renovation', img: moversSidebar, route: '/service-details?service=Bathroom%20Renovation' }
      ]
    }
  ]
};

const Categories = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('handyman');
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarCategories = [
    { id: 'handyman', name: 'Handyman Services', shortName: 'Handyman', image: handymanSidebar },
    { id: 'appliance', name: 'Appliance Repair', shortName: 'Appliance', image: applianceSidebar },
    { id: 'cleaning', name: 'Cleaning & Pest Control', shortName: 'Cleaning', image: cleaningSidebar },
    { id: 'painting', name: 'Painting & Waterproofing', shortName: 'Painting', image: paintingSidebar },
    { id: 'movers', name: 'Movers & Storage', shortName: 'Movers', image: moversSidebar },
    { id: 'renovation', name: 'Renovation', shortName: 'Renovation', image: handymanSidebar }
  ];

  // Search filtering logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();
    const resultsMap = new Map();

    Object.entries(CATEGORY_DATA).forEach(([catId, sections]) => {
      sections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.name.toLowerCase().includes(query) || section.title.toLowerCase().includes(query)) {
            if (!resultsMap.has(item.name)) {
              resultsMap.set(item.name, {
                ...item,
                categoryName: section.title
              });
            }
          }
        });
      });
    });

    return Array.from(resultsMap.values());
  }, [searchQuery]);

  const activeCategoryInfo = sidebarCategories.find(c => c.id === activeCategory);
  const activeSections = CATEGORY_DATA[activeCategory] || [];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden pb-16 lg:pb-0 relative font-sans">
      {/* Top Header — mobile only */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 flex-shrink-0 lg:hidden shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-slate-100/90 active:scale-95 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">Categories</h1>
          <span className="text-[10px] font-medium text-slate-400">Explore all home services</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#0D47A1]">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      {/* Main Split Container */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">
        
        {/* Left Sidebar — custom no-scrollbar for smooth scrolling */}
        <div className="w-[82px] sm:w-28 md:w-36 lg:w-44 bg-slate-50/90 border-r border-slate-200/60 flex flex-col py-2 overflow-y-auto no-scrollbar select-none flex-shrink-0 gap-1.5 sm:gap-2">
          {sidebarCategories.map((cat) => {
            const isActive = activeCategory === cat.id && !searchQuery.trim();
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`relative flex flex-col items-center gap-1 py-2 sm:py-2.5 px-1 sm:px-1.5 mx-1 sm:mx-1.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer text-left group ${
                  isActive
                    ? 'bg-white shadow-xs border border-blue-100/80 font-extrabold text-[#0D47A1]'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 border border-transparent'
                }`}
              >
                {/* Active Bar Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-[#0D47A1] to-blue-500 rounded-r-full shadow-2xs" />
                )}

                <div className={`w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center p-1.5 sm:p-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-br from-[#EAF4FF] to-blue-50/90 scale-105 shadow-2xs border border-blue-200/60' 
                    : 'bg-white border border-slate-100 shadow-2xs group-hover:scale-102'
                }`}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-contain drop-shadow-2xs" />
                </div>
                <span className={`text-[10px] sm:text-xs text-center px-0.5 leading-tight w-full font-bold transition-colors ${
                  isActive ? 'text-[#0D47A1]' : 'text-slate-600 group-hover:text-slate-900'
                }`}>
                  {cat.shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel — styled single custom scrollbar */}
        <div className="flex-1 bg-[#F8FAFC] p-3 sm:p-5 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-3.5 sm:gap-6">
          
          {/* Header & Search Bar Banner */}
          <div className="bg-gradient-to-br from-[#0B3C86] via-[#0D47A1] to-indigo-900 text-white p-3.5 sm:p-5 rounded-2xl border border-blue-800/50 shadow-xs flex flex-col gap-2.5 sm:gap-3 lg:from-white lg:via-[#F4F8FF]/60 lg:to-[#EBF3FE]/40 lg:text-slate-900 lg:border-blue-100/70">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-xl font-black text-white lg:text-slate-900 tracking-tight">
                  {searchQuery ? 'Search Services' : activeCategoryInfo?.name}
                </h2>
              </div>
              {!searchQuery && (
                <span className="text-[10px] sm:text-xs font-bold text-blue-900 bg-white lg:text-white lg:bg-[#0D47A1] px-2.5 py-0.5 rounded-full shadow-2xs">
                  {activeSections.reduce((acc, sec) => acc + sec.items.length, 0)} services
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-blue-100 lg:text-slate-500 leading-tight">
              {searchQuery
                ? `Showing results matching "${searchQuery}"`
                : 'Browse verified technicians and instant home services'}
            </p>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72 md:w-80 mt-0.5 sm:mt-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services (e.g. AC, Electrician)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Mode */}
          {searchResults ? (
            <div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(item.route)}
                      className="group bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:border-[#0D47A1]/40 active:scale-[0.97]"
                    >
                      <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-b from-slate-50 to-blue-50/30 group-hover:from-blue-50/60 group-hover:to-indigo-50/40 rounded-xl p-2 flex items-center justify-center transition-all duration-200 border border-slate-100/90 shadow-2xs">
                        <img src={item.img} alt={item.name} className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-2xs" />
                      </div>
                      <div className="mt-2 text-center w-full">
                        <span className="text-[9px] font-extrabold text-[#0D47A1] uppercase tracking-wider block mb-0.5 line-clamp-1">
                          {item.categoryName}
                        </span>
                        <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-[#0D47A1] line-clamp-2 leading-snug transition-colors">
                          {item.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 sm:p-12 text-center border border-slate-200/60 my-2 sm:my-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                    <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">No services found</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Try searching with a different keyword like "AC", "Cleaning", or "Plumber"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3.5 px-3.5 py-1.5 bg-[#0D47A1] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-xs"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Normal Subcategory Sections View */
            <div className="flex flex-col gap-4 sm:gap-5 md:gap-8">
              {activeSections.map((section, secIdx) => (
                <div key={secIdx} className="flex flex-col gap-2 sm:gap-2.5">
                  {/* Section Title Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#0D47A1] ring-4 ring-blue-100" />
                      <h3 className="text-[11px] sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                        {section.title}
                      </h3>
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200/50">
                      {section.items.length} services
                    </span>
                  </div>

                  {/* Cards Grid: 2 columns on mobile for spacious touch targets, 4+ on desktop */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        onClick={() => navigate(item.route)}
                        className="group bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs hover:shadow-md hover:border-[#0D47A1]/40 active:scale-[0.97]"
                      >
                        <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-b from-slate-50 to-blue-50/40 group-hover:from-blue-50/60 group-hover:to-indigo-50/40 rounded-xl p-2 flex items-center justify-center transition-all duration-200 border border-slate-100/90 shadow-2xs">
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-2xs"
                          />
                        </div>
                        <div className="mt-2 w-full flex items-center justify-between gap-1">
                          <span className="text-[11px] sm:text-xs font-bold text-slate-800 group-hover:text-[#0D47A1] text-center w-full px-0.5 line-clamp-2 leading-snug transition-colors">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Menu Bar (Custom Mobile Tabs) — hidden on desktop */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 sm:px-8 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
        </button>

        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center justify-center relative py-1 px-2.5 text-[#0D47A1]"
        >
          <div className="absolute -top-3 w-8 h-1 bg-[#0D47A1] rounded-b-full shadow-2xs" />
          <div className="p-1 rounded-xl bg-blue-50/90 text-[#0D47A1]">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors"
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Bookings</span>
        </button>

        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-slate-500 hover:text-[#0D47A1] transition-colors"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Account</span>
        </button>
      </div>
    </div>
  );
};

export default Categories;

