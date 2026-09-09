import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, ArrowLeft, Shield, Calendar, TrendingUp, ChevronDown, Check, Clock, 
  Briefcase, ClipboardList, User, Wrench, Zap, FileText, Building2, ChevronRight,
  AlertCircle, RefreshCw, Download, ArrowUpRight
} from 'lucide-react';
import TechBottomNav from '../../components/TechBottomNav';
import { useTech } from '../../context/TechContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/apiClient';

const EarningsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { earningsTally } = useTech();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [trendDays, setTrendDays] = useState(7);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  
  // Real Payout Method from Profile
  const [primaryAccount, setPrimaryAccount] = useState(null);

  // Available Balance state initialized from real earnings tally
  const [withdrawableBalance, setWithdrawableBalance] = useState(earningsTally?.available ?? 0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState('confirm'); // 'confirm', 'success'
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  // Keep withdrawableBalance in sync with earningsTally
  useEffect(() => {
    if (earningsTally?.available !== undefined) {
      setWithdrawableBalance(earningsTally.available);
    }
  }, [earningsTally?.available]);

  // Load Primary Payout Account
  useEffect(() => {
    apiRequest('/tech/profile/profile', { auth: true })
      .then((res) => {
        const methods = res?.payoutMethods || [];
        const primary = methods.find(m => m.isPrimary) || methods[0] || null;
        setPrimaryAccount(primary);
      })
      .catch((err) => console.warn('[earnings] Could not load payout account:', err.message));
  }, []);

  // Load Analytics
  const loadAnalytics = useCallback(() => {
    setLoadingAnalytics(true);
    apiRequest(`/tech/earnings/analytics?days=${trendDays}`, { auth: true })
      .then((res) => setStats(res))
      .catch((err) => console.warn('[earnings] Could not load analytics:', err.message))
      .finally(() => setLoadingAnalytics(false));
  }, [trendDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Load Payouts List
  const loadPayouts = useCallback(() => {
    setLoadingPayouts(true);
    apiRequest('/tech/earnings/payouts?limit=20', { auth: true })
      .then((res) => setPayouts(res || []))
      .catch((err) => console.warn('[earnings] Could not load payouts:', err.message))
      .finally(() => setLoadingPayouts(false));
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  // Read ?tab=quick or ?tab=invoice from URL
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'invoice' ? 'invoice' : 'quick';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get('tab') === 'invoice' ? 'invoice' : 'quick');
  }, [location.search]);

  // Filtered Payouts for Tab
  const visiblePayouts = payouts
    .filter((p) => (p.payoutType || 'Quick').toLowerCase() === activeTab)
    .map((p) => ({
      id: p.id || p._id,
      job: p.job ? `#${String(p.job).slice(-4)}` : (p.jobId ? `#${String(p.jobId).slice(-4)}` : 'Direct'),
      date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
      amount: `+₹${(p.netAmount || p.amount || 0).toLocaleString('en-IN')}`,
      status: (p.status || 'Pending').toUpperCase(),
    }));

  const weekEarned = (stats?.daily || []).slice(-7).reduce((sum, d) => sum + (d.amount || 0), 0);
  const weeklyTarget = stats?.weeklyTargetAmount || 0;
  const targetPercent = weeklyTarget > 0 ? Math.min(Math.round((weekEarned / weeklyTarget) * 100), 100) : null;

  const handleWithdraw = async () => {
    if (withdrawableBalance <= 0) return;
    setWithdrawSubmitting(true);
    setWithdrawError('');
    try {
      await apiRequest('/tech/earnings/payouts', {
        method: 'POST',
        auth: true,
        body: {
          amount: withdrawableBalance,
          payoutType: activeTab === 'invoice' ? 'Invoice' : 'Quick',
        },
      });
      setWithdrawStep('success');
      setWithdrawableBalance(0);
      loadPayouts();
    } catch (err) {
      setWithdrawError(err.message || 'Withdrawal request failed. Please try again.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-20 lg:pb-8 relative font-sans">

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {withdrawStep === 'confirm' ? (
              <>
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#0D47A1] mx-auto shadow-2xs">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-black text-[#052355]">Confirm Withdrawal</h3>
                  <p className="text-xs text-slate-500 mt-1">Transfer your available earnings to your verified payout account</p>
                </div>

                {withdrawError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-left text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Withdrawal Amount</span>
                    <span className="font-black text-[#052355] text-sm">₹{withdrawableBalance.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Destination Account</span>
                    <span className="font-bold text-[#052355] truncate max-w-[180px]">
                      {primaryAccount 
                        ? (primaryAccount.type === 'bank' 
                            ? `${primaryAccount.name || 'Bank'} (${primaryAccount.detail ? `•••• ${primaryAccount.detail.slice(-4)}` : 'Linked'})` 
                            : primaryAccount.detail || primaryAccount.name || 'UPI ID')
                        : 'No account linked'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Processing Fee</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">₹0 (Free)</span>
                  </div>
                </div>

                {!primaryAccount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-800 text-[11px] font-medium text-center">
                    No primary payout method configured.
                    <button 
                      onClick={() => { setShowWithdrawModal(false); navigate('/technician/payout-settings'); }}
                      className="text-[#0D47A1] font-bold underline ml-1 cursor-pointer"
                    >
                      Add Bank Account
                    </button>
                  </div>
                )}

                <div className="flex gap-3 mt-1">
                  <button 
                    onClick={() => { setShowWithdrawModal(false); setWithdrawError(''); }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleWithdraw}
                    disabled={withdrawSubmitting || !primaryAccount || withdrawableBalance <= 0}
                    className="flex-1 bg-[#0D47A1] hover:bg-[#0A3F91] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                  >
                    {withdrawSubmitting ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200 shadow-2xs">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-[#052355]">Transfer Initiated!</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Your withdrawal request has been submitted. Funds will settle to your registered account within standard clearing windows.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawStep('confirm');
                  }}
                  className="w-full bg-[#0D47A1] hover:bg-[#0A3F91] text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md mt-2 cursor-pointer"
                >
                  Great, Got it
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10 lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full text-slate-700">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-black text-[#052355]">Earnings & Payouts</h1>
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

      {/* Desktop Page Top Header Bar (lg+ only) */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#052355] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[#052355] tracking-tight">Earnings & Payouts</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Track your weekly performance, available balance and settlements</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/technician/payout-settings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              <Building2 className="h-4 w-4 text-[#0D47A1]" />
              <span>Payout Settings</span>
            </button>
            <button
              onClick={() => navigate('/technician/recent-earnings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0D47A1] text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              <FileText className="h-4 w-4 text-[#0D47A1]" />
              <span>Earnings History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3.5 lg:px-6 xl:px-8 flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 gap-4 max-w-screen-xl mx-auto w-full">

        {/* LEFT COLUMN (Desktop 5 Columns): Available Balance & Key Summaries */}
        <div className="lg:col-span-5 flex flex-col gap-4">

          {/* Available Balance Card */}
          <div className="bg-gradient-to-br from-[#052355] via-[#082E6E] to-[#0D47A1] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-blue-900/40 flex flex-col gap-4 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
              <span className="text-[11px] font-black text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" /> Withdrawable Balance
              </span>
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9.5px] font-bold text-emerald-200">Verified Funds</span>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-3xl sm:text-4xl font-black text-white leading-none">
                ₹{withdrawableBalance.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-blue-200/80 mt-2 flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-blue-300" />
                Processed & settled directly to your registered bank account
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5 relative z-10">
              <button 
                onClick={() => {
                  if (withdrawableBalance <= 0) {
                    alert('No funds currently available for withdrawal. Complete jobs to build your balance.');
                  } else {
                    setShowWithdrawModal(true);
                  }
                }}
                className="w-full bg-gradient-to-r from-[#FFD400] to-[#FFCA00] text-[#051F42] hover:brightness-105 font-black py-3.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-98"
              >
                <span>Withdraw Funds</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button 
                onClick={() => navigate('/technician/payout-settings')}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2.5 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 className="h-3.5 w-3.5 text-blue-200" />
                <span>
                  {primaryAccount 
                    ? `Linked: ${primaryAccount.name || 'Bank Account'}`
                    : 'Configure Payout Account'}
                </span>
              </button>
            </div>
          </div>

          {/* Today's Stats Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 flex-shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Earnings</span>
                <p className="text-2xl font-black text-[#052355] mt-0.5">₹{earningsTally.today.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {earningsTally.completedToday || 0} completed job{earningsTally.completedToday === 1 ? '' : 's'} today
                </p>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/technician/recent-earnings')}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-[#0D47A1] transition-colors cursor-pointer"
              title="View detailed logs"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Switcher & Breakdown */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">Payout Categories</h3>
              <span className="text-[10px] font-bold text-slate-400">Total ₹{earningsTally.total.toLocaleString('en-IN')}</span>
            </div>

            {/* Segmented Controls */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5">
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'quick'
                    ? 'bg-white text-[#052355] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Zap className={`h-3.5 w-3.5 text-amber-500 ${activeTab === 'quick' ? 'fill-amber-400' : ''}`} />
                <span>QuickPayout</span>
              </button>
              <button
                onClick={() => setActiveTab('invoice')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'invoice'
                    ? 'bg-[#052355] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>InvoicePayout</span>
              </button>
            </div>

            {/* Active Category Summary */}
            {activeTab === 'quick' ? (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">D2C On-Demand Services</span>
                  <span className="text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">Instant</span>
                </div>
                <p className="text-2xl font-black text-[#052355]">₹{earningsTally.split.quick.amount.toLocaleString('en-IN')}</p>
                <p className="text-[10.5px] text-amber-700 font-medium">
                  {earningsTally.split.quick.jobs} Jobs • Direct credited to available balance
                </p>
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#052355]">Brand Warranty & Invoices</span>
                  <span className="text-[9px] font-black text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-md">Approval Cycle</span>
                </div>
                <p className="text-2xl font-black text-[#052355]">₹{earningsTally.split.invoice.amount.toLocaleString('en-IN')}</p>
                <p className="text-[10.5px] text-slate-600 font-medium">
                  {earningsTally.split.invoice.jobs} Jobs • Verified and credited per billing schedule
                </p>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN (Desktop 7 Columns): Analytics, Chart & Recent Payouts */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Income Trends Chart Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0D47A1]" />
                <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">Income Trends</h3>
              </div>

              <div className="relative">
                <select
                  value={trendDays}
                  onChange={(e) => setTrendDays(Number(e.target.value))}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none pr-8 cursor-pointer hover:bg-slate-100"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
            
            {/* Chart Area */}
            <div className="pt-2">
              {loadingAnalytics ? (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs font-medium gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#0D47A1]" />
                  <span>Loading trends...</span>
                </div>
              ) : (stats?.daily || []).length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs font-medium gap-1 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <TrendingUp className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                  <span>No recorded earnings for this timeframe</span>
                </div>
              ) : (
                <div className="flex justify-between items-end h-44 gap-2 sm:gap-3 px-2 pt-4 pb-1">
                  {(() => {
                    const daily = stats?.daily || [];
                    const max = Math.max(...daily.map((d) => d.amount || 0), 1);
                    return daily.map((d) => {
                      const heightPercent = Math.max(Math.round(((d.amount || 0) / max) * 100), 8);
                      const isZero = (d.amount || 0) === 0;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#052355] text-white text-[10px] font-bold py-1 px-2 rounded-md shadow-md transition-opacity pointer-events-none whitespace-nowrap z-20">
                            ₹{(d.amount || 0).toLocaleString('en-IN')}
                          </div>

                          <div className="w-full bg-slate-100 rounded-t-xl h-32 flex items-end overflow-hidden">
                            <div
                              className={`w-full rounded-t-xl transition-all duration-300 ${
                                isZero 
                                  ? 'bg-slate-200 h-2' 
                                  : 'bg-gradient-to-t from-[#0D47A1] to-blue-500 group-hover:brightness-110'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            ></div>
                          </div>
                          
                          <span className="text-[10px] text-slate-500 font-bold">
                            {new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Recent Payouts Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 flex justify-between items-center border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-[#052355] uppercase tracking-wider">Recent Payout Settlements</h3>
                <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">Showing recent {activeTab === 'quick' ? 'QuickPayout' : 'InvoicePayout'} records</p>
              </div>

              <button 
                onClick={() => navigate('/technician/recent-earnings')}
                className="text-xs text-[#0D47A1] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full History</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {loadingPayouts ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#0D47A1]" />
                  <span>Loading payout history...</span>
                </div>
              ) : visiblePayouts.length === 0 ? (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-500">No {activeTab === 'quick' ? 'QuickPayout' : 'InvoicePayout'} settlements found</p>
                  <p className="text-[10.5px] text-slate-400">Completed jobs will be credited and displayed here</p>
                </div>
              ) : (
                visiblePayouts.map((p) => (
                  <div key={p.id} className="p-4 flex justify-between items-center hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        p.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-amber-50 text-amber-600 border border-amber-200/60'
                      }`}>
                        {p.status === 'SETTLED' ? (
                          <Check className="h-5 w-5 stroke-[2.5]" />
                        ) : (
                          <Clock className="h-5 w-5 stroke-[2]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#052355] truncate">Job {p.job}</h4>
                        <p className="text-[10.5px] text-slate-400 font-medium">{p.date}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <span className="text-xs sm:text-sm font-black text-emerald-700">{p.amount}</span>
                      <div className="mt-0.5">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md ${
                          p.status === 'SETTLED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Navigation */}
      <TechBottomNav activeTab="profile" />

    </div>
  );
};

export default EarningsPage;
