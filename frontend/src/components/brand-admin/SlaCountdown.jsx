import { useEffect, useState } from 'react';
export default function SlaCountdown({ sla }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  if (!sla.nextDueAt) return <span className="text-slate-500">No active clock</span>;
  const remaining = sla.state === 'paused' ? sla.remainingMs : new Date(sla.nextDueAt).getTime() - now;
  const state = remaining <= 0 ? 'breached' : sla.state;
  return <span data-testid="sla-countdown" className={`inline-block rounded px-2 py-1 ${state === 'breached' ? 'bg-red-100 text-red-800' : state === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
    {sla.nextStage}<br/>{sla.state === 'paused' ? 'Paused' : `${remaining <= 0 ? 'Overdue' : 'Due in'} ${Math.floor(Math.abs(remaining) / 3600000)}h ${Math.floor(Math.abs(remaining) / 60000) % 60}m`}
  </span>;
}
