"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  MapPin,
  IdCard,
  UserRound,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PendingClient {
  _id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  nationalId: string;
  occupation?: string;
  dateOfBirth?: string;
  createdAt: string;
  ghanaCardFront?: string | null;
  ghanaCardBack?: string | null;
  signature?: string | null;
}

function ImageTile({ label, src, light }: { label: string; src: string; light?: boolean }) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block">
      <div
        className="rounded-xl overflow-hidden border h-28 flex items-center justify-center"
        style={{ borderColor: "rgba(200,150,62,0.25)", background: light ? "#fff" : "rgba(11,29,58,0.6)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </div>
      <p className="text-[10px] mt-1 text-center font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label}
      </p>
    </a>
  );
}

function Detail({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#C8963E" }} />
      <span className="truncate">{value}</span>
    </div>
  );
}

export function ClientApprovalsView() {
  const [clients, setClients] = useState<PendingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<PendingClient | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients?verificationStatus=pending&limit=100", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setClients(data.clients ?? []);
      else toast.error(data.error ?? "Failed to load pending registrations");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/clients/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Verification failed");
        return;
      }
      toast.success("Member approved & activated");
      setClients((prev) => prev.filter((c) => c._id !== id));
    } catch {
      toast.error("Network error");
    } finally {
      setVerifyingId(null);
    }
  }

  async function confirmDecline() {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      const res = await fetch(`/api/clients/${declineTarget._id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          decision: "decline",
          reason: declineReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to decline");
        return;
      }
      toast.success("Registration declined — the member has been notified");
      setClients((prev) => prev.filter((c) => c._id !== declineTarget._id));
      setDeclineTarget(null);
      setDeclineReason("");
    } catch {
      toast.error("Network error");
    } finally {
      setDeclining(false);
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0B1D3A" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{ background: "rgba(200,150,62,0.12)", border: "1px solid rgba(200,150,62,0.25)", color: "#E4B86A" }}
          >
            <ShieldCheck className="w-3 h-3" /> Pending Registrations
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            Client <span style={{ color: "#E4B86A" }}>Approvals</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Review self-registered members and their documents, then verify to activate their portal.
          </p>
        </div>
        <button
          onClick={load}
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(200,150,62,0.08)", border: "1px solid rgba(200,150,62,0.18)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(200,150,62,0.7)" }} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm flex items-center justify-center gap-3" style={{ color: "rgba(255,255,255,0.35)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#C8963E" }} /> Loading…
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}>
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(74,222,128,0.5)" }} />
          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
            No pending registrations — everyone is verified.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {clients.map((c) => (
            <div key={c._id} className="rounded-2xl border p-5 space-y-4" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.16)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)", color: "#0B1D3A" }}
                  >
                    {c.firstName[0]}
                    {c.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-[11px] font-bold" style={{ color: "#E4B86A" }}>{c.clientId}</p>
                  </div>
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0"
                  style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}
                >
                  Pending
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Detail icon={Mail} value={c.email} />
                <Detail icon={Phone} value={c.phone} />
                <Detail icon={IdCard} value={c.nationalId} />
                <Detail icon={MapPin} value={c.address} />
                {c.occupation && <Detail icon={UserRound} value={c.occupation} />}
                <Detail icon={UserRound} value={`Registered ${format(new Date(c.createdAt), "MMM d, yyyy")}`} />
              </div>

              {(c.ghanaCardFront || c.ghanaCardBack || c.signature) && (
                <div className="grid grid-cols-3 gap-2">
                  {c.ghanaCardFront && <ImageTile label="Card Front" src={c.ghanaCardFront} />}
                  {c.ghanaCardBack && <ImageTile label="Card Back" src={c.ghanaCardBack} />}
                  {c.signature && <ImageTile label="Signature" src={c.signature} light />}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => approve(c._id)}
                  disabled={verifyingId === c._id || declining}
                  className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)" }}
                >
                  {verifyingId === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => {
                    setDeclineTarget(c);
                    setDeclineReason("");
                  }}
                  disabled={verifyingId === c._id || declining}
                  className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.32)" }}
                >
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decline modal */}
      {declineTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(7,17,34,0.82)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeclineTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "#0e1f3d", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid rgba(239,68,68,0.15)" }}
            >
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-red-400" />
                <h2 className="font-serif font-black text-white text-lg">
                  Decline Registration
                </h2>
              </div>
              <button
                onClick={() => setDeclineTarget(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                Decline the registration for{" "}
                <span className="font-bold text-white">
                  {declineTarget.firstName} {declineTarget.lastName}
                </span>
                . They will be notified by email with the reason below.
              </p>
              <div>
                <label
                  className="block text-[10px] font-black uppercase tracking-widest mb-2"
                  style={{ color: "rgba(228,184,106,0.55)" }}
                >
                  Reason (optional)
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Ghana card image is not clear / details do not match"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none"
                  style={{ background: "rgba(11,29,58,0.7)", border: "1px solid rgba(239,68,68,0.25)" }}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setDeclineTarget(null)}
                  disabled={declining}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDecline}
                  disabled={declining}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
