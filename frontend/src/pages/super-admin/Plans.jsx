import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/super-admin/Sidebar';
import Topbar from '../../components/super-admin/Topbar';
import AmcPlansTab from '../../components/super-admin/plans/AmcPlansTab';
import EwPlansTab from '../../components/super-admin/plans/EwPlansTab';
import { apiRequest } from '../../lib/apiClient';

// Super Admin → Plans (docs/master-catalogue Phases 12–13): everything a
// customer can buy besides a service booking — AMC plans (membership merged
// in) and extended-warranty packs. No price for these lives in app code.

const TABS = [
  { id: 'amc', label: 'AMC Plans' },
  { id: 'warranty', label: 'Extended Warranty' },
];

export default function Plans() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'amc';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let alive = true;
    apiRequest('/catalog/categories', { silentError: true })
      .then((list) => alive && setCategories((Array.isArray(list) ? list : []).map((c) => ({ key: c.key, name: c.name }))))
      .catch(() => alive && setCategories([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="Plans" subtitle="AMC plans and warranty packs customers can buy — prices, visits and benefits" />
        <div className="p-6 space-y-6 flex-1">
          <div role="tablist" aria-label="Plan types" className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setParams({ tab: t.id })}
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${tab === t.id ? 'bg-white text-[#0D47A1] shadow-sm' : 'text-slate-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'amc' && <AmcPlansTab categories={categories} />}
          {tab === 'warranty' && <EwPlansTab categories={categories} />}
        </div>
      </div>
    </div>
  );
}
