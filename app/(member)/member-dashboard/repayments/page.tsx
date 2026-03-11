"use client";

/**
 * PLACE AT: src/app/member/repayments/page.tsx
 *
 * Members can:
 *   - See all their active/overdue loans with outstanding balances
 *   - Make a repayment on any active or overdue loan
 *   - View their full repayment history across all loans
 *   - Filter history by loan, date range, payment method
 *
 * POST /api/loans/repayments is admin/staff only, so we call a member-specific
 * wrapper: POST /api/member/repayments  (see member-repayments-api.ts)
 * which resolves the member via resolveMemberForUser(), verifies ownership,
 * then records the repayment on their behalf.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  DollarSign,
  Calendar,
  Hash,
  FileText,
  Wallet,
  ArrowDownCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

/* ─── Types ── */
interface ActiveLoan {
  _id: string;
  loanId: string;
  loanAmount: number;
  outstandingBalance: number;
  penaltyAmount: number;
  monthlyRepayment: number;
  totalPayable: number;
  amountPaid: number;
  interestRate: number;
  loanDurationMonths: number;
  status: "active" | "overdue";
  nextPaymentDate?: string;
  purpose: string;
}

interface Repayment {
  _id: string;
  repaymentId?: string;
  loanId: { _id: string; loanId: string; loanAmount: number; status: string };
  amount: number;
  principalPortion: number;
  interestPortion: number;
  penaltyPortion: number;
  outstandingBalanceBefore: number;
  outstandingBalanceAfter: number;
  paymentDate: string;
  method: string;
  reference?: string;
  notes?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type PayMethod =
  | "cash"
  | "savings_deduction"
  | "bank_transfer"
  | "mobile_money";

/* ─── Helpers ── */
function fmt(n: number) {
  return `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const METHOD_META: Record<
  PayMethod,
  { label: string; icon: React.ElementType; color: string }
> = {
  cash: { label: "Cash", icon: Banknote, color: "#4ade80" },
  savings_deduction: {
    label: "Savings Deduction",
    icon: Wallet,
    color: "#E4B86A",
  },
  bank_transfer: { label: "Bank Transfer", icon: Building2, color: "#60a5fa" },
  mobile_money: { label: "Mobile Money", icon: Smartphone, color: "#a78bfa" },
};

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

function PgBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all disabled:opacity-25"
      style={
        active
          ? {
              background: "linear-gradient(135deg,#C8963E,#E4B86A)",
              color: "#0B1D3A",
            }
          : {
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.45)",
            }
      }
    >
      {children}
    </button>
  );
}

/* ─── Repayment Modal ── */
function RepayModal({
  loan,
  onClose,
  onSuccess,
}: {
  loan: ActiveLoan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(loan.monthlyRepayment.toFixed(2));
  const [method, setMethod] = useState<PayMethod>("cash");
  const [reference, setReference] = useState("");
  const [payDate, setPayDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    message: string;
    breakdown: any;
    newBalance: number;
  } | null>(null);

  const totalOwed =
    Math.round((loan.outstandingBalance + loan.penaltyAmount) * 100) / 100;
  const parsedAmt = parseFloat(amount) || 0;
  const isOverpay = parsedAmt > totalOwed + 0.01;
  const isZero = parsedAmt <= 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isZero || isOverpay) return;
    setLoading(true);
    try {
      const res = await fetch("/api/member/repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          loanId: loan._id,
          amount: parsedAmt,
          method,
          reference: reference || undefined,
          paymentDate: payDate,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      setSuccess({
        message: data.message,
        breakdown: data.breakdown,
        newBalance: data.loan.outstandingBalance,
      });
      toast.success(data.message);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,17,34,0.82)", backdropFilter: "blur(10px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md overflow-hidden rounded-2xl"
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

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(200,150,62,0.1)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg,#C8963E,#E4B86A)" }}
            />
            <div>
              <h2 className="font-serif font-black text-white text-lg leading-tight">
                Make Repayment
              </h2>
              <p className="text-xs font-mono" style={{ color: "#E4B86A" }}>
                {loan.loanId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {success ? (
            /* ── Success State ── */
            <div className="text-center space-y-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.28)",
                }}
              >
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="font-serif font-black text-white text-lg">
                  {success.message}
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  {success.newBalance <= 0
                    ? "🎉 Loan fully repaid!"
                    : `New outstanding: ${fmt(success.newBalance)}`}
                </p>
              </div>
              {/* Breakdown */}
              <div
                className="rounded-xl p-4 text-left space-y-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: "rgba(228,184,106,0.5)" }}
                >
                  Payment Breakdown
                </p>
                {[
                  {
                    label: "Total Paid",
                    val: fmt(parsedAmt),
                    color: "#4ade80",
                  },
                  ...(success.breakdown.penaltyCleared > 0
                    ? [
                        {
                          label: "Penalty Cleared",
                          val: fmt(success.breakdown.penaltyCleared),
                          color: "#f87171",
                        },
                      ]
                    : []),
                  {
                    label: "Principal",
                    val: fmt(success.breakdown.principalPortion),
                    color: "rgba(255,255,255,0.7)",
                  },
                  {
                    label: "Interest",
                    val: fmt(success.breakdown.interestPortion),
                    color: "rgba(255,255,255,0.7)",
                  },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      {label}
                    </span>
                    <span className="font-bold" style={{ color }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSuccess(null);
                    onSuccess();
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ── Form State ── */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Loan Summary Strip */}
              <div
                className="rounded-xl p-3.5"
                style={{
                  background:
                    loan.status === "overdue"
                      ? "rgba(239,68,68,0.07)"
                      : "rgba(34,197,94,0.07)",
                  border: `1px solid ${loan.status === "overdue" ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white capitalize">
                      {loan.purpose} Loan
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {loan.loanDurationMonths} months · {loan.interestRate}%
                      p.a.
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${loan.status === "overdue" ? "text-red-400" : "text-emerald-400"}`}
                    style={
                      loan.status === "overdue"
                        ? {
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.28)",
                          }
                        : {
                            background: "rgba(34,197,94,0.12)",
                            border: "1px solid rgba(34,197,94,0.28)",
                          }
                    }
                  >
                    {loan.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    {
                      label: "Outstanding",
                      val: fmt(loan.outstandingBalance),
                      color: loan.status === "overdue" ? "#f87171" : "#E4B86A",
                    },
                    {
                      label: "Penalty",
                      val: fmt(loan.penaltyAmount),
                      color:
                        loan.penaltyAmount > 0
                          ? "#f87171"
                          : "rgba(255,255,255,0.35)",
                    },
                    {
                      label: "Monthly Due",
                      val: fmt(loan.monthlyRepayment),
                      color: "#60a5fa",
                    },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                      <p
                        className="text-[9px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-xs font-black mt-0.5"
                        style={{ color }}
                      >
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
                {loan.penaltyAmount > 0 && (
                  <div
                    className="flex items-center gap-1.5 mt-2.5 text-[10px]"
                    style={{ color: "rgba(251,191,36,0.8)" }}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Penalty of {fmt(loan.penaltyAmount)} will be cleared first
                  </div>
                )}
              </div>

              {/* Amount */}
              <Field label="Amount to Pay (GH₵)" required>
                <div className="relative">
                  <DollarSign
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputCls + " pl-9"}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
                {/* Quick-fill buttons */}
                <div className="flex gap-2 mt-2">
                  {[
                    { label: "Monthly", val: loan.monthlyRepayment },
                    { label: "Full Balance", val: totalOwed },
                    {
                      label: "Half",
                      val: Math.round((totalOwed / 2) * 100) / 100,
                    },
                  ].map(({ label, val }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setAmount(val.toFixed(2))}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{
                        background: "rgba(200,150,62,0.08)",
                        border: "1px solid rgba(200,150,62,0.2)",
                        color: "#E4B86A",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(200,150,62,0.15)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(200,150,62,0.08)")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {isOverpay && (
                  <p className="text-xs mt-1.5 flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Exceeds total owed of {fmt(totalOwed)}
                  </p>
                )}
              </Field>

              {/* Payment Method */}
              <Field label="Payment Method" required>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    Object.entries(METHOD_META) as [
                      PayMethod,
                      (typeof METHOD_META)[PayMethod],
                    ][]
                  ).map(([key, meta]) => {
                    const active = method === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMethod(key)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition-all duration-200"
                        style={
                          active
                            ? {
                                background: `${meta.color}18`,
                                border: `1.5px solid ${meta.color}60`,
                                color: meta.color,
                                boxShadow: `0 0 12px ${meta.color}15`,
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(255,255,255,0.38)",
                              }
                        }
                      >
                        <meta.icon className="w-3.5 h-3.5 shrink-0" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Payment Date" required>
                  <div className="relative">
                    <Calendar
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.5)" }}
                    />
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className={inputCls + " pl-9"}
                      style={{ ...inputStyle, colorScheme: "dark" }}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                      required
                    />
                  </div>
                </Field>
                <Field label="Reference (optional)">
                  <div className="relative">
                    <Hash
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.5)" }}
                    />
                    <input
                      type="text"
                      placeholder="Transaction ref…"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className={inputCls + " pl-9"}
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  placeholder="Any additional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>

              {/* Payment summary strip */}
              {parsedAmt > 0 && !isOverpay && (
                <div
                  className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                  style={{
                    background: "rgba(34,197,94,0.07)",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  <div>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Outstanding Now
                    </p>
                    <p className="text-base font-black text-white">
                      {fmt(loan.outstandingBalance)}
                    </p>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    −{fmt(parsedAmt)}
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      After Payment
                    </p>
                    <p
                      className="text-base font-black"
                      style={{ color: "#E4B86A" }}
                    >
                      {fmt(Math.max(0, totalOwed - parsedAmt))}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
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
                  disabled={loading || isZero || isOverpay}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                    boxShadow: "0 6px 20px rgba(200,150,62,0.35)",
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowDownCircle className="w-4 h-4" /> Confirm Repayment
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ── */
export default function MemberRepaymentsPage() {
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<"all" | PayMethod>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [repayModal, setRepayModal] = useState<ActiveLoan | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchActiveLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const res = await fetch("/api/loans?status=active&limit=50", {
        credentials: "include",
      });
      const data = await res.json();
      // Also fetch overdue
      const res2 = await fetch("/api/loans?status=overdue&limit=50", {
        credentials: "include",
      });
      const data2 = await res2.json();
      const combined = [...(data.loans ?? []), ...(data2.loans ?? [])];
      setActiveLoans(combined);
    } catch {
      toast.error("Failed to load loans");
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(
    async (page = 1, method = methodFilter, from = fromDate, to = toDate) => {
      setHistoryLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page), limit: "20" });
        if (method !== "all") p.set("method", method);
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const res = await fetch(`/api/member/repayments?${p}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          setRepayments(data.repayments ?? []);
          setPagination(data.pagination);
        }
      } catch {
        toast.error("Failed to load repayment history");
      } finally {
        setHistoryLoading(false);
        setSpinning(false);
      }
    },
    [methodFilter, fromDate, toDate],
  );

  useEffect(() => {
    fetchActiveLoans();
    fetchHistory(1, "all", "", "");
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchHistory(1, methodFilter, fromDate, toDate),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [methodFilter, fromDate, toDate, fetchHistory]);

  /* Stats */
  const totalRepaid = repayments.reduce((s, r) => s + r.amount, 0);
  const totalPenalty = repayments.reduce(
    (s, r) => s + (r.penaltyPortion ?? 0),
    0,
  );
  const totalOutstanding = activeLoans.reduce(
    (s, l) => s + l.outstandingBalance,
    0,
  );

  const displayed = search.trim()
    ? repayments.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.loanId?.loanId ?? "").toLowerCase().includes(q) ||
          (r.reference ?? "").toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q)
        );
      })
    : repayments;

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Page Header ── */}
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
            Loan <span style={{ color: "#E4B86A" }}>Repayments</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Pay off your loans and track your repayment history
          </p>
        </div>
        <button
          onClick={() => {
            setSpinning(true);
            fetchActiveLoans();
            fetchHistory(pagination.page, methodFilter, fromDate, toDate);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all"
          style={{
            background: "rgba(200,150,62,0.08)",
            border: "1px solid rgba(200,150,62,0.18)",
            color: "#E4B86A",
          }}
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />{" "}
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Active Loans",
            val: activeLoans.length,
            icon: FileText,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Total Outstanding",
            val: fmt(totalOutstanding),
            icon: TrendingUp,
            gradient: "linear-gradient(135deg,#7f1d1d,#f87171)",
          },
          {
            label: "Total Repaid (page)",
            val: fmt(totalRepaid),
            icon: TrendingDown,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "Penalties Paid",
            val: fmt(totalPenalty),
            icon: AlertTriangle,
            gradient: "linear-gradient(135deg,#3b2500,#f59e0b)",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border p-4"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {s.label}
              </p>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: s.gradient }}
              >
                <s.icon className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <p className="font-serif font-black text-white text-xl">{s.val}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Active Loans — Pay Now section ── */}
      <div>
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ color: "rgba(228,184,106,0.5)" }}
        >
          Active Loans — Make a Payment
        </p>
        {loansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl animate-pulse"
                style={{
                  background: "rgba(200,150,62,0.05)",
                  border: "1px solid rgba(200,150,62,0.1)",
                }}
              />
            ))}
          </div>
        ) : activeLoans.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <CheckCircle2
              className="w-10 h-10 mx-auto mb-3"
              style={{ color: "rgba(34,197,94,0.4)" }}
            />
            <p className="text-white font-bold">No active loans</p>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              You have no loans requiring repayment right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeLoans.map((loan, i) => {
              const pct =
                loan.totalPayable > 0
                  ? Math.min(
                      100,
                      Math.round((loan.amountPaid / loan.totalPayable) * 100),
                    )
                  : 0;
              const isOverdue = loan.status === "overdue";
              const totalOwed =
                Math.round(
                  (loan.outstandingBalance + loan.penaltyAmount) * 100,
                ) / 100;
              return (
                <motion.div
                  key={loan._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-xl border p-4 flex flex-col gap-3"
                  style={{
                    background: "#122549",
                    borderColor: isOverdue
                      ? "rgba(239,68,68,0.3)"
                      : "rgba(200,150,62,0.14)",
                    borderTopColor: isOverdue ? "#f87171" : "#E4B86A",
                    borderTopWidth: 2,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "#E4B86A" }}
                      >
                        {loan.loanId}
                      </p>
                      <p className="text-sm font-bold text-white capitalize mt-0.5">
                        {loan.purpose}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${isOverdue ? "text-red-400" : "text-emerald-400"}`}
                      style={
                        isOverdue
                          ? {
                              background: "rgba(239,68,68,0.12)",
                              border: "1px solid rgba(239,68,68,0.28)",
                            }
                          : {
                              background: "rgba(34,197,94,0.12)",
                              border: "1px solid rgba(34,197,94,0.28)",
                            }
                      }
                    >
                      {loan.status}
                    </span>
                  </div>

                  {/* Progress */}
                  <div>
                    <div
                      className="flex justify-between text-[10px] mb-1"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      <span>Repaid {pct}%</span>
                      <span>
                        {fmt(loan.amountPaid)} / {fmt(loan.totalPayable)}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct >= 100
                              ? "#4ade80"
                              : "linear-gradient(90deg,#C8963E,#E4B86A)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-lg p-2.5 text-center"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <p
                        className="text-[9px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        Outstanding
                      </p>
                      <p
                        className="text-sm font-black mt-0.5"
                        style={{ color: isOverdue ? "#f87171" : "#E4B86A" }}
                      >
                        {fmt(loan.outstandingBalance)}
                      </p>
                    </div>
                    <div
                      className="rounded-lg p-2.5 text-center"
                      style={{
                        background:
                          loan.penaltyAmount > 0
                            ? "rgba(239,68,68,0.07)"
                            : "rgba(255,255,255,0.03)",
                        border: `1px solid ${loan.penaltyAmount > 0 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <p
                        className="text-[9px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {loan.penaltyAmount > 0 ? "Penalty" : "Monthly Due"}
                      </p>
                      <p
                        className={`text-sm font-black mt-0.5 ${loan.penaltyAmount > 0 ? "text-red-400" : ""}`}
                        style={
                          loan.penaltyAmount <= 0 ? { color: "#60a5fa" } : {}
                        }
                      >
                        {fmt(
                          loan.penaltyAmount > 0
                            ? loan.penaltyAmount
                            : loan.monthlyRepayment,
                        )}
                      </p>
                    </div>
                  </div>

                  {loan.nextPaymentDate && (
                    <div
                      className="flex items-center gap-1.5 text-[10px]"
                      style={{
                        color: isOverdue
                          ? "rgba(248,113,113,0.7)"
                          : "rgba(255,255,255,0.3)",
                      }}
                    >
                      <Calendar className="w-3 h-3 shrink-0" />
                      {isOverdue ? "⚠ Overdue since" : "Next payment:"}{" "}
                      <span
                        className={
                          isOverdue ? "text-red-400 font-bold" : "text-white"
                        }
                      >
                        {format(new Date(loan.nextPaymentDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setRepayModal(loan)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                    style={{
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                      boxShadow: "0 4px 16px rgba(200,150,62,0.3)",
                    }}
                  >
                    <ArrowDownCircle className="w-4 h-4" /> Pay{" "}
                    {fmt(Math.min(loan.monthlyRepayment, totalOwed))}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Repayment History ── */}
      <div>
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ color: "rgba(228,184,106,0.5)" }}
        >
          Repayment History
        </p>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-4">
          <div className="relative flex-1 min-w-48">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "rgba(200,150,62,0.5)" }}
            />
            <input
              placeholder="Search loan ID or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputCls + " pl-10"}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {/* Method filter */}
          <div className="relative shrink-0">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "rgba(200,150,62,0.5)" }}
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className={inputCls + " pl-8 pr-8 appearance-none cursor-pointer"}
              style={{ ...inputStyle, minWidth: 175 }}
              onFocus={inputFocus}
              onBlur={inputBlur}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="savings_deduction">Savings Deduction</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "rgba(200,150,62,0.45)" }}
            />
          </div>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputCls + " shrink-0"}
            style={{ ...inputStyle, minWidth: 150, colorScheme: "dark" }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={inputCls + " shrink-0"}
            style={{ ...inputStyle, minWidth: 150, colorScheme: "dark" }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />

          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="h-10 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.22)",
                color: "#f87171",
              }}
            >
              <X className="w-3.5 h-3.5" /> Clear dates
            </button>
          )}
        </div>

        {/* History Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          {/* Head */}
          <div
            className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
            style={{
              gridTemplateColumns: "120px 1fr 110px 110px 110px 100px",
              background: "rgba(200,150,62,0.06)",
              borderBottom: "1px solid rgba(200,150,62,0.1)",
              color: "rgba(228,184,106,0.5)",
            }}
          >
            <span>Loan</span>
            <span>Method</span>
            <span>Amount Paid</span>
            <span>Balance After</span>
            <span>Penalty</span>
            <span>Date</span>
          </div>

          {historyLoading ? (
            <div className="space-y-px">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <div
                    className="h-10 rounded-xl animate-pulse"
                    style={{ background: "rgba(200,150,62,0.05)" }}
                  />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <TrendingDown
                className="w-10 h-10"
                style={{ color: "rgba(200,150,62,0.22)" }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                No repayments recorded yet
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                Make your first repayment using the cards above
              </p>
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "rgba(200,150,62,0.07)" }}
            >
              {displayed.map((r, i) => {
                const methodMeta =
                  METHOD_META[r.method as PayMethod] ?? METHOD_META.cash;
                const loanFullyPaid = r.outstandingBalanceAfter <= 0;
                return (
                  <motion.div
                    key={r._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid gap-4 px-5 py-4 items-center transition-colors duration-100"
                    style={{
                      gridTemplateColumns: "120px 1fr 110px 110px 110px 100px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(200,150,62,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    {/* Loan ID */}
                    <div>
                      <p
                        className="text-xs font-mono font-bold"
                        style={{ color: "#E4B86A" }}
                      >
                        {r.loanId?.loanId ?? "—"}
                      </p>
                      {loanFullyPaid && (
                        <span className="text-[9px] font-bold text-emerald-400">
                          ✓ Fully Paid
                        </span>
                      )}
                    </div>

                    {/* Method */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: `${methodMeta.color}15`,
                          border: `1px solid ${methodMeta.color}30`,
                        }}
                      >
                        <methodMeta.icon
                          className="w-3.5 h-3.5"
                          style={{ color: methodMeta.color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {methodMeta.label}
                        </p>
                        {r.reference && (
                          <p
                            className="text-[10px] font-mono"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            Ref: {r.reference}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-bold text-emerald-400">
                      +{fmt(r.amount)}
                    </p>

                    {/* Balance After */}
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {fmt(r.outstandingBalanceAfter ?? 0)}
                    </p>

                    {/* Penalty */}
                    <p
                      className="text-sm"
                      style={{
                        color:
                          (r.penaltyPortion ?? 0) > 0
                            ? "#f87171"
                            : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {(r.penaltyPortion ?? 0) > 0
                        ? fmt(r.penaltyPortion)
                        : "—"}
                    </p>

                    {/* Date */}
                    <p
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {format(new Date(r.paymentDate), "MMM d, yyyy")}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!historyLoading && displayed.length > 0 && (
            <div
              className="flex items-center justify-between px-5 py-3.5"
              style={{
                borderTop: "1px solid rgba(200,150,62,0.09)",
                background: "rgba(200,150,62,0.025)",
              }}
            >
              <p
                className="text-[11px]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Showing{" "}
                <span style={{ color: "rgba(255,255,255,0.55)" }}>
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                of{" "}
                <span style={{ color: "rgba(255,255,255,0.55)" }}>
                  {pagination.total}
                </span>
              </p>
              {pagination.pages > 1 && (
                <div className="flex items-center gap-1.5">
                  <PgBtn
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      fetchHistory(
                        pagination.page - 1,
                        methodFilter,
                        fromDate,
                        toDate,
                      )
                    }
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </PgBtn>
                  {Array.from(
                    { length: Math.min(pagination.pages, 5) },
                    (_, i) => i + 1,
                  ).map((p) => (
                    <PgBtn
                      key={p}
                      active={p === pagination.page}
                      onClick={() =>
                        fetchHistory(p, methodFilter, fromDate, toDate)
                      }
                    >
                      {p}
                    </PgBtn>
                  ))}
                  <PgBtn
                    disabled={pagination.page >= pagination.pages}
                    onClick={() =>
                      fetchHistory(
                        pagination.page + 1,
                        methodFilter,
                        fromDate,
                        toDate,
                      )
                    }
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </PgBtn>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Repayment Modal ── */}
      <AnimatePresence>
        {repayModal && (
          <RepayModal
            loan={repayModal}
            onClose={() => setRepayModal(null)}
            onSuccess={() => {
              fetchActiveLoans();
              fetchHistory(1, methodFilter, fromDate, toDate);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
