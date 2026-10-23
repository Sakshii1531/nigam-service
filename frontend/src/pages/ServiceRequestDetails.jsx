import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { apiRequest } from '../lib/apiClient';
import { SkeletonScreen } from '../components/common/Skeleton';

// Notification links contain service request IDs, which are different from
// booking IDs. Resolve through the authorized API before opening the booking.
// Keep this route for notifications already stored or delivered by push/email.
export default function ServiceRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/service-requests/${encodeURIComponent(id)}`, { auth: true, silentError: true })
      .then(request => {
        if (!active) return;
        if (!request) throw new Error('This service request is no longer available.');
        const booking = request.booking;
        const bookingId = typeof booking === 'string' ? booking : booking?.id || booking?._id;
        if (bookingId) {
          navigate(`/bookings/${encodeURIComponent(bookingId)}`, { replace: true });
        } else {
          setResult({ id, request });
        }
      })
      .catch(error => {
        if (active) setResult({ id, error: error.message || 'Could not load this service request.' });
      });
    return () => { active = false; };
  }, [id, navigate]);

  if (result?.id !== id) {
    return <SkeletonScreen variant="detail" label="service request" className="min-h-screen bg-[#F8FAFC]" />;
  }

  const request = result.request;
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-5">
      <Link to="/notifications" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0D47A1] mb-5">
        <ArrowLeft size={18} /> Back to notifications
      </Link>
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <ClipboardList className="text-[#0D47A1]" size={24} />
          <h1 className="text-lg font-bold text-[#052355]">{request ? 'Service Request Details' : 'Service request unavailable'}</h1>
        </div>
        {result.error ? <p role="alert" className="text-sm text-slate-600">{result.error}</p> : (
          <>
            <dl className="grid sm:grid-cols-2 gap-5 text-sm">
              <div><dt className="text-slate-500">Request ID</dt><dd className="font-semibold mt-1">{request.humanId || request.id || id}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-semibold mt-1">{request.status || '—'}</dd></div>
              <div><dt className="text-slate-500">Appliance</dt><dd className="font-semibold mt-1">{request.category || 'Appliance service'}</dd></div>
              <div><dt className="text-slate-500">Service provider</dt><dd className="font-semibold mt-1">{request.serviceProvider?.name || 'Unassigned'}</dd></div>
            </dl>
            {request.description && <p className="text-sm text-slate-600 mt-6">{request.description}</p>}
            <p className="text-xs text-slate-500 mt-6">This service request has no linked booking.</p>
          </>
        )}
      </section>
    </div>
  );
}
