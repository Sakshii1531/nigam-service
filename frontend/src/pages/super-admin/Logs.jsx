import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import AuditViewer from '../../components/brand-admin/AuditViewer';
export default function Logs() {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar/><main className="flex-1 ml-64 min-w-0"><Topbar title="Audit Logs"/><div className="p-5"><AuditViewer admin/></div></main></div>;
}
