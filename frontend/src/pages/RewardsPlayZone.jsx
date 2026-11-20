import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Star, Sparkles, Trophy, Coins, Gift,
  Play, RefreshCw, Flame, ChevronRight, CalendarCheck, Users, Zap, X, Lock,
} from 'lucide-react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { goBack } from '../lib/navigation';
import { LoadingSection, SkeletonList, Skeleton } from '../components/common/Skeleton';

// Each slice gets a two-tone gradient so the wheel reads as lit, not flat.
const PRESET_COLORS = [
  { from: '#FDBA3B', to: '#F59E0B', text: '#3B2300' },
  { from: '#7C6CF6', to: '#5B3FE0', text: '#FFFFFF' },
  { from: '#2DD4BF', to: '#0D9488', text: '#FFFFFF' },
  { from: '#FB7185', to: '#E11D48', text: '#FFFFFF' },
  { from: '#60A5FA', to: '#2563EB', text: '#FFFFFF' },
  { from: '#34D399', to: '#059669', text: '#FFFFFF' },
  { from: '#F472B6', to: '#DB2777', text: '#FFFFFF' },
  { from: '#FCD34D', to: '#D97706', text: '#3B2300' },
];

const SPIN_MS = 4200;

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
  return ['M', x, y, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
}

// Page-local keyframes (light chase, shimmer sweep, slow ray spin, float).
const ZONE_STYLES = `
@keyframes rpz-blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .25; transform: scale(.7); } }
@keyframes rpz-shimmer { 0% { transform: translateX(-120%) skewX(-20deg); } 60%, 100% { transform: translateX(260%) skewX(-20deg); } }
@keyframes rpz-rays { to { transform: rotate(360deg); } }
@keyframes rpz-float { 0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); } 50% { transform: translateY(-10px) rotate(calc(var(--r, 0deg) + 12deg)); } }
@keyframes rpz-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, .55); } 50% { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); } }
.rpz-bulb { animation: rpz-blink 1.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.rpz-fast .rpz-bulb { animation-duration: .28s; }
.rpz-shimmer::after { content: ''; position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); animation: rpz-shimmer 2.6s ease-in-out infinite; }
.rpz-rays { animation: rpz-rays 24s linear infinite; }
.rpz-float { animation: rpz-float 5s ease-in-out infinite; }
.rpz-glow { animation: rpz-glow 2s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rpz-bulb, .rpz-shimmer::after, .rpz-rays, .rpz-float, .rpz-glow { animation: none !important; }
}
`;

/** A number that counts up to its new value instead of jumping. */
function CountUp({ value, className }) {
  const ref = useRef(null);
  const previous = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reduce) {
      node.textContent = value.toLocaleString();
      previous.current = value;
      return undefined;
    }
    const controls = animate(previous.current, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => { node.textContent = Math.round(v).toLocaleString(); },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return <span ref={ref} className={className}>{value.toLocaleString()}</span>;
}

/** Confetti burst from the centre of the screen. */
const ConfettiEffect = () => {
  const particles = useMemo(() => {
    const colors = ['#FBBF24', '#F43F5E', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'];
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 420,
      y: -Math.random() * 320 - 60,
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.5,
      round: i % 3 === 0,
      color: colors[i % colors.length],
      delay: Math.random() * 0.15,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[70] flex items-center justify-center" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.2, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.rotation, scale: p.scale }}
          transition={{ duration: 2.4, ease: 'easeOut', delay: p.delay }}
          className="absolute"
          style={{ width: p.round ? 9 : 8, height: p.round ? 9 : 14, borderRadius: p.round ? 999 : 2, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
};

/** Coins drifting in the hero background. */
const FloatingCoins = () => (
  <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
    {[
      { left: '54%', top: '9%', size: 18, delay: '0s', r: '-12deg' },
      { left: '61%', top: '70%', size: 12, delay: '1.2s', r: '18deg' },
      { left: '93%', top: '4%', size: 14, delay: '2.1s', r: '-25deg' },
    ].map((c, i) => (
      <span
        key={i}
        className="rpz-float absolute rounded-full bg-linear-to-br from-amber-200 via-amber-400 to-amber-600 border border-amber-100/60 shadow-[0_4px_14px_rgba(251,191,36,.45)] flex items-center justify-center"
        style={{ left: c.left, top: c.top, width: c.size, height: c.size, animationDelay: c.delay, '--r': c.r }}
      >
        <span className="w-1/2 h-1/2 rounded-full border border-amber-100/70" />
      </span>
    ))}
  </div>
);

/** Circular XP ring around the level number. */
function LevelRing({ level, percent }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="rpz-xp" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="7" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" stroke="url(#rpz-xp)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.max(percent, 2)) / 100 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-200">Level</span>
        <span className="text-2xl font-black text-white leading-none">{level}</span>
      </div>
    </div>
  );
}

const RewardsPlayZone = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const reduceMotion = useReducedMotion();

  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsLeft, setSpinsLeft] = useState(3);
  const [lastResult, setLastResult] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [wheelSegments, setWheelSegments] = useState([]);
  const [wheelError, setWheelError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  // Which one-time rewards are already claimed is recorded in the wallet ledger,
  // not this browser — the previous localStorage list could be cleared to claim
  // the same reward (and real coins) again.
  const [claimedIds, setClaimedIds] = useState([]);
  useEffect(() => {
    if (!user) return;
    apiRequest('/wallet/claims', { auth: true })
      .then((res) => setClaimedIds(res || []))
      .catch((err) => console.warn('[rewards] Could not load claimed rewards:', err.message));
  }, [user]);

  const [tasks, setTasks] = useState([
    { id: 'book_service', icon: CalendarCheck, task: 'Book a Service', hint: 'Get any appliance serviced', reward: 50, done: false, targetPath: '/booking', tone: 'from-sky-400 to-blue-600' },
    { id: 'write_review', icon: Star, task: 'Write a Review', hint: 'Rate a completed service', reward: 20, done: false, targetPath: '/partner-warranty/rate-service', tone: 'from-amber-300 to-orange-500' },
    { id: 'refer_friend', icon: Users, task: 'Refer a Friend', hint: 'Invite someone to Nigam Care', reward: 100, done: false, targetPath: '/refer-earn', tone: 'from-fuchsia-400 to-violet-600' },
  ]);

  const fetchTasksData = async () => {
    if (!user) return;
    try {
      const bookingsRes = await apiRequest('/bookings', { auth: true });
      const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes || []);
      const isBookingDone = bookingsList.length > 0;

      const reviewsRes = await apiRequest('/reviews/user/reviews', { auth: true });
      const reviewsList = Array.isArray(reviewsRes) ? reviewsRes : (reviewsRes || []);
      const isReviewDone = reviewsList.length > 0;

      const userData = await apiRequest('/auth/me', { auth: true });
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
        if (Object.keys(updates).length > 0) updateUser(updates);
      }

      const done = { book_service: isBookingDone, write_review: isReviewDone, refer_friend: isReferralDone };
      setTasks((prev) => prev.map((t) => ({ ...t, done: done[t.id] })));
    } catch (err) {
      console.warn('Error loading real tasks progress:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchWalletCoins = async () => {
    try {
      const walletData = await apiRequest('/wallet', { auth: true });
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
        if (Object.keys(updates).length > 0) updateUser(updates);
      }
    } catch (err) {
      console.warn('Error fetching wallet coins:', err);
    } finally {
      setLoadingCoins(false);
    }
  };

  const fetchWheelConfig = async () => {
    try {
      const config = await apiRequest('/wallet/spin-wheel/config');
      if (config && Array.isArray(config.segments) && config.segments.length >= 2) {
        setWheelSegments(
          config.segments.map((s, index) => {
            const preset = PRESET_COLORS[index % PRESET_COLORS.length];
            return {
              label: s.label?.toUpperCase() || 'REWARD',
              winningType: s.winningType || 'none',
              value: s.value || 0,
              probability: s.probability || 0,
              ...preset,
            };
          }),
        );
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

  const canSpin = !spinning && spinsLeft > 0 && wheelSegments.length > 0;

  const handleSpin = async () => {
    if (!canSpin) return;

    try {
      setSpinning(true);
      setShowConfetti(false);
      setShowWin(false);
      const spinData = await apiRequest('/wallet/spin-wheel/spin', { method: 'POST', auth: true });

      let winIndex = typeof spinData?.winIndex === 'number' ? spinData.winIndex : 0;
      winIndex %= wheelSegments.length;
      const wonSegment = wheelSegments[winIndex];

      if (typeof spinData?.spinsLeft === 'number') setSpinsLeft(spinData.spinsLeft);
      else setSpinsLeft((prev) => Math.max(prev - 1, 0));

      const segAngle = 360 / wheelSegments.length;
      const targetOffset = winIndex * segAngle + segAngle / 2;
      const currentAngle = rotation % 360;
      const targetAngle = (360 - targetOffset) % 360;
      let angleDiff = targetAngle - currentAngle;
      if (angleDiff <= 0) angleDiff += 360;
      setRotation(rotation + 360 * 6 + angleDiff);
      setLastResult(null);

      setTimeout(() => {
        setSpinning(false);
        setLastResult(wonSegment);
        const won = wonSegment.winningType !== 'none';
        setShowWin(true);
        if (won) setShowConfetti(true);

        if (spinData && typeof spinData.coins === 'number') {
          setCoins(spinData.coins);
          setLevel(spinData.level);
          setXp(spinData.xp);
          updateUser({ walletCoins: spinData.coins, level: spinData.level, xp: spinData.xp, spinsLeft: spinData.spinsLeft });
        }
      }, reduceMotion ? 300 : SPIN_MS + 100);
    } catch (err) {
      setSpinning(false);
      console.warn('Error during spin:', err);
      triggerToast(err.message || 'Spin failed. Please try again.');
    }
  };

  const handleClaimReward = async (task) => {
    if (!task.done || claimedIds.includes(task.id) || claimingId) return;
    setClaimingId(task.id);
    try {
      const update = await apiRequest('/wallet/credit', {
        method: 'POST',
        auth: true,
        body: {
          amount: task.reward,
          xp: task.reward,
          reason: task.id === 'refer_friend' ? 'referral' : 'earned',
          claimKey: task.id,
        },
      });

      setClaimedIds((prev) => [...prev, task.id]);

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
        if (Object.keys(updates).length > 0) updateUser(updates);
      } else {
        await fetchWalletCoins();
      }

      setShowConfetti(false);
      requestAnimationFrame(() => setShowConfetti(true));
      triggerToast(`+${task.reward} coins added to your wallet`);
    } catch (err) {
      // 409 means the server already has this claim — reflect that rather than
      // leaving the button live.
      if (err.status === 409) setClaimedIds((prev) => [...prev, task.id]);
      triggerToast(err.message || 'Could not claim that reward.');
    } finally {
      setClaimingId(null);
    }
  };

  useEffect(() => {
    if (!showConfetti) return undefined;
    const t = setTimeout(() => setShowConfetti(false), 2800);
    return () => clearTimeout(t);
  }, [showConfetti]);

  const currentXpProgress = xp % 1000;
  const progressPercentage = Math.min((currentXpProgress / 1000) * 100, 100);
  const missionsDone = tasks.filter((t) => t.done && claimedIds.includes(t.id)).length;

  // SVG wheel geometry
  const SVG_SIZE = 300;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 128;
  const numSegs = wheelSegments.length;
  const segmentAngle = 360 / Math.max(numSegs, 1);
  const BULBS = 20;

  const resultWon = lastResult && lastResult.winningType !== 'none';

  return (
    <div className="min-h-screen bg-[#0B1026] flex flex-col pb-14 relative overflow-x-clip">
      <style>{ZONE_STYLES}</style>
      {showConfetti && <ConfettiEffect />}

      {/* Ambient background */}
      <div className="absolute inset-x-0 top-0 h-[720px] pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute top-40 -right-24 w-80 h-80 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute top-[420px] left-1/4 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="px-4 py-3.5 flex items-center gap-3 sticky top-0 z-50 bg-[#0B1026]/80 backdrop-blur-md border-b border-white/5">
        <button
          onClick={() => goBack(navigate, '/profile')}
          aria-label="Back"
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-black text-white tracking-tight">Rewards &amp; Play Zone</h1>
          <p className="text-[11px] text-indigo-200/70 font-semibold">Spin daily, finish missions, earn coins</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-1.5 pr-3 py-1">
          <span className="w-5 h-5 rounded-full bg-linear-to-br from-amber-200 to-amber-500 flex items-center justify-center">
            <Coins className="w-3 h-3 text-amber-900" />
          </span>
          <span className="text-xs font-black text-white">{loadingCoins ? '—' : coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] bg-white text-slate-900 font-bold text-xs py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col gap-6 px-4 pt-5 max-w-md mx-auto w-full">
        {/* Hero: coins and level */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[28px] p-5 bg-linear-to-br from-[#1D3FB8] via-[#3B2AA8] to-[#6B21A8] border border-white/15 shadow-[0_20px_50px_-12px_rgba(76,29,149,.6)]"
        >
          <FloatingCoins />
          <div className="relative flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1.5 text-amber-300 font-black text-[10px] uppercase tracking-[0.18em]">
                <Coins className="h-3.5 w-3.5" /> Nigam Coins
              </p>
              <div className="mt-1.5 text-white text-[40px] leading-none font-black tracking-tight">
                {loadingCoins ? <Skeleton inline className="h-10 w-28 bg-white/20" /> : <CountUp value={coins} />}
              </div>
              <p className="mt-2 inline-flex items-center gap-1 bg-white/10 border border-white/15 rounded-full px-2.5 py-1 text-[11px] font-bold text-indigo-50">
                Worth ₹{(coins / 10).toFixed(0)} on your next booking
              </p>
            </div>
            <LevelRing level={level} percent={progressPercentage} />
          </div>
          <div className="relative mt-4 flex items-center justify-between text-[11px] font-bold text-indigo-100/90">
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-300" /> {currentXpProgress.toLocaleString()} / 1,000 XP</span>
            <span>{(1000 - currentXpProgress).toLocaleString()} XP to Level {level + 1}</span>
          </div>
        </motion.section>

        {/* Spin & Win stage */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(ellipse_at_top,#2A1F6E_0%,#141A3D_55%,#0E1330_100%)] px-4 pt-5 pb-6 flex flex-col items-center"
          aria-label="Spin and win"
        >
          {/* Light rays behind the wheel */}
          <div className="absolute top-[72px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] pointer-events-none" aria-hidden="true">
            <div
              className="rpz-rays w-full h-full rounded-full opacity-40"
              style={{ background: 'repeating-conic-gradient(from 0deg, rgba(251,191,36,.22) 0deg 8deg, transparent 8deg 22deg)', maskImage: 'radial-gradient(circle, black 30%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 68%)' }}
            />
          </div>

          <div className="relative flex items-center gap-1.5 bg-amber-400/15 border border-amber-300/30 px-3 py-1 rounded-full text-[10px] font-black text-amber-200 uppercase tracking-[0.18em]">
            <Trophy className="h-3.5 w-3.5 text-amber-300" /> Spin &amp; Win
          </div>
          <h2 className="relative mt-2 text-xl font-black text-white text-center">Try your luck today</h2>
          <p className="relative text-xs text-indigo-200/70 font-semibold text-center">Every spin earns XP. Land on a prize to win coins.</p>

          {/* Wheel */}
          <div className={`relative mt-6 ${spinning ? 'rpz-fast' : ''}`}>
            {/* Pointer */}
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-[0_4px_6px_rgba(0,0,0,.5)]"
              animate={spinning && !reduceMotion ? { rotate: [0, -18, 0, -12, 0] } : { rotate: 0 }}
              transition={spinning ? { duration: 0.32, repeat: Infinity } : { duration: 0.2 }}
              style={{ transformOrigin: '50% 20%' }}
              aria-hidden="true"
            >
              <svg width="38" height="48" viewBox="0 0 38 48">
                <defs>
                  <linearGradient id="rpz-pointer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FEF3C7" />
                    <stop offset="55%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <path d="M19 47 L4 18 A15 15 0 1 1 34 18 Z" fill="url(#rpz-pointer)" stroke="#FFF7E0" strokeWidth="2" />
                <circle cx="19" cy="15" r="5" fill="#fff" />
              </svg>
            </motion.div>

            <div className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px]">
              {/* Rim with chasing lights */}
              <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full" aria-hidden="true">
                <defs>
                  <linearGradient id="rpz-rim" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="45%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#FBBF24" />
                  </linearGradient>
                </defs>
                <circle cx="150" cy="150" r="146" fill="#1A1440" stroke="url(#rpz-rim)" strokeWidth="8" />
                {Array.from({ length: BULBS }).map((_, i) => {
                  const p = polarToCartesian(150, 150, 140, (i * 360) / BULBS);
                  return (
                    <circle
                      key={i}
                      className="rpz-bulb"
                      cx={p.x}
                      cy={p.y}
                      r="3.6"
                      fill={i % 2 ? '#FFFFFF' : '#FDE68A'}
                      style={{ animationDelay: `${(i % 2) * 0.55}s`, filter: 'drop-shadow(0 0 4px rgba(253,230,138,.9))' }}
                    />
                  );
                })}
              </svg>

              {/* Rotating wheel */}
              <div
                className="absolute inset-[18px] rounded-full overflow-hidden"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? `transform ${reduceMotion ? 0.2 : SPIN_MS / 1000}s cubic-bezier(0.12, 0.8, 0.1, 1)` : 'none',
                }}
              >
                <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="w-full h-full">
                  <defs>
                    {wheelSegments.map((seg, idx) => (
                      <radialGradient key={idx} id={`rpz-seg-${idx}`} cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor={seg.to} />
                        <stop offset="100%" stopColor={seg.from} />
                      </radialGradient>
                    ))}
                    <radialGradient id="rpz-shine" cx="50%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="rgba(255,255,255,.28)" />
                      <stop offset="60%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                  </defs>
                  {numSegs === 0 && <circle cx={CENTER} cy={CENTER} r={RADIUS + 22} fill="#232A55" />}
                  {wheelSegments.map((seg, idx) => {
                    const startAngle = idx * segmentAngle;
                    const endAngle = (idx + 1) * segmentAngle;
                    const midAngle = startAngle + segmentAngle / 2;
                    // Upright in its slice: icon near the rim, then the label in two
                    // lines ("500" big, "COINS" small) — clear of the centre hub.
                    const iconPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.98, midAngle);
                    const textPos = polarToCartesian(CENTER, CENTER, RADIUS * 0.68, midAngle);
                    const Icon = seg.winningType === 'coins' || seg.winningType === 'money' ? Coins : seg.winningType === 'spin' ? RefreshCw : Star;
                    const [head, ...rest] = seg.label.split(' ');
                    const tail = rest.join(' ');
                    const small = numSegs > 6;
                    return (
                      <g key={idx}>
                        <path d={describeArc(CENTER, CENTER, RADIUS + 22, startAngle, endAngle)} fill={`url(#rpz-seg-${idx})`} stroke="rgba(255,255,255,.85)" strokeWidth="2" />
                        <g transform={`translate(${iconPos.x}, ${iconPos.y}) rotate(${midAngle})`}>
                          <Icon x={-9} y={-9} width={18} height={18} color={seg.text} strokeWidth={2.6} />
                        </g>
                        <g transform={`translate(${textPos.x}, ${textPos.y}) rotate(${midAngle})`} className="select-none">
                          <text x="0" y={tail ? -6 : 0} fill={seg.text} fontSize={small ? 15 : 19} fontWeight="900" textAnchor="middle" dominantBaseline="central">
                            {head}
                          </text>
                          {tail && (
                            <text x="0" y={small ? 9 : 11} fill={seg.text} fontSize={small ? 8 : 9.5} fontWeight="800" textAnchor="middle" dominantBaseline="central" style={{ letterSpacing: '.12em' }}>
                              {tail}
                            </text>
                          )}
                        </g>
                      </g>
                    );
                  })}
                  <circle cx={CENTER} cy={CENTER} r={RADIUS + 22} fill="url(#rpz-shine)" pointerEvents="none" />
                </svg>
              </div>

              {/* Centre hub: tap to spin */}
              <button
                type="button"
                onClick={handleSpin}
                disabled={!canSpin}
                aria-label="Spin the wheel"
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[74px] h-[74px] rounded-full border-4 border-[#FFF7E0] bg-linear-to-br from-amber-300 via-amber-500 to-orange-600 shadow-[0_6px_18px_rgba(0,0,0,.45),inset_0_2px_6px_rgba(255,255,255,.6)] flex items-center justify-center text-[13px] font-black text-amber-950 tracking-wider ${canSpin ? 'rpz-glow cursor-pointer active:scale-95' : 'opacity-90 cursor-default'} transition-transform`}
              >
                {spinning ? <RefreshCw className="h-6 w-6 animate-spin" /> : 'SPIN'}
              </button>
            </div>
          </div>

          {/* Spins left */}
          <div className="relative mt-6 flex items-center gap-2" aria-label={`${spinsLeft} free spins left today`}>
            {Array.from({ length: Math.max(3, spinsLeft) }).map((_, i) => (
              <motion.span
                key={i}
                initial={false}
                animate={{ scale: i < spinsLeft ? 1 : 0.85, opacity: i < spinsLeft ? 1 : 0.35 }}
                className={`w-7 h-7 rounded-full flex items-center justify-center border ${i < spinsLeft ? 'bg-linear-to-br from-amber-200 to-amber-500 border-amber-100' : 'bg-white/5 border-white/15'}`}
              >
                <Zap className={`w-3.5 h-3.5 ${i < spinsLeft ? 'text-amber-900 fill-amber-900' : 'text-white/40'}`} />
              </motion.span>
            ))}
            <span className="ml-1 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-100/80">
              {spinsLeft} free spin{spinsLeft !== 1 ? 's' : ''} today
            </span>
          </div>

          {wheelError && (
            <p className="relative mt-4 text-[11px] font-bold text-amber-200 bg-amber-400/10 border border-amber-300/25 rounded-xl px-3 py-2 max-w-xs text-center">
              {wheelError}
            </p>
          )}

          <button
            onClick={handleSpin}
            disabled={!canSpin}
            className={`relative overflow-hidden mt-5 w-full max-w-xs py-4 rounded-2xl text-sm font-black uppercase tracking-[0.12em] transition-all duration-200 flex items-center justify-center gap-2 ${
              canSpin
                ? 'rpz-shimmer bg-linear-to-r from-amber-300 via-amber-400 to-orange-500 text-amber-950 shadow-[0_10px_30px_-6px_rgba(251,146,60,.7)] cursor-pointer active:scale-[.98]'
                : 'bg-white/8 text-white/40 border border-white/10 cursor-default'
            }`}
          >
            {spinning ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Spinning…</>
            ) : spinsLeft === 0 ? (
              <><Lock className="h-4 w-4" /> Come back tomorrow</>
            ) : (
              <><Play className="h-4 w-4 fill-current" /> Spin now</>
            )}
          </button>

          {lastResult && !spinning && !showWin && (
            <p className="relative mt-3 text-[11px] font-bold text-indigo-100/70">Last spin: {lastResult.label}</p>
          )}
        </motion.section>

        {/* Missions */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-end justify-between px-1">
            <div>
              <h3 className="text-base font-black text-white">Missions</h3>
              <p className="text-[11px] font-semibold text-indigo-200/70">Finish a mission, then claim its coins</p>
            </div>
            <span className="text-[11px] font-black text-amber-300">{missionsDone}/{tasks.length} claimed</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mx-1">
            <motion.div
              className="h-full rounded-full bg-linear-to-r from-amber-300 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(missionsDone / tasks.length) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {loadingTasks ? (
            <LoadingSection loading label="missions" skeleton={<SkeletonList rows={3} />} />
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.map((task, i) => {
                const isClaimed = claimedIds.includes(task.id);
                const isCompleted = task.done;
                return (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                    className={`relative overflow-hidden flex items-center gap-3.5 p-3.5 rounded-2xl border ${
                      isCompleted && !isClaimed ? 'bg-emerald-400/10 border-emerald-300/30' : 'bg-white/[.04] border-white/10'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${task.tone} flex items-center justify-center shadow-lg shrink-0`}>
                      <task.icon className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white leading-tight">{task.task}</p>
                      <p className="text-[11px] font-semibold text-indigo-200/60 truncate">{task.hint}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-amber-300">
                        <Coins className="w-3 h-3" /> +{task.reward} coins
                      </span>
                    </div>
                    <div className="shrink-0">
                      {isClaimed ? (
                        <span className="flex items-center gap-1 text-emerald-300 font-black text-[11px] uppercase tracking-wider">
                          <CheckCircle2 className="h-4 w-4" /> Claimed
                        </span>
                      ) : isCompleted ? (
                        <button
                          onClick={() => handleClaimReward(task)}
                          disabled={claimingId === task.id}
                          className="rpz-shimmer relative overflow-hidden bg-linear-to-r from-emerald-400 to-emerald-600 text-white font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-[0_6px_18px_-4px_rgba(16,185,129,.7)] flex items-center gap-1 disabled:opacity-70"
                        >
                          <Gift className="h-3.5 w-3.5" /> {claimingId === task.id ? 'Claiming…' : 'Claim'}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(task.targetPath)}
                          className="text-[11px] font-black text-white bg-white/10 hover:bg-white/15 border border-white/15 px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-0.5"
                        >
                          Start <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.section>
      </div>

      {/* Result reveal */}
      <AnimatePresence>
        {showWin && lastResult && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#060914]/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWin(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={resultWon ? 'You won' : 'Spin result'}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative w-full max-w-xs rounded-[28px] overflow-hidden bg-linear-to-b from-[#2B1F7A] to-[#141A3D] border border-white/15 p-6 pt-8 text-center shadow-2xl"
            >
              <button type="button" onClick={() => setShowWin(false)} aria-label="Close" className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 text-white/80 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[360px] h-[360px] pointer-events-none" aria-hidden="true">
                <div className="rpz-rays w-full h-full opacity-50" style={{ background: 'repeating-conic-gradient(from 0deg, rgba(251,191,36,.25) 0deg 10deg, transparent 10deg 24deg)', maskImage: 'radial-gradient(circle, black 15%, transparent 55%)', WebkitMaskImage: 'radial-gradient(circle, black 15%, transparent 55%)' }} />
              </div>
              <motion.div
                initial={{ rotate: -20, scale: 0.4 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                className={`relative mx-auto w-24 h-24 rounded-full flex items-center justify-center border-4 border-white/80 shadow-[0_0_40px_rgba(251,191,36,.6)] ${resultWon ? 'bg-linear-to-br from-amber-200 via-amber-400 to-orange-500' : 'bg-linear-to-br from-indigo-300 to-violet-600'}`}
              >
                {lastResult.winningType === 'spin' ? <RefreshCw className="w-11 h-11 text-amber-950" /> : resultWon ? <Coins className="w-11 h-11 text-amber-950" /> : <Star className="w-11 h-11 text-white fill-white" />}
              </motion.div>
              <p className="relative mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">{resultWon ? 'You won' : 'Nice try'}</p>
              <p className="relative mt-1 text-2xl font-black text-white">{resultWon ? lastResult.label : 'Better luck next spin'}</p>
              <p className="relative mt-2 text-xs font-semibold text-indigo-100/80">
                {lastResult.winningType === 'spin' ? 'An extra spin has been added, plus 20 XP.' : resultWon ? 'Added to your wallet, plus 20 XP.' : 'You still earned 20 XP for playing.'}
              </p>
              <button
                type="button"
                onClick={() => setShowWin(false)}
                className="rpz-shimmer relative overflow-hidden mt-6 w-full py-3.5 rounded-2xl bg-linear-to-r from-amber-300 to-orange-500 text-amber-950 text-sm font-black uppercase tracking-wider cursor-pointer"
              >
                {resultWon ? 'Collect' : 'Continue'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardsPlayZone;
