import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';

/**
 * The partner's badge from their completed jobs, with progress to the next
 * one and the whole ladder. Badges and their job ranges are set by the super
 * admin (Rewards Program → Partner badges).
 */
export default function PartnerBadgeCard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    apiRequest('/service-provider/profile/profile', { auth: true, silentError: true })
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  const badge = profile?.badge;
  if (!badge?.name) return null;
  const badges = profile.badges || [];
  const next = badge.next;
  const span = next ? Math.max(1, next.minJobs - badge.minJobs) : 1;
  const percent = next ? Math.min(100, Math.round(((badge.completedJobs - badge.minJobs) / span) * 100)) : 100;
  const color = badge.color || '#0D47A1';

  return (
    <section aria-label="Your badge" className="bg-white/90 rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: color }}>
          <Award className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your badge</p>
          <p className="text-base font-black text-slate-900 leading-tight">{badge.name}</p>
          <p className="text-[11px] text-slate-500 font-medium">{badge.completedJobs} completed job{badge.completedJobs === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-slate-600">
          {next ? `${next.jobsToGo} more job${next.jobsToGo === 1 ? '' : 's'} to reach ${next.name}` : 'You have the highest badge. Great work!'}
        </p>
      </div>
      {badges.length > 1 && (
        <ol className="flex flex-wrap gap-1.5" aria-label="All badges">
          {badges.map((b, i) => {
            const last = badges[i + 1] ? badges[i + 1].minJobs - 1 : null;
            const end = last === null ? `${b.minJobs}+` : last === b.minJobs ? `${b.minJobs}` : `${b.minJobs}–${last}`;
            const held = b.name === badge.name;
            return (
              <li key={b.name} className={`px-2 py-1 rounded-full text-[10px] font-bold border ${held ? 'text-white border-transparent' : 'text-slate-600 border-slate-200 bg-slate-50'}`} style={held ? { background: b.color || color } : undefined}>
                {b.name} · {end} jobs
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
