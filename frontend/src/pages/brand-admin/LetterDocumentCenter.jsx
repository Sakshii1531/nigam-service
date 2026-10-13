import { useState } from 'react';
import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import { apiRequest } from '../../lib/apiClient';
import { useApiData } from '../../hooks/useApiData';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
import { downloadOperationsFile, printOperationsDocument } from '../../lib/brandOperationsDownloads';

const types = ['Service Completion Letter', 'Warranty Certificate', 'FOC Approval Letter', 'Replacement Authorization', 'Customer Bill Copy'];
const field = 'border border-slate-300 rounded-lg p-2 text-sm';
const button = 'rounded-lg border border-blue-800 text-blue-900 px-3 py-2 text-sm disabled:opacity-50';

export default function LetterDocumentCenter() {
  const { can } = useBrandPermissions();
  const [type, setType] = useState(types[0]);
  const [ticketId, setTicketId] = useState('');
  const [page, setPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const docs = useApiData(() => apiRequest(`/brand/documents?page=${page}&limit=20`, { auth: true, envelope: true }), [page]);
  const requests = useApiData(() => can('tickets:view') ? apiRequest(`/service-requests?page=${requestPage}&limit=20`, { auth: true, envelope: true }) : Promise.resolve(null), [requestPage, can('tickets:view')]);

  async function run(action) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function generate(e) {
    e.preventDefault();
    await run(async () => {
      const doc = await apiRequest('/brand/documents', { auth: true, method: 'POST', body: { type, serviceRequest: ticketId } });
      const html = await apiRequest(`/brand/documents/${doc.id}?format=html`, { auth: true, responseType: 'text' });
      setPreview({ id: doc.id, humanId: doc.humanId, html });
      await docs.reload();
    });
  }
  async function view(doc) {
    await run(async () => {
      const html = await apiRequest(`/brand/documents/${doc.id}?format=html`, { auth: true, responseType: 'text' });
      setPreview({ id: doc.id, humanId: doc.humanId, html });
    });
  }
  const download = doc => run(() => downloadOperationsFile(`/brand/documents/${doc.id}?format=html`, `${doc.humanId || doc.id}.html`));
  const print = doc => run(() => printOperationsDocument(doc.id));

  return <div className="min-h-screen bg-slate-100 flex"><Sidebar /><main className="flex-1 ml-64 min-w-0">
    <Topbar title="Letter & Document Center" subtitle="Generate, download and print documents from recorded job details" />
    <div className="p-5 space-y-5">
      {(error || docs.error || requests.error) && <p role="alert" className="text-red-700">{error || docs.error?.message || requests.error?.message}</p>}
      {can('operations:edit') && can('tickets:view') && <form onSubmit={generate} className="bg-white rounded-xl p-5 space-y-3">
        <h2 className="font-bold">Generate document</h2>
        <label htmlFor="document-type" className="block">Document type</label><select id="document-type" className={`${field} block w-full`} value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select>
        <label htmlFor="document-job" className="block">Complaint / Ticket</label><select id="document-job" required className={`${field} block w-full`} value={ticketId} onChange={e => setTicketId(e.target.value)}>
          <option value="">Select a service request…</option>{(requests.data?.data || []).map(r => <option value={r.id} key={r.id}>{r.humanId} — {r.category} ({r.status})</option>)}
        </select>
        <div className="flex gap-4 items-center text-xs"><button type="button" disabled={requestPage <= 1} onClick={() => { setRequestPage(p => p - 1); setTicketId(''); }}>Previous jobs</button>
          <span>Jobs page {requestPage} of {requests.data?.meta?.totalPages || 1}</span>
          <button type="button" disabled={requestPage >= (requests.data?.meta?.totalPages || 1)} onClick={() => { setRequestPage(p => p + 1); setTicketId(''); }}>Next jobs</button></div>
        <button className={button} disabled={busy || !ticketId}>Generate Document Preview</button>
      </form>}
      {preview && <section className="bg-white rounded-xl p-5 space-y-3" aria-label="Document preview">
        <h2 className="font-bold">{preview.humanId}</h2>
        <iframe title="Generated document" sandbox="allow-scripts allow-modals" srcDoc={preview.html} className="w-full h-96 border rounded-xl" />
        <div className="flex gap-3"><button className={button} disabled={busy} onClick={() => download(preview)}>Download document (HTML)</button><button className={button} disabled={busy} onClick={() => print(preview)}>Print / Save PDF</button><button className={button} onClick={() => setPreview(null)}>Close preview</button></div>
      </section>}
      <section className="bg-white rounded-xl p-5 overflow-x-auto"><h2 className="font-bold mb-4">Recent Documents</h2>
        {docs.loading ? <p>Loading documents…</p> : <table className="w-full text-sm text-left"><thead><tr>{['Reference', 'Type', 'Customer', 'Job', 'Generated on', 'Generated by', 'Actions'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
          <tbody>{(docs.data?.data || []).map(d => <tr className="border-t" key={d.id}><td className="p-2">{d.humanId}</td><td>{d.type}</td><td>{d.snapshot?.customer || d.serviceRequest?.user?.name || '—'}</td><td>{d.snapshot?.job || d.serviceRequest?.humanId || '—'}</td><td>{new Date(d.createdAt).toLocaleString('en-IN')}</td><td>{d.snapshot?.generatedBy || d.generatedBy?.name || '—'}</td>
            <td className="p-2"><div className="flex gap-2"><button disabled={busy} onClick={() => view(d)} className={button}>View</button><button disabled={busy} onClick={() => download(d)} className={button} aria-label={`Download ${d.humanId}`}>Download</button><button disabled={busy} onClick={() => print(d)} className={button} aria-label={`Print ${d.humanId}`}>Print / Save PDF</button></div></td></tr>)}</tbody></table>}
        {!docs.loading && !docs.data?.data?.length && <p>No documents generated yet.</p>}
        <div className="flex justify-between mt-4 text-xs"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous documents</button><span>Page {page} of {docs.data?.meta?.totalPages || 1}</span><button disabled={page >= (docs.data?.meta?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Next documents</button></div>
      </section>
    </div>
  </main></div>;
}
