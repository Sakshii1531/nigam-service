import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Coins, Gift, Loader2, Plus, RotateCcw, Save, Sparkles, Trash2, TrendingUp, Trophy, Users } from 'lucide-react';
import { apiRequest } from '../../../lib/apiClient';

const WHEEL_COLORS = ['#0D47A1', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#E11D48'];
const TASK_LABELS = { book_service: 'Completes a service', write_review: 'Writes a review', refer_friend: 'A referred friend joins' };
const PRIZE_LABELS = { coins: 'Coins', spin: 'Extra spin', none: 'No prize (try again)' };

const input = 'w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0D47A1]';
const num = (v) => (v === '' || v === null || v === undefined ? '' : Number(v));

function Section({ id, icon: Icon, title, hint, action, children }) {
  return (
    <section id={id} className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 scroll-mt-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">{title}</h3>
            {hint && <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, children, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-[#0D47A1] border border-blue-200 rounded-xl px-3 py-2 hover:bg-blue-50 disabled:opacity-40 cursor-pointer">
      <Plus size={14} /> {children}
    </button>
  );
}

function RemoveButton({ onClick, label, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer">
      <Trash2 size={15} />
    </button>
  );
}

/** The wheel as customers will see it, drawn from the draft. */
function WheelPreview({ segments }) {
  const size = 220;
  const c = size / 2;
  const r = c - 6;
  if (segments.length < 2) {
    return <div className="w-[220px] h-[220px] rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 text-center p-6">Add at least 2 segments to see the wheel</div>;
  }
  const angle = 360 / segments.length;
  const point = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [c + radius * Math.cos(rad), c + radius * Math.sin(rad)];
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Spin wheel preview">
      <circle cx={c} cy={c} r={r + 4} fill="#0f172a" />
      {segments.map((s, i) => {
        const [x1, y1] = point(i * angle, r);
        const [x2, y2] = point((i + 1) * angle, r);
        const [tx, ty] = point(i * angle + angle / 2, r * 0.62);
        const large = angle > 180 ? 1 : 0;
        return (
          <g key={i}>
            <path d={`M${c},${c} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={s.color || WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="1.5" />
            <text x={tx} y={ty} fill="#fff" fontSize="10" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * angle + angle / 2} ${tx} ${ty})`}>
              {(s.label || '').slice(0, 12)}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r="16" fill="#fff" stroke="#0f172a" strokeWidth="3" />
    </svg>
  );
}

/**
 * Super Admin → Rewards Program: the customer rewards (earning, levels,
 * one-time tasks, spin wheel) and the partner badges, edited together and
 * saved with one button. The server re-checks everything on save.
 */
export default function RewardsProgramEditor({ onToast, focus }) {
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const scrolled = useRef(false);

  const apply = useCallback((data) => {
    const p = data.program;
    const clean = {
      isActive: p.isActive,
      earning: { coinsPer100: p.earning?.coinsPer100 ?? 0, xpPer100: p.earning?.xpPer100 ?? 0 },
      levels: (p.levels || []).map(({ name, xpRequired, dailySpins, perks }) => ({ name, xpRequired, dailySpins, perks: perks || '' })),
      partnerBadges: (p.partnerBadges || []).map(({ name, minJobs, color }) => ({ name, minJobs, color: color || '' })),
      tasks: (p.tasks || []).map(({ key, title, hint, coins, xp, isActive }) => ({ key, title, hint: hint || '', coins, xp, isActive })),
      spinWheel: {
        isActive: p.spinWheel?.isActive ?? true,
        xpPerSpin: p.spinWheel?.xpPerSpin ?? 0,
        segments: (p.spinWheel?.segments || []).map(({ label, prizeType, value, probability, color }) => ({ label, prizeType, value, probability, color: color || '' })),
      },
    };
    setDraft(clean);
    setSaved(JSON.stringify(clean));
    setStats(data.stats);
  }, []);

  useEffect(() => {
    apiRequest('/super-admin/loyalty/program', { auth: true })
      .then(apply)
      .catch((err) => setError(err.message || 'Could not load the rewards program.'));
  }, [apply]);

  // Opened from the old "Spin Wheel Config" link: jump to the wheel.
  useEffect(() => {
    if (draft && focus && !scrolled.current) {
      scrolled.current = true;
      document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [draft, focus]);

  const dirty = draft && JSON.stringify(draft) !== saved;
  const set = (path, value) => {
    setError('');
    setDraft((d) => {
      const next = structuredClone(d);
      let o = next;
      for (const k of path.slice(0, -1)) o = o[k];
      o[path[path.length - 1]] = value;
      return next;
    });
  };
  const update = (list, i, field, value) => set([...list, i, field], value);

  const segments = draft?.spinWheel.segments || [];
  const chanceTotal = Math.round(segments.reduce((s, x) => s + (Number(x.probability) || 0), 0) * 100) / 100;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = structuredClone(draft);
      body.earning = { coinsPer100: Number(body.earning.coinsPer100) || 0, xpPer100: Number(body.earning.xpPer100) || 0 };
      body.levels = body.levels.map((l) => ({ ...l, xpRequired: Number(l.xpRequired) || 0, dailySpins: Number(l.dailySpins) || 0 }));
      body.partnerBadges = body.partnerBadges.map((b) => ({ ...b, minJobs: Number(b.minJobs) || 0 }));
      body.tasks = body.tasks.map((t) => ({ ...t, coins: Number(t.coins) || 0, xp: Number(t.xp) || 0 }));
      body.spinWheel = {
        ...body.spinWheel,
        xpPerSpin: Number(body.spinWheel.xpPerSpin) || 0,
        segments: body.spinWheel.segments.map((s) => ({ ...s, value: s.prizeType === 'none' ? 0 : Number(s.value) || 0, probability: Number(s.probability) || 0 })),
      };
      apply(await apiRequest('/super-admin/loyalty/program', { method: 'PUT', auth: true, body }));
      onToast?.('Rewards program saved. Customers and partners see it now.');
    } catch (err) {
      setError(err.message || 'Could not save the rewards program.');
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : <Loader2 className="animate-spin text-slate-400 mx-auto" />;
  }

  const sortedBadges = [...draft.partnerBadges].map((b, i) => ({ ...b, i })).sort((a, b) => Number(a.minJobs) - Number(b.minJobs));
  const badgeRange = (b) => {
    const pos = sortedBadges.findIndex((x) => x.i === b.i);
    const next = sortedBadges[pos + 1];
    if (!next) return `${b.minJobs}+ jobs`;
    const end = Math.max(Number(next.minJobs) - 1, Number(b.minJobs));
    return end === Number(b.minJobs) ? `${b.minJobs} jobs` : `${b.minJobs}–${end} jobs`;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header + save */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-16 z-20 bg-white/95 backdrop-blur py-2 -mt-2">
        <div>
          <h2 className="text-base font-black text-slate-800">Rewards Program</h2>
          <p className="text-xs text-slate-500">Coins, levels, tasks and the spin wheel for customers, and badges for partners. Everything here is live after you save.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set(['isActive'], e.target.checked)} className="w-4 h-4 accent-[#0D47A1]" aria-label="Rewards program on" />
            Program on
          </label>
          {dirty && (
            <button type="button" onClick={() => setDraft(JSON.parse(saved))} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 cursor-pointer">
              <RotateCcw size={14} /> Undo changes
            </button>
          )}
          <button type="button" onClick={save} disabled={!dirty || saving} className="flex items-center gap-1.5 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs disabled:opacity-40 cursor-pointer">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">{error}</p>}
      {!draft.isActive && <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">The program is off: customers earn no coins or XP, cannot spin and see no tasks. Partner badges still show.</p>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Coins given to customers', stats.coinsGiven.toLocaleString('en-IN'), Coins],
            ['From spending', stats.coinsBySource.spending.toLocaleString('en-IN'), TrendingUp],
            ['From the spin wheel', `${stats.coinsBySource.spinWheel.toLocaleString('en-IN')} (${stats.spinPrizesWon} prizes)`, Gift],
            ['From referrals', stats.coinsBySource.referrals.toLocaleString('en-IN'), Users],
          ].map(([label, value, Icon]) => (
            <div key={label} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Icon size={12} /> {label}</span>
              <span className="text-base font-black text-slate-800 block mt-1">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Earning */}
      <Section id="earning" icon={TrendingUp} title="Earning on services" hint="Credited automatically when a paid service is completed, for every ₹100 of the final bill. Covered (warranty) visits earn nothing.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <label className="text-xs font-bold text-slate-600 flex flex-col gap-1.5">
            Coins per ₹100 spent
            <input type="number" min="0" className={input} value={draft.earning.coinsPer100} onChange={(e) => set(['earning', 'coinsPer100'], num(e.target.value))} aria-label="Coins per 100 rupees" />
          </label>
          <label className="text-xs font-bold text-slate-600 flex flex-col gap-1.5">
            XP per ₹100 spent
            <input type="number" min="0" className={input} value={draft.earning.xpPer100} onChange={(e) => set(['earning', 'xpPer100'], num(e.target.value))} aria-label="XP per 100 rupees" />
          </label>
        </div>
        <p className="text-[11px] text-slate-500">Example: a ₹1,200 bill gives {Math.floor(12 * (Number(draft.earning.coinsPer100) || 0))} coins and {Math.floor(12 * (Number(draft.earning.xpPer100) || 0))} XP.</p>
      </Section>

      {/* Customer levels */}
      <Section
        id="levels"
        icon={Trophy}
        title="Customer levels"
        hint="Customers climb levels as they collect XP (from services, tasks and spins). Each level sets how many free spins they get every day."
        action={<AddButton disabled={draft.levels.length >= 20} onClick={() => set(['levels'], [...draft.levels, { name: '', xpRequired: '', dailySpins: 1, perks: '' }])}>Add level</AddButton>}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Customer levels">
            <thead className="text-[10px] uppercase text-slate-500 text-left">
              <tr><th className="p-2">Level name</th><th className="p-2">XP needed</th><th className="p-2">Free spins / day</th><th className="p-2">Perks shown to the customer</th><th className="p-2">Customers now</th><th /></tr>
            </thead>
            <tbody>
              {draft.levels.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2"><input className={input} value={l.name} maxLength={40} onChange={(e) => update(['levels'], i, 'name', e.target.value)} aria-label={`Level ${i + 1} name`} /></td>
                  <td className="p-2 w-32"><input type="number" min="0" className={input} value={l.xpRequired} onChange={(e) => update(['levels'], i, 'xpRequired', num(e.target.value))} aria-label={`Level ${i + 1} XP needed`} /></td>
                  <td className="p-2 w-28"><input type="number" min="0" className={input} value={l.dailySpins} onChange={(e) => update(['levels'], i, 'dailySpins', num(e.target.value))} aria-label={`Level ${i + 1} daily spins`} /></td>
                  <td className="p-2"><input className={input} value={l.perks} maxLength={200} onChange={(e) => update(['levels'], i, 'perks', e.target.value)} aria-label={`Level ${i + 1} perks`} /></td>
                  <td className="p-2 text-slate-600 font-bold">{stats?.customersPerLevel?.find((x) => x.name === l.name)?.customers ?? '—'}</td>
                  <td className="p-2 text-right"><RemoveButton disabled={draft.levels.length <= 1} label={`Remove level ${l.name || i + 1}`} onClick={() => set(['levels'], draft.levels.filter((_, j) => j !== i))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">The first level must start at 0 XP. Levels are ordered by XP when saved.</p>
      </Section>

      {/* Partner badges */}
      <Section
        id="partner-badges"
        icon={Award}
        title="Partner badges"
        hint="Partners earn badges as they complete jobs. A partner holds the badge whose range their completed jobs fall in. The badge shows on their profile and to customers."
        action={<AddButton disabled={draft.partnerBadges.length >= 15} onClick={() => set(['partnerBadges'], [...draft.partnerBadges, { name: '', minJobs: '', color: '' }])}>Add badge</AddButton>}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Partner badges">
            <thead className="text-[10px] uppercase text-slate-500 text-left">
              <tr><th className="p-2">Badge name</th><th className="p-2">From completed jobs</th><th className="p-2">Range</th><th className="p-2">Colour</th><th className="p-2">Partners now</th><th /></tr>
            </thead>
            <tbody>
              {draft.partnerBadges.map((b, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2"><input className={input} value={b.name} maxLength={30} onChange={(e) => update(['partnerBadges'], i, 'name', e.target.value)} aria-label={`Badge ${i + 1} name`} /></td>
                  <td className="p-2 w-36"><input type="number" min="0" className={input} value={b.minJobs} onChange={(e) => update(['partnerBadges'], i, 'minJobs', num(e.target.value))} aria-label={`Badge ${i + 1} from jobs`} /></td>
                  <td className="p-2 text-slate-600 font-semibold whitespace-nowrap">{b.minJobs === '' ? '—' : badgeRange({ ...b, i })}</td>
                  <td className="p-2 w-24">
                    <input type="color" value={b.color || '#0D47A1'} onChange={(e) => update(['partnerBadges'], i, 'color', e.target.value)} aria-label={`Badge ${i + 1} colour`} className="w-10 h-8 rounded border border-slate-200 cursor-pointer" />
                  </td>
                  <td className="p-2 text-slate-600 font-bold">{stats?.partnersPerBadge?.find((x) => x.name === b.name)?.partners ?? '—'}</td>
                  <td className="p-2 text-right"><RemoveButton disabled={draft.partnerBadges.length <= 1} label={`Remove badge ${b.name || i + 1}`} onClick={() => set(['partnerBadges'], draft.partnerBadges.filter((_, j) => j !== i))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedBadges.map((b) => (
            <span key={b.i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: b.color || '#0D47A1' }}>
              <Award size={12} /> {b.name || 'Unnamed'} · {b.minJobs === '' ? '?' : badgeRange(b)}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">The first badge must start at 0 jobs, so every partner has one. A partner is notified when a completed job moves them up.</p>
      </Section>

      {/* Tasks */}
      <Section id="tasks" icon={Gift} title="One-time tasks" hint="Shown in the customer's Play Zone. The customer claims each reward once, after the app confirms they really did it.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" aria-label="Tasks">
            <thead className="text-[10px] uppercase text-slate-500 text-left">
              <tr><th className="p-2">When the customer…</th><th className="p-2">Title</th><th className="p-2">Short hint</th><th className="p-2">Coins</th><th className="p-2">XP</th><th className="p-2">On</th></tr>
            </thead>
            <tbody>
              {draft.tasks.map((t, i) => (
                <tr key={t.key} className="border-t border-slate-100">
                  <td className="p-2 font-bold text-slate-700 whitespace-nowrap">{TASK_LABELS[t.key]}</td>
                  <td className="p-2"><input className={input} value={t.title} maxLength={60} onChange={(e) => update(['tasks'], i, 'title', e.target.value)} aria-label={`${TASK_LABELS[t.key]} title`} /></td>
                  <td className="p-2"><input className={input} value={t.hint} maxLength={120} onChange={(e) => update(['tasks'], i, 'hint', e.target.value)} aria-label={`${TASK_LABELS[t.key]} hint`} /></td>
                  <td className="p-2 w-24"><input type="number" min="0" className={input} value={t.coins} onChange={(e) => update(['tasks'], i, 'coins', num(e.target.value))} aria-label={`${TASK_LABELS[t.key]} coins`} /></td>
                  <td className="p-2 w-24"><input type="number" min="0" className={input} value={t.xp} onChange={(e) => update(['tasks'], i, 'xp', num(e.target.value))} aria-label={`${TASK_LABELS[t.key]} XP`} /></td>
                  <td className="p-2"><input type="checkbox" checked={t.isActive} onChange={(e) => update(['tasks'], i, 'isActive', e.target.checked)} className="w-4 h-4 accent-[#0D47A1]" aria-label={`${TASK_LABELS[t.key]} on`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Spin wheel */}
      <Section
        id="spin-wheel"
        icon={Sparkles}
        title="Spin wheel"
        hint="Each customer gets their level's free spins every day (reset at midnight). Set the prizes and their chances; the chances must add up to exactly 100%."
        action={<AddButton disabled={segments.length >= 12} onClick={() => set(['spinWheel', 'segments'], [...segments, { label: '', prizeType: 'coins', value: '', probability: '', color: '' }])}>Add segment</AddButton>}>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={draft.spinWheel.isActive} onChange={(e) => set(['spinWheel', 'isActive'], e.target.checked)} className="w-4 h-4 accent-[#0D47A1]" aria-label="Spin wheel on" />
            Wheel on
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            XP for every spin
            <input type="number" min="0" className={`${input} w-20`} value={draft.spinWheel.xpPerSpin} onChange={(e) => set(['spinWheel', 'xpPerSpin'], num(e.target.value))} aria-label="XP per spin" />
          </label>
        </div>
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-1 w-full overflow-x-auto">
            <table className="w-full text-xs" aria-label="Spin wheel segments">
              <thead className="text-[10px] uppercase text-slate-500 text-left">
                <tr><th className="p-2">#</th><th className="p-2">Label on the wheel</th><th className="p-2">Prize</th><th className="p-2">How many</th><th className="p-2">Chance %</th><th className="p-2">Colour</th><th /></tr>
              </thead>
              <tbody>
                {segments.map((s, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 font-bold text-slate-500">{i + 1}</td>
                    <td className="p-2"><input className={input} value={s.label} maxLength={24} onChange={(e) => update(['spinWheel', 'segments'], i, 'label', e.target.value)} aria-label={`Segment ${i + 1} label`} /></td>
                    <td className="p-2 w-40">
                      <select className={input} value={s.prizeType} onChange={(e) => update(['spinWheel', 'segments'], i, 'prizeType', e.target.value)} aria-label={`Segment ${i + 1} prize`}>
                        {Object.entries(PRIZE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="p-2 w-24">
                      <input type="number" min="0" disabled={s.prizeType === 'none'} className={`${input} disabled:bg-slate-50 disabled:text-slate-300`} value={s.prizeType === 'none' ? '' : s.value} onChange={(e) => update(['spinWheel', 'segments'], i, 'value', num(e.target.value))} aria-label={`Segment ${i + 1} how many`} />
                    </td>
                    <td className="p-2 w-24"><input type="number" min="0" max="100" step="0.5" className={input} value={s.probability} onChange={(e) => update(['spinWheel', 'segments'], i, 'probability', num(e.target.value))} aria-label={`Segment ${i + 1} chance`} /></td>
                    <td className="p-2 w-16"><input type="color" value={s.color || WHEEL_COLORS[i % WHEEL_COLORS.length]} onChange={(e) => update(['spinWheel', 'segments'], i, 'color', e.target.value)} aria-label={`Segment ${i + 1} colour`} className="w-10 h-8 rounded border border-slate-200 cursor-pointer" /></td>
                    <td className="p-2 text-right"><RemoveButton label={`Remove segment ${i + 1}`} onClick={() => set(['spinWheel', 'segments'], segments.filter((_, j) => j !== i))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`mt-3 text-xs font-bold rounded-xl px-3 py-2 inline-block ${chanceTotal === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`} aria-live="polite">
              Total chance: {chanceTotal}% {chanceTotal === 100 ? '— ready' : `— must be exactly 100% (${chanceTotal < 100 ? `${Math.round((100 - chanceTotal) * 100) / 100}% left to give` : `${Math.round((chanceTotal - 100) * 100) / 100}% too much`})`}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <WheelPreview segments={segments} />
            <span className="text-[11px] text-slate-500 font-semibold">Preview of the customer&apos;s wheel</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
