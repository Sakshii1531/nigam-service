import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Copy, Check, Share2 } from 'lucide-react';

const ReferEarn = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const referralCode = 'SAKSHI100';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'NCC Services - Refer & Earn',
        text: `Use my referral code ${referralCode} to get 10% off on your first service booking!`,
        url: window.location.origin
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center justify-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Refer & Earn</h1>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-6 flex flex-col gap-6 items-center text-center">
        {/* Gift Box Illustration */}
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 shadow-inner mt-4">
          <Gift className="h-12 w-12 drop-shadow-md" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-black text-slate-900 leading-snug">
            Invite Friends, Earn Rewards!
          </h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
            Share the love with your friends. Get <span className="text-[#0D47A1] font-black">₹100 cashback</span> in your wallet when they book their first service, and they get <span className="text-emerald-600 font-black">10% off</span>!
          </p>
        </div>

        {/* Code Box */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4.5 w-full max-w-sm shadow-xs flex flex-col gap-3.5 mt-2">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
            Your Referral Code
          </span>
          <div className="flex bg-[#F8FAFC] border border-slate-100 rounded-xl p-3.5 items-center justify-between">
            <span className="text-sm font-black text-slate-800 tracking-widest pl-2">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] font-black text-[#0D47A1] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* How it Works */}
        <div className="w-full max-w-sm flex flex-col items-start gap-4 text-left mt-4 bg-white border border-slate-100 p-5 rounded-[24px] shadow-2xs">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
            How it works
          </h3>
          <div className="flex flex-col gap-3.5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0D47A1] flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="text-[11.5px] font-black text-slate-800">Share Code</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  Send your unique referral code or link to friends.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0D47A1] flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="text-[11.5px] font-black text-slate-800">Friend Books</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  They sign up and complete their first service booking using your code.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0D47A1] flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="text-[11.5px] font-black text-slate-800">Get Rewarded</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  You get ₹100 wallet cashback and your friend receives 10% off their booking!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="w-full max-w-sm bg-[#0D47A1] hover:bg-blue-800 text-white text-xs font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md mt-4"
        >
          <Share2 className="h-4.5 w-4.5" />
          <span>Share with Friends</span>
        </button>
      </div>
    </div>
  );
};

export default ReferEarn;
