// Skeleton placeholders for the customer and service-provider apps.
//
// The rule every screen follows: a section renders its real content as soon
// as *its own* data arrives, and shows the matching skeleton only while that
// data is still pending — one slow request never blanks the whole page.
// Shapes here mirror the real layouts (cards, rows, tiles, stats) so nothing
// jumps when the data lands. Pulses only for users who allow motion.

const base = 'bg-slate-200/70 motion-safe:animate-pulse';

/** One grey block. Size it with className (w-*, h-*, rounded-*); `inline` sits in a line of text. */
export function Skeleton({ className = '', rounded = 'rounded-lg', style, inline = false }) {
  return <span aria-hidden="true" style={style} className={`${inline ? 'inline-block align-middle' : 'block'} ${base} ${rounded} ${className}`} />;
}

/** A number or short value that is still loading, inside a sentence or a stat. */
export function InlineValue({ value, className = 'h-[0.9em] w-6', children }) {
  if (value === null || value === undefined) {
    return (
      <>
        <Skeleton inline className={className} />
        <span className="sr-only">Loading</span>
      </>
    );
  }
  return children ?? value;
}

/** A few lines of text; the last one shorter, like a real paragraph. */
export function SkeletonText({ lines = 2, className = '', lineClassName = 'h-3' }) {
  return (
    <span aria-hidden="true" className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`${lineClassName} ${i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </span>
  );
}

/**
 * Wraps a section: skeleton while `loading`, the children otherwise. The
 * wrapper carries aria-busy so screen readers know the region is filling.
 */
export function LoadingSection({ loading, skeleton, children, label, className = '' }) {
  if (!loading) return children;
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label ? `Loading ${label}…` : 'Loading…'}</span>
      {skeleton}
    </div>
  );
}

/** A horizontal row of picture cards (service tiles, products, stories). */
export function SkeletonCardRow({ count = 4, imageClassName = 'h-26 min-[360px]:h-30 sm:h-36 md:h-44', cardClassName = 'w-32.5 min-[360px]:w-36.25 sm:w-44 md:w-auto', withTitle = true, columns = 'md:grid-cols-4' }) {
  return (
    <div aria-hidden="true" className={columns.startsWith('grid-') ? `grid ${columns} gap-4` : `flex gap-2.5 sm:gap-4 overflow-hidden md:grid ${columns} md:gap-5`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`shrink-0 ${cardClassName} border border-slate-100 rounded-2xl p-2 md:p-4 bg-white flex flex-col gap-2`}>
          <Skeleton className={`w-full ${imageClassName}`} rounded="rounded-xl" />
          {withTitle && (
            <>
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-2/5" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** A section heading with an optional right-side action. */
export function SkeletonHeading({ withAction = true, className = 'mb-5' }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-between ${className}`}>
      <Skeleton className="h-5 w-44" />
      {withAction && <Skeleton className="h-7 w-16" rounded="rounded-xl" />}
    </div>
  );
}

/** Round icon + label grid (category chips). */
export function SkeletonIconGrid({ count = 8, className = 'grid grid-cols-4 gap-4' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16" rounded="rounded-2xl" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}

/** A wide banner / hero block. */
export function SkeletonBanner({ className = 'h-36 sm:h-48 md:h-64' }) {
  return <Skeleton className={`w-full ${className}`} rounded="rounded-2xl" />;
}

/** List of rows: avatar/icon, two text lines, trailing value (bookings, jobs, notifications…). */
export function SkeletonList({ rows = 4, withAvatar = true, withTrailing = true, className = 'space-y-3', rowClassName = 'bg-white border border-slate-100 rounded-2xl p-4' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 ${rowClassName}`}>
          {withAvatar && <Skeleton className="w-11 h-11 shrink-0" rounded="rounded-xl" />}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          {withTrailing && <Skeleton className="h-4 w-14 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

/** Larger cards with a header line, a body and a footer (booking / job cards). */
export function SkeletonCards({ count = 3, className = 'space-y-3', cardClassName = 'bg-white border border-slate-100 rounded-2xl p-4' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${cardClassName} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-16" rounded="rounded-full" />
          </div>
          <SkeletonText lines={2} />
          <div className="flex items-center justify-between gap-3 pt-1">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-24" rounded="rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Row of small stat tiles (earnings, counts). */
export function SkeletonStats({ count = 3, className = 'grid grid-cols-3 gap-3' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3.5 space-y-2">
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Label / value lines, as on a details or profile page. */
export function SkeletonKeyValues({ rows = 5, className = 'space-y-3' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** A form's fields (label + input). */
export function SkeletonForm({ fields = 4, className = 'space-y-4' }) {
  return (
    <div aria-hidden="true" className={className}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" rounded="rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Product / service detail: picture, title, price, a few lines. */
export function SkeletonDetail({ className = '' }) {
  return (
    <div aria-hidden="true" className={`space-y-4 ${className}`}>
      <Skeleton className="w-full aspect-4/3 max-h-80" rounded="rounded-2xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={3} />
      <SkeletonKeyValues rows={4} />
    </div>
  );
}

/** Profile header: avatar + name + subtitle. */
export function SkeletonProfileHeader({ className = 'flex items-center gap-4' }) {
  return (
    <div aria-hidden="true" className={className}>
      <Skeleton className="w-16 h-16 shrink-0" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/**
 * A whole screen for pages that show one thing (a booking, a job, a product,
 * a profile): the page's own header row, then blocks shaped like its content.
 * Only for the first load of that one thing — lists and dashboards use
 * per-section skeletons instead.
 */
export function SkeletonScreen({ variant = 'detail', label = 'page', className = 'min-h-screen bg-bg-light', maxWidth = 'max-w-3xl' }) {
  const body = {
    detail: (
      <>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-20" rounded="rounded-full" />
          </div>
          <SkeletonText lines={2} />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <SkeletonList rows={2} className="space-y-3" rowClassName="" />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <SkeletonKeyValues rows={5} />
        </div>
      </>
    ),
    list: <SkeletonList rows={6} />,
    cards: <SkeletonCards count={3} />,
    form: (
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <SkeletonForm fields={5} />
      </div>
    ),
    profile: (
      <>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <SkeletonProfileHeader />
        </div>
        <SkeletonList rows={5} withTrailing={false} />
      </>
    ),
    product: (
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <SkeletonDetail />
      </div>
    ),
  }[variant];
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading {label}…</span>
      <div aria-hidden="true" className="bg-white border-b border-slate-100 px-4 py-3.5 flex items-center gap-3">
        <Skeleton className="w-8 h-8" rounded="rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className={`${maxWidth} mx-auto px-4 py-4 space-y-4`}>{body}</div>
    </div>
  );
}
