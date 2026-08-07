import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Star, Sparkles, Trophy, Award, Coins, 
  ArrowUpRight, Play, RefreshCw, Flame, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';

// Clean, vibrant segment color palette matching app aesthetics
const PRESET_COLORS = [
  { color: '#14B8A6', textColor: '#FFFFFF', icon: '🪙' },
  { color: '#F43F5E', textColor: '#FFFFFF', icon: '🎟️' },
  { color: '#F59E0B', textColor: '#FFFFFF', icon: '🪙' },
  { color: '#8B5CF6', textColor: '#FFFFFF', icon: '⚡' },
  { color: '#3B82F6', textColor: '#FFFFFF', icon: '💎' },
  { color: '#10B981', textColor: '#FFFFFF', icon: '🎁' },
  { color: '#EC4899', textColor: '#FFFFFF', icon: '🌟' },
  { color: '#D97706', textColor: '#FFFFFF', icon: '🔥' },
];

// Helper to convert polar coordinates to Cartesian for SVG path drawing
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', x, y,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

// Victory Confetti particle generator
const ConfettiEffect = () => {
  const particles = useMemo(() => {
    const colors = ['#F59E0B', '#F43F5E', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    return Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 280,
      y: -Math.random() * 180 - 40,
      rotation: Math.random() * 360,
      scale: Math.random() * 0.5 + 0.6,
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40 flex items-center justify-center">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.2, rotate: 0 }}
          animate={{ 
            x: p.x, 
            y: [0, p.y * 0.5, p.y + 120], 
            opacity: [1, 1, 0],
            rotate: p.rotation,
            scale: p.scale
          }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute"
          style={{
            width: 8,
            height: 12,
            borderRadius: 2,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
};

const RewardsPlayZone = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [lastResult, setLastResult] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [wheelSegments, setWheelSegments] = useState([]);
  const [wheelError, setWheelError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Which one-time rewards are already claimed is recorded in the wallet ledger,
  // not this browser — the previous localStorage list could be cleared to claim
  // the same reward (and real coins) again.
  const [claimedIds, setClaimedIds] = useState([]);
  useEffect(() => {
    if (!user) return;
    apiRequest('/wallet/claims', { auth: true })
      .then((res) => setClaimedIds(res.data || []))
      .catch((err) => console.warn('[rewards] Could not load claimed rewards:', err.message));
  }, [user]);

  const [tasks, setTasks] = useState([
    { id: 'book_service', icon: '📅', task: 'Book a Service', reward: 50, rewardLabel: '+50 Coins', done: false, targetPath: '/booking' },
    { id: 'write_review', icon: '⭐', task: 'Write a Review', reward: 20, rewardLabel: '+20 Coins', done: false, targetPath: '/partner-warranty/rate-service' },
    { id: 'refer_friend', icon: '👥', task: 'Refer a Friend', reward: 100, rewardLabel: '+100 Coins', done: false, targetPath: '/refer-earn' },
  ]);

  const fetchTasksData = async () => {
    if (!user) return;
    try {
      const bookingsRes = await apiRequest('/bookings', { auth: true });
      const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes?.data || []);
      const isBookingDone = bookingsList.length > 0;

      const reviewsRes = await apiRequest('/reviews/user/reviews', { auth: true });
      const reviewsList = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes?.data || []);
      const isReviewDone = reviewsList.length > 0;

      const userRes = await apiRequest('/auth/me', { auth: true });
      const userData = userRes?.data || userRes;
      const isReferralDone = (userData?.referralsCount || 0) > 0;
      
      if (userData) {
        const updates = {};
        if (typeof userData.walletCoins === 'number') {
          setCoins(userData.walletCoins);
          updates.walletCoins = userData.walletCoins;
        }
        if (typeof userData.level === 'number') {
          setLevel(userData.level);
          updates.level = userData.level;
        }
        if (typeof userData.xp === 'number') {
          setXp(userData.xp);
          updates.xp = userData.xp;
        }
        if (Object.keys(updates).length > 0) {
          updateUser(updates);
        }
      }

      setTasks([
        { id: 'book_service', icon: '📅', task: 'Book a Service', reward: 50, rewardLabel: '+50 Coins', done: isBookingDone, targetPath: '/booking' },
        { id: 'write_review', icon: '⭐', task: 'Write a Review', reward: 20, rewardLabel: '+20 Coins', done: isReviewDone, targetPath: '/partner-warranty/rate-service' },
        { id: 'refer_friend', icon: '👥', task: 'Refer a Friend', reward: 100, rewardLabel: '+100 Coins', done: isReferralDone, targetPath: '/refer-earn' },
      ]);
    } catch (err) {
      console.warn('Error loading real tasks progress:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchWalletCoins = async () => {
    try {
      const res = await apiRequest('/wallet', { auth: true });
      const walletData = res?.data || res;
      if (walletData) {
        const updates = {};
        if (typeof walletData.coins === 'number') {
          setCoins(walletData.coins);
          updates.walletCoins = walletData.coins;
        }
        if (typeof walletData.level === 'number') {
          setLevel(walletData.level);
          updates.level = walletData.level;
        }
        if (typeof walletData.xp === 'number') {
          setXp(walletData.xp);
          updates.xp = walletData.xp;
        }
        if (typeof walletData.spins === 'number') {
          setSpinsLeft(walletData.spins);
          updates.spinsLeft = walletData.spins;
        }
        if (Object.keys(updates).length > 0) {
          updateUser(updates);
        }
      }
    } catch (err) {
      console.warn('Error fetching wallet coins:', err);
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchWheelConfig = async () => {
    try {
      const res = await apiRequest('/wallet/spin-wheel/config');
      const config = res?.data || res;
      if (config && Array.isArray(config.segments) && config.segments.length >= 2) {
        const formatted = config.segments.map((s, index) => {
          const preset = PRESET_COLORS[index % PRESET_COLORS.length];
          return {
            label: s.label?.toUpperCase() || 'REWARD',
            winningType: s.winningType || 'none',
            value: s.value || 0,
            probability: s.probability || 0,
            icon: s.winningType === 'spin' ? '🎟️' : s.winningType === 'coins' ? '🪙' : preset.icon,
            color: preset.color,
            textColor: preset.textColor
          };
        });
        setWheelSegments(formatted);
        setWheelError('');
      } else {
        // No fallback wheel: the segments carry real coin values, and a
        // hardcoded set would let a customer win prizes the platform never
        // configured. Spinning stays disabled until an admin publishes one.
        setWheelSegments([]);
        setWheelError('The spin wheel is not configured yet. Please check back soon.');
      }
    } catch (err) {
      console.warn('Error fetching spin wheel config:', err);
      setWheelSegments([]);
      setWheelError(err.message || 'Could not load the spin wheel.');
    }
  };

  useEffect(() => {
    fetchWheelConfig();
  }, []);

  useEffect(() => {
    if (user) {
      if (!hasLoaded) {
        setHasLoaded(true);
        fetchWalletCoins();
        fetchTasksData();
      }
    } else {
      setHasLoaded(false);
      setLoadingCoins(false);
      setLoadingTasks(false);
    }
  }, [user, hasLoaded]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSpin = async () => {
    if (spinning || spinsLeft === 0 || wheelSegments.length === 0) return;

    try {
      setSpinning(true);
      setShowConfetti(false);
      const res = await apiRequest('/wallet/spin-wheel/spin', { method: 'POST', auth: true });
      const spinData = res?.data || res;
      
      let winIndex = typeof spinData?.winIndex === 'number' ? spinData.winIndex : 0;
      winIndex = winIndex % wheelSegments.length;

      const wonSegment = wheelSegments[winIndex];

      if (typeof spinData?.spinsLeft === 'number') {
        setSpinsLeft(spinData.spinsLeft);
      } else {
        setSpinsLeft((prev) => Math.max(prev - 1, 0));
      }

      const numSegments = wheelSegments.length;
      const segmentAngle = 360 / numSegments;
      const targetOffset = (winIndex * segmentAngle) + (segmentAngle / 2);
      
      const currentAngle = rotation % 360;
      const targetAngle = (360 - targetOffset) % 360;
      let angleDiff = targetAngle - currentAngle;
      if (angleDiff <= 0) {
        angleDiff += 360;
      }
      const newRotation = rotation + 1800 + angleDiff;
      
      setRotation(newRotation);
      setLastResult(null);

      setTimeout(() => {
        setSpinning(false);
        setLastResult(wonSegment);
        setShowConfetti(true);

        if (spinData && typeof spinData.coins === 'number') {
          setCoins(spinData.coins);
          setLevel(spinData.level || level);
          setXp(spinData.xp || xp);
          updateUser({
            walletCoins: spinData.coins,
            level: spinData.level || level,
            xp: spinData.xp || xp,
            spinsLeft: spinData.spinsLeft
          });
        }

        if (wonSegment.winningType === 'spin') {
          triggerToast(`🎉 Awesome! Won ${wonSegment.label} + 20 XP!`);
        } else if (wonSegment.winningType === 'coins' || wonSegment.winningType === 'money') {
          triggerToast(`🏆 Won ${wonSegment.label}!`);
        } else {
          triggerToast('✨ Earned 20 Participation XP.');
        }
      }, 3600);

    } catch (err) {
      setSpinning(false);
      console.warn('Error during spin:', err);
      triggerToast(err.message || 'Spin failed. Please try again.');
    }
  };

  const handleClaimReward = async (task) => {
    if (!task.done || claimedIds.includes(task.id)) return;
    
    try {
      const res = await apiRequest('/wallet/credit', {
        method: 'POST',
        auth: true,
        body: {
          amount: task.reward,
          xp: task.reward,
          reason: task.id === 'refer_friend' ? 'referral' : 'earned',
          claimKey: task.id,
        }
      });

      setClaimedIds((prev) => [...prev, task.id]);
      
      const update = res?.data || res;
      if (update) {
        const updates = {};
        if (typeof update.coins === 'number') {
          setCoins(update.coins);
          updates.walletCoins = update.coins;
        }
        if (typeof update.level === 'number') {
          setLevel(update.level);
          updates.level = update.level;
        }
        if (typeof update.xp === 'number') {
          setXp(update.xp);
          updates.xp = update.xp;
        }
        if (Object.keys(updates).length > 0) {
          updateUser(updates);
        }
      } else {
        await fetchWalletCoins();
      }
      
      triggerToast(`Successfully claimed +${task.reward} Coins & XP!`);
    } catch (err) {
      // 409 means the server already has this claim — reflect that rather than
      // leaving the button live.
      if (err.status === 409) setClaimedIds((prev) => [...prev, task.id]);
      triggerToast(err.message || 'Could not claim that reward.');
    }
  };

  const currentXpProgress = xp % 1000;
  const progressPercentage = Math.min(((currentXpProgress / 1000) * 100), 100);

  // SVG wheel geometry
  const SVG_SIZE = 260;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 118;
  const numSegs = wheelSegments.length;
  const segmentAngle = 360 / Math.max(numSegs, 1);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-12 relative overflow-x-hidden">
      
      {showConfetti && <ConfettiEffect />}

      {/* Header matching App Style */}
      <div className="bg-white/90 backdrop-blur-md px-5 py-4 flex items-center gap-3 sticky top-0 z-50 shadow-xs border-b border-slate-100">
        <button
          onClick={() => navigate('/profile')}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">Rewards & Play Zone</h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Spin the wheel and claim daily rewards</p>
        </div>
      </div>

      {/* Floating Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-amber-400 animate-spin" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5 px-4 pt-5 max-w-md mx-auto w-full">

        {/* Dashboard Banner: Coins & Level */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[24px] p-5 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
            {/* Coins */}
            <div className="flex flex-col text-left pr-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-[9px] uppercase tracking-widest">
                <Coins className="h-3.5 w-3.5" />
                <span>Nigam Coins</span>
              </div>
              <span className="text-white text-3xl font-black mt-2 tracking-tight">
                {loadingCoins ? '...' : coins.toLocaleString()}
              </span>
              <p className="text-indigo-300 text-[10px] font-bold mt-1.5 flex items-center gap-0.5">
                <span>Value: ₹{(coins / 10).toFixed(0)}</span>
                <ArrowUpRight className="h-3 w-3" />
              </p>
            </div>

            {/* Level */}
            <div className="flex flex-col text-left pl-4">
              <div className="flex items-center justify-between">
                <span className="text-indigo-300 font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span>XP Progress</span>
                </span>
                <div className="w-6 h-6 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                  <Star className="h-3.5 w-3.5 text-white fill-white" />
                </div>
              </div>
              <span className="text-white text-3xl font-black mt-2 tracking-tight">
                Level {level}
              </span>
              
              <div className="mt-2.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-extrabold mb-1">
                  <span>Progress</span>
                  <span className="text-white">{currentXpProgress.toLocaleString()} / 1,000 XP</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CLEAN, ELEGANT SPIN & WIN CARD MATCHING APP DESIGN */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6 flex flex-col items-center relative overflow-hidden">
          
          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full text-[10px] font-black text-amber-800 uppercase tracking-wider mb-2">
            <Trophy className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
            <span>Spin & Win Zone</span>
          </div>

          {/* Wheel Frame */}
          <div className="relative flex flex-col items-center justify-center mt-3">
            
            {/* Top Pointer */}
            <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none drop-shadow-md">
              <div className="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber-500 -mt-1.5" />
            </div>

            {/* Wheel Container */}
            <div className="relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] rounded-full p-2 bg-slate-900 shadow-xl border-4 border-slate-800 flex items-center justify-center">
              
              {/* Rotating Wheel */}
              <div 
                className="w-full h-full rounded-full overflow-hidden transition-transform relative flex items-center justify-center"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 3.5s cubic-bezier(0.15, 0.75, 0.1, 1)' : 'none',
                }}
              >
                <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full">
                  {/* Slices */}
                  {wheelSegments.map((seg, idx) => {
                    const startAngle = idx * segmentAngle;
                    const endAngle = (idx + 1) * segmentAngle;
                    const pathD = describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle);
                    
                    const midAngle = startAngle + segmentAngle / 2;
                    const textPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.65, midAngle);

                    return (
                      <g key={idx}>
                        <path 
                          d={pathD} 
                          fill={seg.color || '#14B8A6'} 
                          stroke="#FFFFFF" 
                          strokeWidth="2" 
                        />

                        {/* Angled Label & Icon */}
                        <g transform={`translate(${textPos.x}, ${textPos.y}) rotate(${midAngle})`}>
                          <text
                            x="0"
                            y="0"
                            fill="#FFFFFF"
                            fontSize="8.5"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="select-none font-black tracking-wide uppercase drop-shadow-xs"
                          >
                            {seg.icon} {seg.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border-4 border-slate-900 z-20 shadow-md flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              </div>

            </div>
          </div>

          {/* Action & Result */}
          <div className="mt-5 w-full flex flex-col items-center gap-3">
            {lastResult && !spinning && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-50 border border-emerald-200/60 rounded-2xl px-5 py-2 inline-flex items-center gap-1.5"
              >
                <span className="text-xs font-black text-emerald-800">🎉 Landed on: {lastResult.label}</span>
              </motion.div>
            )}

            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              {spinsLeft} free spin{spinsLeft !== 1 ? 's' : ''} remaining today
            </p>

            {wheelError && (
              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 max-w-xs text-center">
                {wheelError}
              </p>
            )}

            {/* Primary Orange App Button */}
            <button
              onClick={handleSpin}
              disabled={spinning || spinsLeft === 0 || wheelSegments.length === 0}
              className={`w-full max-w-xs py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                spinning || spinsLeft === 0 || wheelSegments.length === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none cursor-default'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black'
              }`}
            >
              {spinning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Spinning...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-slate-950" />
                  <span>Play Spin & Win</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loyalty Missions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left px-1">
            Loyalty Missions & Milestones
          </h3>
          
          {loadingTasks ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400 font-bold">
              Evaluating missions...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.map((task) => {
                const isClaimed = claimedIds.includes(task.id);
                const isCompleted = task.done;

                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-2xl shadow-xs shrink-0 select-none">
                        {task.icon}
                      </div>
                      <div className="text-left">
                        <span className="text-[13px] font-black text-slate-900 block leading-snug tracking-wide">{task.task}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 inline-block px-2 py-0.5 rounded ${
                          isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {isCompleted ? 'Completed' : task.rewardLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      {isClaimed ? (
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-250/70 rounded-xl px-3.5 py-2 text-emerald-700 font-black text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Claimed</span>
                        </div>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimReward(task)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl cursor-pointer transition-all shadow-sm animate-pulse flex items-center gap-1"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Claim Coins</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(task.targetPath)}
                          className="text-[10px] font-black text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-xs flex items-center gap-1"
                        >
                          <span>Go</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RewardsPlayZone;


