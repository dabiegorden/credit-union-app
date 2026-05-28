"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  User,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

/* ─── Types ── */
interface MemberProfile {
  _id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  savingsBalance: number;
  status: string;
  dateJoined: string;
}

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
    accountNumber: string;
    accountType: string;
    accountName: string;
  };
}

interface DashboardData {
  member: MemberProfile;
  savingsAccounts: SavingsAccount[];
  recentTransactions: Transaction[];
  loanSummary: { activeLoans: number; pendingLoans: number; paidLoans: number };
}

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

const inputStyle: React.CSSProperties = {
  background: "rgba(11,29,58,0.70)",
  border: "1px solid rgba(200,150,62,0.20)",
};

/* ─── Not Linked Screen ── */
function NotLinkedScreen({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0B1D3A" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
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
        <div className="px-8 py-10 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "rgba(200,150,62,0.12)",
              border: "1px solid rgba(200,150,62,0.25)",
            }}
          >
            <User className="w-7 h-7" style={{ color: "#E4B86A" }} />
          </div>
          <h2 className="font-serif font-black text-white text-xl mb-2">
            Account Not Linked
          </h2>
          <p
            className="text-sm leading-relaxed mb-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Hello <span className="text-white font-semibold">{userName}</span>,
            your login account
          </p>
          <p
            className="text-xs font-mono mb-5 px-3 py-1.5 rounded-lg inline-block"
            style={{
              background: "rgba(200,150,62,0.08)",
              color: "#E4B86A",
              border: "1px solid rgba(200,150,62,0.2)",
            }}
          >
            {userEmail}
          </p>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            is not yet linked to a Member profile. Please contact staff and
            provide your email address so they can complete your registration.
          </p>
          <div
            className="p-4 rounded-xl text-left space-y-2"
            style={{
              background: "rgba(200,150,62,0.06)",
              border: "1px solid rgba(200,150,62,0.14)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: "rgba(228,184,106,0.55)" }}
            >
              What to do
            </p>
            {[
              "Contact the credit union staff",
              "Provide your registered email address",
              "Staff will link your account",
              "Login again to access your dashboard",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main ── */
export default function MemberDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    code?: string;
    message: string;
    userName?: string;
    userEmail?: string;
  } | null>(null);
  const [spinning, setSpinning] = useState(false);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/member/profile", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError({
          code: json.code,
          message: json.message || json.error,
          userName: json.userName,
          userEmail: json.userEmail,
        });
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError({ message: "Network error. Please try again." });
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1D3A" }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)" }}
          >
            <Wallet className="w-5 h-5 text-[#0B1D3A]" />
          </div>
          <div
            className="w-48 h-0.5 rounded-full overflow-hidden mx-auto"
            style={{ background: "rgba(200,150,62,0.15)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#C8963E,#E4B86A)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
          <p
            className="text-xs mt-3"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Loading your dashboard…
          </p>
        </div>
      </div>
    );

  if (error?.code === "MEMBER_PROFILE_NOT_FOUND") {
    return (
      <NotLinkedScreen
        userName={error.userName || "Member"}
        userEmail={error.userEmail || ""}
      />
    );
  }

  if (error || !data)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0B1D3A" }}
      >
        <div className="text-center">
          <AlertTriangle
            className="w-10 h-10 mx-auto mb-3"
            style={{ color: "#f87171" }}
          />
          <p className="text-white font-bold mb-1">Something went wrong</p>
          <p
            className="text-sm mb-4"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {error?.message}
          </p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: "linear-gradient(135deg,#C8963E,#E4B86A)",
              color: "#0B1D3A",
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );

  const { member, savingsAccounts, recentTransactions, loanSummary } = data;
  const initials = (member.firstName[0] + member.lastName[0]).toUpperCase();

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
            Member Portal
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl leading-tight">
            Welcome,{" "}
            <span style={{ color: "#E4B86A" }}>{member.firstName}</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {member.memberId} · Member since{" "}
            {format(new Date(member.dateJoined), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${member.status === "active" ? "text-emerald-400" : "text-red-400"}`}
            style={{
              background:
                member.status === "active"
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(239,68,68,0.12)",
              border: `1px solid ${member.status === "active" ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${member.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
            />
            {member.status.toUpperCase()}
          </span>
          <button
            onClick={() => {
              setSpinning(true);
              fetchDashboard();
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
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
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Savings",
            val: fmt(member.savingsBalance),
            icon: Wallet,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Active Loans",
            val: loanSummary.activeLoans,
            icon: FileText,
            gradient: "linear-gradient(135deg,#1e3a5f,#60a5fa)",
          },
          {
            label: "Pending",
            val: loanSummary.pendingLoans,
            icon: Clock,
            gradient: "linear-gradient(135deg,#3b2500,#f59e0b)",
          },
          {
            label: "Loans Repaid",
            val: loanSummary.paidLoans,
            icon: CheckCircle2,
            gradient: "linear-gradient(135deg,#14532d,#4ade80)",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
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

      {/* ── Quick Actions ── */}
      <div>
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ color: "rgba(228,184,106,0.5)" }}
        >
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              href: "/member-dashboard/savings",
              icon: ArrowDownCircle,
              label: "Deposit",
              color: "#4ade80",
              bg: "rgba(34,197,94,0.10)",
              border: "rgba(34,197,94,0.22)",
            },
            {
              href: "/member-dashboard/savings",
              icon: ArrowUpCircle,
              label: "Withdraw",
              color: "#f87171",
              bg: "rgba(239,68,68,0.10)",
              border: "rgba(239,68,68,0.22)",
            },
            {
              href: "/member-dashboard/loans/apply",
              icon: FileText,
              label: "Apply for Loan",
              color: "#E4B86A",
              bg: "rgba(200,150,62,0.10)",
              border: "rgba(200,150,62,0.22)",
            },
            {
              href: "/member-dashboard/loans",
              icon: TrendingUp,
              label: "Track Loans",
              color: "#60a5fa",
              bg: "rgba(59,130,246,0.10)",
              border: "rgba(59,130,246,0.22)",
            },
          ].map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:scale-105"
              style={{ background: a.bg, borderColor: a.border }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `${a.color}18`,
                  border: `1px solid ${a.color}33`,
                }}
              >
                <a.icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <span className="text-xs font-bold text-white">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Savings Accounts ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              My Accounts
            </p>
            <Link
              href="/member-dashboard/loans/savings"
              className="flex items-center gap-1 text-xs font-bold transition-colors hover:underline"
              style={{ color: "#E4B86A" }}
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            {savingsAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Wallet
                  className="w-8 h-8"
                  style={{ color: "rgba(200,150,62,0.22)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  No accounts yet
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.18)" }}
                >
                  Contact staff to open an account
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "rgba(200,150,62,0.07)" }}
              >
                {savingsAccounts.map((acc, i) => {
                  const meta = ACCT_META[acc.accountType] ?? ACCT_META.regular;
                  return (
                    <motion.div
                      key={acc._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-100"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(200,150,62,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        <Wallet
                          className="w-4 h-4"
                          style={{ color: meta.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {acc.accountName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p
                            className="text-[11px] font-mono"
                            style={{ color: "rgba(255,255,255,0.38)" }}
                          >
                            {acc.accountNumber}
                          </p>
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
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-sm font-black"
                          style={{ color: "#E4B86A" }}
                        >
                          {fmt(acc.balance)}
                        </p>
                        <p
                          className={`text-[10px] font-semibold ${acc.status === "active" ? "text-emerald-400" : "text-gray-500"}`}
                        >
                          {acc.status}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: "rgba(228,184,106,0.5)" }}
            >
              Recent Transactions
            </p>
            <Link
              href="/member-dashboard/loans/savings"
              className="flex items-center gap-1 text-xs font-bold transition-colors hover:underline"
              style={{ color: "#E4B86A" }}
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.14)",
            }}
          >
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <FileText
                  className="w-8 h-8"
                  style={{ color: "rgba(200,150,62,0.22)" }}
                />
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  No transactions yet
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "rgba(200,150,62,0.07)" }}
              >
                {recentTransactions.map((tx, i) => {
                  const isD = tx.transactionType === "deposit";
                  return (
                    <motion.div
                      key={tx._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors duration-100"
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(200,150,62,0.04)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "")
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: isD
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(239,68,68,0.12)",
                          border: `1px solid ${isD ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                        }}
                      >
                        {isD ? (
                          <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white capitalize">
                          {tx.transactionType}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {tx.accountId?.accountName ?? "—"} ·{" "}
                          {format(new Date(tx.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${isD ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {isD ? "+" : "-"}
                          {fmt(tx.amount)}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          Bal: {fmt(tx.balanceAfter)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
