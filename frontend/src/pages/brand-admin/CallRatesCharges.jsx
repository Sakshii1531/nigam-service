import Sidebar from '../../components/brand-admin/Sidebar';
import Topbar from '../../components/brand-admin/Topbar';
import BrandRatesPanel from '../../components/brand-admin/BrandRatesPanel';
import { useBrandPermissions } from '../../hooks/useBrandPermissions';
export default function CallRatesCharges() {
  const {
    can
  } = useBrandPermissions();
  return <div className="min-h-screen bg-slate-100 flex"><Sidebar /><main className="flex-1 ml-64 min-w-0"><Topbar title="Call Rates & Charges" subtitle="Dated service rates and geographic overrides" /><div className="p-6"><BrandRatesPanel canEdit={can('rates:edit')} /></div></main></div>;
}
