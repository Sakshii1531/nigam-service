import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Star, Zap, Shield, Sparkles, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { payWithRazorpay } from '../lib/razorpayCheckout';

const plans = [
  {
    id: 'silver',
    name: 'SILVER PLAN',
    price: 499,
    textColor: '#475569',
    badgeText: 'Basic Value',
    accentColor: '#64748B',
    bgGradient: 'from-slate-50 to-slate-200/70',
    borderColor: 'border-slate-300/80',
    glowColor: 'shadow-slate-400/10',
    iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600',
    btnBg: 'bg-slate-900 hover:bg-slate-800 text-white',
    isPopular: false,
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
    textColor: '#B45309',
    badgeText: 'Best Value',
    accentColor: '#D97706',
    bgGradient: 'from-[#FFFDF5] to-[#FFF7E6]',
    borderColor: 'border-amber-400/80',
    glowColor: 'shadow-amber-500/20',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-600',
    btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    isPopular: true,
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
    textColor: '#1D4ED8',
    badgeText: 'Premium Experience',
    accentColor: '#2563EB',
    bgGradient: 'from-blue-50 to-blue-100/60',
    borderColor: 'border-blue-300/80',
    glowColor: 'shadow-blue-500/10',
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    isPopular: false,
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
    textColor: '#701A75',
    badgeText: 'Ultimate Privilege',
    accentColor: '#C026D3',
    bgGradient: 'from-fuchsia-50 to-fuchsia-100/60',
    borderColor: 'border-fuchsia-300/80',
    glowColor: 'shadow-fuchsia-500/10',
    iconBg: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
    btnBg: 'bg-fuchsia-700 hover:bg-fuchsia-800 text-white',
    isPopular: false,
    benefits: [
      'Flat ₹500 OFF on visiting charge',
      '20% OFF on all services',
      'Priority Booking',
      'Free Health Check (2/Year)',
      '1 Year Warranty on Service',
      'Dedicated Support',
      'Exclusive Offers & Invites',
    ],
  },
];

const PlanIcon = ({ id }) => {
  if (id === 'gold') return <Crown className="h-5 w-5 text-white animate-pulse" />;
  if (id === 'diamond') return <Zap className="h-5 w-5 text-white" />;
  if (id === 'platinum') return <Star className="h-5 w-5 text-white fill-white" />;
  return <Shield className="h-5 w-5 text-white" />;
};

const MembershipPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activePlanName, setActivePlanName] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('gold');
  const [isFetchingActive, setIsFetchingActive] = useState(true);
  const [catalogue, setCatalogue] = useState([]);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    apiRequest('/memberships/plans')
      .then((res) => setCatalogue(res || []))
      .catch((err) => setPurchaseError(err.message || 'Could not load membership plans.'));
  }, []);

  // Matches a catalogue row to the styled card by name.
  const planFor = (card) => catalogue.find((c) => c.name.toUpperCase() === card.name.toUpperCase());

  const handlePurchase = async (card) => {
    const plan = planFor(card);
    if (!plan) {
      setPurchaseError('This plan is not currently on sale.');
      return;
    }

    setPurchaseError('');
    setPurchasing(true);
    try {
      const res = await apiRequest('/memberships/purchase', {
        method: 'POST',
        auth: true,
        body: { planId: plan.id, paymentMethod: 'UPI' },
      });
      if (res.razorpay) {
        await payWithRazorpay({
          razorpay: res.razorpay,
          verifyPath: `/memberships/${res.membership.id}/verify-payment`,
          description: plan.name,
        });
      }
      setActivePlanName(plan.name.toUpperCase());
    } catch (err) {
      setPurchaseError(err.message || 'The membership purchase could not be completed.');
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    const fetchActivePlan = async () => {
      try {
        // The real membership record. This used to infer the "current plan"
        // from whether the customer held an active AMC subscription, so an AMC
        // customer was shown as a Gold member they had never bought.
        const res = await apiRequest('/memberships/me', { auth: true });
        setActivePlanName(res?.membership?.name?.toUpperCase() || null);
      } catch (err) {
        console.warn('Error loading active membership:', err);
      } finally {
        setIsFetchingActive(false);
      }
    };
    if (user) {
      fetchActivePlan();
    } else {
      setIsFetchingActive(false);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-6">
      {/* Premium Translucent Header */}
      <div className="bg-white/80 backdrop-blur-md px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100/80">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Nigam Premium Club</h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Elevate your home appliance care experience</p>
        </div>

      {purchaseError && (
        <p className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] font-bold text-red-700">{purchaseError}</p>
      )}
      </div>

      <div className="flex flex-col gap-5 px-4 pt-5">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-blue-900 rounded-[28px] p-6 shadow-xl text-left border border-white/10">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-blue-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-[120px] h-[120px] bg-amber-500/10 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-[10px] uppercase tracking-[3px]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nigam Care Privilege</span>
          </div>
          <h2 className="text-lg font-black text-white mt-1.5 leading-tight">
            Unlock Seamless Priority Home Care
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
            Subscribers receive flat discounts, zero visiting charges, faster response times, and premium warranty extensions.
          </p>
        </div>

        {/* Plan Cards Stack */}
        <div className="flex flex-col gap-4">
          {plans.map((plan) => {
            const isCurrent = activePlanName === plan.name;
            const isSelected = selectedPlanId === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-[24px] border-2 transition-all duration-300 relative overflow-hidden shadow-md bg-gradient-to-b ${plan.bgGradient} ${plan.borderColor} ${plan.glowColor} ${
                  isSelected ? 'scale-[1.01] shadow-lg ring-1 ring-slate-200' : 'opacity-90'
                }`}
              >
                {/* Popularity Badge */}
                {plan.isPopular && (
                  <div
                    className="absolute top-0 right-8 text-[8px] font-black px-3.5 py-1 rounded-b-xl text-white tracking-widest uppercase shadow-sm"
                    style={{ background: plan.accentColor }}
                  >
                    {plan.badgeText}
                  </div>
                )}

                <div className="p-5 flex flex-col gap-4">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 shadow-md ${plan.iconBg}`}
                      >
                        <PlanIcon id={plan.id} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-[13px] font-black tracking-wide" style={{ color: plan.textColor }}>
                          {plan.name}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-extrabold tracking-widest uppercase mt-0.5">
                          Annual Protection
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-[19px] font-black text-slate-900">
                          {planFor(plan) ? `₹${planFor(plan).price.toLocaleString('en-IN')}` : 'Not on sale'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">/Yr</span>
                      </div>
                      <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5">All-inclusive pricing</p>
                    </div>
                  </div>

                  {/* Divider line */}
                  <div className="h-px bg-slate-200/60 w-full" />

                  {/* Benefits grid */}
                  <div className="grid grid-cols-1 gap-2.5 text-left">
                    {plan.benefits.map((benefit, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-4.5 h-4.5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100">
                          <Check className="h-3 w-3 stroke-[3]" style={{ color: plan.accentColor }} />
                        </div>
                        <span className="text-[11.5px] text-slate-700 font-bold leading-tight">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCurrent) return;
                      handlePurchase(plan);
                    }}
                    disabled={isCurrent || isFetchingActive || purchasing || !planFor(plan)}
                    className={`w-full py-3 rounded-xl text-xs font-black transition-all duration-150 cursor-pointer shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider ${
                      isCurrent
                        ? 'bg-emerald-500 text-white border-none cursor-default shadow-none'
                        : `${plan.btnBg}`
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="h-4 w-4 stroke-[3]" />
                        <span>Active Membership</span>
                      </>
                    ) : (
                      <span>Choose {plan.name.split(' ')[0]}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Redesigned Features Grid */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 mt-2 mb-6">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">
            Membership Privileges & Assurances
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: '💰', title: 'Zero Visit Charges', desc: 'Saves ₹200 on every repair trip' },
              { icon: '⚡', title: 'Priority Dispatch', desc: 'Tech arrives within 4 hours' },
              { icon: '🏷️', title: 'Exclusive Discounts', desc: 'Up to 20% off all appliance parts' },
              { icon: '🛠️', title: 'Extended Shield', desc: 'Long-term service warranty' },
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-2xl mb-1.5">{feature.icon}</span>
                <span className="text-[10px] font-black text-slate-800 leading-tight">{feature.title}</span>
                <span className="text-[8px] text-slate-400 font-bold mt-0.5 leading-tight">{feature.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MembershipPlans;
