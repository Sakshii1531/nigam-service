import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Sparkles, Gift, Ticket, Award, Coins, Settings, Plus, Trash2, Edit2, 
  Check, Save, Percent, RefreshCw, Star, Info, TrendingUp, Users, ArrowRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const LoyaltyProgram = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'rewards';

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 1. REWARDS STATE
  const [coinRate, setCoinRate] = useState(1); // 1 coin = ₹1 spent
  const [milestones, setMilestones] = useState([
    { id: 1, title: 'Free Home Inspection', threshold: 200, status: 'Active', benefit: 'Free checkup on AC or Fridge' },
    { id: 2, title: 'Priority Support Access', threshold: 300, status: 'Active', benefit: 'Bypass support queues' },
    { id: 3, title: '10% Extra Appliance Discounts', threshold: 500, status: 'Active', benefit: 'Extra 10% off new store purchases' }
  ]);
  const [newMilestone, setNewMilestone] = useState({ title: '', threshold: '', benefit: '' });
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.threshold) return;
    setMilestones([...milestones, {
      id: Date.now(),
      title: newMilestone.title,
      threshold: parseInt(newMilestone.threshold, 10),
      status: 'Active',
      benefit: newMilestone.benefit || 'Custom reward perk'
    }]);
    setNewMilestone({ title: '', threshold: '', benefit: '' });
    showToast('New milestone reward added successfully!');
  };

  const handleDeleteMilestone = (id) => {
    setMilestones(milestones.filter(m => m.id !== id));
    showToast('Milestone reward removed.');
  };

  // 2. MEMBERSHIP PLANS STATE
  const [membershipPlans, setMembershipPlans] = useState([
    { id: 'silver', name: 'Silver Plan', price: 499, benefits: ['Flat ₹100 OFF on visiting charge', '5% OFF on all services', 'Priority Booking', 'Dedicated Support'] },
    { id: 'gold', name: 'Gold Plan', price: 999, benefits: ['Flat ₹200 OFF on visiting charge', '10% OFF on all services', 'Priority Booking', 'Free Health Check (1/Year)', 'Dedicated Support'] },
    { id: 'diamond', name: 'Diamond Plan', price: 1999, benefits: ['Flat ₹300 OFF on visiting charge', '15% OFF on all services', 'Priority Booking', 'Free Health Check (2/Year)', '1 Year Warranty on Service', 'Dedicated Support'] },
    { id: 'platinum', name: 'Platinum Plan', price: 2999, benefits: ['Flat ₹500 OFF on visiting charge', '20% OFF on all services', 'Priority Booking', 'Free Health Check (2/Year)', '1 Year Warranty on Service', 'Dedicated Support', 'Exclusive Offers'] }
  ]);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editPrice, setEditPrice] = useState(0);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', benefits: '' });
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);

  const handleSavePlanPrice = (id) => {
    setMembershipPlans(membershipPlans.map(p => p.id === id ? { ...p, price: parseInt(editPrice, 10) } : p));
    setEditingPlanId(null);
    showToast(`Updated price for ${id.toUpperCase()} plan.`);
  };

  const handleCreatePlan = (e) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.price) return;
    const benefitsList = newPlan.benefits
      ? newPlan.benefits.split(',').map(b => b.trim()).filter(Boolean)
      : ['Priority Customer Support'];
    
    const id = newPlan.name.toLowerCase().replace(/\s+/g, '-');
    setMembershipPlans([...membershipPlans, {
      id: id,
      name: newPlan.name,
      price: parseInt(newPlan.price, 10),
      benefits: benefitsList
    }]);
    setNewPlan({ name: '', price: '', benefits: '' });
    showToast(`New membership plan '${newPlan.name}' created!`);
  };

  const handleDeletePlan = (id) => {
    setMembershipPlans(membershipPlans.filter(p => p.id !== id));
    showToast('Membership plan deleted.');
  };

  // 3. SPIN WHEEL STATE
  const [wheelSegments, setWheelSegments] = useState([
    { id: 1, label: '₹50 Cashback', prob: 10 },
    { id: 2, label: '50 SuperCoins', prob: 20 },
    { id: 3, label: '₹25 Cashback', prob: 15 },
    { id: 4, label: '100 SuperCoins', prob: 5 },
    { id: 5, label: 'Try Again', prob: 20 },
    { id: 6, label: '₹100 Cashback', prob: 2 },
    { id: 7, label: '25 SuperCoins', prob: 18 },
    { id: 8, label: 'Extra Spin', prob: 10 }
  ]);
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const [editSegmentLabel, setEditSegmentLabel] = useState('');
  const [editSegmentProb, setEditSegmentProb] = useState(0);
  const [newSegment, setNewSegment] = useState({ label: '', prob: '' });
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);

  const handleSaveSegment = (id) => {
    setWheelSegments(wheelSegments.map(s => s.id === id ? { ...s, label: editSegmentLabel, prob: parseInt(editSegmentProb, 10) } : s));
    setEditingSegmentId(null);
    showToast('Spin wheel segment updated successfully.');
  };

  const handleAddSegment = (e) => {
    e.preventDefault();
    if (!newSegment.label || !newSegment.prob) return;
    const probVal = parseInt(newSegment.prob, 10);
    const currentTotalProb = wheelSegments.reduce((acc, curr) => acc + curr.prob, 0);
    if (currentTotalProb + probVal > 100) {
      showToast(`Error: Total probability would exceed 100% (currently ${currentTotalProb}%).`);
      return;
    }
    setWheelSegments([...wheelSegments, {
      id: Date.now(),
      label: newSegment.label,
      prob: probVal
    }]);
    setNewSegment({ label: '', prob: '' });
    showToast('New segment added to spin wheel.');
  };

  const handleDeleteSegment = (id) => {
    setWheelSegments(wheelSegments.filter(s => s.id !== id));
    showToast('Segment removed.');
  };

  // 4. REFERRALS STATE
  const [referralBonus, setReferralBonus] = useState(100); // 100 coins
  const [refereeDiscount, setRefereeDiscount] = useState(10); // 10%
  const [referralStats] = useState({
    totalShared: 1450,
    successfulConversions: 840,
    totalCoinsPaid: 84000
  });
  const [referralCampaigns, setReferralCampaigns] = useState([
    { id: 1, name: 'Standard Welcome Refer', bonus: 100, discount: 10, status: 'Active' },
    { id: 2, name: 'AC Season Special Refer', bonus: 200, discount: 15, status: 'Inactive' }
  ]);
  const [newCampaign, setNewCampaign] = useState({ name: '', bonus: '', discount: '' });
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);

  const handleSaveReferralConfig = (e) => {
    e.preventDefault();
    showToast('Referral program settings updated.');
  };

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.bonus || !newCampaign.discount) return;
    setReferralCampaigns([...referralCampaigns, {
      id: Date.now(),
      name: newCampaign.name,
      bonus: parseInt(newCampaign.bonus, 10),
      discount: parseInt(newCampaign.discount, 10),
      status: 'Active'
    }]);
    setNewCampaign({ name: '', bonus: '', discount: '' });
    showToast(`New campaign '${newCampaign.name}' created!`);
  };

  const handleDeleteCampaign = (id) => {
    setReferralCampaigns(referralCampaigns.filter(c => c.id !== id));
    showToast('Referral campaign deleted.');
  };

  // 5. COUPONS STATE
  const [coupons, setCoupons] = useState([
    { code: 'NIGAMGOLD50', discount: '₹1,500 OFF', desc: 'Applicable on Split AC & Refrigerator', expiry: '2026-07-20', status: 'Active' },
    { code: 'CARE20', discount: '20% OFF', desc: 'Applicable on AC cleaning and checkups', expiry: '2026-07-25', status: 'Active' },
    { code: 'WARRANTYPLUS', discount: '₹500 OFF', desc: 'Applicable on 1-Year Extended Warranty', expiry: '2026-08-15', status: 'Active' }
  ]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', desc: '', expiry: '' });
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);

  const handleAddCoupon = (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;
    setCoupons([...coupons, {
      code: newCoupon.code.toUpperCase(),
      discount: newCoupon.discount,
      desc: newCoupon.desc || 'Discount Promo Code',
      expiry: newCoupon.expiry || '2026-12-31',
      status: 'Active'
    }]);
    setNewCoupon({ code: '', discount: '', desc: '', expiry: '' });
    showToast('New discount coupon created!');
  };

  const handleDeleteCoupon = (code) => {
    setCoupons(coupons.filter(c => c.code !== code));
    showToast('Coupon deleted.');
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Rewards, Coupons & Referrals Management" />

        {/* Inner Content */}
        <div className="p-6 flex-1 flex flex-col gap-6 max-w-5xl">
          {/* Toast message */}
          {toastMessage && (
            <div className="fixed top-20 right-8 bg-[#0D47A1] text-white font-bold py-3 px-6 rounded-xl shadow-2xl z-50 animate-bounce flex items-center gap-2 text-xs">
              <Check className="h-4.5 w-4.5" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Tab Content Box */}
          <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm min-h-[400px]">
            
            {/* SUBSECTION 1: SUPERCOINS & MILESTONES */}
            {activeTab === 'rewards' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">SuperCoins & Rewards Milestones</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Set coin emission multiplier and manage reward thresholds.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddMilestoneModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Milestone</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-slate-150 p-4.5 rounded-xl text-left bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Conversion Rate</span>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span className="text-base font-extrabold text-[#0D47A1]">₹100 Spent =</span>
                      <input 
                        type="number"
                        value={coinRate}
                        onChange={(e) => setCoinRate(e.target.value)}
                        className="w-14 bg-white border border-slate-200 rounded-lg p-1.5 text-center text-sm font-bold text-slate-800 focus:outline-none focus:border-brand-blue"
                      />
                      <span className="text-xs font-bold text-slate-500">Coins</span>
                    </div>
                  </div>

                  <div className="border border-slate-150 p-4.5 rounded-xl text-left bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Coins Distributed</span>
                      <span className="text-lg font-black text-slate-800 block mt-1">2,48,500 Coins</span>
                    </div>
                  </div>

                  <div className="border border-slate-150 p-4.5 rounded-xl text-left bg-slate-50/50 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Coins Redeemed Value</span>
                      <span className="text-lg font-black text-slate-800 block mt-1">₹48,900</span>
                    </div>
                  </div>
                </div>

                {/* Milestones List */}
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Milestone Rewards</h4>
                    <span className="text-[10px] font-bold text-slate-400">Add milestones that unlock rewards automatically</span>
                  </div>

                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Milestone Title</th>
                          <th className="p-3">Coins Required</th>
                          <th className="p-3">Reward / Benefit</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {milestones.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                            <td className="p-3 font-bold text-slate-800">{m.title}</td>
                            <td className="p-3">⚡ {m.threshold}</td>
                            <td className="p-3 text-slate-500">{m.benefit}</td>
                            <td className="p-3"><span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] border border-green-200">Active</span></td>
                            <td className="p-3 text-center">
                              <button 
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create Milestone Modal */}
                {showAddMilestoneModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create New Milestone Reward</span>
                        <button 
                          onClick={() => setShowAddMilestoneModal(false)}
                          className="text-slate-400 hover:text-slate-650 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddMilestone(e);
                        setShowAddMilestoneModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Milestone Title</label>
                            <input 
                              type="text"
                              placeholder="e.g. Bronze Elite Reward"
                              value={newMilestone.title}
                              onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Threshold (Coins)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 150"
                              value={newMilestone.threshold}
                              onChange={(e) => setNewMilestone({ ...newMilestone, threshold: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Benefit Detail</label>
                          <input 
                            type="text"
                            placeholder="e.g. Flat ₹150 off on next booking"
                            value={newMilestone.benefit}
                            onChange={(e) => setNewMilestone({ ...newMilestone, benefit: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                          />
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddMilestoneModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Reward</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SUBSECTION 2: MEMBERSHIP PLANS */}
            {activeTab === 'membership' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Membership Pricing & Perks</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure pricing tiers and subscription options for Club Memberships.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddPlanModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Plan</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-5 mt-2">
                  {membershipPlans.map((plan) => {
                    const tierStyles = {
                      silver: { bg: 'from-slate-50 to-slate-100/60', border: 'border-slate-200', text: 'text-slate-700', iconBg: 'bg-slate-200 text-slate-600' },
                      gold: { bg: 'from-amber-50/50 to-amber-100/30', border: 'border-amber-250', text: 'text-amber-700', iconBg: 'bg-amber-100 text-amber-600' },
                      diamond: { bg: 'from-blue-50/40 to-blue-100/20', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100 text-blue-600' },
                      platinum: { bg: 'from-purple-50/40 to-purple-100/20', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100 text-purple-600' },
                    };
                    const style = tierStyles[plan.id] || { bg: 'from-emerald-50/30 to-emerald-100/20', border: 'border-emerald-250', text: 'text-emerald-700', iconBg: 'bg-emerald-100 text-emerald-600' };

                    return (
                      <div key={plan.id} className={`bg-gradient-to-b ${style.bg} border ${style.border} rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between relative group`}>
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 ${style.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 shadow-3xs`}>
                                <Star className="h-4 w-4 fill-current" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 tracking-wider uppercase">{plan.name}</h4>
                                <span className="text-[9px] font-bold text-slate-400">ANNUAL SUBSCRIPTION</span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => handleDeletePlan(plan.id)}
                              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Delete Plan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3.5 bg-white/70 border border-slate-100 rounded-xl p-2.5 flex justify-between items-center shadow-3xs">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Plan Price</span>
                            
                            {editingPlanId === plan.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-800">₹</span>
                                <input 
                                  type="number"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-16 border border-slate-350 p-1 rounded font-bold text-xs"
                                />
                                <button onClick={() => handleSavePlanPrice(plan.id)} className="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer">
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900">₹{plan.price.toLocaleString()} <span className="text-[10px] text-slate-400 font-semibold">/Yr</span></span>
                                <button 
                                  onClick={() => {
                                    setEditingPlanId(plan.id);
                                    setEditPrice(plan.price);
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 mt-3.5">
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Plan Benefits</span>
                            <div className="flex flex-col gap-1 mt-1">
                              {plan.benefits.map((b, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-[11px] font-semibold text-slate-655">
                                  <Check className={`h-3 w-3 mt-0.5 flex-shrink-0 ${style.text}`} />
                                  <span className="leading-tight">{b}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create Membership Plan Modal */}
                {showAddPlanModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create New Membership Plan</span>
                        <button 
                          onClick={() => setShowAddPlanModal(false)}
                          className="text-slate-400 hover:text-slate-650 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleCreatePlan(e);
                        setShowAddPlanModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Plan Name</label>
                            <input 
                              type="text"
                              placeholder="e.g. Bronze Plan"
                              value={newPlan.name}
                              onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Annual Price (₹)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 799"
                              value={newPlan.price}
                              onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Benefits (Comma-separated list)</label>
                          <input 
                            type="text"
                            placeholder="e.g. Flat ₹150 off on visiting charge, 8% off on all services, Priority Booking"
                            value={newPlan.benefits}
                            onChange={(e) => setNewPlan({ ...newPlan, benefits: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                          />
                          <span className="text-[9px] text-slate-400 font-medium">Enter plan benefits separated by commas.</span>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddPlanModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Create Plan</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBSECTION 3: SPIN WHEEL CONFIG */}
            {activeTab === 'spinwheel' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Spin Wheel Segment configuration</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure rewards labels and winning probabilities of the segments.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddSegmentModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Segment</span>
                  </button>
                </div>

                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs mt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3 text-center">Segment</th>
                        <th className="p-3">Reward Label</th>
                        <th className="p-3">Winning Probability (%)</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {wheelSegments.map((seg, idx) => (
                        <tr key={seg.id} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                          <td className="p-3 text-center font-bold text-slate-800">#{idx + 1}</td>
                          <td className="p-3">
                            {editingSegmentId === seg.id ? (
                              <input 
                                type="text"
                                value={editSegmentLabel}
                                onChange={(e) => setEditSegmentLabel(e.target.value)}
                                className="border border-slate-350 p-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">{seg.label}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {editingSegmentId === seg.id ? (
                              <input 
                                type="number"
                                value={editSegmentProb}
                                onChange={(e) => setEditSegmentProb(e.target.value)}
                                className="w-16 border border-slate-350 p-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                              />
                            ) : (
                              <span>{seg.prob}%</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {editingSegmentId === seg.id ? (
                              <div className="flex justify-center gap-1">
                                <button 
                                  onClick={() => handleSaveSegment(seg.id)}
                                  className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 cursor-pointer"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingSegmentId(null)}
                                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingSegmentId(seg.id);
                                    setEditSegmentLabel(seg.label);
                                    setEditSegmentProb(seg.prob);
                                  }}
                                  className="p-1.5 text-[#0D47A1] hover:bg-blue-50 rounded-lg cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteSegment(seg.id)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-left flex gap-3.5 items-center">
                  <Info className="h-5 w-5 text-[#0D47A1] flex-shrink-0" />
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    * Make sure the total winning probabilities of all segments sum up to exactly **100%** to guarantee accurate wheel distribution (Current Total: {wheelSegments.reduce((acc, curr) => acc + curr.prob, 0)}%).
                  </p>
                </div>

                {/* Create Segment Modal */}
                {showAddSegmentModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Add Spin Wheel Segment</span>
                        <button 
                          onClick={() => setShowAddSegmentModal(false)}
                          className="text-slate-400 hover:text-slate-650 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddSegment(e);
                        setShowAddSegmentModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Reward Label</label>
                            <input 
                              type="text"
                              placeholder="e.g. ₹500 Cashback"
                              value={newSegment.label}
                              onChange={(e) => setNewSegment({ ...newSegment, label: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Winning Probability (%)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 10"
                              value={newSegment.prob}
                              onChange={(e) => setNewSegment({ ...newSegment, prob: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddSegmentModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Segment</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SUBSECTION 4: REFERRAL PROGRAM */}
            {activeTab === 'referrals' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Refer & Earn Program Configuration</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure conversion bonus and referrer benefits.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddCampaignModal(true)}
                    type="button"
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Campaign</span>
                  </button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-slate-150 p-4.5 rounded-xl bg-slate-50/50 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Referral Links Shared</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{referralStats.totalShared} Times</span>
                  </div>
                  <div className="border border-slate-150 p-4.5 rounded-xl bg-slate-50/50 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed Referrals</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{referralStats.successfulConversions} Users</span>
                  </div>
                  <div className="border border-slate-150 p-4.5 rounded-xl bg-slate-50/50 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Coins Awarded Value</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">⚡ {referralStats.totalCoinsPaid.toLocaleString()}</span>
                  </div>
                </div>

                {/* Settings Form */}
                <form onSubmit={handleSaveReferralConfig} className="flex flex-col gap-6 text-left border border-slate-150 rounded-2xl p-5 bg-white shadow-3xs">
                  <span className="text-xs font-black text-slate-850 uppercase tracking-wider block">Global Referral Multipliers</span>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Referrer Reward (Coins)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={referralBonus}
                          onChange={(e) => setReferralBonus(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                        />
                        <span className="text-xs font-bold text-slate-500">Coins</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Coins credited to the referrer wallet upon booking completion.</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Referee Discount Percentage (%)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          value={refereeDiscount}
                          onChange={(e) => setRefereeDiscount(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                        />
                        <span className="text-xs font-bold text-slate-500">% Off</span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Discount percentage applied to the referee's first service invoice.</span>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs self-start cursor-pointer shadow-md"
                  >
                    Save Configuration
                  </button>
                </form>

                {/* Active Campaigns Table */}
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Referral Campaigns</span>
                    <span className="text-[10px] font-bold text-slate-400">Launch dynamic refer incentives</span>
                  </div>
                  
                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                        <tr>
                          <th className="p-3">Campaign Name</th>
                          <th className="p-3">Referrer Reward</th>
                          <th className="p-3">Referee Discount</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-slate-700 font-semibold">
                        {referralCampaigns.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{c.name}</td>
                            <td className="p-3">⚡ {c.bonus} Coins</td>
                            <td className="p-3">{c.discount}% OFF</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                c.status === 'Active' 
                                  ? 'bg-green-50 text-green-600 border-green-200' 
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button 
                                type="button"
                                onClick={() => handleDeleteCampaign(c.id)}
                                className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Create Referral Campaign Modal */}
                {showAddCampaignModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create Referral Campaign</span>
                        <button 
                          onClick={() => setShowAddCampaignModal(false)}
                          className="text-slate-400 hover:text-slate-650 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleCreateCampaign(e);
                        setShowAddCampaignModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Campaign Name</label>
                          <input 
                            type="text"
                            placeholder="e.g. Summer Referral Bash"
                            value={newCampaign.name}
                            onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Referrer Reward (Coins)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 150"
                              value={newCampaign.bonus}
                              onChange={(e) => setNewCampaign({ ...newCampaign, bonus: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Referee Discount (%)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 15"
                              value={newCampaign.discount}
                              onChange={(e) => setNewCampaign({ ...newCampaign, discount: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddCampaignModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Create Campaign</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* SUBSECTION 5: COUPON CODES */}
            {activeTab === 'coupons' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Coupons & Promo Codes Management</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">Manage global coupon codes, discounts, and expiry limits.</p>
                  </div>
                  <button 
                    onClick={() => setShowAddCouponModal(true)}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Create Coupon</span>
                  </button>
                </div>

                {/* Coupons List */}
                <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs mt-2">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Coupon Code</th>
                        <th className="p-3">Discount Value</th>
                        <th className="p-3">Applicability Detail</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {coupons.map((c) => (
                        <tr key={c.code} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                          <td className="p-3 font-mono font-bold text-[#0D47A1]">{c.code}</td>
                          <td className="p-3 text-green-600 font-black">{c.discount}</td>
                          <td className="p-3 text-slate-500">{c.desc}</td>
                          <td className="p-3 text-slate-500 font-medium">{c.expiry}</td>
                          <td className="p-3"><span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[10px] border border-green-200">{c.status}</span></td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleDeleteCoupon(c.code)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Create Coupon Modal */}
                {showAddCouponModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create New Promo Coupon</span>
                        <button 
                          onClick={() => setShowAddCouponModal(false)}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={(e) => {
                        handleAddCoupon(e);
                        setShowAddCouponModal(false);
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Coupon Code</label>
                            <input 
                              type="text"
                              placeholder="e.g. SAVESHIELED"
                              value={newCoupon.code}
                              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Discount (e.g. 20% OFF or ₹500 OFF)</label>
                            <input 
                              type="text"
                              placeholder="e.g. 15% OFF"
                              value={newCoupon.discount}
                              onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Description / Applicability Detail</label>
                            <input 
                              type="text"
                              placeholder="e.g. Valid on split AC installation orders"
                              value={newCoupon.desc}
                              onChange={(e) => setNewCoupon({ ...newCoupon, desc: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Expiry Date</label>
                            <input 
                              type="date"
                              value={newCoupon.expiry}
                              onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => setShowAddCouponModal(false)}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Create Coupon</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default LoyaltyProgram;
