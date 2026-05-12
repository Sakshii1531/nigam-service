import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Map, 
  Plus, 
  Search, 
  MoreVertical, 
  CheckCircle, 
  XCircle,
  MapPin
} from 'lucide-react';

const Cities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cities, setCities] = useState([
    { id: 'CIT-01', name: 'Delhi NCR', area: '1,483 sq km', techs: 450, status: 'Active' },
    { id: 'CIT-02', name: 'Mumbai', area: '603 sq km', techs: 320, status: 'Active' },
    { id: 'CIT-03', name: 'Bangalore', area: '709 sq km', techs: 280, status: 'Active' },
    { id: 'CIT-04', name: 'Chennai', area: '426 sq km', techs: 150, status: 'Active' },
    { id: 'CIT-05', name: 'Kolkata', area: '205 sq km', techs: 0, status: 'Inactive' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setCities(cities.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredCities = cities.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Cities & Service Areas" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Operational Cities</h2>
            <button className="bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus size={16} /> Add City
            </button>
          </div>

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
                  placeholder="Search City Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">City ID</th>
                    <th className="px-6 py-4">City Name</th>
                    <th className="px-6 py-4">Coverage Area</th>
                    <th className="px-6 py-4">Active Techs</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredCities.map((city) => (
                    <tr key={city.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{city.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium flex items-center gap-1">
                        <MapPin size={14} className="text-[#64748B]" /> {city.name}
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{city.area}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{city.techs}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          city.status === 'Active' ? 'bg-green-50 text-green-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {city.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {city.status === 'Active' ? (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Inactive')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                              title="Deactivate"
                            >
                              <XCircle size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(city.id, 'Active')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                              title="Activate"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button className="p-1.5 text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Cities;
