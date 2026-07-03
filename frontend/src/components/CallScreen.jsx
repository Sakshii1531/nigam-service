import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Grid3x3, Video, UserPlus, PhoneOff, ShieldCheck } from 'lucide-react';

/**
 * Full-screen masked-call UI. Simulated: Dialing -> Connected (running timer) -> Ended.
 * Opened via navigate('/call', { state: { name, role, backTo, avatar } }).
 * No real telephony — demonstrates the number-masking calling experience.
 */
const CallScreen = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const name = state?.name || 'Rahul Sharma';
  const role = state?.role || 'Service Technician';
  const backTo = state?.backTo || -1;
  const initial = name.charAt(0).toUpperCase();

  const [phase, setPhase] = useState('dialing'); // dialing | connected | ended
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const timerRef = useRef(null);

  // dialing -> connected after ~2.2s
  useEffect(() => {
    const t = setTimeout(() => setPhase('connected'), 2200);
    return () => clearTimeout(t);
  }, []);

  // running call timer
  useEffect(() => {
    if (phase !== 'connected') return;
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const endCall = () => {
    clearInterval(timerRef.current);
    setPhase('ended');
    setTimeout(() => (backTo === -1 ? navigate(-1) : navigate(backTo)), 1400);
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusText =
    phase === 'dialing' ? 'Calling…' : phase === 'connected' ? fmt(seconds) : 'Call ended';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D47A1] to-[#072C63] flex flex-col items-center justify-between text-white px-6 py-12 relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />

      {/* Masked number chip */}
      <div className="relative z-10 flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 backdrop-blur-sm">
        <ShieldCheck size={14} className="text-[#FFD600]" />
        <span className="text-xs font-medium">Secured via masked number · +91 80•••••00</span>
      </div>

      {/* Caller identity */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-6">
        <div className="relative">
          {phase === 'dialing' && (
            <motion.span
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
          <div className="w-28 h-28 rounded-full bg-white/15 border border-white/20 flex items-center justify-center text-4xl font-bold backdrop-blur-sm">
            {initial}
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-white/70 text-sm mt-0.5">{role}</p>
        </div>
        <div
          className={`text-base font-semibold tracking-wide ${
            phase === 'connected' ? 'text-[#7CF29B]' : 'text-white/80'
          }`}
        >
          {statusText}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full max-w-xs">
        {phase !== 'ended' && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <ControlButton
              active={muted}
              onClick={() => setMuted((m) => !m)}
              icon={muted ? <MicOff size={22} /> : <Mic size={22} />}
              label={muted ? 'Unmute' : 'Mute'}
            />
            <ControlButton
              active={speaker}
              onClick={() => setSpeaker((s) => !s)}
              icon={<Volume2 size={22} />}
              label="Speaker"
            />
            <ControlButton icon={<Grid3x3 size={22} />} label="Keypad" />
            <ControlButton icon={<Video size={22} />} label="Video" />
            <ControlButton icon={<UserPlus size={22} />} label="Add" />
            <ControlButton icon={<ShieldCheck size={22} />} label="Secure" active />
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={endCall}
            disabled={phase === 'ended'}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-colors disabled:opacity-60"
          >
            <PhoneOff size={26} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ icon, label, onClick, active }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5">
    <span
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
        active ? 'bg-white text-[#0D47A1]' : 'bg-white/12 text-white hover:bg-white/20'
      }`}
    >
      {icon}
    </span>
    <span className="text-[11px] text-white/70">{label}</span>
  </button>
);

export default CallScreen;
