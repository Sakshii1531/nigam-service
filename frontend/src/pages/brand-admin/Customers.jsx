import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { 
  Search, 
  Filter, 
  MoreVertical,
  Eye,
  Mail,
  Phone,
  MapPin,
  X,
  CheckCircle2,
  Send,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';

const Customers = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedWarranty, setSelectedWarranty] = useState('Warranty Status');
  const [successMessage, setSuccessMessage] = useState('');

  const customers = [
    { id: 'CUST-001', name: 'Amit Sharma', email: 'amit@example.com', phone: '+91 98765 43210', city: 'Delhi', productCount: 2, complaints: 1, warrantyStatus: 'Under Warranty', lastService: '12 May, 2026', products: ['LG Refrigerator', 'LG Smart TV'], complaintsList: ['Cooling issue in Refrigerator'] },
    { id: 'CUST-002', name: 'Priya Patel', email: 'priya@example.com', phone: '+91 98765 43211', city: 'Mumbai', productCount: 1, complaints: 1, warrantyStatus: 'Out of Warranty', lastService: '12 May, 2026', products: ['LG Washing Machine'], complaintsList: ['Drain blockage'] },
    { id: 'CUST-003', name: 'Rajesh K.', email: 'rajesh@example.com', phone: '+91 98765 43212', city: 'Bangalore', productCount: 3, complaints: 0, warrantyStatus: 'Under Warranty', lastService: '11 May, 2026', products: ['LG Microwave', 'LG Water Purifier', 'LG AC'], complaintsList: [] },
    { id: 'CUST-004', name: 'Neha Gupta', email: 'neha@example.com', phone: '+91 98765 43213', city: 'Pune', productCount: 1, complaints: 2, warrantyStatus: 'Out of Warranty', lastService: '11 May, 2026', products: ['LG Smart TV'], complaintsList: ['Lines on screen', 'Sound cracking'] },
  ];

  const showToast = (message) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleRowClick = (cust) => {
    setSelectedCustomer(cust);
    setShowDrawer(true);
  };

  const handleSendNotification = (name) => {
    showToast(`Notification sent successfully to ${name}!`);
  };

  const filteredCustomers = customers.filter(cust => {
    const matchesSearch = cust.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cust.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cust.phone.includes(searchQuery) ||
                          cust.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || cust.city === selectedCity;
    const matchesWarranty = selectedWarranty === 'Warranty Status' || cust.warrantyStatus === selectedWarranty;
    return matchesSearch && matchesCity && matchesWarranty;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col relative">
        {/* Topbar */}
        <Topbar title="Customer Management" />

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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Customer Name or ID..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Cities</option>
                <option>Delhi</option>
                <option>Mumbai</option>
                <option>Bangalore</option>
                <option>Pune</option>
              </select>

              <select 
                value={selectedWarranty}
                onChange={(e) => setSelectedWarranty(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>Warranty Status</option>
                <option>Under Warranty</option>
                <option>Out of Warranty</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('All Cities');
                setSelectedWarranty('Warranty Status');
                showToast('Filters reset successfully');
              }}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <Filter size={16} /> Reset Filters
            </button>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4 flex-shrink-0">Products</th>
                    <th className="px-6 py-4">Complaints</th>
                    <th className="px-6 py-4">Warranty</th>
                    <th className="px-6 py-4">Last Service</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredCustomers.map((cust) => (
                    <tr 
                      key={cust.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(cust)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold">
                            {cust.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[#1E293B] font-medium">{cust.name}</p>
                            <p className="text-[#64748B] text-xs">{cust.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#64748B] space-y-1">
                          <p className="flex items-center gap-1"><Mail size={12} /> {cust.email}</p>
                          <p className="flex items-center gap-1"><Phone size={12} /> {cust.phone}</p>
                          <p className="flex items-center gap-1"><MapPin size={12} /> {cust.city}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{cust.productCount}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{cust.complaints}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium ${cust.warrantyStatus === 'Under Warranty' ? 'text-green-600' : 'text-orange-600'}`}>
                          {cust.warrantyStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#64748B]">{cust.lastService}</td>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => handleRowClick(cust)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded" 
                            title="View Profile"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleSendNotification(cust.name)}
                            className="p-1.5 text-[#64748B] hover:text-green-600 rounded"
                            title="Send Notification"
                          >
                            <Send size={16} />
                          </button>
                          <button 
                            onClick={() => handleRowClick(cust)}
                            className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-10 text-center text-sm text-[#64748B]">
                        No customers found matching search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Slide-over Customer Details Drawer */}
        {showDrawer && selectedCustomer && (
          <div className="fixed inset-0 z-40 overflow-hidden">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setShowDrawer(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                  <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">Customer Profile</h3>
                    <p className="text-xs text-[#64748B]">Verify details, history and active status</p>
                  </div>
                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="text-[#64748B] hover:text-[#1E293B] p-2 hover:bg-[#E2E8F0] rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  
                  {/* Basic Info */}
                  <div className="flex items-center gap-4 border-b border-[#E2E8F0] pb-6">
                    <div className="w-16 h-16 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-bold text-2xl">
                      {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#1E293B]">{selectedCustomer.name}</h4>
                      <p className="text-sm font-medium text-[#0D47A1]">{selectedCustomer.id}</p>
                      <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        selectedCustomer.warrantyStatus === 'Under Warranty' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}>
                        {selectedCustomer.warrantyStatus}
                      </span>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Contact Info</h5>
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2 text-sm text-[#1E293B]">
                      <p className="flex items-center gap-2"><Mail size={16} className="text-[#64748B]" /> {selectedCustomer.email}</p>
                      <p className="flex items-center gap-2"><Phone size={16} className="text-[#64748B]" /> {selectedCustomer.phone}</p>
                      <p className="flex items-center gap-2"><MapPin size={16} className="text-[#64748B]" /> {selectedCustomer.city}</p>
                    </div>
                  </div>

                  {/* Products Registered */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Registered Products</h5>
                      <span className="text-xs font-bold text-[#0D47A1] bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck size={12} /> {selectedCustomer.products.length} Products
                      </span>
                    </div>
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white text-sm">
                      {selectedCustomer.products.map((prod, idx) => (
                        <div key={idx} className="p-3 hover:bg-[#F8FAFC]">
                          <p className="font-medium text-[#1E293B]">{prod}</p>
                          <p className="text-xs text-[#64748B]">Warranty Active</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Complaints */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Complaints & Tickets</h5>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ClipboardList size={12} /> {selectedCustomer.complaintsList.length} Active
                      </span>
                    </div>
                    {selectedCustomer.complaintsList.length > 0 ? (
                      <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white text-sm">
                        {selectedCustomer.complaintsList.map((comp, idx) => (
                          <div key={idx} className="p-3 bg-red-50/20">
                            <p className="font-medium text-red-700">{comp}</p>
                            <p className="text-xs text-red-500">Status: In Progress</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-green-600 bg-green-50 p-3 rounded-xl border border-green-200 font-medium">
                        No active complaints or service tickets found.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex gap-3">
                  <button 
                    onClick={() => { handleSendNotification(selectedCustomer.name); setShowDrawer(false); }}
                    className="flex-1 bg-[#0D47A1] text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                  >
                    <Send size={14} /> Send Message
                  </button>
                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="flex-1 bg-white text-[#64748B] border border-[#E2E8F0] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
