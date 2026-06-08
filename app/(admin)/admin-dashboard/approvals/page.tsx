"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Clock,
  User,
  FileText,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ApprovalAction = "client_edit" | "client_delete" | "report_export";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalRequest {
  _id: string;
  action: ApprovalAction;
  status: ApprovalStatus;
  requestedBy: { _id: string; name: string; email: string; role: string };
  reviewedBy?: { _id: string; name: string; email: string };
  targetId?: string;
  targetLabel?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

const ACTION_META: Record<
  ApprovalAction,
  { label: string; icon: React.ElementType; color: string }
> = {
  client_edit: { label: "Edit Client", icon: Pencil, color: "#E4B86A" },
  client_delete: { label: "Delete Client", icon: Trash2, color: "#f87171" },
  report_export: { label: "Export Report", icon: FileText, color: "#a78bfa" },
};

const STATUS_META: Record<
  ApprovalStatus,
  { label: string; bg: string; border: string; text: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    bg: "rgba(200,150,62,0.12)",
    border: "rgba(200,150,62,0.3)",
    text: "#E4B86A",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    text: "#4ade80",
    icon: ShieldCheck,
  },
  rejected: {
    label: "Rejected",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    text: "#f87171",
    icon: ShieldX,
  },
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>(
    "pending",
  );
  const [reviewing, setReviewing] = useState<{
    request: ApprovalRequest;
    decision: "approve" | "reject";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (statusFilter !== "all") p.set("status", statusFilter);
      const res = await fetch(`/api/approval-requests?${p}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setRequests(data.requests ?? []);
    } catch {
      toast.error("Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const openReview = (request: ApprovalRequest, decision: "approve" | "reject") => {
    setReviewing({ request, decision });
    setReviewNote("");
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setReviewLoading(true);
    try {
      const res = await fetch(
        `/api/approval-requests/${reviewing.request._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            decision: reviewing.decision,
            reviewNote: reviewNote.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to review request");
        return;
      }
      toast.success(
        reviewing.decision === "approve" ? "Request approved" : "Request rejected",
      );
      setReviewing(null);
      fetchRequests();
    } catch {
      toast.error("Network error");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
          Staff <span style={{ color: "#E4B86A" }}>Approvals</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>
          Review and approve staff requests to edit/delete clients or export
          reports
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: ShieldCheck, label: "Total", val: stats.total, color: "#E4B86A" },
          { icon: Clock, label: "Pending", val: stats.pending, color: "#E4B86A" },
          { icon: CheckCircle2, label: "Approved", val: stats.approved, color: "#4ade80" },
          { icon: XCircle, label: "Rejected", val: stats.rejected, color: "#f87171" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl border p-4"
            style={{ background: "#122549", borderColor: "rgba(200,150,62,0.15)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                {s.label}
              </p>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="font-serif font-black text-2xl text-white">{s.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Filter */}
      <div className="relative w-fit">
        <Filter
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: "rgba(200,150,62,0.5)" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | ApprovalStatus)}
          className="appearance-none rounded-xl pl-9 pr-8 py-2.5 text-sm text-white outline-none cursor-pointer"
          style={{
            background: "#122549",
            border: "1px solid rgba(200,150,62,0.18)",
            minWidth: "180px",
          }}
        >
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
          style={{ color: "rgba(200,150,62,0.5)" }}
        />
      </div>

      {/* List */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.15)" }}
      >
        {loading ? (
          <div
            className="flex items-center justify-center py-16 gap-3"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#C8963E" }} />
            <span className="text-sm">Loading requests…</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className="w-10 h-10" style={{ color: "rgba(200,150,62,0.25)" }} />
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
              No requests found
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(200,150,62,0.08)" }}>
            {requests.map((r, i) => {
              const am = ACTION_META[r.action];
              const sm = STATUS_META[r.status];
              return (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${am.color}1c`, border: `1px solid ${am.color}40` }}
                    >
                      <am.icon className="w-4 h-4" style={{ color: am.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {am.label}
                        {r.targetLabel ? ` — ${r.targetLabel}` : ""}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                        <User className="w-3 h-3 inline mr-1 -mt-0.5" />
                        {r.requestedBy?.name} ({r.requestedBy?.role}) ·{" "}
                        {new Date(r.createdAt).toLocaleString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {r.reason && (
                        <p className="text-xs mt-1 italic truncate" style={{ color: "rgba(228,184,106,0.6)" }}>
                          “{r.reason}”
                        </p>
                      )}
                      {r.reviewNote && (
                        <p className="text-xs mt-1 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Admin note: {r.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 w-fit shrink-0"
                    style={{ background: sm.bg, border: `1px solid ${sm.border}`, color: sm.text }}
                  >
                    <sm.icon className="w-3 h-3" />
                    {sm.label}
                  </span>

                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openReview(r, "approve")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => openReview(r, "reject")}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all hover:-translate-y-0.5"
                        style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {reviewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(11,29,58,0.80)", backdropFilter: "blur(8px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setReviewing(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="w-full rounded-2xl overflow-hidden"
              style={{ maxWidth: 460, background: "#0e1f3d", border: "1px solid rgba(200,150,62,0.2)" }}
            >
              <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(200,150,62,0.12)" }}>
                <h2 className="font-serif font-black text-white text-lg">
                  {reviewing.decision === "approve" ? "Approve" : "Reject"} Request
                </h2>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {ACTION_META[reviewing.request.action].label}
                  {reviewing.request.targetLabel ? ` — ${reviewing.request.targetLabel}` : ""}
                  {" "}requested by {reviewing.request.requestedBy?.name}
                </p>
                {reviewing.request.reason && (
                  <p className="text-xs mt-2 italic" style={{ color: "rgba(228,184,106,0.6)" }}>
                    “{reviewing.request.reason}”
                  </p>
                )}
              </div>
              <div className="px-6 py-6 space-y-4">
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Optional note for the staff member…"
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                  style={{ background: "rgba(11,29,58,0.70)", border: "1px solid rgba(200,150,62,0.20)" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setReviewing(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.10)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={reviewLoading}
                    className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={
                      reviewing.decision === "approve"
                        ? { background: "linear-gradient(135deg,#22c55e,#4ade80)", color: "#0B1D3A" }
                        : { background: "rgba(239,68,68,0.85)", color: "white" }
                    }
                  >
                    {reviewLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : reviewing.decision === "approve" ? (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Approve
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" /> Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
