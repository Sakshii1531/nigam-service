import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/apiClient';
import { buttonClass, Field, Timeline, label, DocumentButtons } from '../../components/provider-onboarding/shared';

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
  return <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl border p-5"><h2 className="font-bold">Correct and resubmit your application</h2><fieldset><legend>Requested service categories</legend>{categories.map(c => <label key={c.id} className="flex items-center gap-2 py-1"><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}</fieldset><Field title="Replace Aadhaar front"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFront(e.target.files[0])} /></Field><Field title="Replace Aadhaar back"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setBack(e.target.files[0])} /></Field><p className="text-sm text-slate-600">Upload both documents together if corrections are needed. Existing documents remain if you do not replace them.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<button className={buttonClass} disabled={busy || !selected.length}>{busy ? 'Submitting…' : 'Resubmit application'}</button></form>;
}
export default function OnboardingJourney() {
  const { user, updateUser, logout } = useAuth(), navigate = useNavigate();
  const providerAccess = user?.providerAccess;
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const result = await apiRequest('/service-provider/onboarding', { auth: true }); setData(result); setError('');
      if (JSON.stringify(providerAccess) !== JSON.stringify(result.eligibility)) updateUser({ providerAccess: result.eligibility });
    } catch (e) { setError(e.message); }
  }, [updateUser, providerAccess]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); window.addEventListener('focus', refresh); return () => { clearInterval(timer); window.removeEventListener('focus', refresh); }; }, [refresh]);
  const app = data?.onboarding, ready = data?.eligibility.eligible;
  async function online() { setBusy(true); try { await apiRequest('/service-provider/profile/availability', { method: 'PATCH', auth: true, body: { availability: 'Available' } }); navigate('/service-provider/dashboard'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <main className="min-h-screen bg-slate-50 p-4 md:p-8"><div className="max-w-3xl mx-auto space-y-5"><header className="flex justify-between items-start"><div><p className="text-blue-800 font-semibold">Nigam Care Partner</p><h1 className="text-2xl font-bold text-slate-900">My onboarding</h1><p className="text-slate-600">{data?.provider.name} · {data?.provider.humanId}</p></div><button onClick={() => logout()} className="text-sm underline">Sign out</button></header>{error && <p role="alert" className="text-red-700">{error}</p>}{!data && !error && <p>Loading your journey…</p>}{data && <><section className="bg-white p-5 rounded-2xl border"><h2 className="font-bold text-lg">{ready ? 'Ready for jobs' : app ? label(app.state) : 'Existing provider account'}</h2>{data.provider.legacyExemption?.recordedAt && <p className="text-sm text-blue-800 mt-2">Your existing active account is covered by the recorded legacy onboarding exemption.</p>}<p className="text-slate-600 mt-2">{ready ? 'You can receive jobs in your approved service categories. Choose Go Online when you are ready.' : app?.state === 'APPROVED' ? 'Your interview and final approval are complete. Purchase a qualifying onboarding kit and verify the code inside the delivered parcel to unlock jobs.' : 'Your area manager will contact you for an interview. Job access starts after final approval and verified receipt of a paid onboarding kit.'}</p>{app?.interviewAt && <p className="mt-2">Interview: {new Date(app.interviewAt).toLocaleString()}</p>}{app?.decisionReason && <p className="mt-2 font-medium">Latest update: {app.decisionReason}</p>}<div className="flex flex-wrap gap-3 mt-4">{data.canBuyKits && <Link className={buttonClass} to="/service-provider/kits">Shop kits &amp; track orders</Link>}{ready && <button disabled={busy} onClick={online} className={buttonClass}>Go Online</button>}<button className="underline text-sm" onClick={refresh}>Refresh status</button></div></section><section className="bg-white rounded-2xl border p-5"><h2 className="font-bold mb-3">Your service categories</h2>{app ? <ul className="space-y-2">{app.requestedCategories.map(c => { const approved = app.approvedCategories.some(a => (a.id || a._id) === (c.id || c._id)); return <li key={c.id || c._id} className="flex justify-between gap-3"><span>{c.name}</span><span className={approved ? 'text-green-800' : 'text-slate-500'}>{approved ? (app.state === 'APPROVED' ? 'Approved' : 'Interview approved') : app.state === 'ASM_REVIEW' || app.state === 'INTERVIEW_SCHEDULED' ? 'Requested' : 'Not approved'}</span></li>; })}</ul> : <p className="text-slate-600">Your previously approved categories remain on your profile.</p>}<p className="text-xs text-slate-500 mt-3">Purchasing a kit does not add service categories.</p></section>{app && ['CHANGES_REQUESTED', 'ASM_REJECTED', 'SUPER_ADMIN_REJECTED'].includes(app.state) && <Resubmission key={app.revision} application={app} refresh={refresh} />}{app && <section className="bg-white rounded-2xl border p-5"><h2 className="font-bold mb-3">Submitted documents</h2><DocumentButtons base="/service-provider/onboarding/documents" /></section>}<section className="bg-white rounded-2xl border p-5"><h2 className="font-bold mb-3">Journey timeline</h2><Timeline events={app?.events} /></section></>}</div></main>;
}
