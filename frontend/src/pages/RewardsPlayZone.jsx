import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Star } from 'lucide-react';

const WHEEL_SEGMENTS = [
  { label: '₹50', color: '#FF6B6B' },
  { label: '50 Coins', color: '#4ECDC4' },
  { label: '₹25', color: '#45B7D1' },
  { label: '100 Coins', color: '#FFA07A' },
  { label: 'Try Again', color: '#98D8C8' },
  { label: '₹100', color: '#DDA0DD' },
  { label: '25 Coins', color: '#F0E68C' },
  { label: 'Extra Spin', color: '#87CEEB' },
];

const RewardsPlayZone = () => {
  const navigate = useNavigate();
  const [coins] = useState(2,450);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [lastResult, setLastResult] = useState(null);

  const handleSpin = () => {
    if (spinning || spinsLeft === 0) return;
    const extraRotation = 1440 + Math.floor(Math.random() * 360);
    const newRotation = rotation + extraRotation;
    setRotation(newRotation);
    setSpinning(true);
    setSpinsLeft((s) => s - 1);
    setTimeout(() => {
      setSpinning(false);
      const idx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
      setLastResult(WHEEL_SEGMENTS[idx].label);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex flex-col pb-10">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-sm border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-sm font-black text-slate-900">Rewards & Play Zone</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* Top Row: My Coins + My Level */}
        <div className="grid grid-cols-2 gap-3">
          {/* My Coins */}
          <div className="bg-[#0D47A1] rounded-2xl p-4 flex flex-col gap-1 shadow-md">
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">⚡</span>
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">My Coins</span>
            </div>
            <span className="text-white text-2xl font-black">2,450</span>
            <button
              onClick={() => alert('Coin history loading...')}
              className="text-blue-300 text-[10px] font-extrabold text-left hover:underline mt-0.5 cursor-pointer"
            >
              View History
            </button>
          </div>

          {/* My Level */}
          <div className="bg-[#0D47A1] rounded-2xl p-4 flex flex-col gap-1 shadow-md">
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">My Level</span>
              <div className="w-7 h-7 bg-gradient-to-tr from-[#FFD54F] to-[#FF8F00] rounded-full flex items-center justify-center">
                <Star className="h-3.5 w-3.5 text-white fill-white" />
              </div>
            </div>
            <span className="text-white text-2xl font-black">Level 4</span>
            <span className="text-blue-300 text-[10px] font-bold">1,250 / 2,000 XP</span>
            {/* XP Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
              <div className="bg-[#FFD54F] h-1.5 rounded-full" style={{ width: '62.5%' }}></div>
            </div>
          </div>
        </div>

        {/* Spin & Win */}
        <div className="bg-[#0D2B6B] rounded-2xl p-4 shadow-md flex justify-between items-center gap-4 relative overflow-hidden">
          <div className="flex flex-col gap-2 z-10">
            <h3 className="text-white text-sm font-black">Spin & Win</h3>
            <p className="text-blue-200 text-[10px] font-semibold leading-snug">Play the wheel & win coins</p>
            <button
              onClick={handleSpin}
              disabled={spinning || spinsLeft === 0}
              className={`bg-[#FFDF00] hover:bg-yellow-300 text-[#0D2B6B] text-xs font-black px-5 py-2 rounded-xl mt-1 transition-all cursor-pointer shadow-sm ${spinning || spinsLeft === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {spinning ? 'Spinning...' : 'Spin Now'}
            </button>
            <span className="text-blue-300 text-[9px] font-bold mt-0.5">{spinsLeft} Free Spins Available</span>
            {lastResult && !spinning && (
              <span className="text-[#FFDF00] text-[10px] font-black mt-0.5">🎉 You won: {lastResult}</span>
            )}
          </div>

          {/* Spin Wheel (CSS) */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <div
              className="w-28 h-28 rounded-full border-4 border-[#FFDF00] shadow-lg overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                background: `conic-gradient(
                  #FF6B6B 0deg 45deg,
                  #4ECDC4 45deg 90deg,
                  #45B7D1 90deg 135deg,
                  #FFA07A 135deg 180deg,
                  #98D8C8 180deg 225deg,
                  #DDA0DD 225deg 270deg,
                  #F0E68C 270deg 315deg,
                  #87CEEB 315deg 360deg
                )`,
              }}
            >
              {WHEEL_SEGMENTS.map((seg, i) => (
                <div
                  key={i}
                  className="absolute inset-0 flex items-center justify-end pr-2"
                  style={{ transform: `rotate(${i * 45 + 22.5}deg)` }}
                >
                  <span className="text-[7px] font-black text-white drop-shadow" style={{ writingMode: 'horizontal-tb' }}>
                    {seg.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Center pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-[#FFDF00] z-10 shadow-md"></div>
            {/* Pointer */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '12px solid #FFDF00' }}></div>
          </div>
        </div>

        {/* Daily Tasks */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-black text-slate-800 px-1">Daily Tasks</h3>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col divide-y divide-slate-100">
            {[
              { icon: '📅', task: 'Book a Service', reward: '+50 Coins', done: false },
              { icon: '⭐', task: 'Write a Review', reward: '+20 Coins', done: true },
              { icon: '👥', task: 'Refer a Friend', reward: '+100 Coins', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs font-bold text-slate-800">{item.task}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-extrabold text-[#0D47A1]">{item.reward}</span>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <button
                      onClick={() => alert(`Task: ${item.task} - Redirecting...`)}
                      className="text-[10px] font-black text-[#0D47A1] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      Go
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RewardsPlayZone;
