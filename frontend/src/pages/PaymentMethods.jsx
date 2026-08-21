import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CreditCard, ShieldCheck, X, Sparkles, RefreshCw, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

// Helper: Auto-detect card network by BIN prefix
const detectCardNetwork = (numberStr) => {
  const num = (numberStr || '').replace(/\D/g, '');
  if (/^4/.test(num)) return { name: 'Visa', color: 'bg-blue-600 text-white border-blue-700', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (/^(5[1-5]|2[2-7])/.test(num)) return { name: 'Mastercard', color: 'bg-orange-600 text-white border-orange-700', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
  if (/^(60|65|81|82|508)/.test(num)) return { name: 'RuPay', color: 'bg-emerald-600 text-white border-emerald-700', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (/^3[47]/.test(num)) return { name: 'Amex', color: 'bg-indigo-600 text-white border-indigo-700', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  if (/^(6011|65|64[4-9])/.test(num)) return { name: 'Discover', color: 'bg-amber-600 text-white border-amber-700', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
  return null;
};

// Helper: Luhn algorithm check (Modulus 10 checksum validation)
const isValidLuhn = (numberStr) => {
  const digits = (numberStr || '').replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let doubleUp = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let curDigit = parseInt(digits.charAt(i), 10);
    if (doubleUp) {
      curDigit *= 2;
      if (curDigit > 9) curDigit -= 9;
    }
    sum += curDigit;
    doubleUp = !doubleUp;
  }
  return sum % 10 === 0;
};

// Helper: Format raw digits into 4-digit groups (e.g., "4532 1234 5678 9012")
const formatCardNumberDisplay = (value) => {
  const raw = value.replace(/\D/g, '').slice(0, 16);
  return raw.replace(/(.{4})/g, '$1 ').trim();
};

// Helper: Auto-format expiry date (MM/YY)
const formatExpiryDisplay = (value) => {
  const raw = value.replace(/\D/g, '').slice(0, 4);
  if (raw.length >= 3) {
    return `${raw.slice(0, 2)}/${raw.slice(2)}`;
  }
  return raw;
};

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardTouched, setCardTouched] = useState(false);

  const [showAddUpiModal, setShowAddUpiModal] = useState(false);
  const [upiAddress, setUpiAddress] = useState('');
  const [upiBank, setUpiBank] = useState('Axis Bank');

  const detectedNetwork = detectCardNetwork(cardNumber);
  const rawDigits = cardNumber.replace(/\D/g, '');
  const isLuhnValid = rawDigits.length >= 13 && isValidLuhn(rawDigits);
  const showCardError = cardTouched && rawDigits.length >= 13 && !isLuhnValid;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      if (user) {
        const res = await apiRequest('/auth/payment-methods', { auth: true });
        const list = Array.isArray(res) ? res : [];
        setPaymentMethods(list);
        updateUser({ paymentMethods: list });
      } else {
        setPaymentMethods(user?.paymentMethods || []);
      }
    } catch (err) {
      console.warn('Error loading payment methods:', err);
      setPaymentMethods(user?.paymentMethods || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [user?.id]);

  const cards = paymentMethods.filter(pm => pm.kind === 'card' || (!pm.kind && pm.last4));
  const upis = paymentMethods.filter(pm => pm.kind === 'upi' || (!pm.kind && pm.upiAddress));

  const handleOpenAddCard = () => {
    setCardNumber('');
    setCardExpiry('');
    setCardTouched(false);
    setShowAddCardModal(true);
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!isLuhnValid || !cardExpiry || cardExpiry.length < 5) {
      setCardTouched(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cardType: detectedNetwork?.name || 'Visa',
        cardNumber: rawDigits,
        expiry: cardExpiry,
        isPrimary: cards.length === 0
      };

      const res = await apiRequest('/auth/payment-methods/tokenize-card', {
        method: 'POST',
        auth: true,
        body: payload
      });

      const updatedList = Array.isArray(res) ? res : (res || []);
      setPaymentMethods(updatedList);
      updateUser({ paymentMethods: updatedList });

      setShowAddCardModal(false);
      setCardNumber('');
      setCardExpiry('');
      showToast(`🔒 ${detectedNetwork?.name || 'Card'} tokenized & saved securely!`);
    } catch (err) {
      console.warn('Error tokenizing card:', err);
      showToast(err.message || 'Failed to tokenize card');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddUpi = async (e) => {
    e.preventDefault();
    if (!upiAddress.includes('@')) return;

    setSubmitting(true);
    try {
      const payload = {
        upiAddress: upiAddress.trim().toLowerCase(),
        upiBank,
        isPrimary: upis.length === 0
      };

      const res = await apiRequest('/auth/payment-methods/tokenize-upi', {
        method: 'POST',
        auth: true,
        body: payload
      });

      const updatedList = Array.isArray(res) ? res : (res || []);
      setPaymentMethods(updatedList);
      updateUser({ paymentMethods: updatedList });

      setShowAddUpiModal(false);
      setUpiAddress('');
      showToast('🔒 UPI tokenized & linked!');
    } catch (err) {
      console.warn('Error tokenizing UPI:', err);
      showToast(err.message || 'Failed to tokenize UPI');
    } finally {
      setSubmitting(false);
    }
  };

  const removePaymentMethod = async (id) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) return;

    try {
      const res = await apiRequest(`/auth/payment-methods/${id}`, {
        method: 'DELETE',
        auth: true
      });

      const updatedList = Array.isArray(res) ? res : (res || []);
      setPaymentMethods(updatedList);
      updateUser({ paymentMethods: updatedList });
      showToast('Payment method removed');
    } catch (err) {
      console.warn('Error removing payment method:', err);
      showToast('Failed to remove payment method');
    }
  };

  const setPrimary = async (id) => {
    try {
      const res = await apiRequest(`/auth/payment-methods/${id}/primary`, {
        method: 'PATCH',
        auth: true
      });

      const updatedList = Array.isArray(res) ? res : (res || []);
      setPaymentMethods(updatedList);
      updateUser({ paymentMethods: updatedList });
      showToast('Primary payment method updated');
    } catch (err) {
      console.warn('Error setting primary payment method:', err);
      showToast('Failed to set primary method');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 whitespace-nowrap">
          <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Payment Methods</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 sm:px-6 pt-5 max-w-3xl mx-auto w-full text-left">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading tokenized payment methods...</span>
          </div>
        ) : (
          <>
            {/* Saved Cards */}
            <div className="flex flex-col gap-2.5">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Tokenized Cards</h2>
              
              {cards.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center text-xs text-slate-400 font-semibold">
                  No saved cards. Add a card to tokenize it securely.
                </div>
              ) : (
                cards.map(card => {
                  const cardId = card._id || card.id;
                  const isPrimary = Boolean(card.isPrimary || card.primary);

                  return (
                    <div key={cardId} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">{card.cardType || card.type || 'Card'} •••• {card.last4}</span>
                            {isPrimary ? (
                              <span className="text-[8px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5" /> Primary
                              </span>
                            ) : (
                              <button 
                                onClick={() => setPrimary(cardId)} 
                                className="text-[8px] bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-0.5 rounded-full font-black uppercase transition-colors cursor-pointer"
                              >
                                Set Primary
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                            Expires {card.expiry} • Tokenized ({card.token ? card.token.substring(0, 12) + '...' : 'Protected'})
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removePaymentMethod(cardId)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Remove Card Token"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  );
                })
              )}

              <button 
                onClick={handleOpenAddCard}
                className="bg-white border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/10 rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Card</span>
              </button>
            </div>

            {/* UPI Accounts */}
            <div className="flex flex-col gap-2.5 mt-2">
              <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">UPI ID Accounts</h2>
              
              {upis.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-5 text-center text-xs text-slate-400 font-semibold">
                  No linked UPI accounts.
                </div>
              ) : (
                upis.map(upi => {
                  const upiId = upi._id || upi.id;
                  const isPrimary = Boolean(upi.isPrimary || upi.primary);

                  return (
                    <div key={upiId} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-black text-sm">
                          ₹
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">{upi.upiAddress || upi.address}</span>
                            {isPrimary ? (
                              <span className="text-[8px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5" /> Primary
                              </span>
                            ) : (
                              <button 
                                onClick={() => setPrimary(upiId)}
                                className="text-[8px] bg-slate-100 hover:bg-green-50 text-slate-500 hover:text-green-600 px-2 py-0.5 rounded-full font-black uppercase transition-colors cursor-pointer"
                              >
                                Set Primary
                              </button>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                            {upi.upiBank || upi.type || 'UPI Account'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removePaymentMethod(upiId)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Remove UPI Token"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  );
                })
              )}

              <button 
                onClick={() => setShowAddUpiModal(true)}
                className="bg-white border-2 border-dashed border-slate-200 hover:border-green-500 hover:bg-green-50/10 rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-green-600 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add New UPI ID</span>
              </button>
            </div>

            {/* Secure PCI-DSS Tokenization Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-start gap-3 mt-4 border border-slate-800 shadow-md">
              <ShieldCheck className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">
                  End-to-End PCI-DSS Tokenized
                </span>
                <p className="text-[9.5px] text-slate-300 font-medium leading-relaxed">
                  Full card numbers and CVVs are tokenized instantly in-memory into cryptographic tokens and discarded. Neither customer nor admin can view full card credentials.
                </p>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Add Card Modal with Auto-Detected Network */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-xl relative text-left animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => !submitting && setShowAddCardModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-wide">Tokenize New Card</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">Raw card details will be tokenized and discarded instantly.</p>
            
            <form onSubmit={handleAddCard} className="flex flex-col gap-4">
              
              {/* Card Number Input with Real-time Brand Detection & Luhn Validation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Card Number (Tokenized On Save)
                  </label>
                  {/* Dynamic Brand Badge (only when detected) */}
                  {detectedNetwork && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border transition-all ${detectedNetwork.badgeBg}`}>
                      {detectedNetwork.name}
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    maxLength="19"
                    placeholder="4532 XXXX XXXX 4321"
                    value={cardNumber}
                    onBlur={() => setCardTouched(true)}
                    onChange={(e) => {
                      const formatted = formatCardNumberDisplay(e.target.value);
                      setCardNumber(formatted);
                    }}
                    className={`w-full bg-slate-50 border rounded-xl pl-3 pr-10 py-2.5 text-xs font-bold text-slate-800 outline-none tracking-widest transition-all ${
                      showCardError 
                        ? 'border-rose-500 focus:ring-1 focus:ring-rose-500' 
                        : isLuhnValid 
                          ? 'border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                          : 'border-slate-200 focus:border-blue-600'
                    }`}
                    required
                  />

                  {/* Validation Icon */}
                  <div className="absolute right-3">
                    {isLuhnValid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : showCardError ? (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    ) : null}
                  </div>
                </div>

                {/* Helper validation messages */}
                {showCardError && (
                  <span className="text-[9.5px] font-bold text-rose-500 pl-1">
                    Invalid card number (checksum failed)
                  </span>
                )}
                {isLuhnValid && (
                  <span className="text-[9.5px] font-bold text-emerald-600 pl-1">
                    Valid {detectedNetwork?.name || 'card'} number
                  </span>
                )}
              </div>

              {/* Expiry Date Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Expiry Date (MM/YY)</label>
                <input 
                  type="text" 
                  placeholder="12/28"
                  maxLength="5"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiryDisplay(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
                  required
                />
              </div>

              {/* Tokenize Button */}
              <button 
                type="submit" 
                disabled={submitting || !isLuhnValid || cardExpiry.length < 5}
                className="bg-[#0D47A1] hover:bg-[#09357A] text-white py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Tokenizing Card...</span>
                  </>
                ) : (
                  <span>Tokenize & Save Card</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add UPI Modal */}
      {showAddUpiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6 shadow-xl relative text-left animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => !submitting && setShowAddUpiModal(false)}
              className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
            <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-wide">Link UPI ID</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">Link your VPA for quick tokenized payments.</p>

            <form onSubmit={handleAddUpi} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">UPI ID Address</label>
                <input 
                  type="text" 
                  placeholder="username@okaxis"
                  value={upiAddress}
                  onChange={(e) => setUpiAddress(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-green-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Link Bank Account</label>
                <select 
                  value={upiBank} 
                  onChange={(e) => setUpiBank(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-green-600"
                >
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Paytm Payments Bank">Paytm Payments Bank</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={submitting || !upiAddress.includes('@')}
                className="bg-[#0D47A1] hover:bg-[#09357A] text-white py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Tokenizing UPI...</span>
                  </>
                ) : (
                  <span>Tokenize & Link UPI</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaymentMethods;


