import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

/**
 * App-wide toast notifications.
 *
 * Two ways in:
 *  - `useToast()` for deliberate messages a screen wants to show
 *    (`toast.success('Address saved')`, `toast.error(err)`).
 *  - automatically, for API failures that would otherwise be swallowed —
 *    apiClient dispatches an `api:error` CustomEvent and this provider listens
 *    for it. The bridge is an event rather than a direct import because
 *    apiClient is a plain module used outside React (route loaders, the push
 *    client) and must not depend on a context. It's the same idiom
 *    LogoContext/`auth:unauthorized` already use.
 */

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 5000;

let nextId = 0;

const VARIANTS = {
  success: {
    ring: 'ring-emerald-200',
    icon: 'text-emerald-600',
    path: 'M20 6L9 17l-5-5',
  },
  error: {
    ring: 'ring-red-200',
    icon: 'text-red-600',
    path: 'M12 8v5M12 16.5v.5M10.3 3.9L2.4 17a1.9 1.9 0 001.7 2.9h15.8a1.9 1.9 0 001.7-2.9L13.7 3.9a1.9 1.9 0 00-3.4 0z',
  },
  info: {
    ring: 'ring-sky-200',
    icon: 'text-[#0D47A1]',
    path: 'M12 16v-5M12 8h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((message, { variant = 'info', duration = AUTO_DISMISS_MS } = {}) => {
    const text = typeof message === 'string' ? message : message?.message;
    if (!text) return null;

    let id = null;
    setToasts((current) => {
      // A retry loop or several parallel requests failing the same way should
      // read as one message, not a stack of identical ones.
      if (current.some((t) => t.message === text && t.variant === variant)) return current;
      id = ++nextId;
      return [...current, { id, message: text, variant }].slice(-3);
    });

    if (id !== null && duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    }
    return id;
  }, [dismiss]);

  // Clear pending timers if the provider itself goes away.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, []);

  useEffect(() => {
    const onApiError = (e) => push(e.detail?.message, { variant: 'error' });
    window.addEventListener('api:error', onApiError);
    return () => window.removeEventListener('api:error', onApiError);
  }, [push]);

  const value = {
    toast: push,
    success: useCallback((m, o) => push(m, { ...o, variant: 'success' }), [push]),
    error: useCallback((m, o) => push(m, { ...o, variant: 'error' }), [push]),
    info: useCallback((m, o) => push(m, { ...o, variant: 'info' }), [push]),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      // Sits above the bottom nav on mobile (which AppChrome renders at the
      // viewport foot) and top-right on desktop, clear of the chrome either way.
      className="fixed z-[9999] pointer-events-none flex flex-col gap-2 bottom-24 left-4 right-4 items-center sm:bottom-auto sm:top-5 sm:right-5 sm:left-auto sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const v = VARIANTS[t.variant] || VARIANTS.info;
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-start gap-3 overflow-hidden rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ${v.ring}`}
          >
            <span aria-hidden="true" className={`mt-0.5 shrink-0 ${v.icon}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={v.path} />
              </svg>
            </span>
            <p className="flex-1 text-sm font-medium leading-snug text-slate-700 break-words">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Safe outside a provider (tests, isolated renders) — the calls become no-ops
 * rather than throwing and taking the screen down over a status message. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    const noop = () => null;
    return { toast: noop, success: noop, error: noop, info: noop, dismiss: noop };
  }
  return ctx;
}
