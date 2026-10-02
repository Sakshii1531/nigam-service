import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { WarrantyHeader, ErrorNote } from '../components/partner-warranty/ui';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { warrantyApi } from '../lib/partnerWarrantyApi';
import { resolveMediaUrl } from '../lib/apiClient';

// The products (Master Catalogue categories) a brand covers — within the
// group, or all of them when reached from brand search (`group` = "all").
const SelectProduct = () => {
  const navigate = useNavigate();
  const { group, brandId } = useParams();
  const scope = group === 'all' ? undefined : group;
  const res = useApiData(() => warrantyApi.products(brandId, scope), [brandId, scope]);
  const products = res.data?.products || [];

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title={res.data?.brand?.name || 'Select Product'} back={scope ? `/partner-warranty/brands/${scope}` : '/partner-warranty'} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-black text-black tracking-wide pl-1">Select Product</h2>
        <ErrorNote message={res.error ? res.error.message || 'Could not load products.' : ''} onRetry={res.reload} />
        {res.loading ? (
          <SkeletonList rows={4} />
        ) : products.length === 0 && !res.error ? (
          <p className="bg-white border border-slate-200 rounded-2xl px-5 py-6 text-sm text-slate-500 text-center">
            This brand has no products listed for warranty here yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => navigate(`/partner-warranty/issues/${group}/${brandId}/${product.id}`)}
                className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl"
              >
                <span className="flex items-center gap-5">
                  <span className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-100/50">
                    {product.imageUrl ? (
                      <img src={resolveMediaUrl(product.imageUrl)} alt="" className="w-12 h-12 object-contain mix-blend-multiply" />
                    ) : product.icon && !/^[a-z-]+$/i.test(product.icon) ? (
                      <span className="text-2xl" aria-hidden="true">{product.icon}</span>
                    ) : (
                      <Package className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    )}
                  </span>
                  <span className="text-sm font-black text-brand-navy">{product.name}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-text-secondary" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectProduct;
