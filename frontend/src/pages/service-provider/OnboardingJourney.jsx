import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ClipboardCheck, FileCheck2, History, LogOut, Package, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
import { buttonClass, inputClass, secondaryButtonClass, Field, Timeline, DocumentButtons, Panel, StatusBadge, JourneyProgress, dateTime } from '../../components/provider-onboarding/shared';

function Resubmission({ application, refresh }) {
  const [categories, setCategories] = useState([]), [selected, setSelected] = useState(application.requestedCategories.map(c => c.id || c._id)), [front, setFront] = useState(null), [back, setBack] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { apiRequest('/catalog/categories').then(setCategories).catch(e => setError(e.message)); }, []);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      let revision = application.revision;
      if (front || back) {
        if (!front || !back) throw new Error('Choose both front and back documents');
        const body = new FormData(); body.append('aadharFront', front); body.append('aadharBack', back);
        const saved = await apiRequest('/service-provider/onboarding/documents', { method: 'POST', auth: true, body });
        revision = saved.onboarding.revision;
      }
      await apiRequest('/service-provider/onboarding/resubmit', { method: 'POST', auth: true, body: { revision, categories: selected } });
      await refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Correct and resubmit your application</h2><fieldset><legend>Requested service categories</legend>{categories.map(c => <label key={c.id} className="my-2 flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}</fieldset><Field title="Replace Aadhaar front"><input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFront(e.target.files[0])} /></Field><Field title="Replace Aadhaar back"><input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setBack(e.target.files[0])} /></Field><p className="text-sm text-slate-600">Upload both documents together if corrections are needed. Existing documents remain if you do not replace them.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<button className={buttonClass} disabled={busy || !selected.length}>{busy ? 'Submitting…' : 'Resubmit application'}</button></form>;
}
export default function OnboardingJourney() {
  const { user, updateUser, logout } = useAuth(), navigate = useNavigate();
  const providerAccess = user?.providerAccess;
  const [data, setData] = useState(null), [orders, setOrders] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [result, history] = await Promise.all([apiRequest('/service-provider/onboarding', { auth: true }), apiRequest('/service-provider/kits/orders', { auth: true })]); setData(result); setOrders(history); setError('');
      if (JSON.stringify(providerAccess) !== JSON.stringify(result.eligibility)) updateUser({ providerAccess: result.eligibility });
    } catch (e) { setError(e.message); }
  }, [updateUser, providerAccess]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); window.addEventListener('focus', refresh); return () => { clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [refresh]);
  const app = data?.onboarding, ready = data?.eligibility.eligible;
  async function online() { setBusy(true); try { await apiRequest('/service-provider/profile/availability', { method: 'PATCH', auth: true, body: { availability: 'Available' } }); navigate('/service-provider/dashboard'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  const corrections = ['CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'].includes(app?.state);
  const statusTitle = ready ? 'Ready for jobs' : corrections ? 'Your application needs attention' : app?.state === 'APPROVED' ? 'Complete your kit delivery' : app?.state === 'SUPER_ADMIN_REVIEW' ? 'Waiting for final approval' : app?.state === 'INTERVIEW_SCHEDULED' ? 'Your interview is scheduled' : 'Your onboarding is in progress';
  return (
    <main className="min-h-screen bg-[#F5F7FB] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#0D47A1]">Nigam Care Partner</p><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My onboarding</h1><p className="mt-2 text-sm text-slate-500">Follow your journey from application to your first job.</p></div><button aria-label="Sign out" onClick={() => logout()} className={secondaryButtonClass}><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></button></header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!data && !error && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading your journey…</p>}
        {data && <>
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-[#0D47A1]">{data.provider.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}</div><div><h2 className="font-bold">{data.provider.name}</h2><p className="mt-1 text-xs text-slate-400">{data.provider.humanId} · {data.provider.city || 'Service partner'}</p></div></div><StatusBadge tone={ready ? 'green' : corrections ? 'red' : 'amber'}>{ready ? <Check size={12} /> : <ClipboardCheck size={12} />}{ready ? 'Eligible for jobs' : corrections ? 'Action required' : 'Onboarding in progress'}</StatusBadge></section>
          <JourneyProgress application={app} orders={orders} ready={ready} legacy={data.eligibility.legacy} />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              <section className={`overflow-hidden rounded-2xl border shadow-sm ${ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-blue-100 bg-gradient-to-br from-blue-50/90 to-white'}`}><div className="p-5 sm:p-6"><span className="text-[10px] font-bold uppercase tracking-wider text-[#0D47A1]">{ready ? 'You’re all set' : 'Your next step'}</span><h2 className="mt-2 text-xl font-bold tracking-tight">{statusTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{ready ? 'You can receive jobs in your approved service categories. Choose Go Online when you are ready.' : corrections ? 'Review the latest feedback below, make the requested corrections and resubmit your application for interview review.' : app?.state === 'APPROVED' ? 'Your interview and final approval are complete. Purchase a qualifying onboarding kit and verify the code inside the delivered parcel to unlock jobs.' : app?.state === 'SUPER_ADMIN_REVIEW' ? 'Your area manager has completed the interview. The super admin will review the approved categories and make the final decision.' : 'Your area manager will contact you for an interview to review your documents and assess your selected service categories.'}</p>{app?.interviewAt && <p className="mt-3 text-xs font-medium text-slate-500">Interview: {dateTime(app.interviewAt)}</p>}<div className="mt-5 flex flex-wrap gap-3">{ready && <button disabled={busy} onClick={online} className={buttonClass}>Go Online <ArrowRight size={15} /></button>}{data.canBuyKits && <Link className={ready ? secondaryButtonClass : buttonClass} to="/service-provider/kits"><Package size={16} />Shop kits &amp; track orders</Link>}<button className={secondaryButtonClass} onClick={refresh}><RefreshCw size={14} />Refresh status</button></div></div>{app?.decisionReason && <div className="border-t border-blue-100/70 bg-white/60 px-5 py-4 sm:px-6"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest update from your reviewer</p><p className="mt-1.5 break-words text-sm text-slate-700">{app.decisionReason}</p></div>}</section>
              {corrections && <Resubmission key={app.revision} application={app} refresh={refresh} />}
              <Panel title="Your service categories" description="Only interview-approved categories become available for jobs." icon={Wrench} action={app && <StatusBadge tone="slate">{app.approvedCategories.length} approved</StatusBadge>}>
                {app ? <ul className="divide-y divide-slate-100">{app.requestedCategories.map(c => { const approved = app.approvedCategories.some(a => (a.id || a._id) === (c.id || c._id)); return <li key={c.id || c._id} className="flex items-center justify-between gap-3 py-3 first:pt-0"><span className="min-w-0 text-sm font-medium">{c.name}</span><StatusBadge tone={approved ? 'green' : 'slate'}>{approved ? (app.state === 'APPROVED' ? 'Approved' : 'Interview approved') : ['ASM_REVIEW', 'INTERVIEW_SCHEDULED'].includes(app.state) ? 'Requested' : 'Not approved'}</StatusBadge></li>; })}</ul> : <p className="text-sm text-slate-500">Your previously approved categories remain on your profile.</p>}<p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">Purchasing a kit does not add service categories.</p>
              </Panel>
              {app && <Panel title="Submitted documents" description="View the documents attached to your application." icon={FileCheck2}><DocumentButtons base="/service-provider/onboarding/documents" /></Panel>}
            </div>
            <aside className="min-w-0 space-y-6">
              <Panel title="Before you receive jobs" icon={ShieldCheck}><ul className="space-y-4">{[{ text: 'Complete your ASM interview', done: ['SUPER_ADMIN_REVIEW', 'APPROVED'].includes(app?.state) || data.eligibility.legacy }, { text: 'Receive final admin approval', done: app?.state === 'APPROVED' || data.eligibility.legacy }, { text: 'Pay for a qualifying kit and verify delivery', done: ready || orders.some(o => o.status === 'ReceiptVerified' && o.paymentStatus === 'Paid' && o.items.some(i => i.qualifiesForOnboarding)) }].map(item => <li key={item.text} className="flex items-start gap-2.5 text-xs leading-5"><Check className={`mt-0.5 shrink-0 rounded-full p-0.5 ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`} size={17} /><span className={item.done ? 'text-slate-700' : 'text-slate-500'}>{item.text}</span></li>)}</ul>{data.provider.legacyExemption?.recordedAt && <p className="mt-4 text-xs leading-5 text-blue-800">Your existing active account is covered by the recorded legacy onboarding exemption.</p>}</Panel>
              <Panel title="Journey timeline" description="Your application updates, in one place." icon={History}><Timeline events={app?.events} /></Panel>
            </aside>
          </div>
        </>}
      </div>
    </main>
  );
}
