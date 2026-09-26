import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Heart, Star, CheckCircle2
} from 'lucide-react';
import CustomerBottomNav from '../components/CustomerBottomNav';

// Import assets to resolve correctly
import fridgeImg from '../assets/appliance_fridge.png';
import washingImg from '../assets/categories/wasing.png';
import splitAcImg from '../assets/categories/split_ac.png';
import waterPurifierImg from '../assets/categories/water_purifier.png';
import tvImg from '../assets/categories/television.png';
import geyserImg from '../assets/icon_3d_geyser.png';
import ovenImg from '../assets/icon_3d_oven.png';
import { apiRequest } from '../lib/apiClient';
import { goBack } from '../lib/navigation';
import { LoadingSection, SkeletonList } from '../components/common/Skeleton';

const MyWishlist = () => {
  const navigate = useNavigate();
  // The wishlist lives on the account, so it's the same on every device.
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setWishlistError] = useState('');

  useEffect(() => {
    apiRequest('/wishlist', { auth: true })
      .then((res) => setWishlist(res || []))
      .catch((err) => setWishlistError(err.message || 'Could not load your wishlist.'))
      .finally(() => setLoading(false));
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
            onClick={() => goBack(navigate, '/profile')}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-wider">My Wishlist</h1>
            <span className="text-[10px] text-blue-200 block font-medium">
              {wishlist.length > 0 ? `${wishlist.length} SAVED DEVICE${wishlist.length === 1 ? '' : 'S'}` : 'WISHLISTED DEVICES'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5">
        {loading ? (
          <LoadingSection loading label="wishlist" skeleton={<SkeletonList rows={3} />} />
        ) : wishlist.length === 0 ? (
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
              className="bg-brand-blue hover:bg-blue-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs mt-3 shadow-md transition-colors cursor-pointer"
            >
              Shop New Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {wishlist.map((item) => {
              const rating = item.rating ? Number(item.rating).toFixed(1) : null;
              const originalPrice = item.originalPrice && item.originalPrice > item.price ? item.originalPrice : null;
              const discount = originalPrice
                ? Math.round(((originalPrice - item.price) / originalPrice) * 100)
                : null;
              const inStock = item.stock > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/buy-new/details/${encodeURIComponent(item.category || 'Water Purifier')}/${encodeURIComponent(item.name)}`)}
                  className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden cursor-pointer hover:border-brand-blue/30 shadow-xs hover:shadow-md transition-all text-left flex flex-col"
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-slate-50 flex items-center justify-center p-4">
                    <img
                      src={getApplianceImg(item.category)}
                      alt={item.name}
                      className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Remove button — floating on the image, like a filled
                        heart being un-hearted rather than a generic trash
                        icon buried in the info column. */}
                    <button
                      onClick={(e) => removeFromWishlist(item.id, e)}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-xs hover:bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-xs border border-slate-100 transition-colors cursor-pointer"
                      title="Remove from Wishlist"
                    >
                      <Heart size={14} fill="currentColor" />
                    </button>

                    {Number.isFinite(item.stock) && !inStock && (
                      <span className="absolute bottom-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200/80">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col p-3 gap-1">
                    {item.brand && (
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.brand}</span>
                    )}
                    <h4 className="text-xs font-black text-slate-800 leading-snug line-clamp-2">
                      {item.name}
                    </h4>

                    {/* Rating */}
                    {rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="bg-green-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {rating} <Star size={7} fill="currentColor" />
                        </span>
                      </div>
                    )}

                    <div className="flex items-baseline gap-1.5 flex-wrap mt-auto pt-1.5">
                      <span className="text-slate-900 font-black text-sm">
                        ₹{item.price.toLocaleString()}
                      </span>
                      {originalPrice && (
                        <span className="text-slate-400 line-through text-[10px] font-semibold">
                          ₹{originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {discount && (
                      <span className="text-emerald-700 font-extrabold text-[10px]">
                        ↓{discount}% OFF
                      </span>
                    )}

                    {inStock && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 mt-0.5">
                        <CheckCircle2 size={10} /> In Stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <CustomerBottomNav />
    </div>
  );
};

export default MyWishlist;
