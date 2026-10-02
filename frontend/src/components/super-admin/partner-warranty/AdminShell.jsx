import Sidebar from '../Sidebar';
import Topbar from '../Topbar';

/** Page frame for the Super Admin Partner Warranty screens. */
export default function AdminShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <div className="p-6 space-y-5 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Panel({ title, right, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {title && <h2 className="text-xs uppercase font-bold text-[#64748B]">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
