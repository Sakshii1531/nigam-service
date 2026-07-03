import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle, Star, Home } from 'lucide-react';

// Predefined winding route (SVG user units, viewBox 0 0 400 640)
const ROUTE_D = 'M56 560 C 120 500, 90 420, 180 380 S 250 300, 236 240 S 300 170, 320 96';
const TOTAL_ETA_MIN = 12;
const TOTAL_DISTANCE_KM = 2.4;

const STAGES = [
  { key: 'assigned', label: 'Technician assigned', badge: 'Assigned' },
  { key: 'enroute', label: 'On the way for AC Repair', badge: 'En Route' },
  { key: 'arrived', label: 'Technician has arrived', badge: 'Arrived' },
];

const Tracking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isRefrigerator = new URLSearchParams(location.search).get('service') === 'refrigerator';

  const pathRef = useRef(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [marker, setMarker] = useState({ x: 56, y: 560 });
  const [pathLen, setPathLen] = useState(0);

  // measure the path once mounted
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  // advance the journey
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => (p >= 1 ? 1 : +(p + 0.0045).toFixed(4)));
    }, 100);
    return () => clearInterval(t);
  }, []);

  // move the marker along the path as progress changes
  useEffect(() => {
    if (!pathRef.current || !pathLen) return;
    const pt = pathRef.current.getPointAtLength(progress * pathLen);
    setMarker({ x: pt.x, y: pt.y });
  }, [progress, pathLen]);

  const stageIndex = progress < 0.04 ? 0 : progress < 0.97 ? 1 : 2;
  const stage = STAGES[stageIndex];
  const arrived = stageIndex === 2;

  const etaMin = Math.max(0, Math.ceil(TOTAL_ETA_MIN * (1 - progress)));
  const distanceKm = Math.max(0, (TOTAL_DISTANCE_KM * (1 - progress))).toFixed(1);

  const traveled = pathLen ? progress * pathLen : 0;

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl flex items-center shadow-sm border border-border-color">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
          </button>
          <h1 className="text-sm font-bold text-text-primary ml-3">Track Order</h1>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" /> Live
          </span>
        </div>
      </div>

      {/* Stylized Map */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
          {/* base */}
          <rect x="0" y="0" width="400" height="640" fill="#E9EFF7" />
          {/* soft blocks */}
          <rect x="20" y="60" width="120" height="120" rx="14" fill="#E1E9F4" />
          <rect x="250" y="40" width="130" height="150" rx="14" fill="#E1E9F4" />
          <rect x="40" y="360" width="120" height="150" rx="14" fill="#E1E9F4" />
          <rect x="250" y="380" width="130" height="140" rx="14" fill="#DCEAD9" />
          <rect x="150" y="230" width="110" height="110" rx="14" fill="#DCEAD9" />
          {/* streets */}
          <g stroke="#F7FAFF" strokeWidth="16" strokeLinecap="round">
            <line x1="0" y1="220" x2="400" y2="220" />
            <line x1="0" y1="360" x2="400" y2="360" />
            <line x1="150" y1="0" x2="150" y2="640" />
            <line x1="300" y1="0" x2="300" y2="640" />
          </g>

          {/* full route (light) */}
          <path d={ROUTE_D} fill="none" stroke="#B9CDEA" strokeWidth="7" strokeLinecap="round" />
          {/* traveled route (blue) */}
          <path
            ref={pathRef}
            d={ROUTE_D}
            fill="none"
            stroke="#0D47A1"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen - traveled}
          />

          {/* destination pin */}
          <g>
            <circle cx="320" cy="96" r="18" fill="#FFD600" />
            <circle cx="320" cy="96" r="18" fill="none" stroke="#0D47A1" strokeWidth="2" />
          </g>

          {/* moving technician marker */}
          <g>
            <circle cx={marker.x} cy={marker.y} r="20" fill="#0D47A1" opacity="0.18">
              <animate attributeName="r" values="16;26;16" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.28;0;0.28" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={marker.x} cy={marker.y} r="12" fill="#0D47A1" stroke="#fff" strokeWidth="3" />
          </g>
        </svg>

        {/* destination + technician icon overlays (crisp icons on top of svg pins) */}
        <div className="absolute" style={{ left: '80%', top: '15%', transform: 'translate(-50%,-50%)' }}>
          <Home className="h-4 w-4 text-[#0D47A1]" />
        </div>

        {/* Floating ETA Card */}
        <div className="absolute top-20 right-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-border-color min-w-[128px]">
          <span className="text-xs text-text-secondary block font-medium">
            {arrived ? 'Arrived' : 'Arriving in'}
          </span>
          <span className="text-xl font-bold text-[#0D47A1] leading-tight">
            {arrived ? 'Now' : `${etaMin} min`}
          </span>
          <span className="text-xs text-text-secondary block mt-0.5">
            {arrived ? 'At your location' : `Distance: ${distanceKm} km`}
          </span>
          {/* progress bar */}
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FFD600] transition-all duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Card */}
      <div className="bg-[#E3ECF9] p-5 rounded-t-[30px] shadow-lg z-10 border-t border-border-color">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-xs text-text-secondary block font-medium">Status</span>
            <span className="text-xs font-bold text-text-primary">{stage.label}</span>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              arrived ? 'text-white bg-[#2E7D32]' : 'text-[#0D47A1] bg-white'
            }`}
          >
            {stage.badge}
          </span>
        </div>

        {/* Stage stepper */}
        <div className="flex items-center gap-1 mb-5">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stageIndex ? 'bg-[#0D47A1]' : 'bg-white'
              }`}
            />
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 flex items-center gap-3">
          <div className="w-11 h-11 bg-[#0D47A1] rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            R
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Rahul Sharma</h3>
            {isRefrigerator && <span className="text-xs text-[#0D47A1] font-semibold block">Refrigerator Specialist</span>}
            <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-text-primary">4.8</span>
              <span>(120+ reviews)</span>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() =>
                navigate('/call', {
                  state: {
                    name: 'Rahul Sharma',
                    role: isRefrigerator ? 'Refrigerator Specialist' : 'Service Technician',
                    backTo: '/tracking',
                  },
                })
              }
              className="p-2.5 bg-[#E3ECF9] rounded-full hover:bg-[#D0E0F5] transition-colors"
            >
              <Phone className="h-4.5 w-4.5 text-[#0D47A1]" />
            </button>
            <button onClick={() => navigate('/chat')} className="p-2.5 bg-[#E3ECF9] rounded-full hover:bg-[#D0E0F5] transition-colors">
              <MessageCircle className="h-4.5 w-4.5 text-[#0D47A1]" />
            </button>
          </div>
        </div>

        <div className="bg-white/80 p-3 rounded-xl text-center text-xs text-text-secondary flex items-center justify-center gap-1.5 shadow-sm">
          <span>🔒</span>
          <span>Your phone number is masked for security.</span>
        </div>
      </div>
    </div>
  );
};

export default Tracking;
