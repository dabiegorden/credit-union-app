"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  Loader2,
  Wallet,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  User,
  Hash,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
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

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface SavingsAccount {
  _id: string;
  accountNumber: string;
  memberId: PopulatedMember;
  accountType: "regular" | "fixed" | "susu";
  accountName: string;
  balance: number;
  status: "active" | "dormant" | "closed";
  openedBy: PopulatedUser;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  _id: string;
  transactionType: "deposit" | "withdrawal";
  amount: number;
  balanceAfter: number;
  description?: string;
  date: string;
  recordedBy: PopulatedUser;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type ModalMode = "open" | "edit" | "view" | "delete" | null;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const ACCOUNT_TYPE_META = {
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

const STATUS_META = {
  active: {
    label: "Active",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    Icon: CheckCircle2,
  },
  dormant: {
    label: "Dormant",
    color: "#E4B86A",
    bg: "rgba(200,150,62,0.13)",
    border: "rgba(200,150,62,0.3)",
    Icon: MinusCircle,
  },
  closed: {
    label: "Closed",
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    Icon: XCircle,
  },
};

function fmt(n: number) {
  return `GH₵${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initials(m: PopulatedMember) {
  return (m.firstName[0] + m.lastName[0]).toUpperCase();
}

/* ─── Modal Shell ─────────────────────────────────────────────────────────── */
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
          maxWidth: wide ? 620 : 480,
          background: "#0e1f3d",
          border: "1px solid rgba(200,150,62,0.22)",
          boxShadow:
            "0 28px 70px rgba(7,17,34,0.85), 0 0 0 1px rgba(200,150,62,0.06)",
        }}
      >
        {/* gold top bar */}
        <div
          className="h-0.75"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        {/* header */}
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

/* ─── Field wrapper ───────────────────────────────────────────────────────── */
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
const inputStyle = {
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

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function AdminSavingsAccountPage() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<SavingsAccount | null>(null);
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [delLoading, setDelLoading] = useState(false);

  // Open account form
  const [allMembers, setAllMembers] = useState<PopulatedMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState("");
  const [chosenMember, setChosenMember] = useState<PopulatedMember | null>(
    null,
  );
  const [acctType, setAcctType] = useState<"regular" | "fixed" | "susu">(
    "regular",
  );
  const [acctName, setAcctName] = useState("");
  const [acctDesc, setAcctDesc] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "dormant" | "closed">(
    "active",
  );
  const [editDesc, setEditDesc] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /* ── Fetch accounts ── */
  const fetchAccounts = useCallback(
    async (page = 1, q = search, status = statusFilter, type = typeFilter) => {
      setLoading(true);
      try {
        const p = new URLSearchParams({ page: String(page), limit: "20" });
        if (q) p.set("search", q);
        if (status !== "all") p.set("status", status);
        if (type !== "all") p.set("type", type);

        const res = await fetch(`/api/savings/accounts?${p}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAccounts(data.accounts);
        setPagination(data.pagination);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load accounts",
        );
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [search, statusFilter, typeFilter],
  );

  useEffect(() => {
    fetchAccounts(1, "", "all", "all");
  }, []); // eslint-disable-line

  // Debounced search/filter
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchAccounts(1, search, statusFilter, typeFilter),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, statusFilter, typeFilter, fetchAccounts]);

  /* ── Fetch all active members for the open-account selector ── */
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

  /* ── Stats ── */
  const stats = {
    total: pagination.total,
    active: accounts.filter((a) => a.status === "active").length,
    dormant: accounts.filter((a) => a.status === "dormant").length,
    closed: accounts.filter((a) => a.status === "closed").length,
    volume: accounts.reduce((s, a) => s + a.balance, 0),
  };

  /* ── Open "view" modal + load transactions ── */
  const openView = async (acc: SavingsAccount) => {
    setSelected(acc);
    setMode("view");
    setTxList([]);
    setTxLoading(true);
    try {
      const res = await fetch(`/api/savings/accounts/${acc._id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) setTxList(data.recentTransactions ?? []);
    } catch {
      /* silent */
    } finally {
      setTxLoading(false);
    }
  };

  /* ── Open "edit" modal ── */
  const openEdit = (acc: SavingsAccount) => {
    setSelected(acc);
    setEditName(acc.accountName);
    setEditStatus(acc.status);
    setEditDesc(acc.description ?? "");
    setMode("edit");
  };

  /* ── Reset open form ── */
  const resetOpenForm = () => {
    setChosenMember(null);
    setMemberFilter("");
    setAcctType("regular");
    setAcctName("");
    setAcctDesc("");
  };

  /* ── Submit: open new account ── */
  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenMember) {
      toast.error("Please select a member");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/savings/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          memberId: chosenMember._id,
          accountType: acctType,
          accountName: acctName || undefined,
          description: acctDesc || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      resetOpenForm();
      fetchAccounts(1, search, statusFilter, typeFilter);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Submit: edit account ── */
  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/savings/accounts/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountName: editName,
          status: editStatus,
          description: editDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(data.message);
      setMode(null);
      fetchAccounts(pagination.page, search, statusFilter, typeFilter);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete account ── */
  const handleDelete = async () => {
    if (!selected) return;
    setDelLoading(true);
    try {
      const res = await fetch(`/api/savings/accounts/${selected._id}`, {
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
      setAccounts((prev) => prev.filter((a) => a._id !== selected._id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch {
      toast.error("Network error");
    } finally {
      setDelLoading(false);
    }
  };

  /* ─── Render ──────────────────────────────────────────────────────────── */
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
            Savings <span style={{ color: "#E4B86A" }}>Accounts</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Open, manage and monitor all member savings accounts
          </p>
        </div>

        <button
          onClick={() => {
            resetOpenForm();
            fetchAllMembers();
            setMode("open");
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          <Plus className="w-4 h-4" />
          Open Account
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total Accounts",
            val: stats.total,
            icon: Wallet,
            color: "#E4B86A",
          },
          {
            label: "Active",
            val: stats.active,
            icon: CheckCircle2,
            color: "#4ade80",
          },
          {
            label: "Dormant",
            val: stats.dormant,
            icon: MinusCircle,
            color: "#E4B86A",
          },
          {
            label: "Closed",
            val: stats.closed,
            icon: XCircle,
            color: "#f87171",
          },
          {
            label: "Total Balance",
            val: fmt(stats.volume),
            icon: TrendingUp,
            color: "#E4B86A",
            wide: true,
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`rounded-xl border p-4 ${s.wide ? "col-span-2 lg:col-span-1" : ""}`}
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
              <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
            </div>
            <p
              className="font-serif font-black text-white"
              style={{ fontSize: s.wide ? "17px" : "24px" }}
            >
              {s.val}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search account number, member name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputCls + " pl-10"}
            style={{ ...inputStyle, minWidth: 0 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>

        {/* Status filter */}
        <div className="relative shrink-0">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputCls + " pl-8 pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 145 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="closed">Closed</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
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
            onChange={(e) => setTypeFilter(e.target.value)}
            className={inputCls + " pl-8 pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 145 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="all">All Types</option>
            <option value="regular">Regular</option>
            <option value="fixed">Fixed Deposit</option>
            <option value="susu">Susu</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => {
            setSpinning(true);
            fetchAccounts(pagination.page, search, statusFilter, typeFilter);
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
            gridTemplateColumns: "1.4fr 1.2fr 90px 100px 110px 100px auto",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>Member</span>
          <span>Account</span>
          <span>Type</span>
          <span>Balance</span>
          <span>Status</span>
          <span className="hidden md:block">Opened</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-5 py-4">
                <div
                  className="h-10 rounded-xl animate-pulse"
                  style={{ background: "rgba(200,150,62,0.05)" }}
                />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Wallet
              className="w-10 h-10"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No savings accounts found
            </p>
            <button
              onClick={() => {
                resetOpenForm();
                setMode("open");
              }}
              className="text-xs font-bold transition-colors"
              style={{ color: "#E4B86A" }}
            >
              + Open the first account
            </button>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {accounts.map((acc, i) => {
              const sm = STATUS_META[acc.status];
              const tm = ACCOUNT_TYPE_META[acc.accountType];
              return (
                <motion.div
                  key={acc._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.025 }}
                  className="grid gap-4 px-5 py-4 items-center group transition-colors duration-100"
                  style={{
                    gridTemplateColumns:
                      "1.4fr 1.2fr 90px 100px 110px 100px auto",
                    cursor: "default",
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
                      {initials(acc.memberId)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {acc.memberId.firstName} {acc.memberId.lastName}
                      </p>
                      <p
                        className="text-[10px] truncate font-medium"
                        style={{ color: "#E4B86A" }}
                      >
                        {acc.memberId.memberId}
                      </p>
                    </div>
                  </div>

                  {/* Account */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {acc.accountName}
                    </p>
                    <p
                      className="text-[11px] font-mono"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {acc.accountNumber}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full w-fit"
                    style={{
                      background: tm.bg,
                      border: `1px solid ${tm.border}`,
                      color: tm.color,
                    }}
                  >
                    {tm.label}
                  </span>

                  {/* Balance */}
                  <p className="text-sm font-bold" style={{ color: "#E4B86A" }}>
                    {fmt(acc.balance)}
                  </p>

                  {/* Status badge */}
                  <div className="flex items-center gap-1.5">
                    <sm.Icon
                      className="w-3 h-3 shrink-0"
                      style={{ color: sm.color }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: sm.bg,
                        border: `1px solid ${sm.border}`,
                        color: sm.color,
                      }}
                    >
                      {sm.label}
                    </span>
                  </div>

                  {/* Opened date */}
                  <p
                    className="text-xs hidden md:block"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {format(new Date(acc.createdAt), "MMM d, yyyy")}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {[
                      {
                        Icon: Eye,
                        title: "View",
                        color: "#C8963E",
                        action: () => openView(acc),
                      },
                      {
                        Icon: Pencil,
                        title: "Edit",
                        color: "#E4B86A",
                        action: () => openEdit(acc),
                      },
                      {
                        Icon: Trash2,
                        title: "Delete",
                        color: "#f87171",
                        action: () => {
                          setSelected(acc);
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
        {!loading && accounts.length > 0 && (
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
                    fetchAccounts(
                      pagination.page - 1,
                      search,
                      statusFilter,
                      typeFilter,
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
                      fetchAccounts(p, search, statusFilter, typeFilter)
                    }
                  >
                    {p}
                  </PgBtn>
                ))}
                <PgBtn
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    fetchAccounts(
                      pagination.page + 1,
                      search,
                      statusFilter,
                      typeFilter,
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

      {/* ═══════════════════════════════════════ MODALS ════════════════════════ */}
      <AnimatePresence>
        {/* ── OPEN ACCOUNT MODAL ── */}
        {mode === "open" && (
          <Modal
            title="Open Savings Account"
            onClose={() => setMode(null)}
            wide
          >
            <form onSubmit={handleOpenAccount} className="space-y-5">
              {/* Member selector — fetched list */}
              <Field label="Select Member" required>
                {/* Selected member pill */}
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
                      onClick={() => setChosenMember(null)}
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
                    {/* Filter bar inside the list */}
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

                    {/* Scrollable list */}
                    <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
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

              <div className="grid grid-cols-2 gap-4">
                <Field label="Account Type" required>
                  <div className="relative">
                    <select
                      value={acctType}
                      onChange={(e) =>
                        setAcctType(
                          e.target.value as "regular" | "fixed" | "susu",
                        )
                      }
                      className={
                        inputCls + " pr-8 appearance-none cursor-pointer"
                      }
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    >
                      <option value="regular">Regular Savings</option>
                      <option value="fixed">Fixed Deposit</option>
                      <option value="susu">Susu Savings</option>
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                      style={{ color: "rgba(200,150,62,0.45)" }}
                    />
                  </div>
                </Field>

                <Field label="Account Name">
                  <input
                    placeholder="e.g. My Savings"
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  />
                </Field>
              </div>

              <Field label="Description (optional)">
                <textarea
                  rows={2}
                  placeholder="Optional notes about this account…"
                  value={acctDesc}
                  onChange={(e) => setAcctDesc(e.target.value)}
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
                  disabled={formLoading || !chosenMember}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-55 disabled:hover:translate-y-0"
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
                      <Plus className="w-4 h-4" /> Open Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ── EDIT ACCOUNT MODAL ── */}
        {mode === "edit" && selected && (
          <Modal title="Edit Account" onClose={() => setMode(null)}>
            <form onSubmit={handleEditAccount} className="space-y-4">
              {/* Read-only info row */}
              <div
                className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{
                  background: "rgba(200,150,62,0.07)",
                  border: "1px solid rgba(200,150,62,0.15)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  {initials(selected.memberId)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {selected.memberId.firstName} {selected.memberId.lastName}
                  </p>
                  <p
                    className="text-[11px] font-mono"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {selected.accountNumber}
                  </p>
                </div>
              </div>

              <Field label="Account Name" required>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  required
                />
              </Field>

              <Field label="Account Status">
                <div className="relative">
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(
                        e.target.value as "active" | "dormant" | "closed",
                      )
                    }
                    className={
                      inputCls + " pr-8 appearance-none cursor-pointer"
                    }
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                  >
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                    <option value="closed">Closed</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                    style={{ color: "rgba(200,150,62,0.45)" }}
                  />
                </div>
                {editStatus === "closed" && (
                  <p
                    className="text-xs mt-1.5 flex items-center gap-1.5"
                    style={{ color: "#f87171" }}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Closing requires a zero balance. Ensure all funds are
                    withdrawn first.
                  </p>
                )}
              </Field>

              <Field label="Description">
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
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

        {/* ── VIEW ACCOUNT MODAL ── */}
        {mode === "view" && selected && (
          <Modal title="Account Details" onClose={() => setMode(null)} wide>
            <div className="space-y-5">
              {/* Hero strip */}
              <div
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{
                  background: "rgba(200,150,62,0.07)",
                  border: "1px solid rgba(200,150,62,0.18)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }}
                  >
                    {initials(selected.memberId)}
                  </div>
                  <div>
                    <p className="font-serif font-black text-white text-lg">
                      {selected.memberId.firstName} {selected.memberId.lastName}
                    </p>
                    <p
                      className="text-[11px] font-mono"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {selected.accountNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs uppercase tracking-wider font-semibold mb-1"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Balance
                  </p>
                  <p
                    className="font-serif font-black text-2xl"
                    style={{ color: "#E4B86A" }}
                  >
                    {fmt(selected.balance)}
                  </p>
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    icon: Hash,
                    label: "Account No.",
                    value: selected.accountNumber,
                  },
                  {
                    icon: Wallet,
                    label: "Type",
                    value: ACCOUNT_TYPE_META[selected.accountType].label,
                  },
                  {
                    icon: User,
                    label: "Member ID",
                    value: selected.memberId.memberId,
                  },
                  {
                    icon: Calendar,
                    label: "Opened",
                    value: format(new Date(selected.createdAt), "MMM d, yyyy"),
                  },
                  {
                    icon: User,
                    label: "Opened By",
                    value: selected.openedBy?.name ?? "—",
                  },
                  {
                    icon: DollarSign,
                    label: "Balance",
                    value: fmt(selected.balance),
                  },
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

              {/* Recent transactions */}
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-2.5"
                  style={{ color: "rgba(228,184,106,0.5)" }}
                >
                  Recent Transactions
                </p>
                {txLoading ? (
                  <div
                    className="flex items-center justify-center py-8 gap-2"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      style={{ color: "#C8963E" }}
                    />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : txList.length === 0 ? (
                  <p
                    className="text-sm text-center py-6"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    No transactions yet
                  </p>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden border"
                    style={{ borderColor: "rgba(200,150,62,0.12)" }}
                  >
                    {txList.map((tx, i) => (
                      <div
                        key={tx._id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors"
                        style={{
                          borderBottom:
                            i < txList.length - 1
                              ? "1px solid rgba(200,150,62,0.07)"
                              : "none",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(200,150,62,0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background:
                              tx.transactionType === "deposit"
                                ? "rgba(34,197,94,0.12)"
                                : "rgba(239,68,68,0.12)",
                            border: `1px solid ${tx.transactionType === "deposit" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                          }}
                        >
                          {tx.transactionType === "deposit" ? (
                            <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowUpCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white capitalize">
                            {tx.transactionType}
                          </p>
                          <p
                            className="text-[10px] truncate"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            {tx.description ||
                              `By ${tx.recordedBy?.name ?? "—"}`}{" "}
                            · {format(new Date(tx.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
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
                          <p
                            className="text-[10px]"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            Bal: {fmt(tx.balanceAfter)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setMode(null);
                    openEdit(selected);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  <Pencil className="w-4 h-4" /> Edit Account
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

        {/* ── DELETE CONFIRM ── */}
        {mode === "delete" && selected && (
          <Modal title="Delete Account" onClose={() => setMode(null)}>
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
                  Delete this account?
                </p>
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.42)" }}
                >
                  You are about to permanently delete{" "}
                  <span className="text-white font-semibold">
                    {selected.accountName}
                  </span>{" "}
                  (
                  <span className="font-mono text-[#E4B86A]">
                    {selected.accountNumber}
                  </span>
                  ). This is only allowed for accounts with a zero balance and
                  no transactions.
                </p>
                {selected.balance > 0 && (
                  <div
                    className="mt-3 px-4 py-3 rounded-xl flex items-center gap-2"
                    style={{
                      background: "rgba(239,68,68,0.10)",
                      border: "1px solid rgba(239,68,68,0.22)",
                    }}
                  >
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">
                      Current balance is{" "}
                      <strong>{fmt(selected.balance)}</strong>. Withdraw all
                      funds before deleting.
                    </p>
                  </div>
                )}
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
                  disabled={delLoading || selected.balance > 0}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-45"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {delLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
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

/* ─── Pagination button ─────────────────────────────────────────────────────── */
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
