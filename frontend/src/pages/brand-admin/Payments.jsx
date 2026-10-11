import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import BrandBillingPanel from '../../components/brand-admin/BrandBillingPanel';
export default function Payments() {
  return <div className="min-h-screen bg-slate-50"><Sidebar /><main className="ml-64"><Topbar title="Payments" subtitle="Brand invoices, payments and dues" /><div className="p-6"><BrandBillingPanel paymentsOnly /></div></main></div>;
}
