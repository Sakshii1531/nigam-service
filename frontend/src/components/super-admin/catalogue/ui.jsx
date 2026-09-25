import { X } from 'lucide-react';

// Small shared pieces for the Master Catalogue screens, in the same visual
// language as the other super-admin pages (Cities.jsx, Settings.jsx).

export const inputClass =
  'w-full border border-slate-200 bg-white p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-sm disabled:bg-slate-50 disabled:text-slate-500';

/** Compact control for toolbars — sized to content, unlike inputClass. */
export const toolbarControlClass =
  'border border-slate-200 bg-white px-2.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-[#0D47A1] text-xs font-semibold text-slate-600';

/**
 * A labelled form control. The <label> wraps the control so the two are
 * associated (screen readers announce it, clicking the text focuses it).
 * Pass `group` when the field holds several controls (radios, button sets):
 * it then renders a labelled group instead of a single label.
 */
export function Field({ label, hint, children, className = '', group = false }) {
  const caption = <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</span>;
  return (
    <div className={className}>
      {group ? (
        <div role="group" aria-label={label}>
          {caption}
          {children}
        </div>
      ) : (
        <label className="block">
          {caption}
          {children}
        </label>
      )}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, width = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-150" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-2xl border border-slate-100 shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({ active }) {
  return active ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-700">Live</span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">Off</span>
  );
}

export function DemoBadge() {
  return (
    <span
      title="Placeholder rate from the seed data — replace it with the client's rate"
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 tracking-wide"
    >
      Demo rate
    </span>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-600 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-[#0D47A1]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label}
    </label>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{message}</p>;
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 text-xs font-bold bg-[#0D47A1] text-white rounded-xl hover:bg-blue-700 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5 ${className}`}
    >
      {children}
    </button>
  );
}
