import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { Users, Plus, Shield, Eye, Edit2, CheckCircle2, X, Search, Building2, UserPlus, Trash2 } from 'lucide-react';

const initialTeams = [
  { id: 1, name: 'Delhi NCR Team A', department: 'Field Service', lead: 'Rahul Kumar', membersCount: 8, activeRequests: 14, region: 'Delhi NCR' },
  { id: 2, name: 'Mumbai West AC Team', department: 'Field Service', lead: 'Amit Singh', membersCount: 6, activeRequests: 9, region: 'Mumbai' },
  { id: 3, name: 'South India QA Team', department: 'Quality Assurance', lead: 'Suresh Raina', membersCount: 4, activeRequests: 3, region: 'Bangalore' },
  { id: 4, name: 'National Remote Support', department: 'Remote Support', lead: 'Deepak Patel', membersCount: 12, activeRequests: 28, region: 'National' },
];

const departmentsList = ['Field Service', 'Quality Assurance', 'Remote Support', 'Installation Team'];

const TeamsDepartments = () => {
  const [teams, setTeams] = useState(initialTeams);
  const [searchQ, setSearchQ] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', department: 'Field Service', lead: '', region: '' });
  const [successMsg, setSuccessMsg] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleAddTeam = () => {
    if (!newTeam.name.trim() || !newTeam.lead.trim() || !newTeam.region.trim()) {
      toast('Please fill in all team details!');
      return;
    }
    setTeams(prev => [
      ...prev,
      {
        id: prev.length + 1,
        ...newTeam,
        membersCount: 1,
        activeRequests: 0
      }
    ]);
    setShowAddModal(false);
    setNewTeam({ name: '', department: 'Field Service', lead: '', region: '' });
    toast(`Team "${newTeam.name}" created successfully!`);
  };

  const handleDeleteTeam = (id, name) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    toast(`Team "${name}" deleted!`);
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.department.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.lead.toLowerCase().includes(searchQ.toLowerCase()) ||
    t.region.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Teams & Departments" subtitle="Manage service zones, field teams, and technician departments" />
        <div className="p-5 space-y-5">

          {/* Top Actions */}
          <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-[#E2E8F0]">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                placeholder="Search teams by name, lead, region..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-xs outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} /> Create Service Team
            </button>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeams.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#EEF4FF] text-[#0D47A1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D0E2FF]">{t.department}</span>
                    <span className="text-[10px] text-[#64748B] font-semibold bg-[#F1F5F9] px-2 py-0.5 rounded-full">{t.region}</span>
                  </div>
                  <h3 className="font-bold text-[#1E293B] text-sm mb-3 mt-1">{t.name}</h3>

                  <div className="space-y-2 border-t border-[#F1F5F9] pt-3 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Team Lead:</span>
                      <span className="font-bold text-[#1E293B]">{t.lead}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Active Members:</span>
                      <span className="font-semibold text-[#0D47A1]">{t.membersCount} Technicians</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#64748B]">Active Complaints:</span>
                      <span className={`font-semibold ${t.activeRequests > 15 ? 'text-red-500' : 'text-[#1E293B]'}`}>{t.activeRequests} Tickets</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#F1F5F9]">
                  <button
                    onClick={() => toast(`Viewing members of ${t.name}...`)}
                    className="flex-1 bg-[#EEF4FF] hover:bg-[#D0E2FF] text-[#0D47A1] py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={12} /> Members
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(t.id, t.name)}
                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg hover:text-red-700 transition-colors border border-transparent hover:border-red-200"
                    title="Delete Team"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-[#E2E8F0]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[#1E293B] text-sm">Create Service Team</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-[#EEF2F6] rounded-full"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Team Name</label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi AC Repair Team"
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Department</label>
                <select
                  value={newTeam.department}
                  onChange={e => setNewTeam({ ...newTeam, department: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                >
                  {departmentsList.map(dept => <option key={dept}>{dept}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Team Lead Technician</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={newTeam.lead}
                  onChange={e => setNewTeam({ ...newTeam, lead: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Coverage Region / City</label>
                <input
                  type="text"
                  placeholder="e.g. South Delhi / Noida"
                  value={newTeam.region}
                  onChange={e => setNewTeam({ ...newTeam, region: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 border border-[#E2E8F0] py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={handleAddTeam} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Create Team</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default TeamsDepartments;
