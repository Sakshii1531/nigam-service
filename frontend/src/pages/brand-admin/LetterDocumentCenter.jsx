import React, { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { FileText, Download, Printer, CheckCircle2, Search, Clock } from 'lucide-react';

const docTypes = [
  { id: 'service-completion', name: 'Service Completion Letter', icon: '✅', desc: 'Confirms the service/repair is completed successfully' },
  { id: 'warranty-certificate', name: 'Warranty Certificate', icon: '🛡️', desc: 'Official warranty certificate for the product' },
  { id: 'foc-approval', name: 'FOC Approval Letter', icon: '📝', desc: 'Free-of-cost parts/service approval letter' },
  { id: 'replacement-auth', name: 'Replacement Authorization', icon: '🔁', desc: 'Authorization letter for product replacement' },
  { id: 'customer-bill', name: 'Customer Bill Copy', icon: '🧾', desc: 'Detailed invoice/bill for the customer' },
];

const recentDocs = [
  { id: 'DOC-001', type: 'Service Completion Letter', customer: 'Amit Sharma', product: 'Refrigerator', generatedOn: '21 May 2025, 11:30 AM', generatedBy: 'Brand Admin' },
  { id: 'DOC-002', type: 'FOC Approval Letter', customer: 'Priya Verma', product: 'Washing Machine', generatedOn: '21 May 2025, 10:15 AM', generatedBy: 'Brand Admin' },
  { id: 'DOC-003', type: 'Warranty Certificate', customer: 'Rohit Kumar', product: 'Air Conditioner', generatedOn: '20 May 2025, 04:30 PM', generatedBy: 'Brand Admin' },
  { id: 'DOC-004', type: 'Replacement Authorization', customer: 'Sunita Sharma', product: 'Washing Machine', generatedOn: '19 May 2025, 02:15 PM', generatedBy: 'Brand Admin' },
];

const LetterDocumentCenter = () => {
  const [selectedDocType, setSelectedDocType] = useState(docTypes[0]);
  const [ticketId, setTicketId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [preview, setPreview] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  const handleGenerate = () => {
    if (!ticketId.trim()) { toast('Please enter a Ticket ID!'); return; }
    setPreview(true);
  };

  const handlePrint = () => toast('Document sent to printer!');
  const handleDownload = () => toast(`${selectedDocType.name} downloaded as PDF!`);

  const filteredDocs = recentDocs.filter(d =>
    d.customer.toLowerCase().includes(searchQ.toLowerCase()) ||
    d.id.toLowerCase().includes(searchQ.toLowerCase()) ||
    d.type.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar title="Letter & Document Center" subtitle="Generate and manage service documents, certificates, and letters" />
        <div className="p-5 space-y-5">

          {/* Generator + Preview */}
          <div className="grid grid-cols-5 gap-5">

            {/* Left: Doc Type Selector */}
            <div className="col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <h2 className="text-xs font-bold text-[#1E293B] mb-3">Select Document Type</h2>
              <div className="space-y-2">
                {docTypes.map(dt => (
                  <button
                    key={dt.id}
                    onClick={() => { setSelectedDocType(dt); setPreview(false); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${selectedDocType.id === dt.id ? 'border-[#0D47A1] bg-[#EEF4FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg">{dt.icon}</span>
                      <div>
                        <p className={`text-xs font-bold leading-tight ${selectedDocType.id === dt.id ? 'text-[#0D47A1]' : 'text-[#1E293B]'}`}>{dt.name}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{dt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Input + Preview */}
            <div className="col-span-3 bg-white rounded-2xl border border-[#E2E8F0] p-4">
              <h2 className="text-xs font-bold text-[#1E293B] mb-3">Generate {selectedDocType.name}</h2>

              {!preview ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Complaint / Ticket ID</label>
                    <input
                      value={ticketId}
                      onChange={e => setTicketId(e.target.value)}
                      placeholder="e.g. TKT/250521/001756"
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                    />
                  </div>
                  <button onClick={handleGenerate} className="w-full bg-[#0D47A1] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                    <FileText size={14} /> Generate Document Preview
                  </button>
                </div>
              ) : (
                <div>
                  {/* Formatted letter preview */}
                  <div className="border border-[#E2E8F0] rounded-xl p-5 bg-[#FAFCFF] font-serif text-[11px] leading-relaxed mb-3">
                    <div className="flex justify-between items-start mb-4 pb-3 border-b border-[#E2E8F0]">
                      <div>
                        <div className="w-10 h-10 bg-[#0D47A1] rounded-lg flex items-center justify-center text-white font-black text-sm mb-1">BP</div>
                        <p className="font-bold text-[#0D47A1] text-xs">Brand Service India Pvt. Ltd.</p>
                        <p className="text-[9px] text-[#64748B]">Toll Free: 1800-123-4567</p>
                      </div>
                      <div className="text-right text-[10px]">
                        <p className="text-[#64748B]">Date: 21 May 2025</p>
                        <p className="text-[#64748B]">Ref: {ticketId}</p>
                      </div>
                    </div>
                    <p className="font-bold text-[#1E293B] mb-2 text-xs">{selectedDocType.name.toUpperCase()}</p>
                    <p className="text-[#1E293B] mb-2">Dear <strong>Amit Sharma</strong>,</p>
                    <p className="text-[#1E293B] mb-2">
                      This letter is to inform you that the <strong>service request</strong> for your <strong>Smart Refrigerator</strong> (Model: GL-T292SBS, Serial: SN123456789) has been successfully resolved by our authorized service partner.
                    </p>
                    <p className="text-[#1E293B] mb-2">
                      Our technician <strong>Rahul Kumar</strong> completed the repair on <strong>21 May 2025</strong>. The issue has been resolved to satisfaction under warranty coverage.
                    </p>
                    <p className="text-[#1E293B] mt-3">Thank you for choosing us.</p>
                    <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex justify-between">
                      <div>
                        <p className="text-[9px] text-[#64748B]">Authorized by</p>
                        <p className="font-bold text-[#1E293B] text-[10px] mt-2">Brand Admin</p>
                        <div className="w-16 h-px bg-[#1E293B] mt-0.5" />
                        <p className="text-[9px] text-[#64748B]">Brand Panel</p>
                      </div>
                      <div className="w-12 h-12 bg-[#EEF4FF] rounded-full flex items-center justify-center text-[#0D47A1] font-black text-xs border border-[#0D47A1]">SEAL</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleDownload} className="flex-1 bg-[#0D47A1] text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5"><Download size={13} /> Download PDF</button>
                    <button onClick={handlePrint} className="flex-1 border border-[#E2E8F0] text-[#64748B] py-2 rounded-xl text-xs font-bold hover:bg-[#F8FAFC] flex items-center justify-center gap-1.5"><Printer size={13} /> Print</button>
                    <button onClick={() => setPreview(false)} className="px-4 border border-[#E2E8F0] text-[#64748B] py-2 rounded-xl text-xs font-bold hover:bg-[#F8FAFC]">Back</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold text-[#1E293B]">Recent Documents</h2>
              <div className="relative w-56">
                <Search size={13} className="absolute left-2.5 top-2 text-[#94A3B8]" />
                <input placeholder="Search documents..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-xl text-[10px] outline-none bg-[#F8FAFC] focus:ring-2 focus:ring-[#0D47A1]" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-3">Doc ID</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Generated On</th>
                    <th className="px-3 py-3">Generated By</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredDocs.map((d, i) => (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold">{d.id}</td>
                      <td className="px-3 py-3 text-[#1E293B] font-medium">{d.type}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.customer}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.product}</td>
                      <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">{d.generatedOn}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.generatedBy}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => toast(`Downloading ${d.id}...`)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Download size={13} /></button>
                          <button onClick={() => toast(`Printing ${d.id}...`)} className="p-1.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg"><Printer size={13} /></button>
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

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} /> {successMsg}
        </div>
      )}
    </div>
  );
};

export default LetterDocumentCenter;
