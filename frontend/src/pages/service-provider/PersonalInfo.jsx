import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ArrowRight,
  Bell,
  Clock,
  MapPin,
  Save,
  X,
  Camera,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Building2,
} from 'lucide-react';
import ServiceProviderBottomNav from '../../components/ServiceProviderBottomNav';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { apiRequest } from '../../lib/apiClient';
import serviceProviderAvatar from '../../assets/service_provider_avatar.png';

const cityLabel = (snapshot) =>
  snapshot?.name ? [snapshot.name, snapshot.state].filter(Boolean).join(', ') : 'Not set';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * The city a service provider serves decides which jobs they're offered and
 * which ASM oversees them, so it isn't edited directly — the
 * provider asks, and an admin or the ASM approves.
 */
async function fetchServiceCity() {
  const [profile, history] = await Promise.all([
    apiRequest('/service-provider/profile/profile', { auth: true }),
    apiRequest('/service-provider/profile/city-change-requests', { auth: true }),
  ]);
  return { profile, history };
}

function ServiceCityCard() {
  const [current, setCurrent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [cityId, setCityId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [recentDecisionId, setRecentDecisionId] = useState(null);

  const applyData = useCallback(({ profile, history }) => {
    const list = Array.isArray(history) ? history : [];
    setCurrent({
      id: profile?.city?.id || profile?.city?._id || (typeof profile?.city === 'string' ? profile.city : null),
      name: profile?.city?.name || profile?.serviceCityName || '',
      state: profile?.city?.state || profile?.serviceStateName || '',
    });
    setRequests(list);
    const decided = list.find((r) => r.status !== 'Pending');
    const fresh =
      decided &&
      Date.now() - new Date(decided.reviewedAt || decided.updatedAt).getTime() <
        14 * 24 * 60 * 60 * 1000;
    setRecentDecisionId(fresh ? decided.id : null);
    setLoadError('');
  }, []);

  const load = useCallback(
    () =>
      fetchServiceCity()
        .then(applyData)
        .catch((err) => setLoadError(err.message || 'Could not load your service city.')),
    [applyData],
  );

  useEffect(() => {
    let cancelled = false;
    fetchServiceCity()
      .then((data) => !cancelled && applyData(data))
      .catch((err) => !cancelled && setLoadError(err.message || 'Could not load your service city.'));
    return () => {
      cancelled = true;
    };
  }, [applyData]);

  const openForm = async () => {
    setShowForm(true);
    setFormError('');
    setCityId('');
    setReason('');
    if (!cities.length) {
      try {
        const res = await apiRequest('/super-admin/cities/public');
        setCities(Array.isArray(res) ? res : []);
      } catch (err) {
        setFormError(err.message || 'Could not load cities.');
      }
    }
  };

  const submit = async () => {
    if (!cityId) {
      setFormError('Choose the city you want to serve.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await apiRequest('/service-provider/profile/city-change-requests', {
        method: 'POST',
        auth: true,
        body: { cityId, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = requests.find((r) => r.status === 'Pending');
  const latestDecided = requests.find((r) => r.status !== 'Pending');
  const showDecided =
    latestDecided &&
    !pending &&
    ['Rejected', 'Approved'].includes(latestDecided.status) &&
    latestDecided.id === recentDecisionId;

  const cancelPending = async () => {
    if (!pending) return;
    setCancelling(true);
    try {
      await apiRequest(`/service-provider/profile/city-change-requests/${pending.id}/cancel`, {
        method: 'POST',
        auth: true,
      });
      await load();
    } catch (err) {
      setLoadError(err.message || 'Could not cancel the request.');
    } finally {
      setCancelling(false);
    }
  };

  const options = cities.filter((c) => c.id !== current?.id);

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl p-3.5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] flex flex-col gap-3.5 sm:gap-4">
      <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 min-[360px]:w-11 min-[360px]:h-11 rounded-2xl bg-blue-50 text-[#0D47A1] border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service Territory</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Assigned Area
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 truncate">
              {current ? cityLabel(current) : 'Loading territory…'}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Dispatch orders and auto-assignment are scoped to this city.
            </p>
          </div>
        </div>

        {current && !pending && (
          <button
            type="button"
            onClick={openForm}
            className="w-full min-[380px]:w-auto shrink-0 text-xs font-bold text-[#0D47A1] px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-all cursor-pointer shadow-2xs active:scale-95 text-center justify-center"
          >
            Request change
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {pending && (
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" /> Change Request Under Review
            </p>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              Pending Admin Approval
            </span>
          </div>
          <p className="text-sm text-slate-800 flex flex-wrap items-center gap-2 font-medium">
            <span className="text-slate-600">{cityLabel(pending.fromCity)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-amber-600 stroke-[2.5]" aria-label="to" />
            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
              {cityLabel(pending.toCity)}
            </span>
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Submitted on {formatDate(pending.createdAt)}. You continue receiving service jobs in your active city until the request is finalized.
          </p>
          <button
            type="button"
            onClick={cancelPending}
            disabled={cancelling}
            className="self-start text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50 cursor-pointer pt-1"
          >
            {cancelling ? 'Cancelling request…' : 'Withdraw request'}
          </button>
        </div>
      )}

      {showDecided && (
        <div
          className={`rounded-2xl border p-4 text-xs font-medium ${
            latestDecided.status === 'Approved'
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/90 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {latestDecided.status === 'Approved' ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <p className="font-bold text-sm">
              {latestDecided.source === 'admin'
                ? `Admin transferred your city to ${latestDecided.toCity?.name}.`
                : latestDecided.status === 'Approved'
                ? `Your transfer to ${latestDecided.toCity?.name} was approved!`
                : `Your transfer request to ${latestDecided.toCity?.name} was not approved.`}
            </p>
          </div>
          {(latestDecided.reviewNote || (latestDecided.source === 'admin' && latestDecided.reason)) && (
            <p className="text-xs mt-1.5 pl-6 opacity-90">
              Note: {latestDecided.reviewNote || latestDecided.reason}
            </p>
          )}
        </div>
      )}

      {/* Change Request Modal Dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => !submitting && setShowForm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="city-request-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-4 shadow-2xl border border-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="city-request-title" className="text-lg font-black text-slate-900">
                  Request Territory Transfer
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Area managers review city transfers. You currently operate in{' '}
                  <strong className="text-slate-700">{cityLabel(current)}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Target City</label>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">{cities.length ? 'Select a city' : 'Loading available cities…'}</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.name, c.state].filter(Boolean).join(', ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reason for Relocation (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="e.g. Relocated residence or workshop to new area..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 resize-none h-24"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                {formError}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={submitting}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !cityId}
                className="flex-1 h-12 bg-[#0D47A1] hover:bg-blue-800 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-blue-900/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <span>Send Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PersonalInfo = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { unreadCount: unreadNotificationsCount } = useNotifications();

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    apiRequest('/service-provider/profile/profile', { auth: true })
      .then((res) => {
        setForm({
          name: res?.name || user?.name || '',
          email: res?.email || user?.email || '',
          phone: res?.phone || user?.phone || '',
          address: res?.address || '',
          avatarUrl: res?.avatarUrl || user?.avatarUrl || '',
        });
      })
      .catch((err) => setError(err.message || 'Could not load your profile.'));
  }, [user]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3200);
  };

  /**
   * Uploads image to backend via /uploads -> Cloudinary storage,
   * updates serviceProvider and User avatarUrl, and reflects immediately in auth context.
   */
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo file size must be under 10MB.');
      return;
    }

    setUploadingAvatar(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest('/uploads', {
        method: 'POST',
        auth: true,
        body: formData,
      });

      if (!res?.url) throw new Error('Upload succeeded but no image URL was returned.');

      // Update local form state with Cloudinary URL
      setForm((prev) => ({ ...prev, avatarUrl: res.url }));

      // Persist immediately to ServiceProvider profile & linked User document
      await apiRequest('/service-provider/profile/profile', {
        method: 'PUT',
        auth: true,
        body: { avatarUrl: res.url },
      });

      // Update AuthContext user state so Dashboard and Profile headers update live
      updateUser({ avatarUrl: res.url });

      triggerToast('Profile photo updated and saved to Cloudinary!');
    } catch (err) {
      setError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    setError('');
    try {
      setForm((prev) => ({ ...prev, avatarUrl: '' }));
      await apiRequest('/service-provider/profile/profile', {
        method: 'PUT',
        auth: true,
        body: { avatarUrl: '' },
      });
      updateUser({ avatarUrl: '' });
      triggerToast('Profile photo reset.');
    } catch (err) {
      setError(err.message || 'Could not reset photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await apiRequest('/service-provider/profile/profile', {
        method: 'PUT',
        auth: true,
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          ...(form.avatarUrl ? { avatarUrl: form.avatarUrl } : {}),
        },
      });

      updateUser({
        name: updated.name || form.name,
        email: updated.email || form.email,
        phone: updated.phone || form.phone,
        ...(form.avatarUrl ? { avatarUrl: form.avatarUrl } : {}),
      });

      triggerToast('Profile changes saved successfully!');
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatarSrc = form.avatarUrl || user?.avatarUrl || serviceProviderAvatar;

  return (
    <div className="min-h-screen bg-[#F6F8FD] flex flex-col pb-28 lg:pb-14 font-sans relative text-left selection:bg-blue-100 selection:text-blue-900">
      {/* ── Ambient Background Lighting (Matching Profile.jsx) ── */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-[#06214D] via-[#0A2D69] to-[#F6F8FD] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-12 -right-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-36 left-1/3 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── Toast Notification ── */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-xl z-60 flex items-center gap-2.5 border border-white/15 animate-in fade-in slide-in-from-top-3 duration-250">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── Mobile Top Sticky App Bar ── */}
      <div className="sticky top-0 z-40 px-3 sm:px-4 pt-3 sm:pt-4 pb-3 lg:hidden bg-[#06214D] border-b border-white/10 transition-all shadow-md">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-2xs"
            title="Go Back"
            aria-label="Go Back"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <div className="text-center flex-1 px-2 sm:px-3">
            <h1 className="text-sm font-black text-white tracking-wide">Edit Profile</h1>
            <p className="text-[10px] text-blue-200/90 font-medium">Personal Information & Avatar</p>
          </div>

          <button
            onClick={() => navigate('/service-provider/notifications')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all relative cursor-pointer shadow-2xs"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-[#06214D]" />
            )}
          </button>
        </div>
      </div>

      {/* ── Desktop Top Navigation Bar (lg+) ── */}
      <div className="hidden lg:block max-w-screen-xl mx-auto w-full px-6 xl:px-8 pt-6 pb-4 relative z-20">
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/80 shadow-[0_4px_24px_rgba(10,37,84,0.06)]">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[#06214D] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              title="Back"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Edit Profile & Credentials</h1>
                <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-blue-700">
                  <ShieldCheck size={13} className="text-blue-600" /> Account Identity
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage your public profile photo, contact details, and registered service location
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/service-provider/notifications')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 transition-colors relative cursor-pointer shadow-2xs"
            >
              <Bell size={16} className="text-[#0D47A1]" />
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="flex-1 px-2.5 sm:px-4 lg:px-6 xl:px-8 pt-2.5 sm:pt-3 lg:pt-0 max-w-4xl mx-auto w-full relative z-10 flex flex-col gap-3.5 sm:gap-5">
        
        {/* 1. HERO AVATAR UPLOAD CARD */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Interactive Profile Photo */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden ring-4 ring-blue-100/90 border-2 border-[#0D47A1]/20 shadow-md relative bg-slate-100 flex items-center justify-center">
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 gap-1.5 animate-in fade-in duration-150">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
                  <span className="text-[10px] font-extrabold tracking-wider uppercase">Saving…</span>
                </div>
              )}
              <img
                src={currentAvatarSrc}
                alt={form.name || 'Service Partner'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-10"
              >
                <Camera className="h-6 w-6 mb-1 text-white" />
                <span className="text-[10px] font-bold">Change Photo</span>
              </button>
            </div>

            {/* Camera action badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-2xl bg-[#0D47A1] hover:bg-blue-800 active:scale-95 text-white ring-4 ring-white shadow-md flex items-center justify-center cursor-pointer transition-all z-20"
              title="Upload new profile picture"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Details & Upload Controls */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Profile Picture</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Cloudinary Powered
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Visible to customers upon dispatch and booking assignment.
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-4 py-2 rounded-xl bg-[#0D47A1] hover:bg-blue-800 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm shadow-blue-900/10 disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload New Photo</span>
                  </>
                )}
              </button>

              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset to Default
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 font-medium">
              Supported formats: JPG, PNG, or WebP up to 10MB. Automatically optimized for web & mobile.
            </p>
          </div>
        </div>

        {/* 2. PERSONAL DETAILS FORM CARD */}
        <form
          onSubmit={handleSave}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-6 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)] flex flex-col gap-4 sm:gap-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Personal Details</h2>
              <p className="text-xs text-slate-500 font-medium">Update contact info and communications address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#0D47A1]" /> Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 transition-all"
                required
              />
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#0D47A1]" /> Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. provider@example.com"
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#0D47A1]" /> Mobile Phone Number
              </label>
              <div className="flex items-center rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden focus-within:border-[#0D47A1] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                <span className="px-3 min-[360px]:px-4 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100/70 py-3.5 shrink-0">
                  +91
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="flex-1 min-w-0 h-12 px-3 min-[360px]:px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#0D47A1]" /> Base Address / Workshop
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Shop number, street name, area landmark..."
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0D47A1] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-[#0D47A1] to-[#0A387E] hover:from-[#0A387E] hover:to-[#08295E] active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5 stroke-[2.5]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 3. SERVICE TERRITORY / CITY CARD */}
        <ServiceCityCard />

      </div>

      {/* ── Bottom Navigation ── */}
      <ServiceProviderBottomNav activeTab="profile" />
    </div>
  );
};

export default PersonalInfo;
