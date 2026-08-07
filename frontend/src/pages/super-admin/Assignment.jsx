import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import {
  Search, UserPlus, MapPin, Star, Clock, ClipboardList, CheckCircle2,
  Zap, SlidersHorizontal, Save, Sparkles, AlertCircle
} from 'lucide-react';

const WEIGHT_META = [
  { key: 'proximity', label: 'Location Proximity' },
  { key: 'skill', label: 'Skill Match' },
  { key: 'rating', label: 'Rating' },
  { key: 'workload', label: 'Workload (fewer jobs)' },
];

const Assignment = () => {
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState('manual'); // 'auto' | 'manual'
  const [weights, setWeights] = useState({ proximity: 40, skill: 30, rating: 20, workload: 10 });

  const [requests, setRequests] = useState([]);
  const [techs, setTechs] = useState([]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const [loadError, setLoadError] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Requests still waiting on a technician, plus the admin-configured weighting
  // the scoring engine uses. The technician shortlist is per-request and is
  // fetched when one is selected.
  const loadData = React.useCallback(async () => {
    try {
      const res = await apiRequest('/service-requests?limit=200&sort=-createdAt', { auth: true });
      const unassigned = (res.data || [])
        .filter(item => !item.technician && !['Closed', 'Cancelled'].includes(item.status))
        .map(item => ({
          id: item.id,
          ref: item.humanId || item.id,
          customer: item.user?.name || 'Customer',
          product: item.category || 'Appliance Repair',
          brand: item.brand?.name || 'Nigam Care',
          city: item.zone || '—',
          date: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—',
          status: item.status,
          technician: 'Unassigned',
        }));
      setRequests(unassigned);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load service requests.');
    }

    try {
      const w = await apiRequest('/super-admin/assignment-weighting', { auth: true });
      if (w.data) {
        setWeights({
          proximity: w.data.proximityPercent,
          skill: w.data.skillPercent,
          rating: w.data.ratingPercent,
          workload: w.data.workloadPercent,
        });
      }
    } catch (err) {
      console.warn('[assignment] Could not load weighting:', err.message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // The shortlist is scored server-side by the same engine auto-assign uses, so
  // the console can't drift from what the platform would actually pick.
  useEffect(() => {
    if (!selectedRequest) { setTechs([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest(`/service-requests/${selectedRequest.id}/technician-suggestions`, { auth: true });
        if (cancelled) return;
        setTechs((res.data || []).map(t => ({
          id: t.id,
          name: t.name,
          skill: t.specs?.length ? t.specs.join(', ') : 'All Appliances',
          rating: t.rating || 0,
          activeJobs: t.activeJobsCount || 0,
          city: t.city || '—',
          score: t.score,
        })));
      } catch (err) {
        if (!cancelled) {
          setTechs([]);
          setLoadError(err.message || 'Could not load technician suggestions.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRequest]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get('req');
    if (reqId && requests.length > 0) {
      const match = requests.find((r) => r.id === reqId || r.ref === reqId);
      if (match) {
        setSelectedRequest(match);
        showToast(`Request ${match.ref} pre-selected for manual assignment`);
      }
    }
  }, [location, requests]);

  const saveWeights = async () => {
    try {
      await apiRequest('/super-admin/assignment-weighting', {
        method: 'PUT',
        auth: true,
        body: {
          proximityPercent: weights.proximity,
          skillPercent: weights.skill,
          ratingPercent: weights.rating,
          workloadPercent: weights.workload,
        },
      });
      showToast('Assignment weighting saved — it applies to every future assignment.');
    } catch (err) {
      showToast(err.message || 'Could not save weighting.');
    }
  };

  // Auto-assignment sends no technician, which tells the server to use the
  // engine's top-ranked candidate for each request.
  const runAutoAssignment = async () => {
    if (requests.length === 0) {
      showToast('No unassigned requests available for auto-assignment.');
      return;
    }
    setAssigning(true);
    let assigned = 0;
    const failures = [];
    for (const req of requests) {
      try {
        await apiRequest(`/service-requests/${req.id}/assign`, { method: 'PATCH', auth: true, body: {} });
        assigned += 1;
      } catch (err) {
        failures.push(`${req.ref}: ${err.message}`);
      }
    }
    setAssigning(false);
    setSelectedRequest(null);
    setSelectedTech(null);
    await loadData();
    showToast(
      failures.length
        ? `Auto-assigned ${assigned} request(s); ${failures.length} could not be assigned.`
        : `Auto-assigned ${assigned} request(s) to the best-matching technicians.`,
    );
    if (failures.length) console.warn('[assignment] Unassigned:', failures);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'auto') runAutoAssignment();
  };

  const handleAssign = async () => {
    if (!selectedRequest || !selectedTech) {
      showToast('Please select a request from the left and a technician from the right.');
      return;
    }
    setAssigning(true);
    try {
      await apiRequest(`/service-requests/${selectedRequest.id}/assign`, {
        method: 'PATCH',
        auth: true,
        body: { technician: selectedTech.id },
      });
      showToast(`Assigned ${selectedTech.name} to request ${selectedRequest.ref}`);
      setSelectedRequest(null);
      setSelectedTech(null);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Could not assign technician.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                  onClick={() => handleModeChange('auto')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'auto' ? 'bg-[#0D47A1] text-white shadow-sm' : 'text-[#64748B]'
                  }`}
                >
                  <Zap size={14} /> Auto-assign
                </button>
                <button
                  onClick={() => handleModeChange('manual')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    mode === 'manual' ? 'bg-[#0D47A1] text-white shadow-sm' : 'text-[#64748B]'
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
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#0D47A1] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#0D47A1] font-medium leading-relaxed">
                      <strong>Automated Assignment Mode Active:</strong> Incoming service requests are evaluated against location proximity, rating, skills, and workload, and automatically assigned without requiring admin intervention.
                    </p>
                  </div>

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
                    onClick={saveWeights}
                    className="mt-2 flex items-center gap-2 px-4 py-2.5 bg-[#0D47A1] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Save size={15} /> Save Rules
                  </button>
                </div>

                {/* Auto-Assignment status box */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={18} className="text-green-600" />
                      <h4 className="text-sm font-bold text-[#1E293B]">Automatic Dispatch System</h4>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      When Auto-Assignment is enabled, the system continuously pairs incoming service requests with the highest-scoring technician based on proximity, ratings, and workload balance.
                    </p>

                    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>System Mode:</span>
                        <span className="text-green-600 font-bold uppercase tracking-wider">Fully Autonomous</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Pending Unassigned Requests:</span>
                        <span className="font-bold text-[#0D47A1]">{requests.length}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>Available Technicians:</span>
                        <span className="font-bold text-green-600">{techs.length} Online</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={runAutoAssignment}
                    className="w-full mt-4 py-3 bg-[#0D47A1] text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap size={16} /> Run Auto-Assign Now ({requests.length} Pending)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <p className="text-xs text-slate-600 font-medium">
                  <strong>Manual Assignment Mode Active:</strong> Select an unassigned request from the left column and pick an available technician from the right column to pair directly.
                </p>
              </div>
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
                        <p className="font-bold text-[#1E293B]">{req.ref}</p>
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
                        <span className="text-xs text-[#64748B]">{tech.city}</span>
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
                    <p className="font-bold text-[#1E293B]">{selectedRequest ? selectedRequest.ref : 'None'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#64748B] text-xs">Selected Tech:</p>
                    <p className="font-bold text-green-600">{selectedTech ? selectedTech.name : 'None'}</p>
                  </div>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={!selectedRequest || !selectedTech || assigning}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                    selectedRequest && selectedTech && !assigning ? 'bg-[#0D47A1] text-white hover:bg-blue-700' : 'bg-[#F1F5F9] text-[#64748B] cursor-not-allowed'
                  }`}
                >
                  <UserPlus size={18} /> {assigning ? 'Assigning…' : 'Assign Technician'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {loadError}
        </div>
      )}

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
