import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Star, Heart } from 'lucide-react';

const Wishlist = () => {
  const navigate = useNavigate();

  const wishlistItems = [
    {
      id: 'ref-double-door',
      name: 'Samsung 253L Double Door Refrigerator',
      price: 24999,
      originalPrice: 28999,
      rating: 4.8,
      reviews: 1420,
      image: 'https://images.unsplash.com/photo-1571175452281-014d7e35753e?w=500&auto=format&fit=crop&q=60'
    },
    {
      id: 'ac-split-invertor',
      name: 'LG 1.5 Ton 5 Star Split Inverter AC',
      price: 37999,
      originalPrice: 45999,
      rating: 4.9,
      reviews: 840,
      image: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=500&auto=format&fit=crop&q=60'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-slate-100 relative">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-slate-100 flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">My Wishlist</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto pb-10">
          
          {wishlistItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:border-[#0D47A1] transition-all group relative"
            >
              {/* Image & Favorite Toggle badge */}
              <div className="h-40 bg-slate-50 relative overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                />
                <button className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-rose-500 hover:scale-105 active:scale-95 transition-all">
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                </button>
              </div>

              {/* Specs */}
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <h3 className="font-extrabold text-xs text-text-primary leading-snug line-clamp-2">{item.name}</h3>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold">
                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                      <span>{item.rating}</span>
                    </div>
                    <span className="text-[9px] text-text-secondary">({item.reviews} verified reviews)</span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Price</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="font-black text-sm text-[#0D47A1]">₹{item.price.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-text-secondary line-through">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/buy-product', {
                      state: {
                        productName: item.name,
                        price: item.price,
                        isApplianceBuy: true
                      }
                    })}
                    className="bg-[#FFD600] text-[#0D47A1] font-extrabold px-3 py-2 rounded-xl text-[10px] flex items-center gap-1 hover:bg-yellow-400 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default Wishlist;
