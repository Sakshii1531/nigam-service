import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Home as HomeIcon, ShoppingCart, Calendar, Wrench, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Category brand mapping with high-fidelity inline SVGs
const BRANDS_DATA = {
  electrocare: {
    title: "ElectroCare",
    brands: [
      {
        id: 'lg',
        name: 'LG',
        logo: (
          <div className="flex items-center gap-2 h-7">
            <svg viewBox="0 0 100 100" className="w-7 h-7 flex-shrink-0">
              <circle cx="50" cy="50" r="46" fill="#C30F42" />
              <path d="M 50 22 A 28 28 0 1 0 78 50" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
              <path d="M 50 36 L 50 64 L 64 64" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="39" cy="45" r="4.5" fill="#FFFFFF" />
            </svg>
            <span className="font-sans font-bold text-lg text-slate-800 tracking-wide">LG</span>
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
        id: 'haier',
        name: 'Haier',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-7 flex-shrink-0">
            <text x="0" y="28" fontFamily="'Century Gothic', 'Futura', sans-serif" fontWeight="bold" fontSize="22" fill="#005AAB" letterSpacing="-0.5">Haier</text>
          </svg>
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
        id: 'whirlpool',
        name: 'Whirlpool',
        logo: (
          <div className="relative flex items-center h-7">
            <svg viewBox="0 0 150 40" className="w-24 h-7 flex-shrink-0">
              <ellipse cx="68" cy="20" rx="42" ry="12" fill="none" stroke="#F28E2B" strokeWidth="2.2" transform="rotate(-8, 68, 20)" />
              <text x="12" y="26" fontFamily="'Georgia', serif" fontWeight="bold" fontSize="17" fill="#111" letterSpacing="0.2">Whirlpool</text>
            </svg>
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
        ),
        isExtra: true
      },
      {
        id: 'panasonic',
        name: 'Panasonic',
        logo: (
          <svg viewBox="0 0 140 40" className="w-24 h-7 flex-shrink-0">
            <text x="5" y="28" fontFamily="'Helvetica Neue', sans-serif" fontWeight="bold" fontSize="22" fill="#004098">Panasonic</text>
          </svg>
        ),
        isExtra: true
      }
    ]
  },
  bathcare: {
    title: "BathCare",
    brands: [
      {
        id: 'jaquar',
        name: 'Jaquar',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontWeight="bold" fontSize="24" fill="#000000">jaquar</text>
          </svg>
        )
      },
      {
        id: 'hindware',
        name: 'Hindware',
        logo: (
          <svg viewBox="0 0 120 40" className="w-22 h-6">
            <text x="5" y="28" fontFamily="'Arial', sans-serif" fontWeight="900" fontSize="20" fill="#D2232A" letterSpacing="0.5">hindware</text>
          </svg>
        )
      },
      {
        id: 'cera',
        name: 'Cera',
        logo: (
          <svg viewBox="0 0 100 40" className="w-16 h-6">
            <text x="5" y="28" fontFamily="'Futura', sans-serif" fontWeight="bold" fontSize="22" fill="#0D47A1">CERA</text>
          </svg>
        )
      },
      {
        id: 'kohler',
        name: 'Kohler',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Courier New', monospace" fontWeight="900" fontSize="22" fill="#111">KOHLER</text>
          </svg>
        )
      },
      {
        id: 'parryware',
        name: 'Parryware',
        logo: (
          <svg viewBox="0 0 120 40" className="w-22 h-6">
            <text x="5" y="28" fontFamily="'Verdana', sans-serif" fontWeight="bold" fontSize="18" fill="#1B5E20">Parryware</text>
          </svg>
        )
      },
      {
        id: 'somany',
        name: 'Somany',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Times New Roman', serif" fontWeight="bold" fontSize="22" fill="#B71C1C">SOMANY</text>
          </svg>
        )
      }
    ]
  },
  'it-cpcare': {
    title: "IT & CPCare",
    brands: [
      {
        id: 'hp',
        name: 'HP',
        logo: (
          <svg viewBox="0 0 100 100" className="w-10 h-10">
            <circle cx="50" cy="50" r="45" fill="#0096D6" />
            <text x="24" y="68" fontFamily="'Arial Black', sans-serif" fontWeight="bold" fontSize="50" fill="#FFFFFF" fontStyle="italic">hp</text>
          </svg>
        )
      },
      {
        id: 'dell',
        name: 'Dell',
        logo: (
          <svg viewBox="0 0 100 100" className="w-10 h-10">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#007DB8" strokeWidth="6" />
            <text x="20" y="62" fontFamily="'Helvetica', sans-serif" fontWeight="bold" fontSize="32" fill="#007DB8">DELL</text>
          </svg>
        )
      },
      {
        id: 'lenovo',
        name: 'Lenovo',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <rect width="120" height="40" rx="4" fill="#E21A22" />
            <text x="12" y="27" fontFamily="'Inter', sans-serif" fontWeight="bold" fontSize="20" fill="#FFFFFF">lenovo</text>
          </svg>
        )
      },
      {
        id: 'asus',
        name: 'ASUS',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#00539B" fontStyle="italic">ASUS</text>
          </svg>
        )
      },
      {
        id: 'acer',
        name: 'Acer',
        logo: (
          <svg viewBox="0 0 100 40" className="w-16 h-6">
            <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontWeight="bold" fontSize="24" fill="#83B81A">acer</text>
          </svg>
        )
      },
      {
        id: 'apple',
        name: 'Apple',
        logo: (
          <svg viewBox="0 0 100 100" className="w-8 h-8">
            <path d="M 45 15 C 38 15 30 20 30 32 C 30 48 45 68 55 68 C 60 68 62 65 68 65 C 74 65 76 68 82 68 C 92 68 98 52 98 51 C 98 51 84 46 84 32 C 84 20 95 15 95 15 C 90 10 80 10 77 10 C 70 10 65 13 60 13 C 55 13 50 15 45 15 Z" fill="#1A1A1A" />
            <path d="M 68 8 C 72 4 78 1 82 2 C 83 6 81 12 77 16 C 73 20 67 22 63 21 C 62 17 64 12 68 8 Z" fill="#1A1A1A" />
          </svg>
        )
      }
    ]
  },
  kitchencare: {
    title: "KitchenCare",
    brands: [
      {
        id: 'faber',
        name: 'Faber',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="24" fill="#C62828">FABER</text>
          </svg>
        )
      },
      {
        id: 'glen',
        name: 'Glen',
        logo: (
          <svg viewBox="0 0 100 40" className="w-16 h-6">
            <text x="5" y="28" fontFamily="'Arial', sans-serif" fontWeight="bold" fontSize="24" fill="#1565C0">GLEN</text>
          </svg>
        )
      },
      {
        id: 'elica',
        name: 'Elica',
        logo: (
          <svg viewBox="0 0 100 40" className="w-18 h-6">
            <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontStyle="italic" fontWeight="bold" fontSize="24" fill="#2E7D32">elica</text>
          </svg>
        )
      },
      {
        id: 'prestige',
        name: 'Prestige',
        logo: (
          <svg viewBox="0 0 120 40" className="w-22 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#D32F2F" letterSpacing="0.5">Prestige</text>
          </svg>
        )
      },
      {
        id: 'butterfly',
        name: 'Butterfly',
        logo: (
          <svg viewBox="0 0 120 40" className="w-22 h-6">
            <text x="5" y="28" fontFamily="'Georgia', serif" fontWeight="bold" fontSize="20" fill="#EF6C00">Butterfly</text>
          </svg>
        )
      },
      {
        id: 'pigeon',
        name: 'Pigeon',
        logo: (
          <svg viewBox="0 0 100 40" className="w-18 h-6">
            <text x="5" y="28" fontFamily="'Inter', sans-serif" fontWeight="bold" fontSize="22" fill="#37474F">Pigeon</text>
          </svg>
        )
      }
    ]
  },
  aircare: {
    title: "AirCare",
    brands: [
      {
        id: 'daikin',
        name: 'Daikin',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#00A0E9">DAIKIN</text>
          </svg>
        )
      },
      {
        id: 'blue-star',
        name: 'Blue Star',
        logo: (
          <svg viewBox="0 0 140 40" className="w-24 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#002D62">BLUE STAR</text>
          </svg>
        )
      },
      {
        id: 'voltas',
        name: 'VOLTAS',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Impact', sans-serif" fontStyle="italic" fontWeight="900" fontSize="24" fill="#005691" letterSpacing="1">VOLTAS</text>
          </svg>
        )
      },
      {
        id: 'lloyd',
        name: 'Lloyd',
        logo: (
          <svg viewBox="0 0 100 40" className="w-18 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#E53935">LLOYD</text>
          </svg>
        )
      },
      {
        id: 'hitachi',
        name: 'Hitachi',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Helvetica', sans-serif" fontWeight="bold" fontSize="22" fill="#D32F2F">HITACHI</text>
          </svg>
        )
      },
      {
        id: 'honeywell',
        name: 'Honeywell',
        logo: (
          <svg viewBox="0 0 140 40" className="w-24 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#DE1E3D">Honeywell</text>
          </svg>
        )
      }
    ]
  },
  watercare: {
    title: "WaterCare",
    brands: [
      {
        id: 'kent',
        name: 'Kent',
        logo: (
          <svg viewBox="0 0 100 40" className="w-16 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="24" fill="#0077C0">KENT</text>
          </svg>
        )
      },
      {
        id: 'aquaguard',
        name: 'Aquaguard',
        logo: (
          <svg viewBox="0 0 140 40" className="w-24 h-6">
            <text x="5" y="28" fontFamily="'Arial', sans-serif" fontWeight="900" fontSize="18" fill="#1565C0" letterSpacing="0.5">Aquaguard</text>
          </svg>
        )
      },
      {
        id: 'pureit',
        name: 'Pureit',
        logo: (
          <svg viewBox="0 0 100 40" className="w-18 h-6">
            <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontWeight="bold" fontSize="22" fill="#0288D1">pureit</text>
          </svg>
        )
      },
      {
        id: 'havells',
        name: 'Havells',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#E53935">HAVELLS</text>
          </svg>
        )
      },
      {
        id: 'ao-smith',
        name: 'AO Smith',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Trebuchet MS', sans-serif" fontWeight="bold" fontSize="20" fill="#1A1A1A">A.O.Smith</text>
          </svg>
        )
      },
      {
        id: 'v-guard',
        name: 'V-Guard',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#FFB300" fontStyle="italic">V-GUARD</text>
          </svg>
        )
      }
    ]
  },
  securecare: {
    title: "SecureCare",
    brands: [
      {
        id: 'godrej',
        name: 'Godrej',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Caveat', cursive, sans-serif" fontWeight="bold" fontSize="24" fill="#E31B23">Godrej</text>
          </svg>
        )
      },
      {
        id: 'yale',
        name: 'Yale',
        logo: (
          <svg viewBox="0 0 80 40" className="w-14 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="24" fill="#FFC72C">Yale</text>
          </svg>
        )
      },
      {
        id: 'cp-plus',
        name: 'CP Plus',
        logo: (
          <svg viewBox="0 0 120 40" className="w-20 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="22" fill="#0D47A1">CP PLUS</text>
          </svg>
        )
      },
      {
        id: 'hikvision',
        name: 'Hikvision',
        logo: (
          <svg viewBox="0 0 140 40" className="w-24 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#D32F2F">HIKVISION</text>
          </svg>
        )
      },
      {
        id: 'qubo',
        name: 'Qubo',
        logo: (
          <svg viewBox="0 0 100 40" className="w-16 h-6">
            <text x="5" y="28" fontFamily="'Arial', sans-serif" fontWeight="900" fontSize="24" fill="#FF5722">qubo</text>
          </svg>
        )
      },
      {
        id: 'solity',
        name: 'Solity',
        logo: (
          <svg viewBox="0 0 100 40" className="w-18 h-6">
            <text x="5" y="28" fontFamily="'Arial Black', sans-serif" fontWeight="900" fontSize="20" fill="#263238">SOLITY</text>
          </svg>
        )
      }
    ]
  }
};

const SelectBrand = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Fallback if category key is not found
  const categoryData = BRANDS_DATA[category] || {
    title: category ? category.charAt(0).toUpperCase() + category.slice(1) : "Category",
    brands: []
  };

  const mainBrands = categoryData.brands.filter(b => !b.isExtra);
  const extraBrands = categoryData.brands.filter(b => b.isExtra);

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 px-6 py-4 flex items-center justify-between border-b border-slate-100 shadow-sm z-30 rounded-b-3xl">
        <button 
          onClick={() => navigate('/partner-warranty')}
          className="p-2 bg-slate-50 hover:bg-slate-100 hover:scale-105 active:scale-95 rounded-2xl transition-all duration-200 flex items-center justify-center cursor-pointer border border-slate-100"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        
        <h1 className="text-lg font-extrabold text-brand-navy text-center flex-1 pr-9 tracking-widest">
          {categoryData.title}
        </h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        
        {/* Title */}
        <h2 className="text-lg font-black text-black tracking-wide pl-1">
          Select Brand
        </h2>

        {/* Brand List container */}
        <div className="flex flex-col gap-3">
          {mainBrands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => navigate(`/partner-warranty/products/${category}/${brand.id}`)}
              className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="flex items-center justify-start h-8 w-32 flex-shrink-0">
                {brand.logo}
              </div>
              <ChevronRight className="h-5 w-5 text-text-secondary" />
            </button>
          ))}

          {/* Extra Brands Accordion */}
          {extraBrands.length > 0 && (
            <AnimatePresence initial={false}>
              {showAllBrands && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-3"
                >
                  {extraBrands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => navigate(`/partner-warranty/products/${category}/${brand.id}`)}
                      className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
                    >
                      <div className="flex items-center justify-start h-8 w-32 flex-shrink-0">
                        {brand.logo}
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-secondary" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* View More Brands Trigger */}
          {extraBrands.length > 0 && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="flex items-center justify-center gap-2 py-4 text-sm font-bold text-brand-navy cursor-pointer w-full text-center rounded-2xl border border-slate-200/60 bg-white"
            >
              <span className="tracking-wide">{showAllBrands ? "View Less Brands" : "View More Brands"}</span>
              <motion.div
                animate={{ rotate: showAllBrands ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default SelectBrand;
