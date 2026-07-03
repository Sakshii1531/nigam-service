import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Route, CornerUpRight, CornerUpLeft,
  ArrowUp, ExternalLink, CheckCircle2, Phone, Volume2, VolumeX, MessageSquare,
} from 'lucide-react';

const ROUTE_D = 'M40 300 C 110 260, 90 190, 180 170 S 300 120, 360 60';

const STEPS = [
  { icon: ArrowUp, dir: 'Head north on Sector 18 Rd', dist: '400 m' },
  { icon: CornerUpRight, dir: 'Turn right onto MG Road', dist: '1.2 km' },
  { icon: CornerUpLeft, dir: 'Turn left onto Ring Road', dist: '600 m' },
  { icon: MapPin, dir: 'Arrive at customer location', dist: '' },
];

const DESTINATION = 'B-204, Green Valley Apartments, Sector 18';

const Navigation = () => {
  const navigate = useNavigate();
  const [muted, setMuted] = useState(false);
  const [eta, setEta] = useState(14); // minutes
  const [progress, setProgress] = useState(0);
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);
  const [marker, setMarker] = useState({ x: 40, y: 300 });

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setProgress((p) => (p >= 1 ? 1 : +(p + 0.01).toFixed(3))), 300);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setEta(Math.max(1, Math.ceil(14 * (1 - progress))));
    if (pathRef.current && pathLen) {
      const pt = pathRef.current.getPointAtLength(progress * pathLen);
      setMarker({ x: pt.x, y: pt.y });
    }
  }, [progress, pathLen]);

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(DESTINATION)}&travelmode=driving`;
  const next = STEPS[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Map with next-turn banner */}
      <div className="relative">
        <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" className="w-full h-64">
          <rect x="0" y="0" width="400" height="320" fill="#E9EFF7" />
          <rect x="30" y="30" width="120" height="90" rx="12" fill="#E1E9F4" />
          <rect x="230" y="150" width="140" height="120" rx="12" fill="#DCEAD9" />
          <rect x="40" y="180" width="120" height="90" rx="12" fill="#E1E9F4" />
          <g stroke="#F7FAFF" strokeWidth="14" strokeLinecap="round">
            <line x1="0" y1="150" x2="400" y2="150" />
            <line x1="180" y1="0" x2="180" y2="320" />
          </g>
          <path d={ROUTE_D} fill="none" stroke="#B9CDEA" strokeWidth="7" strokeLinecap="round" />
          <path
            ref={pathRef}
            d={ROUTE_D}
            fill="none"
            stroke="#0D47A1"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={pathLen}
            strokeDashoffset={pathLen ? pathLen - progress * pathLen : 0}
          />
          <circle cx="360" cy="60" r="9" fill="#FFD600" stroke="#0D47A1" strokeWidth="2" />
          <circle cx={marker.x} cy={marker.y} r="16" fill="#0D47A1" opacity="0.18">
            <animate attributeName="r" values="12;22;12" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={marker.x} cy={marker.y} r="10" fill="#0D47A1" stroke="#fff" strokeWidth="3" />
        </svg>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2.5 bg-white rounded-full shadow-md hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-[#0D47A1]" />
        </button>

        {/* Mute */}
        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute top-4 right-4 p-2.5 bg-white rounded-full shadow-md hover:bg-slate-50 transition-colors"
        >
          {muted ? <VolumeX className="h-5 w-5 text-slate-500" /> : <Volume2 className="h-5 w-5 text-[#0D47A1]" />}
        </button>

        {/* Next-turn banner */}
        <div className="absolute -bottom-6 left-4 right-4 bg-[#0D47A1] text-white rounded-2xl px-5 py-4 shadow-lg flex items-center gap-4">
          <next.icon className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <p className="text-lg font-bold leading-tight">{next.dist}</p>
            <p className="text-sm text-white/80">{next.dir}</p>
          </div>
        </div>
      </div>

      {/* ETA summary */}
      <div className="mt-10 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#0D47A1]" />
            <div>
              <p className="text-lg font-bold text-slate-900">{eta} min</p>
              <p className="text-xs text-slate-500">ETA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-[#0D47A1]" />
            <div>
              <p className="text-lg font-bold text-slate-900">{(2.2 * (1 - progress)).toFixed(1)} km</p>
              <p className="text-xs text-slate-500">Distance</p>
            </div>
          </div>
          <div className="text-right max-w-[45%]">
            <p className="text-xs text-slate-500">Destination</p>
            <p className="text-xs font-semibold text-slate-900 leading-snug">{DESTINATION}</p>
          </div>
        </div>
      </div>

      {/* Turn-by-turn list */}
      <div className="px-4 mt-4 flex-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">Directions</p>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="w-9 h-9 rounded-full bg-[#E8F1FF] flex items-center justify-center shrink-0">
                <s.icon className="h-4.5 w-4.5 text-[#0D47A1]" />
              </div>
              <p className="text-sm text-slate-800 flex-1">{s.dir}</p>
              {s.dist && <span className="text-xs font-semibold text-slate-500">{s.dist}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 bg-white border-t border-slate-200 flex flex-col gap-3 sticky bottom-0">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 border border-[#0D47A1] text-[#0D47A1] font-semibold py-3 rounded-2xl hover:bg-[#EEF4FF] transition-colors"
        >
          <ExternalLink className="h-4.5 w-4.5" /> Open in Google Maps
        </a>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/call', { state: { name: 'Amit Verma', role: 'Customer', backTo: '/technician/navigation' } })}
            className="flex items-center justify-center gap-2 flex-1 bg-[#E8F1FF] text-[#0D47A1] font-semibold py-3 rounded-2xl hover:bg-[#D4E5FF] transition-colors"
          >
            <Phone className="h-4.5 w-4.5" /> Call
          </button>
          <button
            onClick={() => navigate('/technician/chat', { state: { customer: 'Amit Verma' } })}
            className="flex items-center justify-center gap-2 flex-1 bg-[#E8F1FF] text-[#0D47A1] font-semibold py-3 rounded-2xl hover:bg-[#D4E5FF] transition-colors"
          >
            <MessageSquare className="h-4.5 w-4.5" /> Chat
          </button>
          <button
            onClick={() => navigate('/technician/active-job')}
            className="flex items-center justify-center gap-2 flex-[2] bg-[#0D47A1] text-white font-semibold py-3 rounded-2xl hover:bg-blue-800 transition-colors"
          >
            <CheckCircle2 className="h-4.5 w-4.5" /> Arrived
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
