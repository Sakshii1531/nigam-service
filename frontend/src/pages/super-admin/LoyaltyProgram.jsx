import CouponManager from '../../components/super-admin/coupons/CouponManager';
import RewardsProgramEditor from '../../components/super-admin/rewards/RewardsProgramEditor';
import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Plus, Trash2, Check } from 'lucide-react';
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

  // Each tab loads what it shows, so switching tabs always reflects the server.
  useEffect(() => {
    if (activeTab === 'referrals') {
      loadReferralCampaigns();
      loadReferralStats();
      loadReferralSettings();
    }
  }, [activeTab, loadReferralCampaigns, loadReferralStats, loadReferralSettings]);

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
            
            {/* Rewards Program: earning, customer levels, partner badges, tasks and the
                spin wheel in one place. The old Spin Wheel Config link opens it at the wheel. */}
            {(activeTab === 'rewards' || activeTab === 'spinwheel') && (
              <RewardsProgramEditor onToast={showToast} focus={activeTab === 'spinwheel' ? 'spin-wheel' : null} />
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
