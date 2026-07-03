import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import {
  Search, UserPlus, MapPin, Star, Clock, ClipboardList, CheckCircle2,
  Zap, SlidersHorizontal, Save, Sparkles,
} from 'lucide-react';

const WEIGHT_META = [
  { key: 'proximity', label: 'Location Proximity' },
  { key: 'skill', label: 'Skill Match' },
  { key: 'rating', label: 'Rating' },
  { key: 'workload', label: 'Workload (fewer jobs)' },
];
const MAX_JOBS = 5;

const Assignment = () => {
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [weights, setWeights] = useState({ proximity: 40, skill: 30, rating: 20, workload: 10 });

  const [requests, setRequests] = useState([
    { id: 'SR-8901', customer: 'Amit Sharma', product: 'Smart TV', brand: 'LG', city: 'Delhi', date: '12 May, 2026' },
    { id: 'SR-8906', customer: 'Sonal J.', product: 'Washing Machine', brand: 'LG', city: 'Delhi', date: '12 May, 2026' },
  ]);

  const [techs, setTechs] = useState([
    { id: 'TECH-001', name: 'Rahul Kumar', skill: 'All Appliances', rating: 4.8, activeJobs: 2, distance: '3.2 km' },
    { id: 'TECH-006', name: 'Manish S.', skill: 'TV & Sound', rating: 4.5, activeJobs: 0, distance: '1.5 km' },
    { id: 'TECH-007', name: 'Kapil Dev', skill: 'Washing Machine', rating: 4.2, activeJobs: 1, distance: '4.0 km' },
  ]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get('req');
    if (reqId) {
      const match = requests.find((r) => r.id === reqId);
      if (match) {
        setSelectedRequest(match);
        showToast(`Request ${reqId} pre-selected for assignment`);
      }
    }
  }, [location]);

  // ---- scoring engine (simulated assignment logic) ----
  const parseKm = (d) => parseFloat(d) || 0;
  const skillMatch = (tech, product) => {
    if (!product) return 0.7;
    const s = tech.skill.toLowerCase();
    if (s.includes('all')) return 0.9;
    const p = product.toLowerCase();
    if (p.includes('tv') && s.includes('tv')) return 1;
    if (p.includes('washing') && s.includes('washing')) return 1;
    return 0.45;
  };
  const scoreTech = (tech) => {
    const total = weights.proximity + weights.skill + weights.rating + weights.workload || 1;
    const prox = 1 - Math.min(parseKm(tech.distance) / 6, 1);
    const skill = skillMatch(tech, selectedRequest?.product);
    const rating = tech.rating / 5;
    const workload = 1 - Math.min(tech.activeJobs / MAX_JOBS, 1);
    const raw = weights.proximity * prox + weights.skill * skill + weights.rating * rating + weights.workload * workload;
    return Math.round((raw / total) * 100);
  };

  const ranked = [...techs].map((t) => ({ ...t, score: scoreTech(t) })).sort((a, b) => b.score - a.score);
  const recommended = ranked[0];

  const handleAssign = () => {
    if (!selectedRequest || !selectedTech) {
      showToast('Please select both a request and a technician.');
      return;
    }
    showToast(`Assigned ${selectedTech.name} to Request ${selectedRequest.id} successfully!`);
    setRequests(requests.filter((r) => r.id !== selectedRequest.id));
    setSelectedRequest(null);
    setSelectedTech(null);
  };

  const handleAutoAssign = () => {
    const target = selectedRequest || requests[0];
    if (!target) {
      showToast('No pending requests to auto-assign.');
      return;
    }
    showToast(`Auto-assigned ${recommended.name} (score ${recommended.score}) to ${target.id}`);
    setRequests((prev) => prev.filter((r) => r.id !== target.id));
    setSelectedRequest(null);
    setSelectedTech(null);
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Technician Assignment" />

        <div className="p-6 space-y-6 flex-1">
          {/* ---- Assignment Logic Config ---- */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#EEF4FF] text-[#0D47A1] rounded-xl flex items-center justify-center">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1E293B]">Assignment Logic</h3>
                  <p className="text-xs text-[#64748B]">Configure how the system ranks & assigns technicians</p>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex bg-[#F1F5F9] rounded-xl p-1">
                <button
                  onClick={() => setMode('auto')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'auto' ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-[#64748B]'
                  }`}
                >
                  <Zap size={14} /> Auto-assign
                </button>
                <button
                  onClick={() => setMode('manual')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'manual' ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-[#64748B]'
                  }`}
                >
                  <UserPlus size={14} /> Manual
                </button>
              </div>
            </div>

            {mode === 'auto' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weight sliders */}
                <div className="space-y-4">
                  {WEIGHT_META.map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs font-semibold text-[#1E293B] mb-1.5">
                        <span>{label}</span>
                        <span className="text-[#0D47A1]">{weights[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weights[key]}
                        onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                        className="w-full accent-[#0D47A1] cursor-pointer"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => showToast('Assignment rules saved successfully!')}
                    className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-[#0D47A1] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Save size={15} /> Save Rules
                  </button>
                </div>

                {/* Recommended preview */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#0D47A1]" />
                    <h4 className="text-sm font-bold text-[#1E293B]">
                      Recommended {selectedRequest ? `for ${selectedRequest.id}` : '(top match)'}
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {ranked.map((t, i) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                          i === 0 ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-[#E2E8F0] bg-white'
                        }`}
                      >
                        <div className="w-9 h-9 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                          {t.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#1E293B] text-sm truncate">{t.name}</p>
                            {i === 0 && (
                              <span className="text-[10px] font-bold text-[#0D47A1] bg-white border border-[#0D47A1] px-1.5 py-0.5 rounded-full">
                                BEST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#64748B] mt-0.5">
                            <span className="flex items-center gap-0.5"><Star size={10} fill="currentColor" className="text-amber-500" /> {t.rating}</span>
                            <span className="flex items-center gap-0.5"><MapPin size={10} /> {t.distance}</span>
                            <span>{t.activeJobs} jobs</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-[#0D47A1]" style={{ width: `${t.score}%` }} />
                          </div>
                          <span className="text-xs font-bold text-[#0D47A1]">{t.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAutoAssign}
                    className="w-full mt-4 py-3 bg-[#0D47A1] text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap size={16} /> Auto-Assign Best Match
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">
                Manual mode is on. Pick a request and a technician below to assign directly.
              </p>
            )}
          </div>

          {/* ---- Manual assignment (override path) ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Unassigned Requests */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Unassigned Requests</h3>
                <span className="bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full text-xs font-medium">{filteredRequests.length} Pending</span>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search Request or Customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedRequest?.id === req.id ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#1E293B]">{req.id}</p>
                        <p className="text-sm text-[#64748B]">{req.customer}</p>
                      </div>
                      <span className="text-xs text-[#64748B] flex items-center gap-1"><Clock size={12} /> {req.date}</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs text-[#64748B]">
                      <span>{req.product} ({req.brand})</span>
                      <span className="flex items-center gap-0.5"><MapPin size={12} /> {req.city}</span>
                    </div>
                  </div>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-12 text-[#64748B]">
                    <ClipboardList size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No unassigned requests.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Available Technicians */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Available Technicians</h3>
                <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full text-xs font-medium">{techs.length} Online</span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {techs.map((tech) => (
                  <div
                    key={tech.id}
                    onClick={() => setSelectedTech(tech)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedTech?.id === tech.id ? 'border-green-600 bg-green-50' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {tech.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-[#1E293B]">{tech.name}</p>
                          <p className="text-xs text-[#64748B]">{tech.skill}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-500 flex items-center gap-0.5 justify-end">
                          <Star size={14} fill="currentColor" /> {tech.rating}
                        </span>
                        <span className="text-xs text-[#64748B]">{tech.distance} away</span>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-xs text-[#64748B]">
                      <span>Active Jobs: {tech.activeJobs}</span>
                      <span className="text-green-600 font-medium">Ready to assign</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex justify-between text-sm mb-4">
                  <div>
                    <p className="text-[#64748B] text-xs">Selected Request:</p>
                    <p className="font-bold text-[#1E293B]">{selectedRequest ? selectedRequest.id : 'None'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#64748B] text-xs">Selected Tech:</p>
                    <p className="font-bold text-green-600">{selectedTech ? selectedTech.name : 'None'}</p>
                  </div>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={!selectedRequest || !selectedTech}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    selectedRequest && selectedTech ? 'bg-[#0D47A1] text-white hover:bg-blue-700' : 'bg-[#F1F5F9] text-[#64748B] cursor-not-allowed'
                  }`}
                >
                  <UserPlus size={18} /> Assign Technician
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Assignment;
