"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  AlertTriangle,
  DollarSign,
  Calendar,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

/* ─── Types ── */
interface SavingsAccount {
  _id: string;
  accountNumber: string;
  accountType: "regular" | "fixed" | "susu";
  accountName: string;
  balance: number;
  status: string;
}

interface Transaction {
  _id: string;
  transactionType: "deposit" | "withdrawal";
  amount: number;
  balanceAfter: number;
  date: string;
  description?: string;
  accountId: {
    _id: string;
    accountNumber: string;
    accountType: string;
    accountName: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type ModalMode = "transact" | null;

/* ─── Helpers ── */
const ACCT_META = {
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

/* ─── Modal Shell ── */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
        className="w-full max-w-sm overflow-hidden rounded-2xl"
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
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
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

/* ─── Main ── */
export default function MemberSavingsPage() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "deposit" | "withdrawal"
  >("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  /* modal */
  const [mode, setMode] = useState<ModalMode>(null);
  const [selectedAccount, setSelectedAccount] = useState<SavingsAccount | null>(
    null,
  );
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txDate, setTxDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [formLoading, setFormLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchAll = useCallback(
    async (page = 1, type = typeFilter, from = fromDate, to = toDate) => {
      setLoading(true);
      try {
        const [accRes, txRes] = await Promise.all([
          fetch("/api/savings/accounts", { credentials: "include" }),
          fetch(
            `/api/savings/transactions?page=${page}&limit=20${type !== "all" ? `&type=${type}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`,
            { credentials: "include" },
          ),
        ]);
        const [accJson, txJson] = await Promise.all([
          accRes.json(),
          txRes.json(),
        ]);
        if (accRes.ok) setAccounts(accJson.accounts ?? []);
        if (txRes.ok) {
          setTransactions(txJson.transactions ?? []);
          setPagination(txJson.pagination);
        }
      } catch {
        toast.error("Failed to load savings data");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [typeFilter, fromDate, toDate],
  );

  useEffect(() => {
    fetchAll(1, "all", "", "");
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchAll(1, typeFilter, fromDate, toDate),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [typeFilter, fromDate, toDate, fetchAll]);

  async function handleTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
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
          accountId: selectedAccount._id,
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
      setAmount("");
      setDescription("");
      fetchAll(pagination.page, typeFilter, fromDate, toDate);
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  }

  const totalDeposits = transactions
    .filter((t) => t.transactionType === "deposit")
    .reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions
    .filter((t) => t.transactionType === "withdrawal")
    .reduce((s, t) => s + t.amount, 0);
  const totalBalance = accounts
    .filter((a) => a.status !== "closed")
    .reduce((s, a) => s + a.balance, 0);

  const displayed = search.trim()
    ? transactions.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.accountId?.accountName?.toLowerCase().includes(q) ||
          t.accountId?.accountNumber?.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
        );
      })
    : transactions;

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
            Savings Management
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
            My <span style={{ color: "#E4B86A" }}>Savings</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Manage your deposits and withdrawals
          </p>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Balance",
            val: fmt(totalBalance),
            icon: Wallet,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Accounts",
            val: accounts.length,
            icon: FileText,
            gradient: "linear-gradient(135deg,#1e3a5f,#60a5fa)",
          },
          {
            label: "Deposits (page)",
            val: fmt(totalDeposits),
            icon: TrendingUp,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
          {
            label: "Withdrawals (page)",
            val: fmt(totalWithdrawals),
            icon: TrendingDown,
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

      {/* ── Accounts ── */}
      <div>
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ color: "rgba(228,184,106,0.5)" }}
        >
          Your Accounts
        </p>
        {accounts.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            <Wallet
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: "rgba(200,150,62,0.22)" }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>
              No accounts found. Contact staff to open one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {accounts.map((acc, i) => {
              const meta = ACCT_META[acc.accountType] ?? ACCT_META.regular;
              const isActive = acc.status === "active";
              return (
                <motion.div
                  key={acc._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-xl border p-4 flex flex-col gap-3"
                  style={{
                    background: "#122549",
                    borderColor: "rgba(200,150,62,0.14)",
                    borderTopColor: meta.color,
                    borderTopWidth: 2,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">
                        {acc.accountName}
                      </p>
                      <p
                        className="text-[11px] font-mono mt-0.5"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {acc.accountNumber}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase ${isActive ? "text-emerald-400" : "text-gray-500"}`}
                      >
                        {acc.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      Balance
                    </p>
                    <p
                      className="font-serif font-black text-xl"
                      style={{ color: meta.color }}
                    >
                      {fmt(acc.balance)}
                    </p>
                  </div>
                  {isActive && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setTxType("deposit");
                          setMode("transact");
                        }}
                        className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: "rgba(34,197,94,0.10)",
                          border: "1px solid rgba(34,197,94,0.22)",
                          color: "#4ade80",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(34,197,94,0.18)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(34,197,94,0.10)")
                        }
                      >
                        <ArrowDownCircle className="w-3.5 h-3.5" /> Deposit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setTxType("withdrawal");
                          setMode("transact");
                        }}
                        disabled={acc.balance <= 0}
                        className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: "rgba(239,68,68,0.10)",
                          border: "1px solid rgba(239,68,68,0.22)",
                          color: "#f87171",
                        }}
                        onMouseEnter={(e) => {
                          if (acc.balance > 0)
                            e.currentTarget.style.background =
                              "rgba(239,68,68,0.18)";
                        }}
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(239,68,68,0.10)")
                        }
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            placeholder="Search account name or description…"
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
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
        <button
          onClick={() => {
            setSpinning(true);
            fetchAll(pagination.page, typeFilter, fromDate, toDate);
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

      {/* ── Transaction Table ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: "1.4fr 90px 120px 120px 100px",
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.1)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          <span>Account</span>
          <span>Type</span>
          <span>Amount</span>
          <span>Balance After</span>
          <span>Date</span>
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
          <div className="flex flex-col items-center justify-center py-16 gap-3">
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
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.07)" }}
          >
            {displayed.map((tx, i) => {
              const isD = tx.transactionType === "deposit";
              const meta =
                ACCT_META[
                  tx.accountId?.accountType as keyof typeof ACCT_META
                ] ?? ACCT_META.regular;
              return (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid gap-4 px-5 py-4 items-center"
                  style={{
                    gridTemplateColumns: "1.4fr 90px 120px 120px 100px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(200,150,62,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {tx.accountId?.accountName ?? "—"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p
                        className="text-[11px] font-mono"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {tx.accountId?.accountNumber ?? "—"}
                      </p>
                      {tx.description && (
                        <p
                          className="text-[10px] truncate max-w-24"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {tx.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isD ? (
                      <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ArrowUpCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={
                        isD
                          ? {
                              background: "rgba(34,197,94,0.12)",
                              border: "1px solid rgba(34,197,94,0.28)",
                              color: "#4ade80",
                            }
                          : {
                              background: "rgba(239,68,68,0.12)",
                              border: "1px solid rgba(239,68,68,0.28)",
                              color: "#f87171",
                            }
                      }
                    >
                      {isD ? "Deposit" : "Withdrawal"}
                    </span>
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: isD ? "#4ade80" : "#f87171" }}
                  >
                    {isD ? "+" : "-"}
                    {fmt(tx.amount)}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "rgba(255,255,255,0.65)" }}
                  >
                    {fmt(tx.balanceAfter)}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.38)" }}
                  >
                    {format(new Date(tx.date), "MMM d, yyyy")}
                  </p>
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
                  onClick={() =>
                    fetchAll(pagination.page - 1, typeFilter, fromDate, toDate)
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
                    onClick={() => fetchAll(p, typeFilter, fromDate, toDate)}
                  >
                    {p}
                  </PgBtn>
                ))}
                <PgBtn
                  disabled={pagination.page >= pagination.pages}
                  onClick={() =>
                    fetchAll(pagination.page + 1, typeFilter, fromDate, toDate)
                  }
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </PgBtn>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Transaction Modal ── */}
      <AnimatePresence>
        {mode === "transact" && selectedAccount && (
          <Modal
            title={
              txType === "deposit" ? "Make a Deposit" : "Make a Withdrawal"
            }
            onClose={() => {
              setMode(null);
              setAmount("");
              setDescription("");
            }}
          >
            <form onSubmit={handleTransaction} className="space-y-5">
              {/* Type toggle */}
              <Field label="Transaction Type" required>
                <div className="grid grid-cols-2 gap-2">
                  {(["deposit", "withdrawal"] as const).map((t) => {
                    const active = txType === t;
                    const color = t === "deposit" ? "#4ade80" : "#f87171";
                    const bg =
                      t === "deposit"
                        ? "rgba(34,197,94,0.22)"
                        : "rgba(239,68,68,0.22)";
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTxType(t)}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                        style={
                          active
                            ? {
                                background: bg,
                                border: `1.5px solid ${color}50`,
                                color,
                                boxShadow: `0 0 16px ${color}22`,
                              }
                            : {
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "rgba(255,255,255,0.38)",
                              }
                        }
                      >
                        {t === "deposit" ? (
                          <ArrowDownCircle className="w-4 h-4" />
                        ) : (
                          <ArrowUpCircle className="w-4 h-4" />
                        )}
                        {t === "deposit" ? "Deposit" : "Withdrawal"}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Account info strip */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: "rgba(200,150,62,0.10)",
                  border: "1px solid rgba(200,150,62,0.28)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">
                    {selectedAccount.accountName}
                  </p>
                  <p
                    className="text-[11px] font-mono"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {selectedAccount.accountNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-xs font-black"
                    style={{ color: "#E4B86A" }}
                  >
                    {fmt(selectedAccount.balance)}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Balance
                  </p>
                </div>
              </div>

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
                    parseFloat(amount) > selectedAccount.balance && (
                      <p className="text-xs mt-1.5 flex items-center gap-1.5 text-red-400">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> Exceeds
                        balance of {fmt(selectedAccount.balance)}
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
                  placeholder="Optional note…"
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
                    {fmt(selectedAccount.balance)}
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
                        ? selectedAccount.balance + (parseFloat(amount) || 0)
                        : selectedAccount.balance - (parseFloat(amount) || 0),
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode(null);
                    setAmount("");
                    setDescription("");
                  }}
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
                  disabled={
                    formLoading ||
                    !amount ||
                    (txType === "withdrawal" &&
                      parseFloat(amount) > selectedAccount.balance)
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
                      Confirm {txType === "deposit" ? "Deposit" : "Withdrawal"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
