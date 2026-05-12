import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  XCircle,
  FileCheck,
  Download,
  ExternalLink
} from 'lucide-react';

const Warranty = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [claims, setClaims] = useState([
    { id: 'WRN-101', customer: 'Amit Sharma', product: 'Smart TV', brand: 'LG', invoice: 'INV-2026-001', status: 'Pending', date: '12 May, 2026' },
    { id: 'WRN-102', customer: 'Priya Patel', product: 'Refrigerator', brand: 'Samsung', invoice: 'INV-2026-002', status: 'Approved', date: '12 May, 2026' },
    { id: 'WRN-103', customer: 'Rajesh K.', product: 'Washing Machine', brand: 'Whirlpool', invoice: 'INV-2026-003', status: 'Rejected', date: '11 May, 2026' },
    { id: 'WRN-104', customer: 'Neha Gupta', product: 'Microwave', brand: 'LG', invoice: 'INV-2026-004', status: 'Approved', date: '11 May, 2026' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setClaims(claims.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredClaims = claims.filter(c => 
    c.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.invoice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Warranty Management" />

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#1E293B]">Warranty Claims & Verification</h2>
            <div className="flex gap-2">
              <button className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
                <Download size={16} /> Export Logs
              </button>
            </div>
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
                  placeholder="Search Claim ID, Customer, Invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <select className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]">
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Claim ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Invoice No.</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{claim.id}</td>
                      <td className="px-6 py-4 text-[#1E293B] font-medium">{claim.customer}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{claim.product}</td>
                      <td className="px-6 py-4 text-[#1E293B]">{claim.brand}</td>
                      <td className="px-6 py-4 text-[#0D47A1] font-medium flex items-center gap-1">
                        {claim.invoice} <ExternalLink size={12} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          claim.status === 'Approved' ? 'bg-green-50 text-green-600' :
                          claim.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{claim.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-1.5 text-[#64748B] hover:text-[#0D47A1] hover:bg-[#EEF4FF] rounded" title="View Document">
                            <Eye size={16} />
                          </button>
                          
                          {claim.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(claim.id, 'Approved')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded" 
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusChange(claim.id, 'Rejected')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded" 
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
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
            
            {/* Empty State */}
            {filteredClaims.length === 0 && (
              <div className="text-center py-12 bg-white">
                <FileCheck size={48} className="text-[#64748B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E293B] mb-1">No Claims Found</h3>
                <p className="text-sm text-[#64748B]">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Warranty;
