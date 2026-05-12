import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Clock, 
  Search, 
  Filter, 
  User, 
  Shield, 
  CreditCard, 
  Package,
  AlertTriangle
} from 'lucide-react';

const Logs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [logs, setLogs] = useState([
    { id: 1, user: 'Super Admin', action: 'Approved Brand LG', type: 'System', date: '12 May, 2026 - 11:30 AM' },
    { id: 2, user: 'Support Mgr', action: 'Resolved Complaint CMP-304', type: 'Support', date: '12 May, 2026 - 10:15 AM' },
    { id: 3, user: 'Super Admin', action: 'Banned User USR-1003', type: 'User', date: '11 May, 2026 - 04:20 PM' },
    { id: 4, user: 'Finance Mgr', action: 'Processed Payout for Tech Rahul', type: 'Finance', date: '11 May, 2026 - 02:00 PM' },
    { id: 5, user: 'System', action: 'Low stock alert for Refrigerator Compressor', type: 'Inventory', date: '10 May, 2026 - 09:00 AM' },
  ]);

  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Activity Logs" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Admin, Action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Types</option>
                <option>System</option>
                <option>Support</option>
                <option>User</option>
                <option>Finance</option>
                <option>Inventory</option>
              </select>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex-1 overflow-y-auto">
            <div className="border-l-2 border-[#E2E8F0] ml-4 pl-6 space-y-6">
              {filteredLogs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                    log.type === 'System' ? 'bg-[#0D47A1]' :
                    log.type === 'Support' ? 'bg-green-500' :
                    log.type === 'User' ? 'bg-red-500' :
                    log.type === 'Finance' ? 'bg-yellow-500' : 'bg-orange-500'
                  }`}></div>
                  
                  <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-[#1E293B]">{log.action}</p>
                        <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
                          <User size={12} /> {log.user} • <span className="font-medium text-[#0D47A1]">{log.type}</span>
                        </p>
                      </div>
                      <span className="text-xs text-[#64748B] flex items-center gap-1"><Clock size={12} /> {log.date}</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-[#64748B]">
                  <Clock size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No logs found matching your criteria.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Logs;
