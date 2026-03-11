"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

/* ─── Types ── */
type LoanPurpose =
  | "business"
  | "education"
  | "medical"
  | "housing"
  | "personal"
  | "agriculture"
  | "other";

interface EligibilityResult {
  score: number;
  creditHistory: string;
  eligible: boolean;
  maxRecommendedAmount: number;
  interestRate: number;
  breakdown: {
    savingsScore: number;
    activityScore: number;
    repaymentScore: number;
    membershipScore: number;
    accountScore: number;
  };
  flags: string[];
}

interface RepaymentPreview {
  monthlyRepayment: number;
  totalInterest: number;
  totalPayable: number;
}

const PURPOSE_OPTIONS: { value: LoanPurpose; label: string; emoji: string }[] =
  [
    { value: "business", label: "Business", emoji: "💼" },
    { value: "education", label: "Education", emoji: "🎓" },
    { value: "medical", label: "Medical", emoji: "🏥" },
    { value: "housing", label: "Housing", emoji: "🏠" },
    { value: "personal", label: "Personal", emoji: "👤" },
    { value: "agriculture", label: "Agriculture", emoji: "🌾" },
    { value: "other", label: "Other", emoji: "📦" },
  ];

/* ─── Helpers ── */
function fmt(n: number) {
  return `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const inputCls =
  "w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200";
const inputStyle: React.CSSProperties = {
  background: "rgba(11,29,58,0.70)",
  border: "1px solid rgba(200,150,62,0.20)",
};
const inputFocus = (e: React.FocusEvent<any>) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.55)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,150,62,0.10)";
};
const inputBlur = (e: React.FocusEvent<any>) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.20)";
  e.currentTarget.style.boxShadow = "none";
};

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-black uppercase tracking-widest mb-2"
        style={{ color: "rgba(228,184,106,0.55)" }}
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function PreviewRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex justify-between items-center py-2"
      style={{ borderBottom: "1px solid rgba(200,150,62,0.07)" }}
    >
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </span>
      <span
        className={`text-sm font-bold ${highlight ? "" : "text-white"}`}
        style={highlight ? { color: "#E4B86A" } : {}}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Main ── */
export default function LoanApplyPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(
    null,
  );
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [loanAmount, setLoanAmount] = useState("");
  const [duration, setDuration] = useState("12");
  const [purpose, setPurpose] = useState<LoanPurpose>("personal");
  const [purposeDescription, setPurposeDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<RepaymentPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    loanId: string;
  } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!eligibility || !loanAmount || !duration) {
      setPreview(null);
      return;
    }
    const p = parseFloat(loanAmount),
      m = parseInt(duration),
      r = eligibility.interestRate;
    if (isNaN(p) || isNaN(m) || p <= 0) {
      setPreview(null);
      return;
    }
    const totalInterest = p * (r / 100) * (m / 12);
    const totalPayable = p + totalInterest;
    setPreview({
      monthlyRepayment: Math.round((totalPayable / m) * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPayable: Math.round(totalPayable * 100) / 100,
    });
  }, [loanAmount, duration, eligibility]);

  async function fetchProfile() {
    try {
      setEligibilityLoading(true);
      const profileRes = await fetch("/api/member/profile", {
        credentials: "include",
      });
      const profileJson = await profileRes.json();
      if (!profileRes.ok) return;
      const mid = profileJson.member._id;
      setMemberId(mid);
      const res = await fetch(
        `/api/loans/eligibility?memberId=${mid}&amount=1000`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (res.ok) setEligibility(json.eligibility);
    } catch {
    } finally {
      setEligibilityLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const amount = parseFloat(loanAmount);
    const months = parseInt(duration);
    if (isNaN(amount) || amount < 100) {
      setSubmitError("Minimum loan amount is GH₵ 100.");
      return;
    }
    if (isNaN(months) || months < 1 || months > 60) {
      setSubmitError("Duration must be between 1 and 60 months.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId,
          loanAmount: amount,
          loanDurationMonths: months,
          purpose,
          purposeDescription: purposeDescription || undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || "Failed to submit.");
        return;
      }
      setSuccess({ message: json.message, loanId: json.loan?.loanId });
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success Screen ── */
  if (success)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0B1D3A" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl overflow-hidden text-center"
          style={{
            background: "#0e1f3d",
            border: "1px solid rgba(200,150,62,0.22)",
            boxShadow: "0 28px 70px rgba(7,17,34,0.85)",
          }}
        >
          <div
            className="h-0.75"
            style={{
              background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
            }}
          />
          <div className="px-8 py-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.28)",
              }}
            >
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="font-serif font-black text-white text-2xl mb-2">
              Application Submitted!
            </h2>
            <p
              className="text-sm mb-2"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              {success.message}
            </p>
            <p
              className="text-xs font-mono px-3 py-1.5 rounded-lg inline-block mb-4"
              style={{
                background: "rgba(200,150,62,0.08)",
                color: "#E4B86A",
                border: "1px solid rgba(200,150,62,0.2)",
              }}
            >
              Ref: {success.loanId}
            </p>
            <p
              className="text-xs mb-8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Your application is awaiting review. You will be notified once it
              is processed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/member-dashboard/loans")}
                className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                  color: "#0B1D3A",
                }}
              >
                Track Loans <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSuccess(null);
                  setLoanAmount("");
                  setDuration("12");
                  setPurpose("personal");
                  setPurposeDescription("");
                  setNotes("");
                  setPreview(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                Apply Again
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{
              background: "rgba(200,150,62,0.12)",
              border: "1px solid rgba(200,150,62,0.25)",
              color: "#E4B86A",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
            Loan Services
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
            Apply for a <span style={{ color: "#E4B86A" }}>Loan</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Fill in the details below to submit your loan application
          </p>
        </div>
        <button
          onClick={() => router.push("/member-dashboard/loans")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <ArrowLeft className="w-4 h-4" /> My Loans
        </button>
      </div>

      {/* ── Eligibility Banner ── */}
      {eligibilityLoading ? (
        <div
          className="h-16 rounded-xl animate-pulse"
          style={{
            background: "rgba(200,150,62,0.06)",
            border: "1px solid rgba(200,150,62,0.12)",
          }}
        />
      ) : eligibility ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-xl"
          style={{
            background: eligibility.eligible
              ? "rgba(34,197,94,0.08)"
              : "rgba(239,68,68,0.08)",
            border: `1px solid ${eligibility.eligible ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"}`,
          }}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0`}
            style={{
              background: eligibility.eligible
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.15)",
            }}
          >
            {eligibility.eligible ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`font-bold text-sm ${eligibility.eligible ? "text-emerald-400" : "text-red-400"}`}
            >
              {eligibility.eligible
                ? "You are eligible to apply for a loan"
                : "You are not currently eligible"}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Credit score:{" "}
              <strong className="text-white">{eligibility.score}/100</strong> ·{" "}
              {eligibility.creditHistory.replace("_", " ")} · Interest rate:{" "}
              <strong className="text-white">
                {eligibility.interestRate}% p.a.
              </strong>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className="text-[10px]"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Max Recommended
            </p>
            <p className="text-sm font-black" style={{ color: "#E4B86A" }}>
              {fmt(eligibility.maxRecommendedAmount)}
            </p>
          </div>
        </motion.div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          {/* Loan Details */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Loan Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Loan Amount (GH₵)" required>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    min="100"
                    step="50"
                    className={inputCls + " pl-9"}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
                {eligibility && (
                  <p
                    className="text-[10px] mt-1.5"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Recommended max:{" "}
                    <span style={{ color: "#E4B86A" }}>
                      {fmt(eligibility.maxRecommendedAmount)}
                    </span>
                  </p>
                )}
              </Field>
              <Field label="Duration (months)" required>
                <div className="relative">
                  <Calendar
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={
                      inputCls + " pl-9 pr-8 appearance-none cursor-pointer"
                    }
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  >
                    {[3, 6, 9, 12, 18, 24, 36, 48, 60].map((m) => (
                      <option key={m} value={m} className="bg-[#1a1a24]">
                        {m} months
                        {m >= 12 ? ` (${m / 12} yr${m > 12 ? "s" : ""})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </div>

          {/* Purpose */}
          <div
            className="rounded-2xl border p-5 space-y-4"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Loan Purpose
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PURPOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPurpose(opt.value)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all duration-200"
                  style={
                    purpose === opt.value
                      ? {
                          background: "rgba(200,150,62,0.15)",
                          border: "1.5px solid rgba(200,150,62,0.5)",
                          color: "#E4B86A",
                          boxShadow: "0 0 16px rgba(200,150,62,0.15)",
                        }
                      : {
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.38)",
                        }
                  }
                >
                  <span className="text-xl">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <Field label="Description (optional)">
              <textarea
                value={purposeDescription}
                onChange={(e) => setPurposeDescription(e.target.value)}
                placeholder="Describe how you plan to use the loan…"
                rows={3}
                maxLength={500}
                className={inputCls + " resize-none"}
                style={inputStyle}
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
            </Field>
          </div>

          {/* Notes */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Additional Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information for the loan officer…"
              rows={2}
              maxLength={500}
              className={inputCls + " resize-none"}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {submitError && (
            <div
              className="flex items-start gap-2.5 p-4 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.22)",
              }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/member-dashboard/loans")}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !loanAmount ||
                !purpose ||
                (eligibility !== null && !eligibility.eligible)
              }
              className=" flex-1 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              style={{
                background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                color: "#0B1D3A",
                boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
              }}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Submit Application
                </>
              )}
            </button>
          </div>

          {eligibility && !eligibility.eligible && (
            <p
              className="text-xs text-center"
              style={{ color: "rgba(248,113,113,0.7)" }}
            >
              Your eligibility score is too low. Please contact staff for
              assistance.
            </p>
          )}
        </form>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Repayment Preview */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-4"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Repayment Preview
            </p>
            {preview && eligibility ? (
              <>
                <div
                  className="text-center mb-4 pb-4"
                  style={{ borderBottom: "1px solid rgba(200,150,62,0.1)" }}
                >
                  <p
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Monthly Repayment
                  </p>
                  <p
                    className="font-serif font-black text-3xl mt-1"
                    style={{ color: "#E4B86A" }}
                  >
                    {fmt(preview.monthlyRepayment)}
                  </p>
                </div>
                <PreviewRow
                  label="Interest Rate"
                  value={`${eligibility.interestRate}% p.a.`}
                />
                <PreviewRow
                  label="Principal"
                  value={fmt(parseFloat(loanAmount))}
                />
                <PreviewRow
                  label="Total Interest"
                  value={fmt(preview.totalInterest)}
                />
                <PreviewRow
                  label="Total Payable"
                  value={fmt(preview.totalPayable)}
                  highlight
                />
              </>
            ) : (
              <div className="py-8 text-center">
                <TrendingUp
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "rgba(200,150,62,0.22)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  Enter amount and duration to see preview
                </p>
              </div>
            )}
          </div>

          {/* Eligibility Breakdown */}
          {eligibility && (
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "#122549",
                borderColor: "rgba(200,150,62,0.14)",
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-4"
                style={{ color: "rgba(228,184,106,0.5)" }}
              >
                Eligibility Breakdown
              </p>
              <div className="flex items-center justify-center mb-5">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    border: `3px solid ${eligibility.score >= 70 ? "#4ade80" : eligibility.score >= 50 ? "#E4B86A" : "#f87171"}`,
                  }}
                >
                  <div className="text-center">
                    <p
                      className="font-serif font-black text-2xl"
                      style={{
                        color:
                          eligibility.score >= 70
                            ? "#4ade80"
                            : eligibility.score >= 50
                              ? "#E4B86A"
                              : "#f87171",
                      }}
                    >
                      {eligibility.score}
                    </p>
                    <p
                      className="text-[9px]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      / 100
                    </p>
                  </div>
                </div>
              </div>
              {[
                {
                  label: "Savings",
                  val: eligibility.breakdown.savingsScore,
                  max: 30,
                },
                {
                  label: "Activity",
                  val: eligibility.breakdown.activityScore,
                  max: 20,
                },
                {
                  label: "Repayment",
                  val: eligibility.breakdown.repaymentScore,
                  max: 30,
                },
                {
                  label: "Membership",
                  val: eligibility.breakdown.membershipScore,
                  max: 10,
                },
                {
                  label: "Accounts",
                  val: eligibility.breakdown.accountScore,
                  max: 10,
                },
              ].map((bar) => {
                const pct = Math.round((bar.val / bar.max) * 100);
                const color =
                  pct > 60 ? "#4ade80" : pct > 30 ? "#E4B86A" : "#f87171";
                return (
                  <div key={bar.label} className="mb-2.5">
                    <div
                      className="flex justify-between text-[10px] mb-1"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      <span>{bar.label}</span>
                      <span>
                        {bar.val}/{bar.max}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: color,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {eligibility.flags.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {eligibility.flags.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-[10px]"
                      style={{ color: "rgba(251,191,36,0.75)" }}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
