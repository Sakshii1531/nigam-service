import { Link } from 'react-router-dom';
import { formatDateTime } from '../../lib/partnerWarrantyFormat';
const value = v => v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
export function AuditDiff({ changes }) {
  if (!changes || !Object.keys(changes).length) return <span className="text-slate-400">—</span>;
  return <details><summary className="cursor-pointer text-blue-900">{Object.keys(changes).join(', ')}</summary><dl className="mt-2 space-y-2">{Object.entries(changes).map(([field, diff]) => <div key={field}><dt className="font-semibold">{field}</dt><dd className="break-words">{Array.isArray(diff) && diff.length === 2 ? <><span className="text-slate-500">{value(diff[0])}</span> → <span>{value(diff[1])}</span></> : value(diff)}</dd></div>)}</dl></details>;
}
function auditEntityLink(row) {
  if (!row.entityId) return null;
  if (['ticket','WarrantyClaim'].includes(row.entityType)) return `/brand-admin/tickets/${row.entityId}`;
  if (['customer','Customer'].includes(row.entityType)) return `/brand-admin/customers/${row.entityId}`;
  const pages = {invoice:'invoices',BrandInvoice:'invoices',payment:'payments',BrandPayment:'payments',rate:'call-rates',BrandRate:'call-rates',
    user:'users',User:'users',role:'users',Role:'users',team:'teams',Team:'teams',settings:'settings',BrandSettings:'settings',
    escalation:'escalations',Escalation:'escalations',policy:'warranty',WarrantyPolicy:'warranty',catalog_item:'catalog',document:'documents',replacement:'replacement-approvals',return:'reverse-logistics',academy_item:'academy'};
  return pages[row.entityType] ? `/brand-admin/${pages[row.entityType]}` : null;
}
export default function AuditEntries({ rows, admin = false }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Time',...(admin?['Brand']:[]),'User / employee ID / roles','Action','Entity','Old → new','Reason'].map(h=><th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id || row._id} className="align-top"><td className="p-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>{admin&&<td className="p-3">{row.brand?.name || 'Platform'}</td>}<td className="p-3"><p className="font-semibold">{row.actor?.name || row.user?.name || 'System'}</p><p>{row.actor?.employeeId || '—'}</p><p className="text-slate-500">{row.actor?.roles?.join(', ') || row.actor?.kind || row.user?.role || 'system'}</p></td><td className="p-3 font-medium">{row.action}</td><td className="p-3 break-all">{!admin&&auditEntityLink(row)?<Link to={auditEntityLink(row)} className="text-blue-900 underline">{row.entityType} {row.entityId}</Link>:<>{row.entityType || '—'} {row.entityId}</>}</td><td className="p-3 min-w-44 max-w-sm"><AuditDiff changes={row.meta?.changes}/></td><td className="p-3 max-w-xs break-words">{row.reason || '—'}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-8 text-center text-sm text-slate-500">No audit entries match these filters.</p>}</div>;
}
