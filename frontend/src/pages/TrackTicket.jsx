import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, Star, CalendarClock, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { WarrantyHeader, StageTimeline, StatusPill, ErrorNote } from '../components/partner-warranty/ui';
import { formatDateTime } from '../lib/partnerWarrantyFormat';
import { SkeletonDetail } from '../components/common/Skeleton';
import { useApiData } from '../hooks/useApiData';
import { useWarrantyClaimLive } from '../hooks/useWarrantyClaimLive';
import { warrantyApi } from '../lib/partnerWarrantyApi';
import { resolveMediaUrl } from '../lib/apiClient';

// Track Ticket (docs/partner-warranty Phase 12, client #13): the stage list
// from GET /claims/:id/track, refreshed live. Only what the customer needs —
// the technician appears once they accept, the OTP only while it is needed.

const EXPLAIN = {
  Submitted: 'Your claim has been sent to the brand.',
  'Brand Review': 'The brand is verifying your claim.',
  'Info Requested': 'The brand needs more information from you.',
  Approved: 'The brand approved your warranty claim.',
  'Job Created': 'We are assigning a service technician near you.',
  'Partner Assigned': 'A technician has been assigned to your service.',
  'Visit Scheduled': 'Your technician visit is scheduled.',
  'Technician On Way': 'Your technician is on the way.',
  'Service In Progress': 'The technician is working on your product.',
  'Service Completed': 'The service is done. Please confirm below.',
  Closed: 'This claim is closed. Thank you!',
  Rejected: 'The brand did not approve this claim.',
  'On Hold': 'This claim is on hold. We will update you soon.',
  Cancelled: 'This claim was cancelled.',
};

const TrackTicket = () => {
  const { id } = useParams();
  const track = useApiData(() => warrantyApi.track(id), [id]);
  useWarrantyClaimLive(() => track.reload(), track.data?.id || null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const t = track.data;

  const confirm = async () => {
    setActionError('');
    setConfirming(true);
    try {
      await warrantyApi.confirm(id);
      await track.reload();
    } catch (err) {
      setActionError(err.message || 'Could not confirm right now.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/50 flex flex-col pb-8">
      <WarrantyHeader title="Track Ticket" back="/partner-warranty/claims" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
        <ErrorNote message={track.error ? track.error.message || 'Could not load this claim.' : ''} onRetry={track.reload} />
        {track.loading ? (
          <SkeletonDetail />
        ) : t ? (
          <>
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
              <div className="bg-blue-50 px-5 py-4 flex flex-col items-start gap-1.5 border-b border-slate-200/60">
                <StatusPill status={t.status} label={t.statusLabel} />
                <p className="text-xs text-slate-600">{EXPLAIN[t.status] || ''}</p>
                {t.rejectionReason && <p className="text-xs font-semibold text-red-700">Reason: {t.rejectionReason}</p>}
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400 font-semibold tracking-wide">Raised on</span>
                  <span className="text-xs text-slate-500">{formatDateTime(t.stages[0]?.at)}</span>
                </div>
                <Link to={`/partner-warranty/claims/${t.id}`} className="flex flex-col gap-0.5 items-end">
                  <span className="text-xs text-slate-400 font-semibold tracking-wide">Ticket ID</span>
                  <span className="text-sm font-black text-brand-navy tracking-wide underline underline-offset-2">{t.humanId}</span>
                </Link>
              </div>
            </div>

            {t.actionNeeded && (
              <Link to={`/partner-warranty/claims/${t.id}`} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-sm font-bold text-amber-800">The brand needs more information — tap to respond</span>
              </Link>
            )}

            {t.partner && (
              <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center gap-4">
                {t.partner.photo ? (
                  <img src={resolveMediaUrl(t.partner.photo)} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="h-12 w-12 rounded-full bg-brand-navy text-white font-black flex items-center justify-center" aria-hidden="true">
                    {t.partner.name.charAt(0)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-400 font-semibold">Your technician</p>
                  <p className="text-sm font-black text-brand-navy truncate">{t.partner.name}</p>
                  {t.partner.rating ? (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" /> {t.partner.rating}
                    </p>
                  ) : null}
                </div>
                {t.partner.phone && (
                  <a href={`tel:${t.partner.phone}`} aria-label={`Call ${t.partner.name}`} className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}

            {t.visit && (
              <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-brand-blue" aria-hidden="true" />
                <span className="text-sm">
                  <span className="block text-xs text-slate-400 font-semibold">Visit</span>
                  <span className="font-bold text-brand-navy">
                    {new Date(`${t.visit.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {t.visit.slot ? ` · ${t.visit.slot}` : ''}
                  </span>
                </span>
              </div>
            )}

            {t.completionOtp && (
              <div className="bg-white border-2 border-dashed border-brand-blue/40 rounded-2xl px-5 py-4 flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-brand-blue" aria-hidden="true" />
                <span className="flex-1 text-xs text-slate-600">Share this code with the technician only after the work is done.</span>
                <span className="text-xl font-black tracking-[0.3em] text-brand-navy" aria-label={`Completion code ${t.completionOtp.split('').join(' ')}`}>
                  {t.completionOtp}
                </span>
              </div>
            )}

            <StageTimeline stages={t.stages} />

            {t.status === 'Closed' && (
              <Link
                to="/partner-warranty/rate-service"
                state={{ ticketId: t.humanId, serviceRequestId: t.serviceRequestId }}
                className="text-center py-3.5 bg-white border border-brand-navy text-brand-navy font-bold rounded-2xl">
                Rate your service
              </Link>
            )}

            {t.serviceJobId && <p className="text-[11px] text-slate-400 text-center">Service Job {t.serviceJobId}</p>}

            <div aria-live="polite">
              <ErrorNote message={actionError} />
            </div>
            {t.canConfirm && (
              <button
                type="button"
                onClick={confirm}
                disabled={confirming}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Service done — close my claim
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TrackTicket;
