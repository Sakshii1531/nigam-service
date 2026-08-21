import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Sparkles, Gift, Ticket, Award, Coins, Settings, Plus, Trash2, Edit2, 
  Check, Save, Percent, RefreshCw, Star, Info, TrendingUp, Users, ArrowRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';

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
  const [milestones, setMilestones] = useState([]);

  const loadMilestones = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/milestones', { auth: true });
      setMilestones(res || []);
    } catch (err) {
      showToast(err.message || 'Could not load milestones.');
    }
  }, []);
  const [newMilestone, setNewMilestone] = useState({ title: '', threshold: '', benefit: '' });
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestone.title || !newMilestone.threshold) return;
    try {
      await apiRequest('/super-admin/loyalty/milestones', {
        method: 'POST',
        auth: true,
        body: {
          title: newMilestone.title,
          threshold: parseInt(newMilestone.threshold, 10),
          benefit: newMilestone.benefit || 'Custom reward perk',
        },
      });
      await loadMilestones();
      setNewMilestone({ title: '', threshold: '', benefit: '' });
      showToast('New milestone reward added successfully!');
    } catch (err) {
      showToast(err.message || 'Could not add milestone.');
    }
  };

  const handleDeleteMilestone = async (id) => {
    try {
      await apiRequest(`/super-admin/loyalty/milestones/${id}`, { method: 'DELETE', auth: true });
      await loadMilestones();
      showToast('Milestone reward removed.');
    } catch (err) {
      showToast(err.message || 'Could not remove milestone.');
    }
  };

  // 2. MEMBERSHIP PLANS STATE
  const [membershipPlans, setMembershipPlans] = useState([]);

  const loadPlans = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/memberships', { auth: true });
      setMembershipPlans(res || []);
    } catch (err) {
      showToast(err.message || 'Could not load membership plans.');
    }
  }, []);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editPrice, setEditPrice] = useState(0);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', benefits: '' });
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);

  const handleSavePlanPrice = async (id) => {
    try {
      await apiRequest(`/super-admin/loyalty/memberships/${id}`, {
        method: 'PUT',
        auth: true,
        body: { price: parseInt(editPrice, 10) },
      });
      await loadPlans();
      setEditingPlanId(null);
      showToast('Plan price updated.');
    } catch (err) {
      showToast(err.message || 'Could not update plan price.');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.name || !newPlan.price) return;
    const benefitsList = newPlan.benefits
      ? newPlan.benefits.split(',').map(b => b.trim()).filter(Boolean)
      : ['Priority Customer Support'];

    try {
      await apiRequest('/super-admin/loyalty/memberships', {
        method: 'POST',
        auth: true,
        body: { name: newPlan.name, price: parseInt(newPlan.price, 10), benefits: benefitsList },
      });
      await loadPlans();
      setNewPlan({ name: '', price: '', benefits: '' });
      showToast(`New membership plan '${newPlan.name}' created!`);
    } catch (err) {
      showToast(err.message || 'Could not create plan.');
    }
  };

  const handleDeletePlan = async (id) => {
    try {
      await apiRequest(`/super-admin/loyalty/memberships/${id}`, { method: 'DELETE', auth: true });
      await loadPlans();
      showToast('Membership plan deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete plan.');
    }
  };

  // 3. SPIN WHEEL STATE
  const [wheelSegments, setWheelSegments] = useState([]);
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const [editSegmentLabel, setEditSegmentLabel] = useState('');
  const [editSegmentProb, setEditSegmentProb] = useState(0);
  const [editSegmentWinningType, setEditSegmentWinningType] = useState('none');
  const [editSegmentValue, setEditSegmentValue] = useState(0);

  const [newSegment, setNewSegment] = useState({ label: '', prob: '', winningType: 'none', value: 0 });
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);

  const saveConfigToDb = async (updatedSegments) => {
    try {
      await apiRequest('/super-admin/loyalty/spin-wheel', {
        method: 'PUT',
        auth: true,
        body: {
          segments: updatedSegments.map(s => ({
            label: s.label,
            probability: s.prob,
            winningType: s.winningType || 'none',
            value: Number(s.value) || 0
          })),
          isActive: true
        }
      });
      showToast('Spin wheel configuration saved to server.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save config: ' + err.message);
    }
  };

  const handleSaveSegment = async (id) => {
    const updated = wheelSegments.map(s => s.id === id ? { 
      ...s, 
      label: editSegmentLabel, 
      prob: parseInt(editSegmentProb, 10),
      winningType: editSegmentWinningType,
      value: parseInt(editSegmentValue, 10) || 0
    } : s);
    setWheelSegments(updated);
    setEditingSegmentId(null);
    await saveConfigToDb(updated);
  };

  const handleAddSegment = async (e) => {
    e.preventDefault();
    if (!newSegment.label || !newSegment.prob) return;
    const probVal = parseInt(newSegment.prob, 10);
    const currentTotalProb = wheelSegments.reduce((acc, curr) => acc + curr.prob, 0);
    if (currentTotalProb + probVal > 100) {
      showToast(`Error: Total probability would exceed 100% (currently ${currentTotalProb}%).`);
      return;
    }
    const updated = [...wheelSegments, {
      id: Date.now(),
      label: newSegment.label,
      prob: probVal,
      winningType: newSegment.winningType || 'none',
      value: parseInt(newSegment.value, 10) || 0
    }];
    setWheelSegments(updated);
    setNewSegment({ label: '', prob: '', winningType: 'none', value: 0 });
    setShowAddSegmentModal(false);
    await saveConfigToDb(updated);
  };

  const handleDeleteSegment = async (id) => {
    const updated = wheelSegments.filter(s => s.id !== id);
    setWheelSegments(updated);
    await saveConfigToDb(updated);
  };

  // 4. REFERRALS STATE
  const [referralBonus, setReferralBonus] = useState(100); // 100 coins
  const [refereeDiscount, setRefereeDiscount] = useState(10); // 10%
  const [referralStats] = useState({
    totalShared: 1450,
    successfulConversions: 840,
    totalCoinsPaid: 84000
  });
  const [coinRedemption, setCoinRedemption] = useState(null);
  const [referralCampaigns, setReferralCampaigns] = useState([]);

  const loadReferralCampaigns = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/referral-campaigns', { auth: true });
      setReferralCampaigns(res || []);
    } catch (err) {
      showToast(err.message || 'Could not load referral campaigns.');
    }
  }, []);
  const [newCampaign, setNewCampaign] = useState({ name: '', bonus: '', discount: '' });
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);

  const handleSaveReferralConfig = (e) => {
    e.preventDefault();
    showToast('Referral program settings updated.');
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.bonus || !newCampaign.discount) return;
    try {
      await apiRequest('/super-admin/loyalty/referral-campaigns', {
        method: 'POST',
        auth: true,
        body: {
          name: newCampaign.name,
          bonus: parseInt(newCampaign.bonus, 10),
          discount: parseInt(newCampaign.discount, 10),
        },
      });
      await loadReferralCampaigns();
      setNewCampaign({ name: '', bonus: '', discount: '' });
      showToast(`New campaign '${newCampaign.name}' created!`);
    } catch (err) {
      showToast(err.message || 'Could not create campaign.');
    }
  };

  const handleDeleteCampaign = async (id) => {
    try {
      await apiRequest(`/super-admin/loyalty/referral-campaigns/${id}`, { method: 'DELETE', auth: true });
      await loadReferralCampaigns();
      showToast('Referral campaign deleted.');
    } catch (err) {
      showToast(err.message || 'Could not delete campaign.');
    }
  };

  // 5. COUPONS STATE
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', desc: '', expiry: '', applicableOn: ['product', 'service', 'plan'] });
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [showEditCouponModal, setShowEditCouponModal] = useState(false);

  const fetchAllCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await apiRequest('/coupons/admin', { auth: true });
      const listToMap = Array.isArray(res) ? res : [];
      setCoupons(listToMap);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch coupons from server.');
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchSpinWheelConfig = async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/spin-wheel', { auth: true });
      const config = res;
      if (config && Array.isArray(config.segments)) {
        setWheelSegments(config.segments.map((s, index) => ({
          id: s.id || index + 1,
          label: s.label,
          prob: s.probability,
          winningType: s.winningType || 'none',
          value: s.value || 0
        })));
      }
    } catch (err) {
      console.warn('Error fetching spin wheel config:', err);
    }
  };

  // Each tab loads what it shows, so switching tabs always reflects the server.
  useEffect(() => {
    if (activeTab === 'coupons') fetchAllCoupons();
    else if (activeTab === 'spinwheel') fetchSpinWheelConfig();
    else if (activeTab === 'rewards') loadMilestones();
    else if (activeTab === 'membership') loadPlans();
    else if (activeTab === 'referrals') {
      loadReferralCampaigns();
      apiRequest('/super-admin/analytics/coin-redemption', { auth: true })
        .then((res) => setCoinRedemption(res))
        .catch((err) => console.warn('[loyalty] Could not load coin redemption:', err.message));
    }
  }, [activeTab, loadMilestones, loadPlans, loadReferralCampaigns]);

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;
    
    const numericDiscount = Number(String(newCoupon.discount).replace(/[^\d]/g, ''));
    if (isNaN(numericDiscount) || numericDiscount <= 0) {
      showToast('Discount must be a positive number');
      return;
    }

    try {
      await apiRequest('/coupons', {
        method: 'POST',
        auth: true,
        body: {
          code: newCoupon.code.toUpperCase(),
          discount: numericDiscount,
          description: newCoupon.desc || 'Discount Promo Code',
          expiry: newCoupon.expiry ? new Date(newCoupon.expiry) : undefined,
          applicableOn: newCoupon.applicableOn || ['product', 'service', 'plan']
        }
      });
      setNewCoupon({ code: '', discount: '', desc: '', expiry: '', applicableOn: ['product', 'service', 'plan'] });
      showToast('New discount coupon created!');
      fetchAllCoupons();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error creating coupon.');
    }
  };

  const handleToggleStatus = async (coupon) => {
    const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiRequest(`/coupons/${coupon.id}`, {
        method: 'PATCH',
        auth: true,
        body: { status: newStatus }
      });
      showToast(`Coupon status set to ${newStatus}`);
      fetchAllCoupons();
    } catch (err) {
      console.error(err);
      showToast('Error updating coupon status.');
    }
  };

  const handleUpdateCoupon = async (e) => {
    e.preventDefault();
    if (!editingCoupon.code || !editingCoupon.discount) return;

    const numericDiscount = Number(String(editingCoupon.discount).replace(/[^\d]/g, ''));
    if (isNaN(numericDiscount) || numericDiscount <= 0) {
      showToast('Discount must be a positive number');
      return;
    }

    try {
      await apiRequest(`/coupons/${editingCoupon.id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          code: editingCoupon.code.toUpperCase(),
          discount: numericDiscount,
          description: editingCoupon.description || 'Discount Promo Code',
          expiry: editingCoupon.expiry ? new Date(editingCoupon.expiry) : null,
          status: editingCoupon.status,
          applicableOn: editingCoupon.applicableOn || ['product', 'service', 'plan']
        }
      });
      setShowEditCouponModal(false);
      setEditingCoupon(null);
      showToast('Coupon updated successfully!');
      fetchAllCoupons();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error updating coupon.');
    }
  };

  const handleDeleteCoupon = async (id) => {
    try {
      await apiRequest(`/coupons/${id}`, {
        method: 'DELETE',
        auth: true
      });
      showToast('Coupon deleted.');
      fetchAllCoupons();
    } catch (err) {
      console.error(err);
      showToast('Error deleting coupon.');
    }
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
        <div className="p-6 flex-1 flex flex-col gap-6 w-full">
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
                      <span className="text-lg font-black text-slate-800 block mt-1">₹{(coinRedemption?.valueRupees || 0).toLocaleString('en-IN')}</span>
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
                        <th className="p-3">Winning Type</th>
                        <th className="p-3">Value / Quantity</th>
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
                              <select 
                                value={editSegmentWinningType}
                                onChange={(e) => setEditSegmentWinningType(e.target.value)}
                                className="border border-slate-350 p-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                              >
                                <option value="none">No Reward/Try Again</option>
                                <option value="coins">Coins</option>
                                <option value="money">Rupees (Cashback)</option>
                                <option value="spin">Extra Spin</option>
                              </select>
                            ) : (
                              <span className="capitalize">{seg.winningType === 'money' ? 'Rupees (Cashback)' : seg.winningType === 'none' ? 'No Reward' : seg.winningType}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {editingSegmentId === seg.id ? (
                              <input 
                                type="number"
                                value={editSegmentValue}
                                onChange={(e) => setEditSegmentValue(e.target.value)}
                                className="w-16 border border-slate-350 p-1.5 rounded-lg text-xs font-bold text-slate-800 focus:outline-none"
                              />
                            ) : (
                              <span>{seg.value || 0}</span>
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
                                    setEditSegmentWinningType(seg.winningType || 'none');
                                    setEditSegmentValue(seg.value || 0);
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
                      }} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Reward Label</label>
                            <input 
                              type="text"
                              placeholder="e.g. ₹50 Cashback"
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Winning Type</label>
                            <select 
                              value={newSegment.winningType}
                              onChange={(e) => setNewSegment({ ...newSegment, winningType: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            >
                              <option value="none">No Reward/Try Again</option>
                              <option value="coins">Coins</option>
                              <option value="money">Rupees (Cashback)</option>
                              <option value="spin">Extra Spin</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Value / Quantity</label>
                            <input 
                              type="number"
                              placeholder="e.g. 50"
                              value={newSegment.value}
                              onChange={(e) => setNewSegment({ ...newSegment, value: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
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
                {couponsLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl h-48"></div>
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="bg-white border border-slate-150 rounded-2xl p-12 text-center shadow-2xs">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wide">No Coupons Found</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">Click "Create Coupon" to add the first coupon.</p>
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs mt-2 bg-white">
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
                          <tr key={c.id || c.code} className="hover:bg-slate-50/50 font-semibold text-slate-700">
                            <td className="p-3 font-mono font-bold text-[#0D47A1]">{c.code}</td>
                            <td className="p-3 text-green-600 font-black">
                              {c.description?.toLowerCase().includes('%') ? `${c.discount}%` : `₹${c.discount}`}
                            </td>
                            <td className="p-3 text-slate-500">{c.description || 'Global Promo'}</td>
                            <td className="p-3 text-slate-500 font-medium">
                              {c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-black uppercase tracking-wider ${
                                c.status === 'Active' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingCoupon({
                                      id: c.id,
                                      code: c.code,
                                      discount: c.discount,
                                      description: c.description || '',
                                      expiry: c.expiry ? new Date(c.expiry).toISOString().split('T')[0] : '',
                                      status: c.status,
                                      applicableOn: c.applicableOn || ['product', 'service', 'plan']
                                    });
                                    setShowEditCouponModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Edit Coupon"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(c)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    c.status === 'Active' ? 'text-slate-400 hover:text-slate-655 hover:bg-slate-100' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                  title={c.status === 'Active' ? "Mark Inactive" : "Mark Active"}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCoupon(c.id)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Create Coupon Modal */}
                {showAddCouponModal && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Create New Promo Coupon</span>
                        <button 
                          onClick={() => setShowAddCouponModal(false)}
                          className="text-slate-400 hover:text-slate-600 font-black text-lg p-1.5 cursor-pointer"
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
                              placeholder="e.g. SAVESHIELD"
                              value={newCoupon.code}
                              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Discount (Numeric Amount in ₹)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 500"
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

                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Applicable On</label>
                          <div className="flex gap-4 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                            {['product', 'service', 'plan'].map(scope => {
                              const label = scope === 'product' ? 'Products' : scope === 'service' ? 'Services' : 'Protection Plans';
                              const checked = newCoupon.applicableOn?.includes(scope);
                              return (
                                <label key={scope} className="flex items-center gap-2 text-xs font-black text-slate-700 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const updated = e.target.checked
                                        ? [...(newCoupon.applicableOn || []), scope]
                                        : (newCoupon.applicableOn || []).filter(s => s !== scope);
                                      setNewCoupon({ ...newCoupon, applicableOn: updated });
                                    }}
                                    className="rounded border-slate-350 text-[#0D47A1] focus:ring-[#0D47A1] w-4 h-4 cursor-pointer"
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
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

                {/* Edit Coupon Modal */}
                {showEditCouponModal && editingCoupon && (
                  <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Edit Coupon Details</span>
                        <button 
                          onClick={() => {
                            setShowEditCouponModal(false);
                            setEditingCoupon(null);
                          }}
                          className="text-slate-400 hover:text-slate-655 font-black text-lg p-1.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <form onSubmit={handleUpdateCoupon} className="flex flex-col gap-4 text-left mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Coupon Code</label>
                            <input 
                              type="text"
                              placeholder="e.g. SAVESHIELD"
                              value={editingCoupon.code}
                              onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                              required
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Discount (Numeric Amount in ₹)</label>
                            <input 
                              type="number"
                              placeholder="e.g. 500"
                              value={editingCoupon.discount}
                              onChange={(e) => setEditingCoupon({ ...editingCoupon, discount: e.target.value })}
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
                              value={editingCoupon.description}
                              onChange={(e) => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">Expiry Date</label>
                            <input 
                              type="date"
                              value={editingCoupon.expiry}
                              onChange={(e) => setEditingCoupon({ ...editingCoupon, expiry: e.target.value })}
                              className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Coupon Status</label>
                          <select
                            value={editingCoupon.status}
                            onChange={(e) => setEditingCoupon({ ...editingCoupon, status: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-blue"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Applicable On</label>
                          <div className="flex gap-4 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                            {['product', 'service', 'plan'].map(scope => {
                              const label = scope === 'product' ? 'Products' : scope === 'service' ? 'Services' : 'Protection Plans';
                              const checked = editingCoupon.applicableOn?.includes(scope);
                              return (
                                <label key={scope} className="flex items-center gap-2 text-xs font-black text-slate-700 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const updated = e.target.checked
                                        ? [...(editingCoupon.applicableOn || []), scope]
                                        : (editingCoupon.applicableOn || []).filter(s => s !== scope);
                                      setEditingCoupon({ ...editingCoupon, applicableOn: updated });
                                    }}
                                    className="rounded border-slate-350 text-[#0D47A1] focus:ring-[#0D47A1] w-4 h-4 cursor-pointer"
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
                          <button 
                            type="button"
                            onClick={() => {
                              setShowEditCouponModal(false);
                              setEditingCoupon(null);
                            }}
                            className="border border-slate-250 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-5 rounded-xl text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Changes</span>
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
