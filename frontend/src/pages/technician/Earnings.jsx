import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, ArrowLeft, Shield, Calendar, TrendingUp, ChevronDown, Check, Clock, Briefcase, ClipboardList, User, Wrench, Zap, FileText } from 'lucide-react';
import { useTech } from '../../context/TechContext';
import { apiRequest } from '../../lib/apiClient';

const EarningsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { earningsTally, notifications } = useTech();
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [trendDays, setTrendDays] = useState(7);

  useEffect(() => {
    apiRequest(`/tech/earnings/analytics?days=${trendDays}`, { auth: true })
      .then((res) => setStats(res))
      .catch((err) => console.warn('[earnings] Could not load analytics:', err.message));
  }, [trendDays]);

  useEffect(() => {
    apiRequest('/tech/earnings/payouts?limit=20', { auth: true })
      .then((res) => setPayouts(res || []))
      .catch((err) => console.warn('[earnings] Could not load payouts:', err.message));
  }, []);

  // Earned so far this week, against the technician's configured target.
  // Payout.payoutType is 'Quick' | 'Invoice'; the tabs use lowercase keys.
  const visiblePayouts = payouts
    .filter((p) => (p.payoutType || 'Quick').toLowerCase() === activeTab)
    .map((p) => ({
      id: p.id,
      job: p.job ? `#${String(p.job).slice(-4)}` : '—',
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      amount: `+₹${(p.netAmount || 0).toLocaleString('en-IN')}`,
      status: (p.status || 'Pending').toUpperCase(),
    }));

  const weekEarned = (stats?.daily || []).slice(-7).reduce((sum, d) => sum + d.amount, 0);
  const weeklyTarget = stats?.weeklyTargetAmount || 0;
  const targetPercent = weeklyTarget > 0 ? Math.min(Math.round((weekEarned / weeklyTarget) * 100), 100) : null;
  const [withdrawableBalance, setWithdrawableBalance] = useState(12450);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState('confirm'); // 'confirm', 'success'

  // Read ?tab=quick or ?tab=invoice from URL
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'invoice' ? 'invoice' : 'quick';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get('tab') === 'invoice' ? 'invoice' : 'quick');
  }, [location.search]);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleWithdraw = () => {
    setWithdrawStep('success');
    setWithdrawableBalance(0);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative font-sans">

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-[#052355]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {withdrawStep === 'confirm' ? (
              <>
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[#0D47A1] mx-auto">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-semibold text-[#052355]">Confirm Withdrawal</h3>
                  <p className="text-xs text-slate-500 mt-1">Are you sure you want to withdraw your available balance to your primary bank account?</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 text-left text-xs font-normal text-slate-650 space-y-2">
                  <div className="flex justify-between">
                    <span>Withdrawal Amount</span>
                    <span className="font-semibold text-[#052355]">₹{withdrawableBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destination Account</span>
                    <span className="font-semibold text-[#052355]">HDFC Bank (•••• 4321)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee</span>
                    <span className="text-green-600 font-semibold">₹0 (Free)</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-1">
                  <button 
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleWithdraw}
                    className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-sm"
                  >
                    Withdraw
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto border border-green-100 shadow-sm">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-[#052355]">Transfer Initiated!</h3>
                  <p className="text-xs text-slate-500 mt-2">Your funds are being transferred to your registered bank account. Usually settles within 2-4 hours.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawStep('confirm');
                  }}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-semibold py-3.5 rounded-2xl text-xs transition-all shadow-md mt-2"
                >
                  Great, Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Earnings & Payouts</h1>
        </div>
        <button 
          onClick={() => navigate('/technician/notifications')}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors relative"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {/* Available Balance Card */}
        <div className="bg-[#052355] text-white rounded-3xl p-5 shadow-sm text-left relative overflow-hidden">
          <div className="absolute top-[-10px] right-[-10px] w-28 h-28 bg-white/5 rounded-full blur-xl"></div>
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Available Balance</span>
          <p className="text-3xl font-semibold mt-1">₹{withdrawableBalance.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1.5 mt-2.5 text-slate-300 text-xs">
            <Shield className="h-4 w-4 text-green-400" />
            <span>Secured & Verified Funds</span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button 
              onClick={() => {
                if (withdrawableBalance === 0) {
                  alert('No funds available for withdrawal.');
                } else {
                  setShowWithdrawModal(true);
                }
              }}
              className="w-full bg-[#FFD600] text-[#0D47A1] font-semibold py-3.5 rounded-2xl hover:bg-yellow-400 transition-colors shadow-sm"
            >
              Withdraw Funds
            </button>
            <button 
              onClick={() => navigate('/technician/recent-earnings')}
              className="w-full bg-white/10 border border-white/20 text-white font-semibold py-3.5 rounded-2xl hover:bg-white/20 transition-colors"
            >
              Download Report
            </button>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left">
          <span className="text-xs font-semibold text-slate-500">Today's Earnings</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">₹{earningsTally.today.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1 mt-2 text-green-600 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>+12.5% from yesterday</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm flex gap-1">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'quick'
                ? 'bg-amber-400 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${activeTab === 'quick' ? 'fill-white' : ''}`} />
            QuickPayout
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'invoice'
                ? 'bg-[#0A2D6E] text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            InvoicePayout
          </button>
        </div>

        {/* Tab Summary Card */}
        {activeTab === 'quick' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-800">QuickPayout — D2C Services</p>
                <p className="text-[10px] text-amber-600">Instant credit after job completion</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0D47A1] mt-1">₹{earningsTally.split.quick.amount.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{earningsTally.split.quick.jobs} Jobs • Instant Credit</p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <FileText className="h-4 w-4 text-[#0D47A1]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#052355]">InvoicePayout — Invoice Jobs</p>
                <p className="text-[10px] text-blue-500">Settled after approval from NCC</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0D47A1] mt-1">₹{earningsTally.split.invoice.amount.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{earningsTally.split.invoice.jobs} Jobs • Approval Pending</p>
          </div>
        )}

        {/* Weekly Target progress — hidden unless a target has been set */}
        {targetPercent !== null && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">Weekly Target Progress</span>
              <span className="text-xs font-bold text-[#0D47A1]">{targetPercent}%</span>
            </div>
            <p className="text-xl font-semibold text-slate-900 mt-1">
              ₹{weekEarned.toLocaleString('en-IN')} / ₹{weeklyTarget.toLocaleString('en-IN')}
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-[#0D47A1] rounded-full transition-all duration-500" style={{ width: `${targetPercent}%` }}></div>
            </div>
          </div>
        )}

        {/* Income Trends */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-semibold text-[#052355] uppercase tracking-wider">Income Trends</h3>
            <div className="relative">
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(Number(e.target.value))}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 focus:outline-none pr-8"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>
          
          {/* Income Trends chart */}
          <div className="flex justify-between items-end h-40 gap-2.5 px-2">
            {(stats?.daily || []).length === 0 && (
              <p className="text-[11px] text-slate-400 font-normal w-full text-center self-center">No earnings in this period.</p>
            )}
            {(() => {
              const daily = stats?.daily || [];
              const max = Math.max(...daily.map((d) => d.amount), 1);
              return daily.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-[#E3ECF9] rounded-t-md hover:bg-[#0D47A1] transition-colors cursor-pointer"
                    style={{ height: `${Math.round((d.amount / max) * 100)}%` }}
                    title={`${new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ₹${d.amount.toLocaleString('en-IN')}`}
                  ></div>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Recent Payouts */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-left">
          <div className="p-4 flex justify-between items-center border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-[#052355] uppercase tracking-wider">Recent Payouts</h3>
            <button 
              onClick={() => navigate('/technician/recent-earnings')}
              className="text-xs text-[#0D47A1] font-semibold hover:text-blue-800 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="flex flex-col">
            {visiblePayouts.length === 0 && (
              <p className="p-4 text-[11px] text-slate-400 font-normal">No {activeTab === 'quick' ? 'quick' : 'invoice'} payouts yet.</p>
            )}
            {visiblePayouts.map((p) => (
              <div key={p.id} className="p-4 flex justify-between items-center border-b border-slate-100 last:border-b-0 hover:bg-slate-55 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    p.status === 'SETTLED' ? 'bg-green-50 text-green-500' : 'bg-yellow-50 text-yellow-500'
                  }`}>
                    {p.status === 'SETTLED' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Job {p.job}</h4>
                    <p className="text-[10px] text-slate-500 font-normal">{p.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-900">{p.amount}</span>
                  <div className="mt-1">
                    <span className={`text-[9px] font-semibold px-2.5 py-0.5 rounded-md ${
                      p.status === 'SETTLED' 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-3 px-3.5 flex justify-around items-center z-20 shadow-lg">
        <button onClick={() => navigate('/technician/dashboard')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Briefcase className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Jobs</span>
        </button>
        <button onClick={() => navigate('/technician/raise-part-request?tab=claims')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <ClipboardList className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Requests</span>
        </button>
        <button onClick={() => navigate('/technician/inventory')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Wrench className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Inventory</span>
        </button>
        <button onClick={() => navigate('/technician/schedule')} className="flex flex-col items-center gap-1 text-slate-600 hover:text-slate-700 transition-all">
          <Calendar className="h-6 w-6 stroke-[2]" />
          <span className="text-[10px] font-normal tracking-wide">Schedule</span>
        </button>
        <button onClick={() => navigate('/technician/profile')} className="flex flex-col items-center gap-1 text-[#0D47A1] transition-all">
          <User className="h-6 w-6 stroke-[2.5]" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default EarningsPage;
