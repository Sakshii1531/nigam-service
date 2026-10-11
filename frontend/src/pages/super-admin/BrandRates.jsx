import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import BrandRatesPanel from '../../components/brand-admin/BrandRatesPanel';
export default function BrandRates() {
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar /><main className="flex-1 ml-64 min-w-0"><Topbar title="Brand Rates" subtitle="Brand charges, partner payouts and margins" /><div className="p-6"><BrandRatesPanel admin canEdit /></div></main></div>;
}
