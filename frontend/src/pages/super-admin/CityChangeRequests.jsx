import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock, MapPin, Phone, RefreshCw, XCircle } from "lucide-react";
import Sidebar from "../../components/super-admin/Sidebar";
import Topbar from "../../components/super-admin/Topbar";
import Pagination from "../../components/common/Pagination";
import { apiRequest } from "../../lib/apiClient";
import { useAuth } from "../../context/AuthContext";

const TABS = ["Pending", "Approved", "Rejected", "Cancelled"];

const STATUS_TONE = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const cityLabel = (snapshot) =>
  snapshot?.name ? [snapshot.name, snapshot.state].filter(Boolean).join(", ") : "No city";

/**
 * Review queue for service providers asking to serve a different city.
 * Super-admins see every request; an ASM sees the ones moving a provider into
 * or out of their zone (scoped server-side) and can decide them only with the
 * techs:manage permission.
 */
const CityChangeRequests = () => {
  const { user } = useAuth();
  const isAsm = user?.role === "asm";
  const canManage = !isAsm || Boolean(user?.permissions?.includes("techs:manage"));

  const [status, setStatus] = useState("Pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // { request, action: 'approve' | 'reject' }
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/super-admin/city-change-requests?status=${status}&page=${page}&limit=20`, {
        auth: true,
        envelope: true,
      });
      setItems(res?.data || []);
      setMeta(res?.meta || { total: 0, totalPages: 1 });
      setError("");
    } catch (err) {
      setError(err.message || "Could not load city change requests.");
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (request, action) => {
    setReviewing({ request, action });
    setNote("");
    setReviewError("");
  };

  const submitReview = async () => {
    if (!reviewing) return;
    const { request, action } = reviewing;
    if (action === "reject" && !note.trim()) {
      setReviewError("Tell the service provider why — they will see this reason.");
      return;
    }
    setSubmitting(true);
    setReviewError("");
    try {
      await apiRequest(`/super-admin/city-change-requests/${request.id}/${action}`, {
        method: "POST",
        auth: true,
        body: note.trim() ? { note: note.trim() } : {},
      });
      setReviewing(null);
      setToast(
        action === "approve"
          ? `${request.serviceProvider?.name || "Service provider"} now serves ${request.toCity?.name}.`
          : `Request from ${request.serviceProvider?.name || "service provider"} rejected.`,
      );
      setTimeout(() => setToast(""), 4000);
      load();
    } catch (err) {
      setReviewError(err.message || "Could not save your decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <Topbar title="City Change Requests" />

        <div className="p-6 space-y-5 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#1E293B]">Service city change requests</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {isAsm
                  ? "Requests from service providers moving into or out of your zone."
                  : "Service providers asking to serve a different city. Approving moves them straight away."}
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {toast && (
            <div role="status" className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm font-semibold">
              <CheckCircle2 size={16} /> {toast}
            </div>
          )}

          <div className="flex gap-2" role="tablist" aria-label="Request status">
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={status === tab}
                onClick={() => {
                  setStatus(tab);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  status === tab ? "bg-[#0D47A1] text-white" : "bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50"
                }`}>
                {tab}
                {tab === status && !loading ? ` (${meta.total || 0})` : ""}
              </button>
            ))}
          </div>

          {error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-semibold">{error}</div>
          ) : loading ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl px-6 py-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-[#0D47A1] flex items-center justify-center">
                <MapPin size={22} />
              </div>
              <p className="text-sm font-bold text-slate-800 mt-3">No {status.toLowerCase()} requests</p>
              <p className="text-xs text-slate-500 mt-1">
                {status === "Pending" ? "When a service provider asks to change city, it shows up here." : "Nothing here yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((request) => (
                <div key={request.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-wrap items-start gap-5 justify-between">
                  <div className="min-w-55 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#1E293B]">{request.serviceProvider?.name || "Service provider"}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${STATUS_TONE[request.status]}`}>
                        {request.status}
                      </span>
                      {request.source === "admin" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0D47A1]">Changed by admin</span>
                      )}
                    </div>
                    {request.serviceProvider?.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone size={12} /> {request.serviceProvider.phone}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">{cityLabel(request.fromCity)}</span>
                      <ArrowRight size={16} className="text-slate-400" aria-label="to" />
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0D47A1] font-semibold">{cityLabel(request.toCity)}</span>
                    </div>
                    {request.reason && (
                      <p className="text-sm text-slate-600">
                        <span className="text-slate-400">Reason: </span>
                        {request.reason}
                      </p>
                    )}
                    {request.reviewNote && request.status !== "Pending" && (
                      <p className="text-sm text-slate-600">
                        <span className="text-slate-400">Note: </span>
                        {request.reviewNote}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock size={12} /> Requested {formatDateTime(request.createdAt)}
                      {request.reviewedAt && request.status !== "Pending" && ` · Decided ${formatDateTime(request.reviewedAt)}`}
                      {request.reviewedBy?.name && ` by ${request.reviewedBy.name}`}
                    </p>
                  </div>

                  {request.status === "Pending" && canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openReview(request, "reject")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50">
                        <XCircle size={15} /> Reject
                      </button>
                      <button
                        onClick={() => openReview(request, "approve")}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D47A1] text-white text-sm font-semibold hover:bg-blue-800">
                        <CheckCircle2 size={15} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {meta.total > 20 && (
                <Pagination currentPage={page} totalItems={meta.total} itemsPerPage={20} onPageChange={setPage} />
              )}
            </div>
          )}
        </div>
      </div>

      {reviewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => !submitting && setReviewing(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div>
              <h3 id="review-title" className="text-base font-bold text-[#1E293B]">
                {reviewing.action === "approve" ? "Approve city change?" : "Reject city change?"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {reviewing.request.serviceProvider?.name || "This service provider"}:{" "}
                <strong>{cityLabel(reviewing.request.fromCity)}</strong> → <strong>{cityLabel(reviewing.request.toCity)}</strong>
              </p>
              {reviewing.action === "approve" && (
                <p className="text-xs text-slate-500 mt-2">
                  They will immediately start getting jobs from {reviewing.request.toCity?.name} instead. Jobs they already accepted are not affected.
                </p>
              )}
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-slate-600">
                {reviewing.action === "approve" ? "Note for the service provider (optional)" : "Reason (shown to the service provider)"}
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1]"
              />
            </label>
            {reviewError && <p role="alert" className="text-sm text-rose-600">{reviewError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewing(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${
                  reviewing.action === "approve" ? "bg-[#0D47A1] hover:bg-blue-800" : "bg-rose-600 hover:bg-rose-700"
                }`}>
                {submitting ? "Saving…" : reviewing.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityChangeRequests;
