import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { exportCsv } from '../../lib/exportCsv';
import { 
  Receipt, 
  Clock, 
  CheckCircle2, 
  IndianRupee, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit,
  MoreVertical,
  X,
  FileText,
  ArrowLeft
} from 'lucide-react';

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// Indian-format short scale for the summary tiles (₹4.2L, ₹1.3Cr).
function compactRupees(amount) {
  if (!amount) return '₹0';
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  if (amount >= 1e3) return `₹${Math.round(amount / 1e3)}K`;
  return currency.format(amount);
}

function shape(invoice) {
  return {
    id: invoice.id,
    ref: invoice.humanId || invoice.id,
    customer: invoice.customer?.name || 'Customer',
    technician: invoice.technician?.name || 'Unassigned',
    product: invoice.product || '—',
    // Keep the raw total alongside the display string so the tiles can sum it.
    totalAmount: invoice.total || 0,
    serviceCharge: currency.format(invoice.serviceCharge || 0),
    partCharge: currency.format(invoice.partCharge || 0),
    gst: currency.format(invoice.gst || 0),
    total: currency.format(invoice.total || 0),
    status: invoice.status || 'Pending',
  };
}

const Invoices = () => {
  const [successMessage, setSuccessMessage] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadInvoices() {
      try {
        const data = await apiRequest('/brand/invoices', { auth: true });
        if (!cancelled) setInvoices((data || []).map(shape));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInvoices();
    return () => { cancelled = true; };
  }, []);

  const sumWhere = (predicate) => invoices.filter(predicate).reduce((acc, i) => acc + i.totalAmount, 0);
  const stats = [
    { title: 'Total Billed', value: compactRupees(sumWhere(() => true)), icon: <IndianRupee size={20} />, color: 'bg-emerald-600' },
    { title: 'Paid Amount', value: compactRupees(sumWhere(i => i.status === 'Paid')), icon: <CheckCircle2 size={20} />, color: 'bg-green-600' },
    { title: 'Pending Payments', value: compactRupees(sumWhere(i => i.status === 'Pending')), icon: <Clock size={20} />, color: 'bg-yellow-600' },
  ];

  const handleRowClick = (inv) => {
    setSelectedInvoice(inv);
    setShowDrawer(true);
  };

  // Writes a real file. Both of these used to be success messages with no
  // download of any kind.
  const triggerExport = () => {
    const written = exportCsv(
      'brand-invoices',
      ['Invoice', 'Customer', 'Technician', 'Product', 'Service Charge', 'Part Charge', 'GST', 'Total', 'Status'],
      filteredInvoices.map((i) => [i.ref, i.customer, i.technician, i.product, i.serviceCharge, i.partCharge, i.gst, i.total, i.status]),
    );
    setSuccessMessage(written ? 'Billing summary exported as CSV.' : 'There are no invoices matching the current filters.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // There is no server-side PDF renderer, so this opens the browser's print
  // dialog (which offers "Save as PDF") instead of claiming a download that
  // never started.
  const triggerPdfDownload = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.ref.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.technician.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'All Status' || inv.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Topbar */}
        <Topbar title="Invoices & Billing" />

        {/* Body */}
        {showDrawer && selectedInvoice ? (
          <div className="p-6 space-y-6 flex-1 bg-[#F8FAFC] text-left">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowDrawer(false)}
                className="flex items-center gap-2 text-sm font-semibold text-[#0D47A1] hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Invoices
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col max-w-3xl text-sm">
              <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Invoice Breakdown</h2>
                  <p className="text-sm text-[#0D47A1] font-medium">{selectedInvoice.ref}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Service Overview</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Customer Name:</span>
                      <span className="font-medium text-[#1E293B]">{selectedInvoice.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Technician Assigned:</span>
                      <span className="font-medium text-[#1E293B]">{selectedInvoice.technician}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Appliance:</span>
                      <span className="font-medium text-[#1E293B]">{selectedInvoice.product}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Billing Details</h3>
                  <div className="bg-[#F8FAFC] p-4 rounded-xl space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Labor Service Charge:</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.serviceCharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Spare Parts Cost:</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.partCharge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">GST (18% Integrated):</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.gst}</span>
                    </div>
                    <div className="border-t border-[#E2E8F0] pt-2 flex justify-between text-base font-bold">
                      <span className="text-[#1E293B]">Grand Total:</span>
                      <span className="text-indigo-650">{selectedInvoice.total}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs uppercase text-[#64748B] font-semibold mb-2">Transaction Status</h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedInvoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                      selectedInvoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[#E2E8F0] flex gap-3 bg-[#F8FAFC]">
                <button 
                  onClick={() => triggerPdfDownload(selectedInvoice.ref)}
                  className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText size={16} /> Download PDF Invoice
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6 flex-1">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-[#64748B]">{stat.title}</p>
                  <p className="text-2xl font-bold text-[#1E293B]">{stat.value}</p>
                </div>
              </div>
            ))}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#0D47A1] focus:border-[#0D47A1] outline-none transition-all text-sm bg-[#F8FAFC]"
                  placeholder="Search Invoice ID or Customer..."
                />
              </div>

              {/* Filters */}
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-sm text-[#1E293B] border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0D47A1] bg-[#F8FAFC]"
              >
                <option>All Status</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Failed</option>
              </select>
            </div>

            <button 
              onClick={triggerExport}
              className="bg-white text-[#1E293B] border border-[#E2E8F0] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors flex items-center gap-2"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Invoice ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Parts</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {loading && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-[#64748B] font-semibold">Loading invoices…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredInvoices.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-10 text-center text-[#64748B] font-semibold">No invoices found.</td></tr>
                  )}
                  {filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.id} 
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      onClick={() => handleRowClick(inv)}
                    >
                      <td className="px-6 py-4 font-medium text-[#0D47A1]">{inv.ref}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-[#1E293B] font-medium">{inv.customer}</p>
                          <p className="text-[#64748B] text-xs">{inv.technician}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1E293B]">{inv.product}</td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.serviceCharge}</td>
                      <td className="px-6 py-4 text-[#64748B]">{inv.partCharge}</td>
                      <td className="px-6 py-4 font-medium text-[#1E293B]">{inv.total}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'Paid' ? 'bg-green-50 text-green-600' :
                          inv.status === 'Pending' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleRowClick(inv)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded hover:bg-[#EEF2F6]" 
                            title="View Breakdown"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => triggerPdfDownload(inv.ref)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D47A1] rounded hover:bg-[#EEF2F6]" 
                            title="Download PDF"
                          >
                            <Download size={16} />
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
        )}
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

export default Invoices;
