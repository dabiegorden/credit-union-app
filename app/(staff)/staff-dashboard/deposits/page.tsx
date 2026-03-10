"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Pencil,
  Trash2,
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
  Wallet,
  TrendingUp,
  TrendingDown,
  Hash,
  Calendar,
  User,
  DollarSign,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface PopulatedMember {
  _id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  savingsBalance: number;
}

interface PopulatedAccount {
  _id: string;
  accountNumber: string;
  accountType: "regular" | "fixed" | "susu";
  accountName: string;
  balance: number;
  status: "active" | "dormant" | "closed";
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface SavingsTransaction {
  _id: string;
  accountId: PopulatedAccount;
  memberId: PopulatedMember;
  transactionType: "deposit" | "withdrawal";
  amount: number;
  balanceAfter: number;
  description?: string;
  date: string;
  recordedBy: PopulatedUser;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type ModalMode = "record" | "view" | "edit" | "delete" | null;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const ACCT_TYPE_META = {
  regular: {
    label: "Regular",
    color: "#E4B86A",
    bg: "rgba(200,150,62,0.14)",
    border: "rgba(200,150,62,0.3)",
  },
  fixed: {
    label: "Fixed Deposit",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.3)",
  },
  susu: {
    label: "Susu",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.13)",
    border: "rgba(34,197,94,0.3)",
  },
};

const TX_TYPE_META = {
  deposit: {
    label: "Deposit",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.28)",
    Icon: ArrowDownCircle,
  },
  withdrawal: {
    label: "Withdrawal",
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.28)",
    Icon: ArrowUpCircle,
  },
};

function fmt(n: number) {
  return `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(m: PopulatedMember) {
  return (m.firstName[0] + m.lastName[0]).toUpperCase();
}

/* ─── Modal Shell ────────────────────────────────────────────────────────── */
function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
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
        className="w-full overflow-hidden rounded-2xl"
        style={{
          maxWidth: wide ? 600 : 480,
          background: "#0e1f3d",
          border: "1px solid rgba(200,150,62,0.22)",
          boxShadow:
            "0 28px 70px rgba(7,17,34,0.85), 0 0 0 1px rgba(200,150,62,0.06)",
        }}
      >
        <div
          className="h-0.75"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        <div
          className="flex items-center justify-between px-6 py-5"
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
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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
        <div className="px-6 py-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────────────── */
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

/* ─── Pagination Button ──────────────────────────────────────────────────── */
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

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function StaffDepositsPage() {
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
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
  const [typeFilter, setTypeFilter] = useState<
    "all" | "deposit" | "withdrawal"
  >("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* modals */
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<SavingsTransaction | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  /* record-deposit form */
  const [allMembers, setAllMembers] = useState<PopulatedMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState("");
  const [chosenMember, setChosenMember] = useState<PopulatedMember | null>(
    null,
  );

  const [memberAccounts, setMemberAccounts] = useState<PopulatedAccount[]>([]);
  const [acctLoading, setAcctLoading] = useState(false);
  const [chosenAccount, setChosenAccount] = useState<PopulatedAccount | null>(
    null,
  );

  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txDate, setTxDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [formLoading, setFormLoading] = useState(false);

  /* edit form */
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /* ── Fetch transactions ── */
  const fetchTransactions = useCallback(
    async (
      page = 1,
      q = search,
      type = typeFilter,
      from = fromDate,
      to = toDate,
    ) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page), limit: "20" });
        if (type !== "all") p.set("type", type);
        if (from) p.set("from", from);
        if (to) p.set("to", to);

        /* client-side member filter — we search by name/id after fetch */
        const res = await fetch(`/api/savings/transactions?${p}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTransactions(data.transactions ?? []);
        setPagination(data.pagination);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load transactions",
        );
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [search, typeFilter, fromDate, toDate],
  );

  useEffect(() => {
    fetchTransactions(1, "", "all", "", "");
  }, []); // eslint-disable-line

  /* debounced re-fetch on filter changes */
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchTransactions(1, search, typeFilter, fromDate, toDate),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, typeFilter, fromDate, toDate, fetchTransactions]);

  /* ── Fetch all active members ── */
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

  /* ── Fetch accounts for a chosen member ── */
  const fetchMemberAccounts = useCallback(async (memberId: string) => {
    setAcctLoading(true);
    setMemberAccounts([]);
    setChosenAccount(null);
    try {
      const res = await fetch(
        `/api/savings/accounts?memberId=${memberId}&status=active`,
        { credentials: "include" },
      );
      const data = await res.json();
      setMemberAccounts(data.accounts ?? []);
    } catch {
      toast.error("Could not load accounts for this member");
    } finally {
      setAcctLoading(false);
    }
  }, []);

  /* ── Derived stats from current page ── */
  const totalDeposits = transactions
    .filter((t) => t.transactionType === "deposit")
    .reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions
    .filter((t) => t.transactionType === "withdrawal")
    .reduce((s, t) => s + t.amount, 0);
  const depositCount = transactions.filter(
    (t) => t.transactionType === "deposit",
  ).length;
  const withdrawalCount = transactions.filter(
    (t) => t.transactionType === "withdrawal",
  ).length;

  /* ── Reset record form ── */
  const resetForm = () => {
    setChosenMember(null);
    setMemberFilter("");
    setMemberAccounts([]);
    setChosenAccount(null);
    setTxType("deposit");
    setAmount("");
    setDescription("");
    setTxDate(new Date().toISOString().split("T")[0]);
  };

  /* ── Submit: record transaction ── */
  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenAccount) {
      toast.error("Please select an account");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/savings/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId: chosenAccount._id,
          transactionType: txType,
          amount: amt,
          description: description || undefined,
          date: txDate,
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
      fetchTransactions(1, search, typeFilter, fromDate, toDate);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Submit: edit transaction ── */
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/savings/transactions/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ description: editDesc, date: editDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      fetchTransactions(pagination.page, search, typeFilter, fromDate, toDate);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete / reverse ── */
  const handleDelete = async () => {
    if (!selected) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/savings/transactions/${selected._id}`, {
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
      setTransactions((prev) => prev.filter((t) => t._id !== selected._id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch {
      toast.error("Network error");
    } finally {
      setDelLoading(false);
    }
  };

  /* ── Client-side search filter (name, member ID, account number) ── */
  const displayed = search.trim()
    ? transactions.filter((t) => {
        const q = search.toLowerCase();
        const name =
          `${t.memberId?.firstName} ${t.memberId?.lastName}`.toLowerCase();
        return (
          name.includes(q) ||
          t.memberId?.memberId?.toLowerCase().includes(q) ||
          t.accountId?.accountNumber?.toLowerCase().includes(q)
        );
      })
    : transactions;

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Page header ── */}
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
            Savings Management
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
            Deposits &amp; <span style={{ color: "#E4B86A" }}>Withdrawals</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Record and manage all savings transactions across member accounts
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            fetchAllMembers();
            setMode("record");
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          <Plus className="w-4 h-4" />
          Record Transaction
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Transactions",
            val: pagination.total,
            icon: FileText,
            color: "#E4B86A",
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Deposits (page)",
            val: depositCount,
            icon: ArrowDownCircle,
            color: "#4ade80",
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "Withdrawals (page)",
            val: withdrawalCount,
            icon: ArrowUpCircle,
            color: "#f87171",
            gradient: "linear-gradient(135deg,#7f1d1d,#f87171)",
          },
          {
            label: "Net Volume (page)",
            val: fmt(totalDeposits - totalWithdrawals),
            icon: TrendingUp,
            color: "#60a5fa",
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search member name, ID or account…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " pl-10"}
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>

        {/* Type filter */}
        <div className="relative shrink-0">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | "deposit" | "withdrawal")
            }
            className={inputCls + " pl-8 pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 160 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>

        {/* Date range */}
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

        {/* Clear dates */}
        {(fromDate || toDate) && (
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-10 px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "#f87171",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(239,68,68,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(239,68,68,0.12)")
            }
          >
            <X className="w-3.5 h-3.5" /> Clear dates
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={() => {
            setSpinning(true);
            fetchTransactions(
              pagination.page,
              search,
              typeFilter,
              fromDate,
              toDate,
            );
          }}
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
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
        {/* Table head */}
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "1.6fr 1.3fr 90px 110px 110px 100px auto",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>Member</span>
          <span>Account</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Balance After</span>
          <span>Date</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
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
            <ArrowDownCircle
              className="w-10 h-10"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No transactions found
            </p>
            <button
              onClick={() => {
                resetForm();
                fetchAllMembers();
                setMode("record");
              }}
              className="text-xs font-bold transition-colors"
              style={{ color: "#E4B86A" }}
            >
              + Record first transaction
            </button>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {displayed.map((tx, i) => {
              const tm = TX_TYPE_META[tx.transactionType];
              const at = tx.accountId?.accountType
                ? ACCT_TYPE_META[tx.accountId.accountType]
                : null;
              return (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid gap-4 px-5 py-4 items-center group transition-colors duration-100"
                  style={{
                    gridTemplateColumns:
                      "1.6fr 1.3fr 90px 110px 110px 100px auto",
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
                      {tx.memberId ? initials(tx.memberId) : "??"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {tx.memberId?.firstName} {tx.memberId?.lastName}
                      </p>
                      <p
                        className="text-[10px] font-medium truncate"
                        style={{ color: "#E4B86A" }}
                      >
                        {tx.memberId?.memberId}
                      </p>
                    </div>
                  </div>

                  {/* Account */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {tx.accountId?.accountName ?? "—"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p
                        className="text-[11px] font-mono"
                        style={{ color: "rgba(255,255,255,0.38)" }}
                      >
                        {tx.accountId?.accountNumber ?? "—"}
                      </p>
                      {at && (
                        <span
                          className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{
                            background: at.bg,
                            color: at.color,
                            border: `1px solid ${at.border}`,
                          }}
                        >
                          {at.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className="flex items-center gap-1.5">
                    <tm.Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: tm.color }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: tm.bg,
                        border: `1px solid ${tm.border}`,
                        color: tm.color,
                      }}
                    >
                      {tm.label}
                    </span>
                  </div>

                  {/* Amount */}
                  <p
                    className="text-sm font-bold"
                    style={{
                      color:
                        tx.transactionType === "deposit"
                          ? "#4ade80"
                          : "#f87171",
                    }}
                  >
                    {tx.transactionType === "deposit" ? "+" : "-"}
                    {fmt(tx.amount)}
                  </p>

                  {/* Balance after */}
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {fmt(tx.balanceAfter)}
                  </p>

                  {/* Date */}
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {format(new Date(tx.date), "MMM d, yyyy")}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {[
                      {
                        Icon: Eye,
                        title: "View",
                        color: "#C8963E",
                        action: () => {
                          setSelected(tx);
                          setMode("view");
                        },
                      },
                      {
                        Icon: Pencil,
                        title: "Edit",
                        color: "#E4B86A",
                        action: () => {
                          setSelected(tx);
                          setEditDesc(tx.description ?? "");
                          setEditDate(tx.date.split("T")[0]);
                          setMode("edit");
                        },
                      },
                      {
                        Icon: Trash2,
                        title: "Reverse",
                        color: "#f87171",
                        action: () => {
                          setSelected(tx);
                          setMode("delete");
                        },
                      },
                    ].map(({ Icon, title, color, action }) => (
                      <button
                        key={title}
                        onClick={action}
                        title={title}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
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

        {/* Footer / pagination */}
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
                  onClick={() =>
                    fetchTransactions(
                      pagination.page - 1,
                      search,
                      typeFilter,
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
                      fetchTransactions(p, search, typeFilter, fromDate, toDate)
                    }
                  >
                    {p}
                  </PgBtn>
                ))}
                <PgBtn
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    fetchTransactions(
                      pagination.page + 1,
                      search,
                      typeFilter,
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

      {/* ════════════════════════════ MODALS ════════════════════════════════ */}
      <AnimatePresence>
        {/* ── RECORD TRANSACTION ── */}
        {mode === "record" && (
          <Modal title="Record Transaction" onClose={() => setMode(null)} wide>
            <form onSubmit={handleRecord} className="space-y-5">
              {/* Transaction type toggle */}
              <Field label="Transaction Type" required>
                <div className="grid grid-cols-2 gap-2">
                  {(["deposit", "withdrawal"] as const).map((t) => {
                    const meta = TX_TYPE_META[t];
                    const active = txType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTxType(t)}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                        style={
                          active
                            ? {
                                background:
                                  t === "deposit"
                                    ? "linear-gradient(135deg,rgba(34,197,94,0.22),rgba(34,197,94,0.12))"
                                    : "linear-gradient(135deg,rgba(239,68,68,0.22),rgba(239,68,68,0.12))",
                                border: `1.5px solid ${meta.border}`,
                                color: meta.color,
                                boxShadow: `0 0 16px ${meta.color}22`,
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(255,255,255,0.38)",
                              }
                        }
                      >
                        <meta.Icon className="w-4 h-4" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Step 1 — Select Member */}
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
                      <p className="text-sm font-bold text-white leading-tight">
                        {chosenMember.firstName} {chosenMember.lastName}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {chosenMember.memberId} · {chosenMember.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChosenMember(null);
                        setMemberAccounts([]);
                        setChosenAccount(null);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0"
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
                    {/* filter bar */}
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
                    {/* list */}
                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                      {membersLoading ? (
                        <div
                          className="flex items-center justify-center gap-2 py-8"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          <Loader2
                            className="w-4 h-4 animate-spin"
                            style={{ color: "#C8963E" }}
                          />
                          <span className="text-sm">Loading members…</span>
                        </div>
                      ) : (
                        (() => {
                          const q = memberFilter.toLowerCase();
                          const filtered = allMembers.filter(
                            (m) =>
                              !q ||
                              `${m.firstName} ${m.lastName}`
                                .toLowerCase()
                                .includes(q) ||
                              m.memberId.toLowerCase().includes(q) ||
                              m.email.toLowerCase().includes(q),
                          );
                          return filtered.length === 0 ? (
                            <p
                              className="text-center text-sm py-8"
                              style={{ color: "rgba(255,255,255,0.25)" }}
                            >
                              No members found
                            </p>
                          ) : (
                            filtered.map((m, i) => (
                              <button
                                key={m._id}
                                type="button"
                                onClick={() => {
                                  setChosenMember(m);
                                  setMemberFilter("");
                                  fetchMemberAccounts(m._id);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                                style={{
                                  borderBottom:
                                    i < filtered.length - 1
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
                                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0"
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
                                    className="text-[11px] truncate"
                                    style={{ color: "rgba(255,255,255,0.38)" }}
                                  >
                                    {m.memberId} · {m.email}
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

              {/* Step 2 — Select Account (only shown after member is picked) */}
              {chosenMember && (
                <Field label="Step 2 — Select Account" required>
                  {acctLoading ? (
                    <div
                      className="flex items-center gap-2 py-4"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        style={{ color: "#C8963E" }}
                      />
                      <span className="text-sm">Loading accounts…</span>
                    </div>
                  ) : memberAccounts.length === 0 ? (
                    <div
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-300">
                        This member has no active savings accounts.
                      </p>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(200,150,62,0.18)" }}
                    >
                      {memberAccounts.map((acc, i) => {
                        const at = ACCT_TYPE_META[acc.accountType];
                        const isSel = chosenAccount?._id === acc._id;
                        return (
                          <button
                            key={acc._id}
                            type="button"
                            onClick={() => setChosenAccount(acc)}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150"
                            style={{
                              borderBottom:
                                i < memberAccounts.length - 1
                                  ? "1px solid rgba(200,150,62,0.09)"
                                  : "none",
                              background: isSel
                                ? "rgba(200,150,62,0.12)"
                                : "rgba(11,29,58,0.50)",
                              borderLeft: isSel
                                ? "3px solid #C8963E"
                                : "3px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSel)
                                e.currentTarget.style.background =
                                  "rgba(200,150,62,0.06)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSel)
                                e.currentTarget.style.background =
                                  "rgba(11,29,58,0.50)";
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: at.bg,
                                border: `1px solid ${at.border}`,
                              }}
                            >
                              <Wallet
                                className="w-4 h-4"
                                style={{ color: at.color }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white">
                                  {acc.accountName}
                                </p>
                                <span
                                  className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: at.bg,
                                    color: at.color,
                                    border: `1px solid ${at.border}`,
                                  }}
                                >
                                  {at.label}
                                </span>
                              </div>
                              <p
                                className="text-[11px] font-mono mt-0.5"
                                style={{ color: "rgba(255,255,255,0.38)" }}
                              >
                                {acc.accountNumber}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p
                                className="text-xs font-black"
                                style={{ color: "#E4B86A" }}
                              >
                                {fmt(acc.balance)}
                              </p>
                              <p
                                className="text-[10px]"
                                style={{ color: "rgba(255,255,255,0.3)" }}
                              >
                                Balance
                              </p>
                            </div>
                            {isSel && (
                              <CheckCircle2
                                className="w-4 h-4 shrink-0 ml-1"
                                style={{ color: "#C8963E" }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
              )}

              {/* Step 3 — Amount, date, description */}
              {chosenAccount && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Amount (GH₵)" required>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                          style={{ color: "rgba(200,150,62,0.5)" }}
                        />
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className={inputCls + " pl-9"}
                          style={inputStyle}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                          required
                        />
                      </div>
                      {txType === "withdrawal" &&
                        chosenAccount &&
                        parseFloat(amount) > chosenAccount.balance && (
                          <p className="text-xs mt-1.5 flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Exceeds balance of {fmt(chosenAccount.balance)}
                          </p>
                        )}
                    </Field>

                    <Field label="Date" required>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                          style={{ color: "rgba(200,150,62,0.5)" }}
                        />
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          className={inputCls + " pl-9"}
                          style={{ ...inputStyle, colorScheme: "dark" }}
                          onFocus={inputFocus}
                          onBlur={inputBlur}
                          required
                        />
                      </div>
                    </Field>
                  </div>

                  <Field label="Description (optional)">
                    <textarea
                      rows={2}
                      placeholder="Optional note about this transaction…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={inputCls + " resize-none"}
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                  </Field>

                  {/* Summary strip */}
                  <div
                    className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    style={{
                      background:
                        txType === "deposit"
                          ? "rgba(34,197,94,0.07)"
                          : "rgba(239,68,68,0.07)",
                      border: `1px solid ${txType === "deposit" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                    }}
                  >
                    <div>
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        Current balance
                      </p>
                      <p className="text-base font-black text-white">
                        {fmt(chosenAccount.balance)}
                      </p>
                    </div>
                    <div
                      className="text-xl font-black"
                      style={{
                        color: txType === "deposit" ? "#4ade80" : "#f87171",
                      }}
                    >
                      {txType === "deposit" ? "+" : "−"}
                      {amount ? fmt(parseFloat(amount) || 0) : "GH₵0.00"}
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        New balance
                      </p>
                      <p
                        className="text-base font-black"
                        style={{ color: "#E4B86A" }}
                      >
                        {fmt(
                          txType === "deposit"
                            ? chosenAccount.balance + (parseFloat(amount) || 0)
                            : chosenAccount.balance - (parseFloat(amount) || 0),
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
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
                    formLoading ||
                    !chosenAccount ||
                    !amount ||
                    (txType === "withdrawal" &&
                      parseFloat(amount) > (chosenAccount?.balance ?? 0))
                  }
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
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
                      {txType === "deposit" ? (
                        <ArrowDownCircle className="w-4 h-4" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4" />
                      )}
                      Record {TX_TYPE_META[txType].label}
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── VIEW TRANSACTION ── */}
        {mode === "view" && selected && (
          <Modal title="Transaction Details" onClose={() => setMode(null)}>
            <div className="space-y-4">
              {/* Type hero */}
              <div
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background:
                    selected.transactionType === "deposit"
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(239,68,68,0.08)",
                  border: `1px solid ${selected.transactionType === "deposit" ? "rgba(34,197,94,0.22)" : "rgba(239,68,68,0.22)"}`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      selected.transactionType === "deposit"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                    border: `1px solid ${selected.transactionType === "deposit" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}
                >
                  {selected.transactionType === "deposit" ? (
                    <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ArrowUpCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-serif font-black text-white text-lg capitalize">
                    {selected.transactionType}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {format(new Date(selected.date), "MMMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <p
                  className="font-serif font-black text-2xl shrink-0"
                  style={{
                    color:
                      selected.transactionType === "deposit"
                        ? "#4ade80"
                        : "#f87171",
                  }}
                >
                  {selected.transactionType === "deposit" ? "+" : "-"}
                  {fmt(selected.amount)}
                </p>
              </div>

              {/* Detail rows */}
              <div className="space-y-2">
                {[
                  {
                    icon: User,
                    label: "Member",
                    value: `${selected.memberId?.firstName} ${selected.memberId?.lastName} (${selected.memberId?.memberId})`,
                  },
                  {
                    icon: Hash,
                    label: "Account",
                    value: `${selected.accountId?.accountName} · ${selected.accountId?.accountNumber}`,
                  },
                  {
                    icon: DollarSign,
                    label: "Amount",
                    value: fmt(selected.amount),
                  },
                  {
                    icon: TrendingUp,
                    label: "Balance After",
                    value: fmt(selected.balanceAfter),
                  },
                  {
                    icon: Calendar,
                    label: "Date",
                    value: format(new Date(selected.date), "MMM d, yyyy"),
                  },
                  {
                    icon: User,
                    label: "Recorded By",
                    value: `${selected.recordedBy?.name} (${selected.recordedBy?.role})`,
                  },
                  ...(selected.description
                    ? [
                        {
                          icon: FileText,
                          label: "Description",
                          value: selected.description,
                        },
                      ]
                    : []),
                ].map(({ icon: Icon, label, value }) => (
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
                      <Icon
                        className="w-3.5 h-3.5"
                        style={{ color: "#C8963E" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-[9px] font-black uppercase tracking-wider"
                        style={{ color: "rgba(255,255,255,0.32)" }}
                      >
                        {label}
                      </p>
                      <p className="text-sm font-semibold text-white truncate">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setEditDesc(selected.description ?? "");
                    setEditDate(selected.date.split("T")[0]);
                    setMode("edit");
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setMode(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
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
        )}

        {/* ── EDIT TRANSACTION ── */}
        {mode === "edit" && selected && (
          <Modal title="Edit Transaction" onClose={() => setMode(null)}>
            <form onSubmit={handleEdit} className="space-y-4">
              {/* Read-only info */}
              <div
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{
                  background: "rgba(200,150,62,0.07)",
                  border: "1px solid rgba(200,150,62,0.15)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:
                      selected.transactionType === "deposit"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                  }}
                >
                  {selected.transactionType === "deposit" ? (
                    <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-white capitalize">
                    {selected.transactionType} · {fmt(selected.amount)}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {selected.memberId?.firstName} {selected.memberId?.lastName}{" "}
                    · {selected.accountId?.accountNumber}
                  </p>
                </div>
              </div>

              <p
                className="text-xs px-1"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                Only the description and date can be edited. The amount is
                immutable.
              </p>

              <Field label="Date">
                <div className="relative">
                  <Calendar
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={inputCls + " pl-9"}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </div>
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add or update a note…"
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
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
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
                  disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-55"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                    boxShadow: "0 6px 20px rgba(200,150,62,0.3)",
                  }}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── REVERSE / DELETE TRANSACTION ── */}
        {mode === "delete" && selected && (
          <Modal title="Reverse Transaction" onClose={() => setMode(null)}>
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
                  Reverse this transaction?
                </p>
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.42)" }}
                >
                  This will permanently delete the{" "}
                  <span
                    className="font-semibold capitalize"
                    style={{
                      color:
                        selected.transactionType === "deposit"
                          ? "#4ade80"
                          : "#f87171",
                    }}
                  >
                    {selected.transactionType}
                  </span>{" "}
                  of{" "}
                  <span className="text-white font-semibold">
                    {fmt(selected.amount)}
                  </span>{" "}
                  and restore the account balance accordingly.
                </p>

                {/* Transaction summary */}
                <div
                  className="mt-4 p-3.5 rounded-xl text-left space-y-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Member
                    </span>
                    <span className="text-white font-semibold">
                      {selected.memberId?.firstName}{" "}
                      {selected.memberId?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Account
                    </span>
                    <span className="font-mono text-[#E4B86A] text-xs">
                      {selected.accountId?.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>
                      Amount
                    </span>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          selected.transactionType === "deposit"
                            ? "#4ade80"
                            : "#f87171",
                      }}
                    >
                      {selected.transactionType === "deposit" ? "+" : "-"}
                      {fmt(selected.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>Date</span>
                    <span className="text-white">
                      {format(new Date(selected.date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
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
                  disabled={delLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {delLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Reverse &amp; Delete
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
