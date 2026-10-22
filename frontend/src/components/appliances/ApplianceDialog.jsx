import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const dialogs = [];
let restorePage;

// Fixed-body locking also prevents the page moving behind a dialog on iOS.
// Keep one lock for nested dialogs and restore the exact original page position.
function lockPage() {
  const body = document.body, root = document.documentElement;
  const scrollX = window.scrollX, scrollY = window.scrollY;
  const bodyStyle = body.getAttribute('style'), rootStyle = root.getAttribute('style');
  const scrollbar = window.innerWidth - root.clientWidth;
  const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
  Object.assign(body.style, { position:'fixed', top:`-${scrollY}px`, left:`-${scrollX}px`, width:'100%', overflow:'hidden', paddingRight:`${padding + scrollbar}px` });
  Object.assign(root.style, { overflow:'hidden', overscrollBehavior:'none' });
  return () => {
    if (bodyStyle === null) body.removeAttribute('style'); else body.setAttribute('style',bodyStyle);
    if (rootStyle === null) root.removeAttribute('style'); else root.setAttribute('style',rootStyle);
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto'; window.scrollTo(scrollX,scrollY); root.style.scrollBehavior = behavior;
  };
}

export default function ApplianceDialog({ children, onClose, label, labelledBy, role = 'dialog', className = '', testId }) {
  const panel = useRef(null), close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const element = panel.current, previous = document.activeElement;
    if (!dialogs.length) restorePage = lockPage();
    dialogs.push(element);
    element.focus({ preventScroll:true });
    function keyboard(event) {
      if (dialogs.at(-1) !== element) return;
      if (event.key === 'Escape' && close.current) { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length && node.tabIndex >= 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); element.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown',keyboard);
    return () => {
      document.removeEventListener('keydown',keyboard);
      const index = dialogs.indexOf(element); if (index >= 0) dialogs.splice(index,1);
      if (!dialogs.length) { restorePage?.(); restorePage = undefined; }
      if (previous?.isConnected) previous.focus({ preventScroll:true });
    };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[110] flex items-center justify-center overscroll-none bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section ref={panel} tabIndex={-1} role={role} aria-modal="true" aria-label={label} aria-labelledby={labelledBy} data-testid={testId} className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] ${className}`}>{children}</section>
  </div>,document.body);
}
