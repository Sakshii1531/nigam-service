import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import BrandBillingPanel from '../../components/brand-admin/BrandBillingPanel';
export default function BrandBilling() {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar /><main className="flex-1 ml-64 min-w-0"><Topbar title="Brand Billing" subtitle="Review invoices, record receipts and track dues" /><div className="p-6"><BrandBillingPanel admin /></div></main></div>;
}
