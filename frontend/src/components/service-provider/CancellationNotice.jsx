import { AlertTriangle } from 'lucide-react';

export default function CancellationNotice({ booking, onDismiss }) {
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[125]">
      <div role="alertdialog" aria-modal="true" aria-labelledby="job-cancelled-title" aria-describedby="job-cancelled-description" className="bg-white border border-rose-100 rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-linear-to-r from-rose-600 to-red-700 p-5 text-white flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <h3 id="job-cancelled-title" className="font-bold">Customer Cancelled Booking</h3>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p id="job-cancelled-description" className="text-sm text-slate-700">
            Booking <strong>{booking.humanId || booking.bookingId || 'Order'}</strong> has been cancelled by the customer.
            {booking.reason && <span className="block mt-2">Reason: {booking.reason}</span>}
          </p>
          <p className="text-sm text-slate-500">This booking has been removed from your active schedule.</p>
          <button autoFocus type="button" onClick={onDismiss} className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl cursor-pointer">Understood</button>
        </div>
      </div>
    </div>
  );
}
