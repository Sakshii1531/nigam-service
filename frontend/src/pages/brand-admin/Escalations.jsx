import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import TicketEscalations from '../../components/brand-admin/TicketEscalations';
export default function Escalations() {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar/><main className="flex-1 ml-64 min-w-0"><Topbar title="Escalations" subtitle="Track SLA warnings, breaches and ticket resolutions"/><section className="bg-white rounded-2xl border m-5 p-5"><h1 className="font-bold text-xl mb-4">Escalation desk</h1><TicketEscalations/></section></main></div>;
}
