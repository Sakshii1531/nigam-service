import { useState } from "react";
import { AlertTriangle, X, Check, ShieldCheck } from "lucide-react";

const CANCELLATION_REASONS = [
  { id: "changed_mind", label: "Changed my mind / Service no longer needed" },
  { id: "waiting_time", label: "Waiting time too long / Delay in service" },
  {
    id: "booked_mistake",
    label: "Booked by mistake / Wrong appliance or date",
  },
  { id: "alternative_found", label: "Found another provider / Solved myself" },
  { id: "price_issue", label: "Price was higher than expected" },
  { id: "other", label: "Other reason" },
];

const CancelBookingModal = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading,
}) => {
  const [selectedReason, setSelectedReason] = useState(
    CANCELLATION_REASONS[0].label,
  );
  const [customReason, setCustomReason] = useState("");

  if (!isOpen || !booking) return null;

  const bookingCode = booking.humanId || booking.id || "Booking";
  const serviceName =
    booking.service?.name || booking.service || "Home Service";
  const advancePaid = Boolean(
    booking.advancePaid ||
    (booking.advanceAmount && Number(booking.advanceAmount) > 0),
  );

  const handleConfirm = () => {
    const finalReason =
      selectedReason === "Other reason" && customReason.trim()
        ? `Other: ${customReason.trim()}`
        : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-fade-in">
      <div
        className="bg-white rounded-[28px] max-w-md w-full flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Cancel Booking
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {serviceName} •{" "}
                <span className="font-bold text-slate-700">{bookingCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              Reason for Cancellation
            </label>
            <div className="flex flex-col gap-2">
              {CANCELLATION_REASONS.map((r) => {
                const isSelected = selectedReason === r.label;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReason(r.label)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? "border-brand-blue bg-blue-50/70 text-brand-blue shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <span>{r.label}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ml-2 ${
                        isSelected
                          ? "bg-brand-blue border-brand-blue text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedReason === "Other reason" && (
              <div className="mt-2.5">
                <textarea
                  rows={2}
                  placeholder="Please specify why you are cancelling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue"
                />
              </div>
            )}
          </div>

          {/* Refund / Policy Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">Cancellation Policy</p>
              <p className="text-[11px] text-amber-800/90 mt-0.5">
                {advancePaid
                  ? `Your advance payment will be refunded to your original payment method within 5-7 business days.`
                  : "Free cancellation before the service partner arrives at your location."}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer">
            Keep Booking
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-2">
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{isLoading ? "Cancelling…" : "Yes, Cancel Booking"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
