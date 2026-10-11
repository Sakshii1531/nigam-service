import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import AuditViewer from '../../components/brand-admin/AuditViewer';
export default function AuditLog() {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar/><main className="flex-1 ml-64 min-w-0"><Topbar title="Audit log" subtitle="Who changed what, when and why"/><div className="p-5"><AuditViewer/></div></main></div>;
}
