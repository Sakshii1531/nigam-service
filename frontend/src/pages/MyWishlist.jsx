import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Trash2, Heart, Star, ShoppingCart, 
  Home as HomeIcon, LayoutGrid, Calendar, User 
} from 'lucide-react';
import { motion } from 'framer-motion';

// Import assets to resolve correctly
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';
import geyserImg from '../assets/icon_3d_geyser.png';
import ovenImg from '../assets/icon_3d_oven.png';
import { apiRequest } from '../lib/apiClient';

const MyWishlist = () => {
  const navigate = useNavigate();
  // The wishlist lives on the account, so it's the same on every device.
  const [wishlist, setWishlist] = useState([]);
  const [wishlistError, setWishlistError] = useState('');

  useEffect(() => {
    apiRequest('/wishlist', { auth: true })
      .then((res) => setWishlist(res || []))
      .catch((err) => setWishlistError(err.message || 'Could not load your wishlist.'));
  }, []);

  const getApplianceImg = (category) => {
    const n = category?.toLowerCase() || '';
    if (n.includes('television') || n.includes('tv')) return tvImg;
    if (n.includes('refrigerator') || n.includes('fridge')) return fridgeImg;
    if (n.includes('washing') || n.includes('machine')) return washingImg;
    if (n.includes('ac') || n.includes('conditioner') || n.includes('air')) return splitAcImg;
    if (n.includes('purifier') || n.includes('water')) return waterPurifierImg;
    if (n.includes('geyser')) return geyserImg;
    if (n.includes('microwave') || n.includes('oven')) return ovenImg;
    return tvImg;
  };

  const removeFromWishlist = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await apiRequest(`/wishlist/${id}`, { method: 'DELETE', auth: true });
      setWishlist(res || []);
    } catch (err) {
      setWishlistError(err.message || 'Could not remove that item.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 lg:pb-8 relative">
      {/* Header Bar */}
      <div className="bg-[#0B4EA2] text-white px-6 py-4 flex items-center justify-between border-b border-blue-900 shadow-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-wider">My Wishlist</h1>
            <span className="text-[10px] text-blue-200 block font-medium">WISHLISTED DEVICES</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
        {wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
              <Heart size={30} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Your Wishlist is Empty</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Tap the heart on any product to save it here.</p>
            </div>
            <button 
              onClick={() => navigate('/buy-new')}
              className="bg-[#0D47A1] hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs mt-3 shadow-md transition-colors cursor-pointer"
            >
              Shop New Products
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {wishlist.map((item) => {
              // All three were derived from the price: a star rating from
              // `price % 6`, a struck-through "original price" of 1.5x, and a
              // discount percentage from `price % 18`. That is an invented
              // saving shown against a price that was never charged.
              const rating = item.rating ? Number(item.rating).toFixed(1) : null;
              const originalPrice = item.originalPrice && item.originalPrice > item.price ? item.originalPrice : null;
              const discount = originalPrice
                ? Math.round(((originalPrice - item.price) / originalPrice) * 100)
                : null;

              return (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/buy-new/details/${encodeURIComponent(item.category || 'Water Purifier')}/${encodeURIComponent(item.name)}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-brand-blue/30 shadow-xs hover:shadow-sm transition-all text-left relative"
                >
                  {/* Image */}
                  <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 shrink-0">
                    <img 
                      src={getApplianceImg(item.category)} 
                      alt={item.name} 
                      className="w-full h-full object-contain mix-blend-multiply" 
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-snug truncate pr-6">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.category}</p>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {rating && (
                          <span className="bg-green-600 text-white text-[8px] font-extrabold px-1 py-0.2 rounded flex items-center gap-0.5">
                            {rating} <Star size={7} fill="currentColor" />
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[7px] font-black italic bg-blue-50 text-blue-700 px-1 rounded border border-blue-100">
                          ★ Assured
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-slate-800 font-extrabold text-xs">
                        ₹{item.price.toLocaleString()}
                      </span>
                      {originalPrice && (
                        <>
                          <span className="text-slate-400 line-through text-[10px] font-semibold">
                            ₹{originalPrice.toLocaleString()}
                          </span>
                          <span className="text-[#388E3C] font-extrabold text-[9px]">
                            ↓{discount}%
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => removeFromWishlist(item.id, e)}
                    className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove from Wishlist"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 p-4 flex justify-around items-center z-40 shadow-lg rounded-t-3xl lg:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center text-slate-400 hover:text-[#0B4EA2] cursor-pointer transition-colors"
        >
          <HomeIcon className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => navigate('/categories')}
          className="flex flex-col items-center text-slate-400 hover:text-[#0B4EA2] cursor-pointer transition-colors"
        >
          <LayoutGrid className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Categories</span>
        </button>
        <button 
          onClick={() => navigate('/buy')}
          className="flex flex-col items-center text-slate-400 hover:text-[#0B4EA2] cursor-pointer transition-colors"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Buy</span>
        </button>
        <button 
          onClick={() => navigate('/bookings')}
          className="flex flex-col items-center text-slate-400 hover:text-[#0B4EA2] cursor-pointer transition-colors"
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Bookings</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center text-[#0B4EA2] cursor-pointer transition-colors"
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-semibold mt-0.5">Account</span>
        </button>
      </div>
    </div>
  );
};

export default MyWishlist;
