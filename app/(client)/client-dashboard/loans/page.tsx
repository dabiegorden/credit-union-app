"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
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
  User,
  Eye,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";

/* ─── Types ── */
interface Loan {
  _id: string;
  loanId: string;
  memberId: {
    _id: string;
    memberId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  loanAmount: number;
  loanDurationMonths: number;
  purpose: string;
  purposeDescription?: string;
  interestRate: number;
  totalRepayable: number;
  monthlyRepayment: number;
  amountPaid: number;
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "active"
    | "paid"
    | "overdue"
    | "rejected"
    | "cancelled";
  disbursedAt?: string;
  createdAt: string;
  notes?: string;
}

interface Repayment {
  _id: string;
  repaymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
type StatusFilter =
  | "all"
  | "pending"
  | "under_review"
  | "approved"
  | "active"
  | "paid"
  | "overdue"
  | "rejected"
  | "cancelled";

/* ─── Helpers ── */
const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "Pending",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.28)",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.28)",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.28)",
    icon: CheckCircle2,
  },
  active: {
    label: "Active",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.28)",
    icon: TrendingUp,
  },
  paid: {
    label: "Paid",
    color: "#E4B86A",
    bg: "rgba(200,150,62,0.12)",
    border: "rgba(200,150,62,0.28)",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Overdue",
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.28)",
    icon: AlertTriangle,
  },
  rejected: {
    label: "Rejected",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.10)",
    border: "rgba(156,163,175,0.22)",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.22)",
    icon: XCircle,
  },
};

function fmt(n: number) {
  return `GH₵${n?.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_TABS: StatusFilter[] = [
  "all",
  "pending",
  "under_review",
  "active",
  "overdue",
  "approved",
  "paid",
  "rejected",
  "cancelled",
];

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

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{
        background: m.bg,
        border: `1px solid ${m.border}`,
        color: m.color,
      }}
    >
      <m.icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

/* ─── Drawer Modal ── */
function Drawer({
  loan,
  repayments,
  repLoading,
  onClose,
  onCancel,
  cancelling,
}: {
  loan: Loan;
  repayments: Repayment[];
  repLoading: boolean;
  onClose: () => void;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const remaining = loan.totalRepayable - loan.amountPaid;
  const pct =
    loan.totalRepayable > 0
      ? Math.min(100, Math.round((loan.amountPaid / loan.totalRepayable) * 100))
      : 0;
  const sm = STATUS_META[loan.status] ?? STATUS_META.pending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(7,17,34,0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="h-full w-full max-w-md overflow-y-auto flex flex-col"
        style={{
          background: "#0e1f3d",
          borderLeft: "1px solid rgba(200,150,62,0.2)",
        }}
      >
        <div
          className="h-0.75 shrink-0"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(200,150,62,0.1)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg,#C8963E,#E4B86A)" }}
            />
            <div>
              <h2 className="font-serif font-black text-white text-lg leading-tight">
                Loan Details
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

        <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
          {/* Hero amount */}
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: sm.bg, border: `1px solid ${sm.border}` }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: sm.color }}
            >
              Loan Amount
            </p>
            <p className="font-serif font-black text-3xl text-white">
              {fmt(loan.loanAmount)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <StatusBadge status={loan.status} />
            </div>
          </div>

          {/* Repayment Progress (active/overdue/paid) */}
          {["active", "overdue", "paid"].includes(loan.status) && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: "#122549",
                border: "1px solid rgba(200,150,62,0.14)",
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: "rgba(228,184,106,0.5)" }}
              >
                Repayment Progress
              </p>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct === 100
                        ? "#4ade80"
                        : "linear-gradient(90deg,#C8963E,#E4B86A)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  Paid:{" "}
                  <strong className="text-white">{fmt(loan.amountPaid)}</strong>
                </span>
                <span className="font-bold" style={{ color: "#E4B86A" }}>
                  {pct}%
                </span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  Remaining:{" "}
                  <strong className="text-white">
                    {fmt(Math.max(0, remaining))}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Loan details */}
          <div className="space-y-2">
            {[
              { icon: Hash, label: "Loan ID", val: loan.loanId },
              { icon: DollarSign, label: "Amount", val: fmt(loan.loanAmount) },
              {
                icon: TrendingUp,
                label: "Total Repayable",
                val: fmt(loan.totalRepayable),
              },
              {
                icon: DollarSign,
                label: "Monthly Payment",
                val: fmt(loan.monthlyRepayment),
              },
              {
                icon: Calendar,
                label: "Duration",
                val: `${loan.loanDurationMonths} months`,
              },
              {
                icon: TrendingUp,
                label: "Interest Rate",
                val: `${loan.interestRate}% p.a.`,
              },
              { icon: FileText, label: "Purpose", val: loan.purpose },
              {
                icon: Calendar,
                label: "Applied On",
                val: format(new Date(loan.createdAt), "MMM d, yyyy"),
              },
              ...(loan.disbursedAt
                ? [
                    {
                      icon: Calendar,
                      label: "Disbursed",
                      val: format(new Date(loan.disbursedAt), "MMM d, yyyy"),
                    },
                  ]
                : []),
              ...(loan.purposeDescription
                ? [
                    {
                      icon: FileText,
                      label: "Description",
                      val: loan.purposeDescription,
                    },
                  ]
                : []),
              ...(loan.notes
                ? [{ icon: FileText, label: "Notes", val: loan.notes }]
                : []),
            ].map(({ icon: Icon, label, val }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(200,150,62,0.12)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: "#C8963E" }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[9px] font-black uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.32)" }}
                  >
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-white wrap-break-words">
                    {val}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Repayment history */}
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Repayment History
            </p>
            {repLoading ? (
              <div
                className="flex items-center justify-center py-8 gap-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: "#C8963E" }}
                />
                <span className="text-sm">Loading repayments…</span>
              </div>
            ) : repayments.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-8 gap-2"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 12,
                }}
              >
                <FileText
                  className="w-6 h-6"
                  style={{ color: "rgba(200,150,62,0.22)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  No repayments recorded yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {repayments.map((r) => (
                  <div
                    key={r._id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(34,197,94,0.06)",
                      border: "1px solid rgba(34,197,94,0.14)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(34,197,94,0.15)" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {fmt(r.amount)}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "rgba(255,255,255,0.38)" }}
                      >
                        {format(new Date(r.paymentDate), "MMM d, yyyy")} ·{" "}
                        {r.paymentMethod}
                      </p>
                    </div>
                    <p
                      className="text-xs font-mono shrink-0"
                      style={{ color: "#E4B86A" }}
                    >
                      {r.repaymentId}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        {loan.status === "pending" && (
          <div
            className="px-6 py-4 shrink-0"
            style={{ borderTop: "1px solid rgba(200,150,62,0.1)" }}
          >
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4" /> Cancel Application
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Main ── */
export default function MemberLoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchLoans = useCallback(
    async (page = 1, status = statusFilter) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page), limit: "20" });
        if (status !== "all") p.set("status", status);
        const res = await fetch(`/api/loans?${p}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLoans(data.loans ?? []);
        setPagination(data.pagination);
      } catch (err: any) {
        toast.error(err.message || "Failed to load loans");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchLoans(1, "all");
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLoans(1, statusFilter), 380);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [statusFilter, fetchLoans]);

  async function openDetail(loan: Loan) {
    setSelectedLoan(loan);
    setRepLoading(true);
    setRepayments([]);
    try {
      const res = await fetch(`/api/loans/repayments?loanId=${loan._id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setRepayments(data.repayments ?? []);
    } catch {
    } finally {
      setRepLoading(false);
    }
  }

  async function handleCancel() {
    if (!selectedLoan) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Loan application cancelled");
      setSelectedLoan(null);
      fetchLoans(pagination.page, statusFilter);
    } catch {
      toast.error("Network error");
    } finally {
      setCancelling(false);
    }
  }

  /* Counts */
  const counts = {
    active: loans.filter((l) => l.status === "active").length,
    pending: loans.filter((l) =>
      ["pending", "under_review", "approved"].includes(l.status),
    ).length,
    overdue: loans.filter((l) => l.status === "overdue").length,
    paid: loans.filter((l) => l.status === "paid").length,
  };

  const displayed = search.trim()
    ? loans.filter(
        (l) =>
          l.loanId.toLowerCase().includes(search.toLowerCase()) ||
          l.purpose.toLowerCase().includes(search.toLowerCase()),
      )
    : loans;

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
            My <span style={{ color: "#E4B86A" }}>Loans</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Track all your loan applications and repayments
          </p>
        </div>
        <Link
          href="/member-dashboard/loans/apply"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          <Plus className="w-4 h-4" /> Apply for Loan
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Loans",
            val: pagination.total,
            icon: FileText,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Active",
            val: counts.active,
            icon: TrendingUp,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "Pending Review",
            val: counts.pending,
            icon: Clock,
            gradient: "linear-gradient(135deg,#3b2500,#f59e0b)",
          },
          {
            label: "Overdue",
            val: counts.overdue,
            icon: AlertTriangle,
            gradient: "linear-gradient(135deg,#7f1d1d,#f87171)",
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

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const active = tab === statusFilter;
          const m = tab !== "all" ? STATUS_META[tab] : null;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      color: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {tab === "under_review"
                ? "Under Review"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search loan ID or purpose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " pl-10"}
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>
        <button
          onClick={() => {
            setSpinning(true);
            fetchLoans(pagination.page, statusFilter);
          }}
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "rgba(200,150,62,0.08)",
            border: "1px solid rgba(200,150,62,0.18)",
          }}
        >
          <RefreshCw
            className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
            style={{ color: "rgba(200,150,62,0.7)" }}
          />
        </button>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "120px 1fr 110px 110px 110px 100px auto",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>Loan ID</span>
          <span>Purpose</span>
          <span>Amount</span>
          <span>Monthly</span>
          <span>Status</span>
          <span>Date</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
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
            <FileText
              className="w-10 h-10"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No loans found
            </p>
            <Link
              href="/member-dashboard/loans/apply"
              className="text-xs font-bold"
              style={{ color: "#E4B86A" }}
            >
              + Apply for your first loan
            </Link>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {displayed.map((loan, i) => {
              const sm = STATUS_META[loan.status] ?? STATUS_META.pending;
              const pct =
                loan.totalRepayable > 0
                  ? Math.min(
                      100,
                      Math.round((loan.amountPaid / loan.totalRepayable) * 100),
                    )
                  : 0;
              return (
                <motion.div
                  key={loan._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid gap-4 px-5 py-4 items-center group transition-colors duration-100"
                  style={{
                    gridTemplateColumns:
                      "120px 1fr 110px 110px 110px 100px auto",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(200,150,62,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <p
                    className="text-xs font-mono font-bold"
                    style={{ color: "#E4B86A" }}
                  >
                    {loan.loanId}
                  </p>
                  <div>
                    <p className="text-sm font-bold text-white capitalize">
                      {loan.purpose}
                    </p>
                    {["active", "overdue"].includes(loan.status) && (
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="flex-1 h-1 rounded-full overflow-hidden"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            maxWidth: 100,
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100
                                  ? "#4ade80"
                                  : "linear-gradient(90deg,#C8963E,#E4B86A)",
                            }}
                          />
                        </div>
                        <span
                          className="text-[10px]"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">
                    {fmt(loan.loanAmount)}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {fmt(loan.monthlyRepayment)}
                  </p>
                  <StatusBadge status={loan.status} />
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {format(new Date(loan.createdAt), "MMM d, yyyy")}
                  </p>
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openDetail(loan)}
                      title="View Details"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#C8963E18";
                        e.currentTarget.style.borderColor = "#C8963E40";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.06)";
                      }}
                    >
                      <Eye
                        className="w-3.5 h-3.5"
                        style={{ color: "#C8963E" }}
                      />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && displayed.length > 0 && (
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
                {Math.min(pagination.page * pagination.limit, pagination.total)}
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
                  onClick={() => fetchLoans(pagination.page - 1, statusFilter)}
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
                    onClick={() => fetchLoans(p, statusFilter)}
                  >
                    {p}
                  </PgBtn>
                ))}
                <PgBtn
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchLoans(pagination.page + 1, statusFilter)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </PgBtn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedLoan && (
          <Drawer
            loan={selectedLoan}
            repayments={repayments}
            repLoading={repLoading}
            onClose={() => setSelectedLoan(null)}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
