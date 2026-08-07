import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, Briefcase, ClipboardList, Calendar, Wrench, User,
  CreditCard, Plus, X, Building2, CheckCircle, ChevronRight
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

const PayoutSettings = () => {
  const navigate = useNavigate();

  // Payout methods live on the technician's profile — they have to survive a
  // reinstall and be the same account payouts actually settle to.
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');

  const loadAccounts = React.useCallback(async () => {
    try {
      const res = await apiRequest('/tech/profile/profile', { auth: true });
      setAccounts((res.data?.payoutMethods || []).map((m) => ({
        id: m._id || m.id,
        type: m.type,
        name: m.name || m.upiId || (m.type === 'bank' ? 'Bank Account' : 'UPI'),
        detail: m.detail || (m.type === 'upi' ? m.upiId : ''),
        primary: Boolean(m.isPrimary),
      })));
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load payout methods.');
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  // Modal states
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showUpiForm, setShowUpiForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Bank form state
  const [bankForm, setBankForm] = useState({
    bankName: '', accountNo: '', confirmAccountNo: '', ifsc: '', holderName: ''
  });

  // UPI form state
  const [upiId, setUpiId] = useState('');

  const resetAll = () => {
    setShowMethodPicker(false);
    setShowBankForm(false);
    setShowUpiForm(false);
    setBankForm({ bankName: '', accountNo: '', confirmAccountNo: '', ifsc: '', holderName: '' });
    setUpiId('');
  };

  const handleAddBank = async () => {
    if (!bankForm.bankName || !bankForm.accountNo || !bankForm.ifsc || !bankForm.holderName) return;
    if (bankForm.accountNo !== bankForm.confirmAccountNo) {
      setError('Account numbers do not match.');
      return;
    }
    try {
      await apiRequest('/tech/profile/payout-methods', {
        method: 'POST',
        auth: true,
        body: {
          type: 'bank',
          name: bankForm.bankName,
          accountNo: bankForm.accountNo,
          ifsc: bankForm.ifsc,
          holderName: bankForm.holderName,
          isPrimary: accounts.length === 0,
        },
      });
      await loadAccounts();
    } catch (err) {
      setError(err.message || 'Could not add bank account.');
      return;
    }
    resetAll();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleAddUpi = async () => {
    if (!upiId.includes('@')) return;
    try {
      await apiRequest('/tech/profile/payout-methods', {
        method: 'POST',
        auth: true,
        body: { type: 'upi', name: upiId, upiId, isPrimary: accounts.length === 0 },
      });
      await loadAccounts();
    } catch (err) {
      setError(err.message || 'Could not add UPI ID.');
      return;
    }
    resetAll();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const anyModalOpen = showMethodPicker || showBankForm || showUpiForm;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 max-w-md mx-auto border-x border-slate-100 shadow-sm relative overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded-full">
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Payout Settings</h1>
        </div>
        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors relative">
          <Bell className="h-5 w-5 text-slate-700" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-4">

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-[11px] font-semibold text-rose-600">
            {error}
          </div>
        )}

        {/* Payment Methods */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Methods</h3>
          <div className="flex flex-col gap-3">
            {accounts.length === 0 && (
              <p className="text-[11px] text-slate-400 font-medium">No payout method added yet.</p>
            )}
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E3ECF9] rounded-full flex items-center justify-center">
                    {acc.type === 'bank' ? (
                      <CreditCard className="h-5 w-5 text-[#0D47A1]" />
                    ) : (
                      <div className="font-bold text-[#0D47A1] text-sm">UPI</div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{acc.name}</h4>
                    <p className="text-xs text-slate-500">{acc.detail}</p>
                  </div>
                </div>
                {acc.primary && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add New Method Button */}
        <button
          onClick={() => setShowMethodPicker(true)}
          className="w-full border border-dashed border-slate-300 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Payment Method
        </button>

      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-4 w-4" />
          Payment method added successfully!
        </div>
      )}

      {/* Backdrop */}
      {anyModalOpen && (
        <div
          className="fixed inset-0 bg-[#052355]/40 backdrop-blur-sm z-30"
          onClick={resetAll}
        />
      )}

      {/* Step 1: Method Picker Bottom Sheet */}
      {showMethodPicker && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-40 shadow-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-[#052355]">Add Payment Method</h2>
            <button onClick={resetAll} className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          <div className="p-5 flex flex-col gap-3 pb-28">
            <p className="text-xs text-slate-500 mb-1">Select the type of payment method to add:</p>

            {/* Bank Account Option */}
            <button
              onClick={() => { setShowMethodPicker(false); setShowBankForm(true); }}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#0D47A1]/40 hover:bg-blue-50/30 transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-[#0D47A1]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#052355]">Bank Account</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Add savings or current bank account</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>

            {/* UPI Option */}
            <button
              onClick={() => { setShowMethodPicker(false); setShowUpiForm(true); }}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#0D47A1]/40 hover:bg-blue-50/30 transition-all text-left"
            >
              <div className="w-12 h-12 bg-[#E3ECF9] rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-[#0D47A1] font-bold text-sm">UPI</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#052355]">UPI ID</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Link your UPI ID (e.g. name@upi)</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2a: Bank Account Form */}
      {showBankForm && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-40 shadow-2xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowBankForm(false); setShowMethodPicker(true); }}
                className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <h2 className="text-sm font-bold text-[#052355]">Add Bank Account</h2>
            </div>
            <button onClick={resetAll} className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          <div className="p-5 flex flex-col gap-4 pb-8">

            {/* Bank Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Bank Name</label>
              <input
                type="text"
                placeholder="e.g. State Bank of India"
                value={bankForm.bankName}
                onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#0D47A1] bg-slate-50"
              />
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Account Holder Name</label>
              <input
                type="text"
                placeholder="As per bank records"
                value={bankForm.holderName}
                onChange={e => setBankForm(p => ({ ...p, holderName: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#0D47A1] bg-slate-50"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Account Number</label>
              <input
                type="number"
                placeholder="Enter account number"
                value={bankForm.accountNo}
                onChange={e => setBankForm(p => ({ ...p, accountNo: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#0D47A1] bg-slate-50"
              />
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Confirm Account Number</label>
              <input
                type="number"
                placeholder="Re-enter account number"
                value={bankForm.confirmAccountNo}
                onChange={e => setBankForm(p => ({ ...p, confirmAccountNo: e.target.value }))}
                className={`w-full border rounded-xl px-3.5 py-3 text-xs focus:outline-none bg-slate-50 ${
                  bankForm.confirmAccountNo && bankForm.accountNo !== bankForm.confirmAccountNo
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-200 focus:border-[#0D47A1]'
                }`}
              />
              {bankForm.confirmAccountNo && bankForm.accountNo !== bankForm.confirmAccountNo && (
                <p className="text-[10px] text-red-500 mt-1">Account numbers do not match</p>
              )}
            </div>

            {/* IFSC Code */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">IFSC Code</label>
              <input
                type="text"
                placeholder="e.g. SBIN0001234"
                value={bankForm.ifsc}
                onChange={e => setBankForm(p => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#0D47A1] bg-slate-50 font-mono tracking-widest"
              />
            </div>

            <p className="text-[10px] text-slate-400">
              ⚠️ Please ensure the account details are correct. Incorrect details may cause payout delays.
            </p>

            <button
              onClick={handleAddBank}
              disabled={!bankForm.bankName || !bankForm.accountNo || !bankForm.ifsc || !bankForm.holderName || bankForm.accountNo !== bankForm.confirmAccountNo}
              className="w-full bg-[#0D47A1] disabled:bg-slate-300 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-sm hover:bg-[#0A3F91]"
            >
              Add Bank Account
            </button>
          </div>
        </div>
      )}

      {/* Step 2b: UPI Form */}
      {showUpiForm && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-40 shadow-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowUpiForm(false); setShowMethodPicker(true); }}
                className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <h2 className="text-sm font-bold text-[#052355]">Add UPI ID</h2>
            </div>
            <button onClick={resetAll} className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          <div className="p-5 flex flex-col gap-4 pb-8">

            <div className="w-16 h-16 bg-[#E3ECF9] rounded-2xl flex items-center justify-center mx-auto mb-1">
              <span className="text-[#0D47A1] font-bold text-lg">UPI</span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">UPI ID</label>
              <input
                type="text"
                placeholder="yourname@upi"
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-[#0D47A1] bg-slate-50"
              />
              {upiId && !upiId.includes('@') && (
                <p className="text-[10px] text-red-500 mt-1">Please enter a valid UPI ID (must include @)</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-[10px] text-[#0D47A1] font-medium">Supported UPI handles</p>
              <p className="text-[10px] text-slate-500 mt-0.5">@okaxis, @oksbi, @okicici, @ybl, @upi, @paytm, @gpay and more</p>
            </div>

            <p className="text-[10px] text-slate-400">
              ⚠️ Make sure your UPI ID is linked to a valid bank account. Payouts will be transferred directly.
            </p>

            <button
              onClick={handleAddUpi}
              disabled={!upiId.includes('@')}
              className="w-full bg-[#0D47A1] disabled:bg-slate-300 disabled:text-slate-400 text-white font-semibold py-3.5 rounded-xl text-xs transition-all shadow-sm hover:bg-[#0A3F91]"
            >
              Verify & Add UPI ID
            </button>
          </div>
        </div>
      )}

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

export default PayoutSettings;
