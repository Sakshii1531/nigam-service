import CouponManager from '../../components/super-admin/coupons/CouponManager';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Plus, Trash2, Edit2, 
  Check, Save, Info
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../lib/apiClient';

const LoyaltyProgram = () => {
  const [searchParams] = useSearchParams();
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
  // "Coins Redeemed Value" stat card below — was being fetched under the
  // wrong tab (referrals) so it silently never populated on the rewards tab
  // that actually renders it. Real data either way (analytics.service.js's
  // getCoinRedemption, summing WalletLedger's 'redeemed' rows).
  const [coinRedemption, setCoinRedemption] = useState(null);
  const loadCoinRedemption = React.useCallback(async () => {
    try {
      setCoinRedemption(await apiRequest('/super-admin/analytics/coin-redemption', { auth: true }));
    } catch (err) {
      console.warn('[loyalty] Could not load coin redemption:', err.message);
    }
  }, []);

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
  const [referralBonus, setReferralBonus] = useState(100); // ₹ credited to the referrer — platformSettings.referralBonusAmount
  const [refereeDiscount, setRefereeDiscount] = useState(10); // % off the referee's first booking — platformSettings.refereeDiscountPercent
  const [savingReferralConfig, setSavingReferralConfig] = useState(false);
  const [referralStats, setReferralStats] = useState({
    totalReferrers: 0,
    successfulConversions: 0,
    totalCoinsPaid: 0,
  });
  const [referralCampaigns, setReferralCampaigns] = useState([]);

  const loadReferralCampaigns = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/referral-campaigns', { auth: true });
      setReferralCampaigns(res || []);
    } catch (err) {
      showToast(err.message || 'Could not load referral campaigns.');
    }
  }, []);

  const loadReferralStats = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/loyalty/referral-stats', { auth: true });
      if (res) setReferralStats(res);
    } catch (err) {
      showToast(err.message || 'Could not load referral stats.');
    }
  }, []);

  // The multiplier fields default to the model's own defaults (100 / 10)
  // above so the form isn't blank while this loads, then pick up whatever
  // super-admin actually last saved.
  const loadReferralSettings = React.useCallback(async () => {
    try {
      const res = await apiRequest('/super-admin/settings', { auth: true });
      if (res?.referralBonusAmount !== undefined) setReferralBonus(res.referralBonusAmount);
      if (res?.refereeDiscountPercent !== undefined) setRefereeDiscount(res.refereeDiscountPercent);
    } catch (err) {
      showToast(err.message || 'Could not load referral settings.');
    }
  }, []);

  const [newCampaign, setNewCampaign] = useState({ name: '', bonus: '', discount: '' });
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);

  const handleSaveReferralConfig = async (e) => {
    e.preventDefault();
    setSavingReferralConfig(true);
    try {
      await apiRequest('/super-admin/settings', {
        method: 'PUT',
        auth: true,
        body: {
          referralBonusAmount: Number(referralBonus),
          refereeDiscountPercent: Number(refereeDiscount),
        },
      });
      showToast('Referral program settings updated.');
    } catch (err) {
      showToast(err.message || 'Could not save referral settings.');
    } finally {
      setSavingReferralConfig(false);
    }
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
    if (activeTab === 'spinwheel') fetchSpinWheelConfig();
    else if (activeTab === 'rewards') {
      loadMilestones();
      loadCoinRedemption();
    }
    else if (activeTab === 'referrals') {
      loadReferralCampaigns();
      loadReferralStats();
      loadReferralSettings();
    }
  }, [activeTab, loadMilestones, loadCoinRedemption, loadReferralCampaigns, loadReferralStats, loadReferralSettings]);

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
          <div className="flex-1 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm min-h-100">
            
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
                            <td className="p-3">{m.threshold}</td>
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
                  <Info className="h-5 w-5 text-[#0D47A1] shrink-0" />
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Referrers</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{referralStats.totalReferrers} Customers</span>
                  </div>
                  <div className="border border-slate-150 p-4.5 rounded-xl bg-slate-50/50 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed Referrals</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{referralStats.successfulConversions} Users</span>
                  </div>
                  <div className="border border-slate-150 p-4.5 rounded-xl bg-slate-50/50 text-left">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Coins Awarded Value</span>
                    <span className="text-lg font-black text-slate-800 block mt-1">{referralStats.totalCoinsPaid.toLocaleString()}</span>
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
                    disabled={savingReferralConfig}
                    className="bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs self-start cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingReferralConfig ? 'Saving…' : 'Save Configuration'}
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
                            <td className="p-3">{c.bonus} Coins</td>
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
            {activeTab === 'coupons' && <CouponManager onToast={showToast} />}

          </div>

        </div>
      </div>
    </div>
  );
};

export default LoyaltyProgram;
