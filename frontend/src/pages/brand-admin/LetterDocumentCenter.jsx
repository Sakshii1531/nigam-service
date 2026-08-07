import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { FileText, Download, Printer, CheckCircle2, Search, Clock } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

// `name` must match the API's document-type enum exactly — it is sent as-is.
const docTypes = [
  { id: 'service-completion', name: 'Service Completion Letter', icon: '✅', desc: 'Confirms the service/repair is completed successfully' },
  { id: 'warranty-certificate', name: 'Warranty Certificate', icon: '🛡️', desc: 'Official warranty certificate for the product' },
  { id: 'foc-approval', name: 'FOC Approval Letter', icon: '📝', desc: 'Free-of-cost parts/service approval letter' },
  { id: 'replacement-auth', name: 'Replacement Authorization', icon: '🔁', desc: 'Authorization letter for product replacement' },
  { id: 'customer-bill', name: 'Customer Bill Copy', icon: '🧾', desc: 'Detailed invoice/bill for the customer' },
];

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function shape(doc) {
  return {
    id: doc.id,
    ref: doc.humanId || doc.id,
    type: doc.type,
    customer: doc.serviceRequest?.user?.name || 'Customer',
    product: doc.serviceRequest?.category || '—',
    ticket: doc.serviceRequest?.humanId || '—',
    generatedOn: doc.createdAt ? dateFormatter.format(new Date(doc.createdAt)) : '—',
    generatedBy: doc.generatedBy?.name || 'Brand Admin',
    pdfUrl: doc.pdfUrl || '',
  };
}

const LetterDocumentCenter = () => {
  const [selectedDocType, setSelectedDocType] = useState(docTypes[0]);
  // Holds a ServiceRequest id — the API keys documents to the request document,
  // not to the ticket code the operator reads.
  const [ticketId, setTicketId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [preview, setPreview] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [recentDocs, setRecentDocs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [docData, reqData] = await Promise.all([
          apiRequest('/brand/documents', { auth: true }),
          apiRequest('/service-requests', { auth: true }).catch(() => []),
        ]);
        if (cancelled) return;
        setRecentDocs((Array.isArray(docData) ? docData : []).map(shape));
        setRequests(Array.isArray(reqData) ? reqData : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleGenerate = async () => {
    if (!ticketId) { toast('Please select a service request!'); return; }
    try {
      const created = await apiRequest('/brand/documents', {
        method: 'POST',
        auth: true,
        body: { type: selectedDocType.name, serviceRequest: ticketId },
      });
      // Re-fetch so the new row carries the populated customer/appliance the
      // create response returns only as ids.
      const docData = await apiRequest('/brand/documents', { auth: true });
      setRecentDocs((Array.isArray(docData) ? docData : []).map(shape));
      setPreview(true);
      toast(`${created.type} generated.`);
    } catch (err) {
      setError(`Could not generate document: ${err.message}`);
    }
  };

  const handlePrint = () => toast('Document sent to printer!');
  const handleDownload = () => toast(`${selectedDocType.name} downloaded as PDF!`);

  // The request the preview letter is rendered against.
  const previewRequest = requests.find(r => r.id === ticketId);

  const q = searchQ.toLowerCase();
  const filteredDocs = recentDocs.filter(d =>
    d.customer.toLowerCase().includes(q) ||
    d.ref.toLowerCase().includes(q) ||
    d.type.toLowerCase().includes(q)
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
                    <label className="text-[10px] font-semibold text-[#64748B] uppercase block mb-1">Complaint / Ticket</label>
                    {/* A picker rather than free text: the API references the
                        service request document, and only this brand's requests
                        are selectable anyway. */}
                    <select
                      value={ticketId}
                      onChange={e => setTicketId(e.target.value)}
                      className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs bg-[#F8FAFC] outline-none focus:ring-2 focus:ring-[#0D47A1]"
                    >
                      <option value="">Select a service request…</option>
                      {requests.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.humanId || r.id} — {r.category || 'Appliance'} ({r.status})
                        </option>
                      ))}
                    </select>
                    {requests.length === 0 && !loading && (
                      <p className="text-[10px] text-[#94A3B8] mt-1">No service requests available for this brand.</p>
                    )}
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
                        <p className="text-[#64748B]">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p className="text-[#64748B]">Ref: {previewRequest?.humanId || '—'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-[#1E293B] mb-2 text-xs">{selectedDocType.name.toUpperCase()}</p>
                    <p className="text-[#1E293B] mb-2">Dear <strong>{previewRequest?.user?.name || 'Customer'}</strong>,</p>
                    <p className="text-[#1E293B] mb-2">
                      This letter is to inform you that the <strong>service request</strong> for your <strong>{previewRequest?.category || 'appliance'}</strong> has been successfully resolved by our authorized service partner.
                    </p>
                    <p className="text-[#1E293B] mb-2">
                      Current request status: <strong>{previewRequest?.status || '—'}</strong>.
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
                  {loading && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-[#64748B] font-semibold">Loading documents…</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-red-600 font-semibold">{error}</td></tr>
                  )}
                  {!loading && !error && filteredDocs.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-[#64748B] font-semibold">No documents generated yet.</td></tr>
                  )}
                  {filteredDocs.map((d) => (
                    <tr key={d.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3 py-3 text-[#0D47A1] font-semibold">{d.ref}</td>
                      <td className="px-3 py-3 text-[#1E293B] font-medium">{d.type}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.customer}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.product}</td>
                      <td className="px-3 py-3 text-[#64748B] whitespace-nowrap">{d.generatedOn}</td>
                      <td className="px-3 py-3 text-[#64748B]">{d.generatedBy}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => toast(`Downloading ${d.ref}...`)} className="p-1.5 text-[#0D47A1] hover:bg-[#EEF4FF] rounded-lg"><Download size={13} /></button>
                          <button onClick={() => toast(`Printing ${d.ref}...`)} className="p-1.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-lg"><Printer size={13} /></button>
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
