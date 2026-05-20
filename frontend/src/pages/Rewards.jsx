import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Gift, Ticket, Award, Coins } from 'lucide-react';

const Rewards = () => {
  const navigate = useNavigate();
  const [coins, setCoins] = useState(250);
  const [scratched, setScratched] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col h-[700px] border border-slate-100 relative">
        
        {/* Header */}
        <div className="p-5 flex items-center border-b border-slate-100 flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-base font-extrabold text-[#0D47A1] ml-3">Nigam Super Rewards</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto pb-10">
          
          {/* Points Balance Card */}
          <div className="bg-gradient-to-br from-[#072C63] via-[#0A3D80] to-[#0D47A1] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col gap-4">
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD400]/10 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-white/75 font-bold uppercase tracking-wider block">SuperCoin Balance</span>
                <span className="text-3xl font-extrabold flex items-center gap-1.5 mt-1">
                  ⚡ {coins}
                </span>
              </div>
              <Coins className="h-10 w-10 text-[#FFD400] animate-bounce" />
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-between items-center text-[10px] uppercase font-bold text-white/90">
              <span>Next Milestone: 500 Coins</span>
              <span className="text-[#FFD400]">Plus Gold Level</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
              <div className="bg-[#FFD400] h-1.5 rounded-full" style={{ width: '50%' }}></div>
            </div>
          </div>

          {/* Interactive Scratch Card */}
          <div className="flex flex-col gap-2.5">
            <h2 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">Your Daily Mystery Reward</h2>
            <div 
              onClick={() => {
                if (!scratched) {
                  setCoins(c => c + 150);
                  setScratched(true);
                }
              }}
              className={`h-36 rounded-2xl border-2 border-dashed border-[#BACBE7] flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${
                scratched ? 'bg-emerald-50/40 border-emerald-300' : 'bg-slate-50 hover:bg-blue-50/30'
              }`}
            >
              {!scratched ? (
                <>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2 animate-pulse">
                    <Gift className="h-6 w-6 text-[#0D47A1]" />
                  </div>
                  <span className="text-xs font-extrabold text-[#0D47A1]">TAP TO SCRATCH CARD</span>
                  <span className="text-[9px] text-text-secondary mt-1">Win up to 500 SuperCoins</span>
                </>
              ) : (
                <div className="text-center animate-[scaleIn_0.3s_ease-out]">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest block">CONGRATULATIONS!</span>
                  <span className="text-lg font-black text-emerald-600 block mt-0.5">+150 SuperCoins Credited</span>
                </div>
              )}
            </div>
          </div>

          {/* Milestones and Benefits */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">Milestone Benefits</h2>
            
            <div className="flex flex-col gap-2.5">
              {[
                { title: 'Free Home Inspection', desc: 'Valid at 200 SuperCoins', active: true, icon: Award },
                { title: 'Priority Support Access', desc: 'Unlock at 300 SuperCoins', active: false, icon: Ticket },
                { title: '10% Extra Appliance Discounts', desc: 'Unlock at 500 SuperCoins', active: false, icon: Gift }
              ].map((m, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${m.active ? 'bg-blue-50 text-[#0D47A1]' : 'bg-slate-100 text-slate-400'}`}>
                      <m.icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-text-primary block">{m.title}</span>
                      <span className="text-[9px] text-text-secondary mt-0.5 block">{m.desc}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    m.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {m.active ? 'Active' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Rewards;
