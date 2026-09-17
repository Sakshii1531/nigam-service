import { useState } from "react";
import {
  Calendar,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";

const TIME_SLOTS = [
  { id: "morning", label: "Morning", time: "08:00 AM – 11:00 AM" },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM – 03:00 PM" },
  { id: "evening", label: "Evening", time: "04:00 PM – 07:00 PM" },
];

const RESCHEDULE_REASONS = [
  "Not available at home",
  "Personal emergency",
  "Want service at a more convenient time",
  "Appliance parts / site not ready",
  "Other reason",
];

function getUpcomingDates(count = 7) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName =
      i === 0
        ? "Today"
        : i === 1
          ? "Tomorrow"
          : d.toLocaleDateString("en-IN", { weekday: "short" });
    const formatted = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    dates.push({
      dateObj: d,
      isoDate: d.toISOString().split("T")[0],
      dayName,
      formatted,
    });
  }
  return dates;
}

const RescheduleBookingModal = ({
  isOpen,
  onClose,
  onConfirm,
  booking,
  isLoading,
}) => {
  const upcomingDates = getUpcomingDates(7);
  const [selectedDate, setSelectedDate] = useState(
    upcomingDates[1]?.isoDate || upcomingDates[0]?.isoDate,
  );
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [selectedReason, setSelectedReason] = useState(RESCHEDULE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  if (!isOpen || !booking) return null;

  const bookingCode = booking.humanId || booking.id || "Booking";
  const serviceName =
    booking.service?.name || booking.service || "Home Service";

  const handleConfirm = () => {
    const finalReason =
      selectedReason === "Other reason" && customReason.trim()
        ? `Other: ${customReason.trim()}`
        : selectedReason;

    const chosenDateObj = upcomingDates.find((d) => d.isoDate === selectedDate);
    const dateLabel = chosenDateObj
      ? `${chosenDateObj.dayName} (${chosenDateObj.formatted})`
      : selectedDate;

    onConfirm({
      scheduledDate: selectedDate,
      timeSlot: {
        date: dateLabel,
        time: `${selectedSlot.label} (${selectedSlot.time})`,
      },
      reason: finalReason,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-fade-in font-sans">
      <div
        className="bg-white rounded-[28px] max-w-lg w-full flex flex-col shadow-2xl border border-slate-100 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Reschedule Booking
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4.5 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Pick Date */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              Select New Date
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.isoDate;
                return (
                  <button
                    key={item.isoDate}
                    type="button"
                    onClick={() => setSelectedDate(item.isoDate)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? "border-brand-blue bg-blue-50/80 text-brand-blue font-bold shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {item.dayName}
                    </span>
                    <span className="text-xs font-black mt-0.5 block">
                      {item.formatted}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Pick Time Slot */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              Select Preferred Time Slot
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedSlot.id === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-brand-blue bg-blue-50/80 text-brand-blue font-bold shadow-xs"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">{slot.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-brand-blue" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-1">
                      {slot.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Reason */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
              Reason for Rescheduling
            </label>
            <div className="flex flex-col gap-1.5">
              {RESCHEDULE_REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedReason(r)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? "border-brand-blue bg-blue-50/60 text-brand-blue"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}>
                    <span>{r}</span>
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border shrink-0 ${
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
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Tell us why you are rescheduling..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-blue"
                />
              </div>
            )}
          </div>

          {/* Policy Assurance Notice */}
          <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">Zero Rescheduling Fee</p>
              <p className="font-bold">Zero Fee Reschedule</p>
              <p className="text-[11px] text-blue-800/80 mt-0.5">
                Rescheduling is completely free. Your assigned service partner
                will be notified of your new appointment slot immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors cursor-pointer">
            Keep Current Slot
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 bg-brand-blue hover:bg-[#083679] disabled:opacity-60 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-brand-blue/20 cursor-pointer flex items-center justify-center gap-2">
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{isLoading ? "Rescheduling…" : "Confirm Reschedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleBookingModal;
