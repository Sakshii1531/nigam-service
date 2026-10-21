import Sidebar from '../super-admin/Sidebar';
import Topbar from '../super-admin/Topbar';
export default function AdminFrame({ title, subtitle, children }) {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar /><main className="flex-1 ml-64 min-w-0"><Topbar title={title} subtitle={subtitle} /><div className="p-6 space-y-5">{children}</div></main></div>;
}
