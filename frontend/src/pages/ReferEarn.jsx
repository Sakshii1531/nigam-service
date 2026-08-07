import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Copy, Check, Share2, Coins, Sparkles, Trophy, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ReferEarn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showEarnedToast, setShowEarnedToast] = useState(false);
  
  const referralCode = user?.referralCode || (user?.name ? `${user.name.split(' ')[0].toUpperCase()}100` : 'NCCGOLD100');
  const userCoins = user?.walletCoins || 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setShowEarnedToast(true);
    setTimeout(() => {
      setCopied(false);
      setShowEarnedToast(false);
    }, 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Nigam Care Services - Refer & Earn',
        text: `Use my referral code ${referralCode} to get 10% OFF on your first home appliance service booking!`,
        url: window.location.origin
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10 relative">
      {/* Toast Alert */}
      {showEarnedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 z-[999] animate-bounce text-xs font-black">
          <Sparkles className="h-4 w-4" />
          <span>Referral Code Copied to Clipboard!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 relative">
        <button
          onClick={() => navigate('/profile')}
          className="absolute left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Refer & Earn</h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-5 flex flex-col gap-6 max-w-3xl mx-auto w-full text-left">
        
        {/* Banner Card */}
        <div className="bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#0A2D6C] rounded-[28px] p-6 text-white shadow-md relative overflow-hidden border border-white/5 flex flex-col gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] bg-white/10 text-blue-200 border border-white/10 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start">
                Nigam Rewards Club
              </span>
              <h2 className="text-xl font-black tracking-wide leading-tight mt-1.5">
                Invite Friends,<br/>Earn Real Coins!
              </h2>
            </div>
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0">
              <Gift className="h-7 w-7 text-amber-300 animate-pulse" />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mt-1 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-blue-200 font-bold block uppercase">Your Current Balance</span>
              <span className="text-lg font-black text-white mt-0.5 block flex items-center gap-1">
                <Coins className="h-5 w-5 text-[#FFD54F]" /> {userCoins.toLocaleString('en-IN')} Coins
              </span>
            </div>
            <button 
              onClick={() => navigate('/rewards-play-zone')}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              Play Zone
            </button>
          </div>
        </div>

        {/* Info detail */}
        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed px-2 text-center">
          Share the love with your friends. Get <span className="text-[#0D47A1] font-black">100 Coins reward</span> in your wallet when they book their first service, and they get <span className="text-emerald-600 font-black">10% OFF</span>!
        </p>

        {/* Code Box */}
        <div className="bg-white border border-slate-150 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block pl-1">
            Your Referral Code
          </span>
          <div className="flex bg-[#F8FAFC] border border-slate-200/50 rounded-2xl p-4 items-center justify-between">
            <span className="text-sm font-black text-[#0D47A1] font-mono tracking-widest pl-2">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-black text-[#0D47A1] hover:underline cursor-pointer border border-[#0D47A1]/20 rounded-xl px-3.5 py-1.5 bg-white shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-black">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* How it Works */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider px-1">
            How it works
          </h3>
          
          <div className="bg-white border border-slate-150 p-5 rounded-3xl shadow-2xs flex flex-col gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#0D47A1] flex items-center justify-center text-xs font-black flex-shrink-0">
                1
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-800">Share Code</h4>
                <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  Send your unique referral code or link to friends via WhatsApp or SMS.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-50 pt-4">
              <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-800">Friend Books</h4>
                <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  They sign up and complete their first service booking using your referral code.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-50 pt-4">
              <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                3
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-800">Get Rewarded</h4>
                <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  You get 100 Coins credited to your Nigam Super Rewards wallet and your friend receives 10% off their booking!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mt-2"
        >
          <Share2 className="h-4.5 w-4.5" />
          <span>Share & Earn 100 Coins</span>
        </button>
      </div>
    </div>
  );
};

export default ReferEarn;
