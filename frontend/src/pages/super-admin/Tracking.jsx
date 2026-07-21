import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import {
  MapPin,
  Search,
  Clock,
  Truck,
  User,
  Navigation,
  RefreshCw,
  CheckCircle2,
  Phone,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getStoredTokens } from '../../lib/apiClient';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')
  : 'http://localhost:4000';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const STATUS_COLORS = {
  'On the way': { bg: 'bg-blue-600', text: 'bg-blue-50 text-blue-700', dot: '#2563EB' },
  Repairing: { bg: 'bg-yellow-500', text: 'bg-yellow-50 text-yellow-700', dot: '#EAB308' },
  Completed: { bg: 'bg-green-500', text: 'bg-green-50 text-green-700', dot: '#22C55E' },
};

// Load Google Maps script dynamically once per app session
let googleMapsLoadPromise = null;
function loadGoogleMaps() {
  if (!googleMapsLoadPromise) {
    googleMapsLoadPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      const callbackName = '__googleMapsReady__';
      window[callbackName] = () => {
        delete window[callbackName];
        resolve(window.google.maps);
      };
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${callbackName}&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = (e) => {
        googleMapsLoadPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
  }
  return googleMapsLoadPromise;
}

function getDerivedFields(tracking) {
  const techName =
    tracking.technician?.user?.name ||
    tracking.technician?.name ||
    'Unknown Technician';
  const customerName =
    tracking.job?.serviceRequest?.user?.name || 'Unknown Customer';
  const jobHumanId = tracking.job?.humanId || tracking.job?.id || 'N/A';

  return { techName, customerName, jobHumanId };
}

const Tracking = () => {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [mapError, setMapError] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const socketRef = useRef(null);
  const mapsApiRef = useRef(null);

  const showToast = useCallback((msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  // ── Marker management ──────────────────────────────────────────────────────

  const createOrUpdateMarker = useCallback((tracking) => {
    if (!mapRef.current || !mapsApiRef.current) return;
    const { lat, lng } = tracking.coords || {};
    if (lat == null || lng == null) return;

    const mapsApi = mapsApiRef.current;
    const position = new mapsApi.LatLng(lat, lng);
    const trackingId = tracking.id || tracking._id;
    const { techName } = getDerivedFields(tracking);
    const colors = STATUS_COLORS[tracking.status] || STATUS_COLORS['On the way'];

    if (markersRef.current[trackingId]) {
      markersRef.current[trackingId].setPosition(position);
      markersRef.current[trackingId].setTitle(`${techName} — ${tracking.status}`);
    } else {
      const marker = new mapsApi.Marker({
        position,
        map: mapRef.current,
        title: `${techName} — ${tracking.status}`,
        icon: {
          path: mapsApi.SymbolPath.CIRCLE,
          fillColor: colors.dot,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 10,
        },
        label: {
          text: tracking.status === 'On the way' ? '🚚' : tracking.status === 'Repairing' ? '🔧' : '✅',
          fontSize: '14px',
        },
      });

      marker.addListener('click', () => {
        setSelectedJob((prev) =>
          prev?.id === trackingId ? null : tracking,
        );
      });

      markersRef.current[trackingId] = marker;
    }
  }, []);

  const removeStaleMarkers = useCallback((activeIds) => {
    const set = new Set(activeIds);
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!set.has(id)) {
        marker.setMap(null);
        delete markersRef.current[id];
      }
    }
  }, []);

  // ── Google Maps init ───────────────────────────────────────────────────────

  const initMap = useCallback(async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('No Google Maps API key found. Add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
      return;
    }
    try {
      const mapsApi = await loadGoogleMaps();
      mapsApiRef.current = mapsApi;

      if (!mapContainerRef.current) return;

      mapRef.current = new mapsApi.Map(mapContainerRef.current, {
        center: { lat: 20.5937, lng: 78.9629 }, // Centre of India
        zoom: 5,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      });
    } catch (err) {
      setMapError('Failed to load Google Maps. Check your API key and network.');
    }
  }, []);

  // ── Socket.IO ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-tracking', {}, (ack) => {
        if (!ack?.ok) {
          setMapError('Unable to join the tracking room — super_admin role required.');
        }
      });
    });

    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    socket.on('tracking:update', (tracking) => {
      setJobs((prev) => {
        const id = tracking.id || tracking._id;
        const exists = prev.find((j) => (j.id || j._id) === id);
        return exists
          ? prev.map((j) => ((j.id || j._id) === id ? tracking : j))
          : [...prev, tracking];
      });
      createOrUpdateMarker(tracking);
      setSelectedJob((prev) => (prev && (prev.id || prev._id) === (tracking.id || tracking._id) ? tracking : prev));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [createOrUpdateMarker]);

  // ── Bootstrap: fetch existing active jobs via REST, then init map ──────────

  const fetchActiveJobs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const { accessToken } = getStoredTokens();
      const res = await fetch(`${SOCKET_URL}/api/v1/super-admin/tracking`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tracking data');
      const json = await res.json();
      const items = json.data || [];
      setJobs(items);
      // Render existing markers
      items.forEach((t) => createOrUpdateMarker(t));
      removeStaleMarkers(items.map((t) => t.id || t._id));
      showToast('Live locations refreshed!');
    } catch {
      // Non-fatal, we still get live updates via socket
    } finally {
      setIsRefreshing(false);
    }
  }, [createOrUpdateMarker, removeStaleMarkers, showToast]);

  useEffect(() => {
    initMap().then(() => fetchActiveJobs());
  }, [initMap, fetchActiveJobs]);

  // ── Center map on selected job ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedJob || !mapRef.current || !mapsApiRef.current) return;
    const { lat, lng } = selectedJob.coords || {};
    if (lat == null || lng == null) return;
    mapRef.current.panTo(new mapsApiRef.current.LatLng(lat, lng));
    mapRef.current.setZoom(13);
  }, [selectedJob]);

  // ── Filter list ────────────────────────────────────────────────────────────

  const filteredJobs = jobs.filter((j) => {
    const { techName, customerName, jobHumanId } = getDerivedFields(j);
    const q = searchQuery.toLowerCase();
    return (
      techName.toLowerCase().includes(q) ||
      jobHumanId.toLowerCase().includes(q) ||
      customerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      <Sidebar />

      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Live Tracking" />

        <div className="p-6 space-y-4 flex-1 flex flex-col">
          {/* Status bar */}
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                socketConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {socketConnected ? 'Live — Socket.IO Connected' : 'Disconnected'}
            </span>
            <span className="text-xs text-slate-500 font-medium">{jobs.length} active job{jobs.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Left: Job list */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-13rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Jobs</h3>
                <button
                  onClick={fetchActiveJobs}
                  disabled={isRefreshing}
                  className="text-[#0D47A1] p-1.5 hover:bg-[#EEF4FF] rounded-full transition-colors disabled:opacity-50"
                  title="Refresh locations"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
                  placeholder="Search by Technician, Job ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredJobs.map((job) => {
                  const { techName, customerName, jobHumanId } = getDerivedFields(job);
                  const jobId = job.id || job._id;
                  const colors = STATUS_COLORS[job.status] || STATUS_COLORS['On the way'];
                  const isSelected = (selectedJob?.id || selectedJob?._id) === jobId;

                  return (
                    <div
                      key={jobId}
                      onClick={() => setSelectedJob(isSelected ? null : job)}
                      className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                        isSelected ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#1E293B] text-sm">{jobHumanId}</p>
                          <p className="text-xs font-semibold text-[#0D47A1] flex items-center gap-1 mt-0.5">
                            <User size={11} /> {techName}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${colors.text}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-[#64748B] space-y-0.5 font-medium">
                        <p className="flex items-center gap-1"><MapPin size={11} /> {job.location || 'Location pending...'}</p>
                        <p className="flex items-center gap-1"><Clock size={11} /> ETA: {job.eta || '—'}</p>
                        <p className="flex items-center gap-1"><User size={11} /> Customer: {customerName}</p>
                        {job.coords?.lat != null && (
                          <p className="text-[10px] text-slate-400">
                            {job.coords.lat.toFixed(5)}, {job.coords.lng.toFixed(5)}
                          </p>
                        )}
                      </div>
                      <div className="mt-2.5 flex justify-end border-t border-dashed border-[#E2E8F0] pt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                          className="text-xs font-bold text-[#0D47A1] flex items-center gap-0.5 hover:underline"
                        >
                          Track <Navigation size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredJobs.length === 0 && (
                  <div className="text-center pt-8">
                    <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-[#64748B]">No active live jobs</p>
                    <p className="text-[10px] text-slate-400 mt-1">Waiting for technicians to go online...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Google Map */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-13rem)] shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-5 py-4 border-b border-[#E2E8F0] flex-shrink-0">
                <h3 className="font-bold text-[#1E293B]">Live Map</h3>
                <div className="flex gap-3">
                  {Object.entries(STATUS_COLORS).map(([label, colors]) => (
                    <span key={label} className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors.dot }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {mapError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F8FAFC]">
                  <AlertTriangle size={40} className="text-orange-400 mb-3" />
                  <p className="font-bold text-[#1E293B] text-sm mb-1">Map unavailable</p>
                  <p className="text-xs text-[#64748B] text-center max-w-sm">{mapError}</p>
                  <code className="mt-3 text-[10px] bg-slate-100 px-3 py-2 rounded text-slate-600">
                    VITE_GOOGLE_MAPS_API_KEY=&lt;your-key&gt;
                  </code>
                </div>
              ) : (
                <div ref={mapContainerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
              )}

              {/* Selected job overlay card */}
              {selectedJob && !mapError && (() => {
                const { techName, customerName, jobHumanId } = getDerivedFields(selectedJob);
                const colors = STATUS_COLORS[selectedJob.status] || STATUS_COLORS['On the way'];
                return (
                  <div className="absolute bottom-8 right-8 bg-white p-4 rounded-xl shadow-xl border border-[#E2E8F0] max-w-xs w-full z-20 animate-in slide-in-from-bottom-2">
                    <div className="flex gap-3 items-start">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${colors.bg}`}>
                        {selectedJob.status === 'On the way' ? <Truck size={18} /> : <MapPin size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-[11px] font-black text-[#1E293B]">Job {jobHumanId}</p>
                            <p className="text-sm font-bold text-[#0D47A1] truncate">{techName}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ml-2 ${colors.text}`}>
                            {selectedJob.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-0.5 border-t border-dashed border-[#E2E8F0] pt-1.5">
                          <p><span className="text-[#64748B]">Customer:</span> {customerName}</p>
                          <p><span className="text-[#64748B]">Location:</span> {selectedJob.location || '—'}</p>
                          <p className="text-[#0D47A1]"><span className="text-[#64748B]">ETA:</span> {selectedJob.eta || '—'}</p>
                          {selectedJob.coords?.lat != null && (
                            <p className="text-slate-400 text-[10px]">
                              {selectedJob.coords.lat.toFixed(5)}, {selectedJob.coords.lng.toFixed(5)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => showToast(`Contacting ${techName}...`)}
                            className="px-3 py-1 bg-slate-100 hover:bg-[#EEF4FF] text-[#0D47A1] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                          >
                            <Phone size={12} /> Contact
                          </button>
                          <button
                            onClick={() => setSelectedJob(null)}
                            className="px-3 py-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMessage}
        </div>
      )}
    </div>
  );
};

export default Tracking;
