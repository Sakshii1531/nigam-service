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
  RefreshCw
} from 'lucide-react';

const Tracking = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeJobs, setActiveJobs] = useState([
    { id: 'JOB-201', tech: 'Rahul Kumar', customer: 'Amit Sharma', status: 'On the way', eta: '10 mins', location: 'Connaught Place, Delhi' },
    { id: 'JOB-202', tech: 'Amit Singh', customer: 'Priya Patel', status: 'Repairing', eta: 'In Progress', location: 'Andheri West, Mumbai' },
    { id: 'JOB-203', tech: 'Suresh Raina', customer: 'Rajesh K.', status: 'Completed', eta: 'Finished', location: 'Indiranagar, Bangalore' },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
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
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Jobs</h3>
                <button className="text-[#0D47A1] p-1.5 hover:bg-[#EEF4FF] rounded-full transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Technician or Job ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {activeJobs.map((job) => (
                  <div 
                    key={job.id}
                    className="p-4 border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-[#1E293B]">{job.id}</p>
                        <p className="text-xs font-medium text-[#0D47A1] flex items-center gap-0.5"><User size={12} /> {job.tech}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        job.status === 'Repairing' ? 'bg-yellow-50 text-yellow-600' :
                        job.status === 'On the way' ? 'bg-blue-50 text-blue-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#64748B]">
                      <p className="flex items-center gap-1"><MapPin size={12} /> {job.location}</p>
                      <p className="flex items-center gap-1 mt-0.5"><Clock size={12} /> ETA: {job.eta}</p>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button className="text-xs font-bold text-[#0D47A1] flex items-center gap-0.5 hover:underline">
                        Track <Navigation size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Simulated Map */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Live Map View</h3>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs text-[#64748B]"><span className="w-2.5 h-2.5 bg-blue-600 rounded-full"></span> On the way</span>
                  <span className="flex items-center gap-1 text-xs text-[#64748B]"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span> Repairing</span>
                </div>
              </div>

              {/* Simulated Map Canvas */}
              <div className="flex-1 bg-[#F1F5F9] rounded-xl relative overflow-hidden">
                {/* Grid Lines to simulate map grid */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border border-[#1E293B]"></div>
                  ))}
                </div>

                {/* Simulated Markers */}
                <div className="absolute top-1/4 left-1/3 group cursor-pointer">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <Truck size={16} />
                  </div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Rahul (On the way)
                  </div>
                </div>

                <div className="absolute top-2/3 left-2/3 group cursor-pointer">
                  <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg">
                    <MapPin size={16} />
                  </div>
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-[#1E293B] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    Amit (Repairing)
                  </div>
                </div>

                <div className="absolute bottom-10 left-1/4 bg-white p-3 rounded-lg shadow-sm border border-[#E2E8F0] max-w-xs">
                  <p className="text-xs font-bold text-[#1E293B]">Job #JOB-201</p>
                  <p className="text-xs text-[#64748B]">Tech: Rahul Kumar</p>
                  <p className="text-xs text-[#0D47A1] font-medium mt-1">Status: Moving towards customer</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Tracking;
