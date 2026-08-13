import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import { ArrowLeft, ShoppingCart, Star, Heart } from 'lucide-react';

const Wishlist = () => {
  const navigate = useNavigate();

  // The customer's real wishlist. This page shipped three invented products
  // (with 1,420 and 840 "reviews" and Unsplash stock photos) that no order
  // could reference — MyWishlist.jsx already reads the real list.
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiRequest('/wishlist', { auth: true })
      .then((res) => { if (!cancelled) setWishlistItems(res.data || []); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Could not load your wishlist.'); });
    return () => { cancelled = true; };
  }, []);


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
                  src={item.imageUrl || item.image} 
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
                  {item.rating ? (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        <span>{item.rating}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Price</span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="font-black text-sm text-[#0D47A1]">₹{item.price.toLocaleString('en-IN')}</span>
                      {item.originalPrice > item.price && (
                        <span className="text-[10px] text-text-secondary line-through">₹{item.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/buy-product', {
                      state: {
                        productId: item.id,
                        productName: item.name,
                        price: item.price,
                        quantity: 1,
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
