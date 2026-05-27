import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Star, Zap, Shield } from 'lucide-react';

const plans = [
  {
    id: 'silver',
    name: 'SILVER PLAN',
    price: 499,
    textColor: '#4A5D6E',
    bgGradient: 'linear-gradient(180deg, #F4F7FB, #E9EFF5)',
    borderColor: '#E2E8F0',
    iconBg: 'linear-gradient(135deg, #94A3B8, #64748B)',
    btnBg: '#F1F5F9',
    btnBorder: '#E2E8F0',
    btnTextColor: '#4A5D6E',
    isPopular: false,
    isCurrent: false,
    benefits: [
      'Flat ₹100 OFF on visiting charge',
      '5% OFF on all services',
      'Priority Booking',
      'Dedicated Support',
    ],
  },
  {
    id: 'gold',
    name: 'GOLD PLAN',
    price: 999,
    textColor: '#D84315',
    bgGradient: 'linear-gradient(180deg, #FFFDF5, #FFF2D6)',
    borderColor: '#FFB74D',
    iconBg: 'linear-gradient(135deg, #FFB74D, #FFA726)',
    btnBg: '#E65100',
    btnBorder: '#E65100',
    btnTextColor: '#FFFFFF',
    isPopular: true,
    isCurrent: true,
    benefits: [
      'Flat ₹200 OFF on visiting charge',
      '10% OFF on all services',
      'Priority Booking',
      'Free Health Check (1/Year)',
      'Dedicated Support',
    ],
  },
  {
    id: 'diamond',
    name: 'DIAMOND PLAN',
    price: 1999,
    textColor: '#1565C0',
    bgGradient: 'linear-gradient(180deg, #F3F9FF, #E1F0FF)',
    borderColor: '#BBDDFB',
    iconBg: 'linear-gradient(135deg, #42A5F5, #1E88E5)',
    btnBg: '#E8F4FF',
    btnBorder: '#90CAF9',
    btnTextColor: '#1565C0',
    isPopular: false,
    isCurrent: false,
    benefits: [
      'Flat ₹300 OFF on visiting charge',
      '15% OFF on all services',
      'Priority Booking',
      'Free Health Check (2/Year)',
      '1 Year Warranty on Service',
      'Dedicated Support',
    ],
  },
  {
    id: 'platinum',
    name: 'PLATINUM PLAN',
    price: 2999,
    textColor: '#6A1B9A',
    bgGradient: 'linear-gradient(180deg, #FDF8FF, #F5E8FF)',
    borderColor: '#EAD4FC',
    iconBg: 'linear-gradient(135deg, #BA68C8, #8E24AA)',
    btnBg: '#F9F1FF',
    btnBorder: '#E1BEE7',
    btnTextColor: '#6A1B9A',
    isPopular: false,
    isCurrent: false,
    benefits: [
      'Flat ₹500 OFF on visiting charge',
      '20% OFF on all services',
      'Priority Booking',
      'Free Health Check (2/Year)',
      '1 Year Warranty on Service',
      'Dedicated Support',
      'Exclusive Offers',
    ],
  },
];

const PlanIcon = ({ id }) => {
  if (id === 'gold') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 17L17 21L15.5 14L21 9.5H14L12 3L10 9.5H3L8.5 14L7 21L12 17Z" fill="white" stroke="#FFD54F" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
  if (id === 'diamond') return <Zap className="h-4 w-4 text-white" />;
  if (id === 'platinum') return <Star className="h-4 w-4 text-white fill-white" />;
  return <Shield className="h-4 w-4 text-white" />;
};

const MembershipPlans = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('gold');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-2">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Membership Plans</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5 pb-2">

        {/* Title */}
        <p className="text-[10px] font-extrabold uppercase tracking-[3px] text-[#1565C0] text-center">MEMBERSHIP PLANS</p>

        {/* Plan Cards - Stacked Vertically (One Plan per Row) */}
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className="rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden shadow-sm"
              style={{
                background: plan.bgGradient,
                borderColor: plan.borderColor,
              }}
            >
              {plan.isPopular && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-black px-3 py-0.5 rounded-b-lg text-white z-10"
                  style={{ background: plan.textColor }}
                >
                  Most Popular
                </div>
              )}

              <div className="p-4 flex flex-col gap-3">
                {/* Icon + Name Row */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: plan.iconBg }}
                  >
                    <PlanIcon id={plan.id} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black leading-tight" style={{ color: plan.textColor }}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="text-base font-black text-slate-900">₹{plan.price.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 font-bold">/Yr</span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div className="flex flex-col gap-1.5">
                  {plan.benefits.slice(0, 4).map((b, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.textColor }} />
                      <span className="text-[11px] text-slate-700 font-semibold leading-tight">{b}</span>
                    </div>
                  ))}
                  {plan.benefits.length > 4 && (
                    <span className="text-[9px] font-bold mt-0.5" style={{ color: plan.textColor }}>
                      +{plan.benefits.length - 4} more benefits
                    </span>
                  )}
                </div>

                {/* Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/payment', {
                      state: {
                        isApplianceBuy: true,
                        productName: plan.name,
                        price: plan.price,
                      }
                    });
                  }}
                  className="w-full mt-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer"
                  style={{
                    background: plan.btnBg,
                    color: plan.btnTextColor,
                    border: `1.5px solid ${plan.btnBorder}`,
                  }}
                >
                  {plan.isCurrent ? 'Current Plan' : 'Choose Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Badges */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 flex justify-between items-center gap-1 mt-1">
          {[
            { icon: '💰', title: 'Lower', sub: 'Visiting Charges' },
            { icon: '⚡', title: 'Faster', sub: 'Service' },
            { icon: '🏷️', title: 'Discount on', sub: 'Services' },
            { icon: '🎁', title: 'Exclusive', sub: 'Offers' },
            { icon: '⭐', title: 'Priority', sub: 'Support' },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-1 text-center flex-1">
              <span className="text-xl">{b.icon}</span>
              <span className="text-[10px] font-black text-slate-800 leading-tight">{b.title}</span>
              <span className="text-[8px] text-slate-500 font-bold leading-tight">{b.sub}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MembershipPlans;
