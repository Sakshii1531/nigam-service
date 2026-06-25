import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  UserPlus, 
  MapPin, 
  Star,
  Clock,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';

const Assignment = () => {
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
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
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get('req');
    if (reqId) {
      const match = requests.find(r => r.id === reqId);
      if (match) {
        setSelectedRequest(match);
        showToast(`Request ${reqId} pre-selected for assignment`);
      }
    }
  }, [location]);

  const handleAssign = () => {
    if (!selectedRequest || !selectedTech) {
      showToast('Please select both a request and a technician.');
      return;
    }
    showToast(`Assigned ${selectedTech.name} to Request ${selectedRequest.id} successfully!`);
    setRequests(requests.filter(r => r.id !== selectedRequest.id));
    setSelectedRequest(null);
    setSelectedTech(null);
  };

  const filteredRequests = requests.filter(r => 
    r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Technician Assignment" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Unassigned Requests */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex flex-col h-[calc(100vh-12rem)] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#1E293B]">Unassigned Requests</h3>
                <span className="bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full text-xs font-medium">{filteredRequests.length} Pending</span>
              </div>

              {/* Search */}
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

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredRequests.map((req) => (
                  <div 
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedRequest?.id === req.id 
                        ? 'border-[#0D47A1] bg-[#EEF4FF]' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
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

              {/* List */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {techs.map((tech) => (
                  <div 
                    key={tech.id}
                    onClick={() => setSelectedTech(tech)}
                    className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                      selectedTech?.id === tech.id 
                        ? 'border-green-600 bg-green-50' 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-[#0D47A1] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {tech.name.split(' ').map(n => n[0]).join('')}
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

              {/* Assignment Action */}
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
                    selectedRequest && selectedTech
                      ? 'bg-[#0D47A1] text-white hover:bg-blue-700'
                      : 'bg-[#F1F5F9] text-[#64748B] cursor-not-allowed'
                  }`}
                >
                  <UserPlus size={18} /> Assign Technician
                </button>
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

export default Assignment;
