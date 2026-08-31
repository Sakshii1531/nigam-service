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
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-xs border-b border-slate-200/80 flex-shrink-0 lg:hidden">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center text-slate-700"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-slate-900 flex-1 text-center pr-8">Categories</h1>
      </div>

      {/* Main Split Container */}
      <div className="flex-1 flex overflow-hidden max-w-screen-2xl mx-auto w-full">
        
        {/* Left Sidebar — custom no-scrollbar so it scrolls smoothly without showing a scrollbar track */}
        <div className="w-24 sm:w-28 md:w-36 lg:w-44 bg-slate-100/70 border-r border-slate-200/70 flex flex-col py-3 overflow-y-auto no-scrollbar select-none flex-shrink-0 gap-1.5">
          {sidebarCategories.map((cat) => {
            const isActive = activeCategory === cat.id && !searchQuery.trim();
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`relative flex flex-col items-center gap-1.5 py-3 px-2 mx-1.5 rounded-xl transition-all duration-200 cursor-pointer text-left group ${
                  isActive
                    ? 'bg-white shadow-xs border border-slate-200/80 font-bold text-[#0D47A1]'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 border border-transparent'
                }`}
              >
                {/* Active Bar Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#0D47A1] rounded-r-full shadow-2xs" />
                )}

                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center p-1.5 transition-transform duration-200 ${
                  isActive ? 'bg-[#EAF4FF] scale-105 shadow-2xs' : 'bg-white/80 group-hover:scale-102'
                }`}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                </div>
                <span className={`text-[11px] sm:text-xs text-center px-1 leading-tight w-full font-extrabold transition-colors ${
                  isActive ? 'text-[#0D47A1]' : 'text-slate-600 group-hover:text-slate-900'
                }`}>
                  {cat.shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Content Panel — styled single custom scrollbar */}
        <div className="flex-1 bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Header & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                {searchQuery ? 'Search Services' : activeCategoryInfo?.name}
                {!searchQuery && (
                  <span className="text-xs font-semibold text-[#0D47A1] bg-[#EAF4FF] px-2.5 py-0.5 rounded-full">
                    {activeSections.reduce((acc, sec) => acc + sec.items.length, 0)} services
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery
                  ? `Showing results matching "${searchQuery}"`
                  : 'Browse verified technicians and instant home services'}
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72 md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services (e.g. AC, Electrician)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Mode */}
          {searchResults ? (
            <div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(item.route)}
                      className="group bg-white border border-slate-200/60 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-md hover:border-[#0D47A1]/40 hover:-translate-y-1"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 group-hover:bg-[#EAF4FF]/50 rounded-xl p-2 flex items-center justify-center transition-colors border border-slate-100">
                        <img src={item.img} alt={item.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="mt-3 text-center w-full">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          {item.categoryName}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#0D47A1] line-clamp-2 leading-tight transition-colors">
                          {item.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/60 my-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No services found</h3>
                  <p className="text-xs text-slate-500 mt-1">Try searching with a different keyword like "AC", "Cleaning", or "Plumber"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 bg-[#0D47A1] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-xs"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Normal Subcategory Sections View */
            <div className="flex flex-col gap-6 md:gap-8">
              {activeSections.map((section, secIdx) => (
                <div key={secIdx} className="flex flex-col gap-3">
                  {/* Section Title */}
                  <div className="flex items-center gap-2.5 pb-1 border-b border-slate-200/60">
                    <div className="w-1.5 h-4 bg-[#0D47A1] rounded-full" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                      {section.title}
                    </h3>
                    <span className="ml-auto text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {section.items.length} services
                    </span>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        onClick={() => navigate(item.route)}
                        className="group bg-white border border-slate-200/60 rounded-2xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between cursor-pointer transition-all duration-300 shadow-2xs hover:shadow-md hover:border-[#0D47A1]/40 hover:-translate-y-1"
                      >
                        <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-slate-50/80 group-hover:bg-[#EAF4FF]/50 rounded-xl p-2 flex items-center justify-center transition-colors border border-slate-100/80">
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-700 group-hover:text-[#0D47A1] text-center mt-2 w-full px-0.5 line-clamp-2 leading-snug transition-colors">
                          {item.name}
                        </span>
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
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 px-6 flex justify-between items-center z-50 shadow-md overflow-visible lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-slate-500 hover:text-[#0D47A1]"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-medium">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-[#0D47A1]"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-medium">Categories</span>
        </button>

        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-slate-500 hover:text-[#0D47A1]"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-medium">Buy</span>
        </button>

        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-slate-500 hover:text-[#0D47A1]"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-medium">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-slate-500 hover:text-[#0D47A1]"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Account</span>
        </button>
      </div>
    </div>
  );
};

export default Categories;
