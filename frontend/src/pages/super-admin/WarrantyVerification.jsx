import React, { useState } from 'react';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import { Search, CheckCircle, XCircle, FileText, Calendar, User } from 'lucide-react';

const WarrantyVerification = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [claims, setClaims] = useState([
    { id: 1, customer: 'Anil Kumar', email: 'anil@gmail.com', product: 'LG 1.5 Ton Split AC', brand: 'LG', date: '10 May, 2026', invoice: 'INV-LG-9823', status: 'Pending' },
    { id: 2, customer: 'Jyoti Sharma', email: 'jyoti@gmail.com', product: 'Samsung Front Load WM', brand: 'Samsung', date: '08 May, 2026', invoice: 'INV-SS-0012', status: 'Pending' },
    { id: 3, customer: 'Manish Pal', email: 'manish@gmail.com', product: 'Whirlpool Double Door Fridge', brand: 'Whirlpool', date: '07 May, 2026', invoice: 'INV-WP-5432', status: 'Approved' },
    { id: 4, customer: 'Kunal Sen', email: 'kunal@gmail.com', product: 'Havells Water Purifier', brand: 'Havells', date: '05 May, 2026', invoice: 'INV-HV-1122', status: 'Rejected' },
  ]);

  const handleVerify = (id, newStatus) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredClaims = claims.filter(c => 
    c.customer.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.product.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Warranty Registration Approvals" subtitle="Verify and approve product warranties against dealer invoices" />
        <div className="p-6 space-y-6 flex-1">
          
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] flex flex-wrap gap-4 items-center justify-between shadow-sm">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search Customer, Product..." 
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] outline-none text-sm bg-[#F8FAFC]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-black tracking-wider uppercase">
                  <th className="p-4 pl-6">Customer Details</th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClaims.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5"><User size={14} className="text-slate-400" /> {c.customer}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{c.email}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{c.product}</p>
                      <p className="text-[10px] text-[#0D47A1] font-bold uppercase">{c.brand}</p>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-slate-600 flex items-center gap-1"><FileText size={12} /> {c.invoice}</td>
                    <td className="p-4 text-slate-500 font-semibold flex items-center gap-1"><Calendar size={12} /> {c.date}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'Pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' :
                        c.status === 'Approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                        'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      {c.status === 'Pending' ? (
                        <>
                          <button onClick={() => handleVerify(c.id, 'Approved')} className="text-xs bg-green-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors cursor-pointer">Verify</button>
                          <button onClick={() => handleVerify(c.id, 'Rejected')} className="text-xs bg-red-600 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors cursor-pointer">Reject</button>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WarrantyVerification;
