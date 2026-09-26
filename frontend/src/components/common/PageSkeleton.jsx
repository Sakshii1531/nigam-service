import { useLocation } from 'react-router-dom';
import { Skeleton, SkeletonBanner, SkeletonCardRow, SkeletonCards, SkeletonHeading, SkeletonIconGrid, SkeletonList, SkeletonStats } from './Skeleton';

// Shown while a page's code is still downloading (the router's Suspense
// fallback). Shaped like the app the user is in, so the screen doesn't flash
// from a spinner to a completely different layout.

function CustomerPage() {
  return (
    <div className="min-h-screen bg-bg-light px-4 sm:px-6 pt-4 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-40" rounded="rounded-xl" />
        <Skeleton className="h-9 w-9" rounded="rounded-full" />
      </div>
      <Skeleton className="h-11 w-full" rounded="rounded-2xl" />
      <SkeletonBanner />
      <SkeletonIconGrid />
      <div>
        <SkeletonHeading />
        <SkeletonCardRow />
      </div>
    </div>
  );
}

function ServiceProviderPage() {
  return (
    <div className="min-h-screen bg-bg-light px-4 pt-4 pb-24 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonStats />
      <SkeletonCards count={2} />
    </div>
  );
}

function ConsolePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden md:block w-64 border-r border-slate-100 bg-white p-4 space-y-3">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-5">
        <Skeleton className="h-8 w-64" />
        <SkeletonStats count={4} className="grid grid-cols-2 md:grid-cols-4 gap-3" />
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}

export default function PageSkeleton() {
  const { pathname } = useLocation();
  const body = pathname.startsWith('/service-provider')
    ? <ServiceProviderPage />
    : /^\/(super-admin|brand-admin|asm)/.test(pathname)
      ? <ConsolePage />
      : <CustomerPage />;
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading…</span>
      {body}
    </div>
  );
}
