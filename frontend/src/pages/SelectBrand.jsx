import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { WarrantyHeader, BrandLogo, ErrorNote } from '../components/partner-warranty/ui';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { warrantyApi } from '../lib/partnerWarrantyApi';

// Partner brands in one warranty group, from the API (docs/partner-warranty
// Phase 12). `group` is the group's slug.
const SelectBrand = () => {
  const navigate = useNavigate();
  const { group } = useParams();
  const [filter, setFilter] = useState('');
  const groups = useApiData(() => warrantyApi.groups(), [], { initial: [] });
  const brands = useApiData(() => warrantyApi.brands({ group }), [group], { initial: [] });

  const title = groups.data.find((g) => g.slug === group)?.name || 'Select Brand';
  const shown = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return term ? brands.data.filter((b) => b.name.toLowerCase().includes(term)) : brands.data;
  }, [brands.data, filter]);

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title={title} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-black text-black tracking-wide pl-1">Select Brand</h2>

        {brands.data.length > 6 && (
          <div className="relative">
            <label htmlFor="pw-brand-filter" className="sr-only">
              Filter brands
            </label>
            <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="pw-brand-filter"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search brands"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-brand-blue"
            />
          </div>
        )}

        <ErrorNote message={brands.error ? 'Could not load brands.' : ''} onRetry={brands.reload} />
        {brands.loading ? (
          <SkeletonList rows={5} />
        ) : shown.length === 0 ? (
          <p className="bg-white border border-slate-200 rounded-2xl px-5 py-6 text-sm text-slate-500 text-center">
            {filter ? `No brand matches “${filter}”.` : 'No partner brands offer warranty service in this category yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {shown.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => navigate(`/partner-warranty/products/${group}/${brand.id}`)}
                className="flex items-center justify-between gap-4 px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <BrandLogo brand={brand} />
                  <span className="text-sm font-black text-brand-navy truncate">{brand.name}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectBrand;
