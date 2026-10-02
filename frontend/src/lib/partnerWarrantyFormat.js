// Small formatting helpers shared by the Partner Warranty screens.

/** Tone of a claim status pill: action needed, bad outcome, done, or in progress. */
export function statusTone(status) {
  if (status === 'Info Requested') return 'action';
  if (['Rejected', 'Cancelled'].includes(status)) return 'bad';
  if (['Closed', 'Service Completed'].includes(status)) return 'done';
  return 'active';
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "due in 5h" / "overdue 2h" for a deadline; `soon` = under 4 hours left. */
export function dueLabel(dueAt, now = Date.now()) {
  if (!dueAt) return null;
  const mins = Math.round((new Date(dueAt).getTime() - now) / 60000);
  const fmt = (m) => (Math.abs(m) >= 120 ? `${Math.round(Math.abs(m) / 60)}h` : `${Math.abs(m)}m`);
  return mins >= 0 ? { text: `due in ${fmt(mins)}`, late: false, soon: mins < 240 } : { text: `overdue ${fmt(mins)}`, late: true, soon: false };
}

/** "Sat, 3 Oct 2026 · 9 AM – 12 PM" for a claim's { date: 'YYYY-MM-DD', slot }. */
export function formatVisit(visit) {
  if (!visit?.date) return null;
  const day = new Date(`${visit.date}T00:00:00`);
  const text = Number.isNaN(day.getTime())
    ? visit.date
    : day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/,(?= \d{4}$)/, '');
  return visit.slot ? `${text} · ${visit.slot}` : text;
}
