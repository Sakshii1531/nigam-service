import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  MapPin, 
  Search, 
  Filter, 
  Clock, 
  Truck, 
  User,
  Navigation,
  RefreshCw,
  X,
  CheckCircle2,
  Phone
} from 'lucide-react';

const Tracking = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeJobs, setActiveJobs] = useState([
    { id: 'JOB-201', tech: 'Rahul Kumar', customer: 'Amit Sharma', status: 'On the way', eta: '10 mins', location: 'Connaught Place, Delhi', coords: { top: '30%', left: '40%' }, phone: '+91 98765 43210' },
    { id: 'JOB-202', tech: 'Amit Singh', customer: 'Priya Patel', status: 'Repairing', eta: 'In Progress', location: 'Andheri West, Mumbai', coords: { top: '65%', left: '70%' }, phone: '+91 98765 43211' },
    { id: 'JOB-203', tech: 'Suresh Raina', customer: 'Rajesh K.', status: 'Completed', eta: 'Finished', location: 'Indiranagar, Bangalore', coords: { top: '80%', left: '25%' }, phone: '+91 98765 43212' },
  ]);

  const [selectedJob, setSelectedJob] = useState(activeJobs[0]);

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Simulate slightly updated ETA
      setActiveJobs(activeJobs.map(job => {
        if (job.status === 'On the way') {
          return { ...job, eta: '7 mins', location: 'Barakhamba Road, Delhi' };
        }
        return job;
      }));
      showToast('Live locations refreshed successfully!');
    }, 1200);
  };

  const filteredActiveJobs = activeJobs.filter(job => 
    job.tech.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative text-slate-800">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Live Tracking" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 flex flex-col">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Left Column: Active Jobs List */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Jobs</h3>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="text-[#0D47A1] p-1.5 hover:bg-[#EEF4FF] rounded-full transition-colors disabled:opacity-50"
                  title="Refresh GPS Locations"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC] text-slate-800"
                  placeholder="Search Technician or Job ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredActiveJobs.map((job) => (
                  <div 
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedJob?.id === job.id 
                        ? 'border-[#0D47A1] bg-[#EEF4FF]' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#1E293B]">{job.id}</p>
                        <p className="text-xs font-semibold text-[#0D47A1] flex items-center gap-0.5 mt-0.5"><User size={12} /> {job.tech}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        job.status === 'Repairing' ? 'bg-yellow-50 text-yellow-600' :
                        job.status === 'On the way' ? 'bg-blue-50 text-blue-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#64748B] space-y-0.5 font-medium">
                      <p className="flex items-center gap-1"><MapPin size={12} className="flex-shrink-0" /> {job.location}</p>
                      <p className="flex items-center gap-1"><Clock size={12} className="flex-shrink-0" /> ETA: {job.eta}</p>
                    </div>
                    <div className="mt-2.5 flex justify-end border-t border-dashed border-[#E2E8F0]/80 pt-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJob(job);
                          showToast(`Centering live GPS coordinates for ${job.tech}`);
                        }}
                        className="text-xs font-bold text-[#0D47A1] flex items-center gap-0.5 hover:underline"
                      >
                        Track <Navigation size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredActiveJobs.length === 0 && (
                  <p className="text-xs text-[#64748B] text-center pt-8">No active live jobs matching criteria.</p>
                )}
              </div>
            </div>

            {/* Right Column: Simulated Map */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Map View</h3>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B]"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span> On the way</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B]"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span> Repairing</span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B]"><span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span> Completed</span>
                </div>
              </div>

              {/* Simulated Map Canvas */}
              <div className="flex-1 bg-[#F1F5F9] rounded-xl relative overflow-hidden border border-[#E2E8F0]">
                {/* Grid Lines to simulate map grid */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border border-[#1E293B]"></div>
                  ))}
                </div>

                {/* Simulated Markers */}
                {activeJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  let colorClass = 'bg-blue-600';
                  if (job.status === 'Repairing') colorClass = 'bg-yellow-500';
                  if (job.status === 'Completed') colorClass = 'bg-green-500';

                  return (
                    <div 
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="absolute transition-all duration-500 cursor-pointer group"
                      style={{ top: job.coords.top, left: job.coords.left }}
                    >
                      <div className={`w-8 h-8 ${colorClass} text-white rounded-full flex items-center justify-center shadow-lg transition-transform ${
                        isSelected ? 'scale-125 animate-bounce ring-4 ring-white' : 'hover:scale-110'
                      }`}>
                        {job.status === 'On the way' ? <Truck size={15} /> : <MapPin size={15} />}
                      </div>
                      <div className={`absolute top-9 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow z-20`}>
                        {job.tech} ({job.status})
                      </div>
                    </div>
                  );
                })}

                {/* Selected Job Card Tooltip Box overlay */}
                {selectedJob && (
                  <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto bg-white p-4 rounded-xl shadow-lg border border-[#E2E8F0] max-w-sm w-[calc(100%-2rem)] flex gap-3 items-start animate-slide-up z-20">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                      selectedJob.status === 'Repairing' ? 'bg-yellow-500' :
                      selectedJob.status === 'On the way' ? 'bg-blue-600' :
                      'bg-green-500'
                    }`}>
                      {selectedJob.status === 'On the way' ? <Truck size={18} /> : <MapPin size={18} />}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-[#1E293B]">Job {selectedJob.id}</p>
                          <p className="text-sm font-bold text-[#0D47A1]">{selectedJob.tech}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedJob.status === 'Repairing' ? 'bg-yellow-50 text-yellow-600' :
                          selectedJob.status === 'On the way' ? 'bg-blue-50 text-blue-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {selectedJob.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5 font-medium border-t border-dashed border-[#E2E8F0] pt-1.5">
                        <p className="text-slate-800"><span className="text-[#64748B]">Customer:</span> {selectedJob.customer}</p>
                        <p><span className="text-[#64748B]">Location:</span> {selectedJob.location}</p>
                        <p className="text-[#0D47A1]"><span className="text-[#64748B]">ETA:</span> {selectedJob.eta}</p>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <a 
                          href={`tel:${selectedJob.phone}`}
                          onClick={(e) => {
                            e.preventDefault();
                            showToast(`Dialing technician ${selectedJob.tech} (${selectedJob.phone})...`);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-[#EEF4FF] text-[#0D47A1] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-slate-200"
                        >
                          <Phone size={12} /> Contact Tech
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default Tracking;
