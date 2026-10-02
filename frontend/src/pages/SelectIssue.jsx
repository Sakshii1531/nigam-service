import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Wrench } from 'lucide-react';
import { WarrantyHeader, ErrorNote } from '../components/partner-warranty/ui';
import { SkeletonList } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { warrantyApi } from '../lib/partnerWarrantyApi';

// Issues for the chosen product, from the API (admin-managed per category).
const SelectIssue = () => {
  const navigate = useNavigate();
  const { group, brandId, categoryId } = useParams();
  const res = useApiData(() => warrantyApi.issues(categoryId), [categoryId]);
  const issues = res.data?.issues || [];

  const choose = (issue) =>
    navigate(`/partner-warranty/raise-request/${group}/${brandId}/${categoryId}`, {
      state: { issueId: issue.id, issueName: issue.name, productName: res.data?.product?.name },
    });

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title={res.data?.product?.name || 'Select Issue'} back={`/partner-warranty/products/${group}/${brandId}`} />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <h2 className="text-lg font-black text-black tracking-wide pl-1">Select Issue</h2>
        <ErrorNote message={res.error ? 'Could not load issues.' : ''} onRetry={res.reload} />
        {res.loading ? (
          <SkeletonList rows={5} />
        ) : issues.length === 0 && !res.error ? (
          <p className="bg-white border border-slate-200 rounded-2xl px-5 py-6 text-sm text-slate-500 text-center">
            No issues are listed for this product yet. Please contact support.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => choose(issue)}
                className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 text-left w-full cursor-pointer rounded-2xl"
              >
                <span className="flex items-center gap-4">
                  <span className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-brand-blue" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-black text-brand-navy">{issue.name}</span>
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

export default SelectIssue;
