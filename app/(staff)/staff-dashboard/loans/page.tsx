"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  TrendingUp,
  TrendingDown,
  User,
  Hash,
  Calendar,
  DollarSign,
  Info,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  BarChart3,
  ArrowRight,
  Percent,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface PopulatedMember {
  _id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  savingsBalance: number;
  status: string;
}
interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}
interface Loan {
  _id: string;
  loanId: string;
  memberId: PopulatedMember;
  applicationDate: string;
  loanAmount: number;
  interestRate: number;
  loanDurationMonths: number;
  purpose: string;
  purposeDescription?: string;
  monthlyRepayment: number;
  totalPayable: number;
  totalInterest: number;
  amountPaid: number;
  outstandingBalance: number;
  penaltyAmount: number;
  status: LoanStatus;
  appliedBy: PopulatedUser;
  reviewedBy?: PopulatedUser;
  approvedBy?: PopulatedUser;
  reviewDate?: string;
  approvalDate?: string;
  disbursementDate?: string;
  dueDate?: string;
  nextPaymentDate?: string;
  eligibilityScore: number;
  savingsBalanceAtApplication: number;
  creditHistory: "good" | "fair" | "poor" | "no_history";
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}
type LoanStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "active"
  | "overdue"
  | "paid"
  | "rejected"
  | "cancelled";
type LoanPurpose =
  | "business"
  | "education"
  | "medical"
  | "housing"
  | "personal"
  | "agriculture"
  | "other";

interface MemberProfile {
  _id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  savingsBalance: number;
}
interface EligibilityResult {
  score: number;
  eligible: boolean;
  creditHistory: string;
  maxRecommendedAmount: number;
  interestRate: number;
  breakdown: Record<string, number>;
  flags: string[];
  loanHistory: {
    completedLoans: number;
    defaultedLoans: number;
    activeLoans: number;
    pendingLoans: number;
  };
}
interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
type ModalMode =
  | "apply"
  | "view"
  | "review"
  | "approve"
  | "reject"
  | "disburse"
  | "cancel"
  | "delete"
  | null;

/* ─── Constants ──────────────────────────────────────────────────────────── */
const STATUS_META: Record<
  LoanStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    Icon: React.ElementType;
  }
> = {
  pending: {
    label: "Pending",
    color: "#E4B86A",
    bg: "rgba(200,150,62,0.13)",
    border: "rgba(200,150,62,0.3)",
    Icon: Hourglass,
  },
  under_review: {
    label: "Under Review",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.3)",
    Icon: Search,
  },
  approved: {
    label: "Approved",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.13)",
    border: "rgba(139,92,246,0.3)",
    Icon: CheckCircle2,
  },
  active: {
    label: "Active",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    Icon: TrendingUp,
  },
  overdue: {
    label: "Overdue",
    color: "#fb923c",
    bg: "rgba(251,146,60,0.13)",
    border: "rgba(251,146,60,0.3)",
    Icon: AlertTriangle,
  },
  paid: {
    label: "Paid",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    Icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.25)",
    Icon: XCircle,
  },
};

const PURPOSE_LABELS: Record<string, string> = {
  business: "Business",
  education: "Education",
  medical: "Medical",
  housing: "Housing",
  personal: "Personal",
  agriculture: "Agriculture",
  other: "Other",
};

const CREDIT_META = {
  good: { label: "Good", color: "#4ade80", Icon: ShieldCheck },
  fair: { label: "Fair", color: "#E4B86A", Icon: ShieldAlert },
  poor: { label: "Poor", color: "#f87171", Icon: ShieldX },
  no_history: { label: "No History", color: "#94a3b8", Icon: ShieldAlert },
};

function fmt(n: number) {
  return `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function initials(m: PopulatedMember | MemberProfile) {
  return (m.firstName[0] + m.lastName[0]).toUpperCase();
}
function scoreColor(s: number) {
  if (s >= 70) return "#4ade80";
  if (s >= 50) return "#E4B86A";
  return "#f87171";
}

/* ─── Modal Shell ────────────────────────────────────────────────────────── */
function Modal({
  title,
  onClose,
  children,
  wide,
  extraWide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  extraWide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,17,34,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.94, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full overflow-hidden rounded-2xl flex flex-col"
        style={{
          maxWidth: extraWide ? 700 : wide ? 580 : 480,
          maxHeight: "90vh",
          background: "#0e1f3d",
          border: "1px solid rgba(200,150,62,0.22)",
          boxShadow: "0 28px 70px rgba(7,17,34,0.9)",
        }}
      >
        <div
          className="h-0.75 shrink-0"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(200,150,62,0.1)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg,#C8963E,#E4B86A)" }}
            />
            <h2 className="font-serif font-black text-white text-lg">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.4)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.05)")
            }
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}

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
        className="block text-[10px] font-black uppercase tracking-widest mb-1.5"
        style={{ color: "rgba(228,184,106,0.55)" }}
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all duration-200";
const inputStyle: React.CSSProperties = {
  background: "rgba(11,29,58,0.70)",
  border: "1px solid rgba(200,150,62,0.20)",
};
const inputFocus = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >,
) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.55)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,150,62,0.10)";
};
const inputBlur = (
  e: React.FocusEvent<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >,
) => {
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

/* ─── Score ring ─────────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function StaffLoanApplicationsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  /* filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* modals */
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Loan | null>(null);

  /* apply form */
  const [allMembers, setAllMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState("");
  const [chosenMember, setChosenMember] = useState<MemberProfile | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(
    null,
  );
  const [eligLoading, setEligLoading] = useState(false);

  const [loanAmount, setLoanAmount] = useState("");
  const [loanMonths, setLoanMonths] = useState("12");
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>("personal");
  const [purposeDesc, setPurposeDesc] = useState("");
  const [rateOverride, setRateOverride] = useState("");
  const [appNotes, setAppNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  /* action modals */
  const [actionNotes, setActionNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [disburseDate, setDisburseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [approveRate, setApproveRate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /* ── Fetch loans ── */
  const fetchLoans = useCallback(
    async (
      page = 1,
      q = search,
      status = statusFilter,
      from = fromDate,
      to = toDate,
    ) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page), limit: "20" });
        if (status !== "all") p.set("status", status);
        if (q) p.set("search", q);
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const res = await fetch(`/api/loans?${p}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLoans(data.loans ?? []);
        setPagination(data.pagination);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load loans");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [search, statusFilter, fromDate, toDate],
  );

  useEffect(() => {
    fetchLoans(1, "", "all", "", "");
  }, []); // eslint-disable-line

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchLoans(1, search, statusFilter, fromDate, toDate),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, statusFilter, fromDate, toDate, fetchLoans]);

  /* ── Fetch members ── */
  const fetchAllMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch("/api/members?limit=200&status=active", {
        credentials: "include",
      });
      const data = await res.json();
      setAllMembers(data.members ?? []);
    } catch {
      toast.error("Could not load members");
    } finally {
      setMembersLoading(false);
    }
  }, []);

  /* ── Fetch eligibility when member + amount selected ── */
  const fetchEligibility = useCallback(
    async (member: MemberProfile, amount: string) => {
      const amt = parseFloat(amount);
      if (!member || !amt || amt <= 0) {
        setEligibility(null);
        return;
      }
      setEligLoading(true);
      try {
        const res = await fetch(
          `/api/loans/eligibility?memberId=${member._id}&amount=${amt}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (res.ok) {
          setEligibility(data.eligibility);
          if (data.eligibility?.interestRate && !rateOverride) {
            setRateOverride(String(data.eligibility.interestRate));
          }
        }
      } catch {
        /* silent */
      } finally {
        setEligLoading(false);
      }
    },
    [rateOverride],
  );

  useEffect(() => {
    if (chosenMember && loanAmount) {
      const t = setTimeout(
        () => fetchEligibility(chosenMember, loanAmount),
        600,
      );
      return () => clearTimeout(t);
    }
  }, [chosenMember, loanAmount, fetchEligibility]);

  /* ── Derived stats ── */
  const stats = {
    total: pagination.total,
    pending: loans.filter((l) => l.status === "pending").length,
    active: loans.filter((l) => ["active", "overdue"].includes(l.status))
      .length,
    totalAmt: loans.reduce((s, l) => s + l.loanAmount, 0),
  };

  /* ── Reset apply form ── */
  const resetForm = () => {
    setChosenMember(null);
    setMemberFilter("");
    setEligibility(null);
    setLoanAmount("");
    setLoanMonths("12");
    setLoanPurpose("personal");
    setPurposeDesc("");
    setRateOverride("");
    setAppNotes("");
  };

  /* ── Calculate repayment preview ── */
  const calcPreview = () => {
    const p = parseFloat(loanAmount) || 0;
    const r = parseFloat(rateOverride) || eligibility?.interestRate || 18;
    const m = parseInt(loanMonths) || 12;
    const totalInterest = p * (r / 100) * (m / 12);
    const totalPayable = p + totalInterest;
    const monthlyRepayment = totalPayable / m;
    return { monthlyRepayment, totalInterest, totalPayable };
  };

  /* ── Submit: apply for loan ── */
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenMember) {
      toast.error("Select a member");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: chosenMember._id,
          loanAmount: parseFloat(loanAmount),
          loanDurationMonths: parseInt(loanMonths),
          purpose: loanPurpose,
          purposeDescription: purposeDesc || undefined,
          interestRateOverride: rateOverride
            ? parseFloat(rateOverride)
            : undefined,
          notes: appNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      resetForm();
      fetchLoans(1, search, statusFilter, fromDate, toDate);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Submit: action (review/approve/reject/disburse/cancel) ── */
  const handleAction = async (action: string) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action };
      if (action === "reject") body.rejectionReason = rejectReason;
      if (action === "approve" && approveRate)
        body.interestRateOverride = parseFloat(approveRate);
      if (action === "disburse") body.disbursementDate = disburseDate;
      if (actionNotes) body.notes = actionNotes;

      const res = await fetch(`/api/loans/${selected._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      setActionNotes("");
      setRejectReason("");
      setApproveRate("");
      fetchLoans(pagination.page, search, statusFilter, fromDate, toDate);
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/loans/${selected._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      setLoans((prev) => prev.filter((l) => l._id !== selected._id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const preview = calcPreview();

  /* ═══════════ RENDER ═══════════ */
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
            Loan Management
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            Loan <span style={{ color: "#E4B86A" }}>Applications</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Review, approve and track member loan applications
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            fetchAllMembers();
            setMode("apply");
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          <Plus className="w-4 h-4" /> New Application
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Applications",
            val: pagination.total,
            icon: FileText,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Pending Review",
            val: stats.pending,
            icon: Hourglass,
            gradient: "linear-gradient(135deg,#92400e,#E4B86A)",
          },
          {
            label: "Active Loans",
            val: stats.active,
            icon: TrendingUp,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "Total Volume",
            val: fmt(stats.totalAmt),
            icon: Banknote,
            gradient: "linear-gradient(135deg,#1e3a5f,#60a5fa)",
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
            <div className="flex items-center justify-between mb-2">
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search member name, ID or loan ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " pl-10"}
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>
        <div className="relative shrink-0">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputCls + " pl-8 pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 170 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
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
          style={{ ...inputStyle, minWidth: 148, colorScheme: "dark" }}
          onFocus={inputFocus}
          onBlur={inputBlur}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className={inputCls + " shrink-0"}
          style={{ ...inputStyle, minWidth: 148, colorScheme: "dark" }}
          onFocus={inputFocus}
          onBlur={inputBlur}
        />
        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "#f87171",
            }}
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <button
          onClick={() => {
            setSpinning(true);
            fetchLoans(pagination.page, search, statusFilter, fromDate, toDate);
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
        {/* Head */}
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "1.6fr 100px 100px 100px 100px 80px auto",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>Member</span>
          <span>Loan ID</span>
          <span>Amount</span>
          <span>Purpose</span>
          <span>Status</span>
          <span>Score</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="space-y-px p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl animate-pulse"
                style={{ background: "rgba(200,150,62,0.04)" }}
              />
            ))}
          </div>
        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText
              className="w-10 h-10"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No loan applications found
            </p>
            <button
              onClick={() => {
                resetForm();
                fetchAllMembers();
                setMode("apply");
              }}
              className="text-xs font-bold"
              style={{ color: "#E4B86A" }}
            >
              + Create first application
            </button>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {loans.map((loan, i) => {
              const sm = STATUS_META[loan.status];
              return (
                <motion.div
                  key={loan._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid gap-4 px-5 py-4 items-center group transition-colors"
                  style={{
                    gridTemplateColumns:
                      "1.6fr 100px 100px 100px 100px 80px auto",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(200,150,62,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  {/* Member */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {initials(loan.memberId)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {loan.memberId.firstName} {loan.memberId.lastName}
                      </p>
                      <p
                        className="text-[10px] font-medium"
                        style={{ color: "#E4B86A" }}
                      >
                        {loan.memberId.memberId}
                      </p>
                    </div>
                  </div>

                  {/* Loan ID */}
                  <p
                    className="text-xs font-mono font-bold"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {loan.loanId}
                  </p>

                  {/* Amount */}
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#E4B86A" }}
                    >
                      {fmt(loan.loanAmount)}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {loan.loanDurationMonths}mo · {loan.interestRate}%
                    </p>
                  </div>

                  {/* Purpose */}
                  <p className="text-xs capitalize font-medium text-white/60 truncate">
                    {PURPOSE_LABELS[loan.purpose]}
                  </p>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <sm.Icon
                      className="w-3 h-3 shrink-0"
                      style={{ color: sm.color }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{
                        background: sm.bg,
                        border: `1px solid ${sm.border}`,
                        color: sm.color,
                      }}
                    >
                      {sm.label}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative w-8 h-8">
                      <ScoreRing score={loan.eligibilityScore} size={32} />
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[8px] font-black"
                        style={{ color: scoreColor(loan.eligibilityScore) }}
                      >
                        {loan.eligibilityScore}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {[
                      {
                        Icon: Eye,
                        title: "View",
                        color: "#C8963E",
                        action: () => {
                          setSelected(loan);
                          setMode("view");
                        },
                      },
                      ...(["pending", "under_review"].includes(loan.status)
                        ? [
                            {
                              Icon: CheckCircle2,
                              title: "Approve",
                              color: "#4ade80",
                              action: () => {
                                setSelected(loan);
                                setApproveRate(String(loan.interestRate));
                                setMode("approve");
                              },
                            },
                            {
                              Icon: XCircle,
                              title: "Reject",
                              color: "#f87171",
                              action: () => {
                                setSelected(loan);
                                setMode("reject");
                              },
                            },
                          ]
                        : []),
                      ...(loan.status === "approved"
                        ? [
                            {
                              Icon: Banknote,
                              title: "Disburse",
                              color: "#a78bfa",
                              action: () => {
                                setSelected(loan);
                                setMode("disburse");
                              },
                            },
                          ]
                        : []),
                      ...(["pending", "rejected", "cancelled"].includes(
                        loan.status,
                      )
                        ? [
                            {
                              Icon: Trash2,
                              title: "Delete",
                              color: "#f87171",
                              action: () => {
                                setSelected(loan);
                                setMode("delete");
                              },
                            },
                          ]
                        : []),
                    ].map(({ Icon, title, color, action }) => (
                      <button
                        key={title}
                        onClick={action}
                        title={title}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            `${color}18`;
                          (e.currentTarget as HTMLElement).style.borderColor =
                            `${color}40`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(255,255,255,0.04)";
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "rgba(255,255,255,0.06)";
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && loans.length > 0 && (
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
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
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
                    fetchLoans(
                      pagination.page - 1,
                      search,
                      statusFilter,
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
                      fetchLoans(p, search, statusFilter, fromDate, toDate)
                    }
                  >
                    {p}
                  </PgBtn>
                ))}
                <PgBtn
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    fetchLoans(
                      pagination.page + 1,
                      search,
                      statusFilter,
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

      {/* ══════════════════════ MODALS ══════════════════════════════════════ */}
      <AnimatePresence>
        {/* ── APPLY MODAL ── */}
        {mode === "apply" && (
          <Modal
            title="New Loan Application"
            onClose={() => setMode(null)}
            extraWide
          >
            <form onSubmit={handleApply} className="space-y-5">
              {/* Step 1: Member */}
              <Field label="Step 1 — Select Member" required>
                {chosenMember ? (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(200,150,62,0.10)",
                      border: "1px solid rgba(200,150,62,0.28)",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {initials(chosenMember)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {chosenMember.firstName} {chosenMember.lastName}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {chosenMember.memberId} · Savings:{" "}
                        {fmt(chosenMember.savingsBalance)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChosenMember(null);
                        setEligibility(null);
                        setRateOverride("");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239,68,68,0.18)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.07)")
                      }
                    >
                      <X className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid rgba(200,150,62,0.2)",
                      background: "rgba(11,29,58,0.70)",
                    }}
                  >
                    <div
                      className="relative"
                      style={{
                        borderBottom: "1px solid rgba(200,150,62,0.12)",
                      }}
                    >
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                        style={{ color: "rgba(200,150,62,0.5)" }}
                      />
                      <input
                        placeholder="Filter members…"
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                      />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 190 }}>
                      {membersLoading ? (
                        <div
                          className="flex items-center justify-center gap-2 py-6"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{ color: "#C8963E" }}
                          />
                          <span className="text-sm">Loading…</span>
                        </div>
                      ) : (
                        (() => {
                          const q = memberFilter.toLowerCase();
                          const f = allMembers.filter(
                            (m) =>
                              !q ||
                              `${m.firstName} ${m.lastName}`
                                .toLowerCase()
                                .includes(q) ||
                              m.memberId.toLowerCase().includes(q),
                          );
                          return f.length === 0 ? (
                            <p
                              className="text-center text-sm py-6"
                              style={{ color: "rgba(255,255,255,0.25)" }}
                            >
                              No members
                            </p>
                          ) : (
                            f.map((m, i) => (
                              <button
                                key={m._id}
                                type="button"
                                onClick={() => {
                                  setChosenMember(m);
                                  setMemberFilter("");
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                style={{
                                  borderBottom:
                                    i < f.length - 1
                                      ? "1px solid rgba(200,150,62,0.07)"
                                      : "none",
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.background =
                                    "rgba(200,150,62,0.07)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background = "")
                                }
                              >
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0"
                                  style={{
                                    background:
                                      "linear-gradient(135deg,#C8963E,#E4B86A)",
                                    color: "#0B1D3A",
                                  }}
                                >
                                  {initials(m)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-white truncate">
                                    {m.firstName} {m.lastName}
                                  </p>
                                  <p
                                    className="text-[10px]"
                                    style={{ color: "rgba(255,255,255,0.38)" }}
                                  >
                                    {m.memberId} · {fmt(m.savingsBalance)}
                                  </p>
                                </div>
                                <span
                                  className="text-[10px] font-bold shrink-0"
                                  style={{ color: "#4ade80" }}
                                >
                                  Select →
                                </span>
                              </button>
                            ))
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}
              </Field>

              {/* Step 2: Loan Details */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Loan Amount (GH₵)" required>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.5)" }}
                    />
                    <input
                      type="number"
                      min="100"
                      step="50"
                      placeholder="0.00"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className={inputCls + " pl-9"}
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                      required
                    />
                  </div>
                  {eligibility?.maxRecommendedAmount ? (
                    <p
                      className="text-[10px] mt-1"
                      style={{ color: "rgba(228,184,106,0.6)" }}
                    >
                      Max recommended: {fmt(eligibility.maxRecommendedAmount)}
                    </p>
                  ) : null}
                </Field>

                <Field label="Duration (months)" required>
                  <div className="relative">
                    <select
                      value={loanMonths}
                      onChange={(e) => setLoanMonths(e.target.value)}
                      className={
                        inputCls + " pr-8 appearance-none cursor-pointer"
                      }
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    >
                      {[3, 6, 9, 12, 18, 24, 36, 48, 60].map((m) => (
                        <option key={m} value={m}>
                          {m} months
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.45)" }}
                    />
                  </div>
                </Field>

                <Field label="Purpose" required>
                  <div className="relative">
                    <select
                      value={loanPurpose}
                      onChange={(e) =>
                        setLoanPurpose(e.target.value as LoanPurpose)
                      }
                      className={
                        inputCls + " pr-8 appearance-none cursor-pointer"
                      }
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    >
                      {Object.entries(PURPOSE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.45)" }}
                    />
                  </div>
                </Field>

                <Field label="Interest Rate (% p.a.)">
                  <div className="relative">
                    <Percent
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.5)" }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder={
                        eligLoading
                          ? "Loading…"
                          : `Auto: ${eligibility?.interestRate ?? 18}%`
                      }
                      value={rateOverride}
                      onChange={(e) => setRateOverride(e.target.value)}
                      className={inputCls + " pl-9"}
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Purpose Description">
                <textarea
                  rows={2}
                  placeholder="Brief description of loan purpose…"
                  value={purposeDesc}
                  onChange={(e) => setPurposeDesc(e.target.value)}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>

              {/* Eligibility Panel */}
              {chosenMember && loanAmount && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(200,150,62,0.18)" }}
                >
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{
                      background: "rgba(200,150,62,0.07)",
                      borderBottom: "1px solid rgba(200,150,62,0.12)",
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: "rgba(228,184,106,0.6)" }}
                    >
                      Eligibility Check
                    </p>
                    {eligLoading && (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        style={{ color: "#C8963E" }}
                      />
                    )}
                  </div>
                  {eligibility ? (
                    <div className="p-4 space-y-3">
                      {/* Score + verdict */}
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <ScoreRing score={eligibility.score} size={64} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="text-sm font-black"
                              style={{ color: scoreColor(eligibility.score) }}
                            >
                              {eligibility.score}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-base font-black text-white">
                            {eligibility.eligible
                              ? "✓ Eligible"
                              : "✗ Not Eligible"}
                          </p>
                          {(() => {
                            const cm =
                              CREDIT_META[
                                eligibility.creditHistory as keyof typeof CREDIT_META
                              ];
                            return (
                              <div className="flex items-center gap-1 mt-0.5">
                                <cm.Icon
                                  className="w-3.5 h-3.5"
                                  style={{ color: cm.color }}
                                />
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: cm.color }}
                                >
                                  {cm.label} Credit History
                                </span>
                              </div>
                            );
                          })()}
                          <p
                            className="text-[10px] mt-1"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            Suggested rate:{" "}
                            <strong style={{ color: "#E4B86A" }}>
                              {eligibility.interestRate}% p.a.
                            </strong>
                            {" · "}Max:{" "}
                            <strong style={{ color: "#E4B86A" }}>
                              {fmt(eligibility.maxRecommendedAmount)}
                            </strong>
                          </p>
                        </div>
                      </div>
                      {/* Score breakdown */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { key: "savingsScore", label: "Savings", max: 30 },
                          { key: "activityScore", label: "Activity", max: 20 },
                          {
                            key: "repaymentScore",
                            label: "Repayment",
                            max: 30,
                          },
                          {
                            key: "membershipScore",
                            label: "Membership",
                            max: 10,
                          },
                          { key: "accountScore", label: "Accounts", max: 10 },
                        ].map(({ key, label, max }) => {
                          const val = eligibility.breakdown[key] ?? 0;
                          return (
                            <div
                              key={key}
                              className="text-center p-2 rounded-lg"
                              style={{ background: "rgba(255,255,255,0.03)" }}
                            >
                              <p
                                className="text-[9px] uppercase tracking-wider mb-1"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                              >
                                {label}
                              </p>
                              <p
                                className="text-sm font-black"
                                style={{ color: scoreColor((val / max) * 100) }}
                              >
                                {val}/{max}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      {/* Flags */}
                      {eligibility.flags.length > 0 && (
                        <div className="space-y-1">
                          {eligibility.flags.map((flag, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs"
                              style={{ color: "rgba(251,146,60,0.9)" }}
                            >
                              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-orange-400" />
                              {flag}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center py-6 gap-2"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        style={{ color: "#C8963E" }}
                      />
                      <span className="text-sm">Calculating eligibility…</span>
                    </div>
                  )}
                </div>
              )}

              {/* Repayment preview */}
              {loanAmount && parseFloat(loanAmount) > 0 && (
                <div
                  className="grid grid-cols-3 gap-2 rounded-xl p-3"
                  style={{
                    background: "rgba(200,150,62,0.07)",
                    border: "1px solid rgba(200,150,62,0.15)",
                  }}
                >
                  {[
                    { label: "Monthly", val: fmt(preview.monthlyRepayment) },
                    {
                      label: "Total Interest",
                      val: fmt(preview.totalInterest),
                    },
                    { label: "Total Payable", val: fmt(preview.totalPayable) },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p
                        className="text-[9px] uppercase tracking-wider mb-0.5"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-sm font-black"
                        style={{ color: "#E4B86A" }}
                      >
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  placeholder="Internal notes…"
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMode(null)}
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
                  disabled={formLoading || !chosenMember || !loanAmount}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                    boxShadow: "0 6px 20px rgba(200,150,62,0.35)",
                  }}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── VIEW MODAL ── */}
        {mode === "view" &&
          selected &&
          (() => {
            const sm = STATUS_META[selected.status];
            const cm = CREDIT_META[selected.creditHistory];
            return (
              <Modal
                title="Loan Details"
                onClose={() => setMode(null)}
                extraWide
              >
                <div className="space-y-4">
                  {/* Hero */}
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{
                      background: "rgba(200,150,62,0.07)",
                      border: "1px solid rgba(200,150,62,0.18)",
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {initials(selected.memberId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-black text-white text-lg">
                        {selected.memberId.firstName}{" "}
                        {selected.memberId.lastName}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {selected.memberId.memberId} · Applied{" "}
                        {format(
                          new Date(selected.applicationDate),
                          "MMM d, yyyy",
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="font-serif font-black text-2xl"
                        style={{ color: "#E4B86A" }}
                      >
                        {fmt(selected.loanAmount)}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <sm.Icon
                          className="w-3 h-3"
                          style={{ color: sm.color }}
                        />
                        <span
                          className="text-[10px] font-black uppercase"
                          style={{ color: sm.color }}
                        >
                          {sm.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Hash, label: "Loan ID", val: selected.loanId },
                      {
                        icon: Percent,
                        label: "Interest Rate",
                        val: `${selected.interestRate}% p.a.`,
                      },
                      {
                        icon: Calendar,
                        label: "Duration",
                        val: `${selected.loanDurationMonths} months`,
                      },
                      {
                        icon: DollarSign,
                        label: "Monthly Repay.",
                        val: fmt(selected.monthlyRepayment),
                      },
                      {
                        icon: TrendingUp,
                        label: "Total Payable",
                        val: fmt(selected.totalPayable),
                      },
                      {
                        icon: TrendingDown,
                        label: "Total Interest",
                        val: fmt(selected.totalInterest),
                      },
                      {
                        icon: DollarSign,
                        label: "Amount Paid",
                        val: fmt(selected.amountPaid),
                      },
                      {
                        icon: DollarSign,
                        label: "Outstanding",
                        val: fmt(selected.outstandingBalance),
                      },
                      {
                        icon: AlertTriangle,
                        label: "Penalty",
                        val: fmt(selected.penaltyAmount),
                      },
                      {
                        icon: FileText,
                        label: "Purpose",
                        val: PURPOSE_LABELS[selected.purpose],
                      },
                    ].map(({ icon: Icon, label, val }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(200,150,62,0.12)" }}
                        >
                          <Icon
                            className="w-3 h-3"
                            style={{ color: "#C8963E" }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-[9px] font-black uppercase tracking-wider"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {label}
                          </p>
                          <p className="text-xs font-semibold text-white truncate">
                            {val}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Credit score */}
                  <div
                    className="flex items-center gap-4 p-3 rounded-xl"
                    style={{
                      background: "rgba(200,150,62,0.05)",
                      border: "1px solid rgba(200,150,62,0.12)",
                    }}
                  >
                    <div className="relative shrink-0">
                      <ScoreRing score={selected.eligibilityScore} size={52} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="text-xs font-black"
                          style={{
                            color: scoreColor(selected.eligibilityScore),
                          }}
                        >
                          {selected.eligibilityScore}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">
                        Eligibility Score at Application
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <cm.Icon
                          className="w-3.5 h-3.5"
                          style={{ color: cm.color }}
                        />
                        <span className="text-xs" style={{ color: cm.color }}>
                          {cm.label} Credit
                        </span>
                      </div>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Savings at application:{" "}
                        {fmt(selected.savingsBalanceAtApplication)}
                      </p>
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {selected.rejectionReason && (
                    <div
                      className="p-3 rounded-xl flex items-start gap-2"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                    >
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-300">
                          Rejection Reason
                        </p>
                        <p className="text-xs text-red-200 mt-0.5">
                          {selected.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Next steps */}
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "under_review"].includes(selected.status) && (
                      <>
                        <button
                          onClick={() => {
                            setApproveRate(String(selected.interestRate));
                            setMode("approve");
                          }}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                          style={{
                            background: "rgba(34,197,94,0.15)",
                            color: "#4ade80",
                            border: "1px solid rgba(34,197,94,0.3)",
                          }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setMode("reject")}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                          style={{
                            background: "rgba(239,68,68,0.12)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.25)",
                          }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {selected.status === "approved" && (
                      <button
                        onClick={() => setMode("disburse")}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        style={{
                          background: "rgba(139,92,246,0.15)",
                          color: "#a78bfa",
                          border: "1px solid rgba(139,92,246,0.3)",
                        }}
                      >
                        <Banknote className="w-3.5 h-3.5" /> Disburse Funds
                      </button>
                    )}
                    <button
                      onClick={() => setMode(null)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Modal>
            );
          })()}

        {/* ── APPROVE MODAL ── */}
        {mode === "approve" && selected && (
          <Modal title="Approve Loan" onClose={() => setMode(null)}>
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl flex items-center gap-3"
                style={{
                  background: "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Approve {selected.loanId}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {selected.memberId.firstName} {selected.memberId.lastName} ·{" "}
                    {fmt(selected.loanAmount)}
                  </p>
                </div>
              </div>
              <Field label="Adjust Interest Rate (% p.a.)">
                <div className="relative">
                  <Percent
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={approveRate}
                    onChange={(e) => setApproveRate(e.target.value)}
                    className={inputCls + " pl-9"}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Leave unchanged to keep the system-suggested rate.
                </p>
              </Field>
              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  placeholder="Optional approval notes…"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
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
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#14532d,#4ade80)",
                    color: "white",
                  }}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── REJECT MODAL ── */}
        {mode === "reject" && selected && (
          <Modal title="Reject Loan" onClose={() => setMode(null)}>
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl flex items-center gap-3"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Reject {selected.loanId}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {selected.memberId.firstName} {selected.memberId.lastName} ·{" "}
                    {fmt(selected.loanAmount)}
                  </p>
                </div>
              </div>
              <Field label="Rejection Reason" required>
                <textarea
                  rows={3}
                  placeholder="Explain why this application is being rejected…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  required
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
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
                  onClick={() => handleAction("reject")}
                  disabled={actionLoading || !rejectReason.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" /> Reject Loan
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── DISBURSE MODAL ── */}
        {mode === "disburse" && selected && (
          <Modal title="Disburse Loan" onClose={() => setMode(null)}>
            <div className="space-y-4">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.2)",
                }}
              >
                <p className="text-sm font-bold text-white mb-1">
                  Disburse {selected.loanId}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Member:{" "}
                    </span>
                    <span className="text-white font-semibold">
                      {selected.memberId.firstName} {selected.memberId.lastName}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Amount:{" "}
                    </span>
                    <span style={{ color: "#E4B86A" }} className="font-bold">
                      {fmt(selected.loanAmount)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Duration:{" "}
                    </span>
                    <span className="text-white">
                      {selected.loanDurationMonths} months
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Monthly:{" "}
                    </span>
                    <span className="text-white font-semibold">
                      {fmt(selected.monthlyRepayment)}
                    </span>
                  </div>
                </div>
              </div>
              <Field label="Disbursement Date" required>
                <div className="relative">
                  <Calendar
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <input
                    type="date"
                    value={disburseDate}
                    onChange={(e) => setDisburseDate(e.target.value)}
                    className={inputCls + " pl-9"}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  First repayment due 1 month from this date.
                </p>
              </Field>
              <Field label="Notes (optional)">
                <textarea
                  rows={2}
                  placeholder="Disbursement notes…"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </Field>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
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
                  onClick={() => handleAction("disburse")}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#312e81,#a78bfa)",
                    color: "white",
                  }}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Banknote className="w-4 h-4" /> Disburse Funds
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── DELETE MODAL ── */}
        {mode === "delete" && selected && (
          <Modal title="Delete Application" onClose={() => setMode(null)}>
            <div className="text-center space-y-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold text-base">
                  Delete this application?
                </p>
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.42)" }}
                >
                  Permanently delete loan application{" "}
                  <span className="font-mono text-[#E4B86A]">
                    {selected.loanId}
                  </span>{" "}
                  for{" "}
                  <span className="text-white font-semibold">
                    {selected.memberId.firstName} {selected.memberId.lastName}
                  </span>
                  . This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setMode(null)}
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
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
