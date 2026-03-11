"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Banknote,
  Activity,
  ShieldAlert,
  XCircle,
  FileText,
  ChevronRight,
  CircleDot,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MembersStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  newThisMonth: number;
  newPrevMonth: number;
  pctChange: number;
}
interface SavingsStats {
  totalAccounts: number;
  activeAccounts: number;
  closedAccounts: number;
  dormantAccounts: number;
  totalBalance: number;
  depositsToday: number;
  withdrawalsToday: number;
  netToday: number;
  txCountToday: number;
  depositsThisMonth: number;
  withdrawalsThisMonth: number;
  netThisMonth: number;
  txCountThisMonth: number;
  pctChangeDeposits: number;
  pctChangeWithdrawals: number;
}
interface LoansStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  active: number;
  overdue: number;
  paid: number;
  rejected: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalPaid: number;
  totalPenalties: number;
  pctNeedAttention: number;
}
interface RepayStats {
  collectedThisMonth: number;
  countThisMonth: number;
  collectedPrevMonth: number;
  pctChange: number;
}
interface SparkPoint {
  day: string;
  deposits: number;
  withdrawals: number;
  net: number;
}
interface LoanSparkPoint {
  day: string;
  count: number;
  amount: number;
}
interface RecentLoan {
  _id: string;
  loanId: string;
  status: string;
  loanAmount: number;
  purpose: string;
  applicationDate: string;
  memberName: string;
  memberId: string;
}
interface RecentTx {
  _id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  date: string;
  memberName: string;
  memberId: string;
  accountNumber: string;
  accountType: string;
}
interface OverdueLoan {
  _id: string;
  loanId: string;
  memberName: string;
  memberId: string;
  outstandingBalance: number;
  penaltyAmount: number;
  nextPaymentDate: string;
  loanAmount: number;
}
interface Alerts {
  overdueLoansCount: number;
  dormantAccountsCount: number;
  pendingApplicationsCount: number;
  overdueLoans: OverdueLoan[];
}

interface DashboardData {
  generatedAt: string;
  members: MembersStats;
  savings: SavingsStats;
  loans: LoansStats;
  repayments: RepayStats;
  sparklineData: SparkPoint[];
  sparklineLoans: LoanSparkPoint[];
  recentLoans: RecentLoan[];
  recentTx: RecentTx[];
  alerts: Alerts;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return `GH₵${(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtShort(n: number) {
  if (n >= 1_000_000) return `GH₵${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `GH₵${(n / 1_000).toFixed(1)}K`;
  return `GH₵${n.toFixed(0)}`;
}
function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const LOAN_STATUS_META: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  pending: {
    color: "#E4B86A",
    bg: "rgba(200,150,62,0.13)",
    border: "rgba(200,150,62,0.3)",
    label: "Pending",
  },
  under_review: {
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.13)",
    border: "rgba(59,130,246,0.3)",
    label: "Under Review",
  },
  approved: {
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.13)",
    border: "rgba(139,92,246,0.3)",
    label: "Approved",
  },
  active: {
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    label: "Active",
  },
  overdue: {
    color: "#fb923c",
    bg: "rgba(251,146,60,0.13)",
    border: "rgba(251,146,60,0.3)",
    label: "Overdue",
  },
  paid: {
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    label: "Paid",
  },
  rejected: {
    color: "#f87171",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    label: "Rejected",
  },
  cancelled: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.25)",
    label: "Cancelled",
  },
};

/* ─── Shared tooltip ─────────────────────────────────────────────────────── */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-xs"
      style={{
        background: "#0e1f3d",
        border: "1px solid rgba(200,150,62,0.25)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
      }}
    >
      <p className="font-bold text-white mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span style={{ color: "rgba(255,255,255,0.55)" }}>{p.name}:</span>
          <span className="font-bold text-white">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Change badge ────────────────────────────────────────────────────────── */
function ChangeBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full"
      style={{
        background: up ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
        color: up ? "#4ade80" : "#f87171",
        border: `1px solid ${up ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
      }}
    >
      {up ? (
        <ArrowUpRight className="w-2.5 h-2.5" />
      ) : (
        <ArrowDownRight className="w-2.5 h-2.5" />
      )}
      {Math.abs(pct)}%
    </span>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="font-serif font-black text-white text-base">{title}</p>
        {subtitle && (
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] font-bold transition-colors"
          style={{ color: "rgba(228,184,106,0.7)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "#E4B86A")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(228,184,106,0.7)")
          }
        >
          View all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ─── KPI card with sparkline ─────────────────────────────────────────────── */
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  pct,
  spark,
  sparkKey,
  sparkColor,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  pct?: number;
  spark?: any[];
  sparkKey?: string;
  sparkColor?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: gradient }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          {pct !== undefined && <ChangeBadge pct={pct} />}
        </div>
        <p className="font-serif font-black text-white text-2xl leading-none">
          {value}
        </p>
        <p
          className="text-[11px] font-semibold mt-1.5"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          {label}
        </p>
        {sub && (
          <p
            className="text-[10px] mt-0.5"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {sub}
          </p>
        )}
      </div>
      {spark && spark.length > 0 && sparkKey && (
        <div style={{ height: 52, marginTop: -4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={spark}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`spark-${sparkKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={sparkColor ?? "#C8963E"}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={sparkColor ?? "#C8963E"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={sparkKey as string}
                stroke={sparkColor ?? "#C8963E"}
                fill={`url(#spark-${sparkKey})`}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Loan status pill card ───────────────────────────────────────────────── */
function LoanPill({
  label,
  count,
  color,
  bg,
  border,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <span
        className="text-xs font-semibold"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {label}
      </span>
      <span className="text-sm font-black" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────────────────── */
function Skeleton({ h = 20, r = 8 }: { h?: number; r?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        height: h,
        borderRadius: r,
        background: "rgba(200,150,62,0.06)",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setSpinning(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /* ─── Loading skeleton ── */
  if (loading) {
    return (
      <div
        className="min-h-screen p-6 space-y-6"
        style={{ background: "#0B1D3A" }}
      >
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2 w-64">
            <Skeleton h={14} r={6} />
            <Skeleton h={32} />
            <Skeleton h={12} r={6} />
          </div>
          <Skeleton h={40} r={12} />
        </div>
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h={140} r={16} />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} h={140} r={16} />
          ))}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton h={280} r={16} />
          </div>
          <Skeleton h={280} r={16} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton h={320} r={16} />
          <Skeleton h={320} r={16} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    members,
    savings,
    loans,
    repayments,
    sparklineData,
    sparklineLoans,
    recentLoans,
    recentTx,
    alerts,
  } = data;

  /* Loan portfolio donut data */
  const loanDonut = [
    { name: "Active", value: loans.active, fill: "#4ade80" },
    { name: "Overdue", value: loans.overdue, fill: "#fb923c" },
    { name: "Paid", value: loans.paid, fill: "#60a5fa" },
    {
      name: "Pending",
      value: loans.pending + loans.underReview,
      fill: "#E4B86A",
    },
    { name: "Rejected", value: loans.rejected, fill: "#f87171" },
  ].filter((d) => d.value > 0);

  const totalAlerts =
    alerts.overdueLoansCount +
    alerts.dormantAccountsCount +
    alerts.pendingApplicationsCount;

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
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
            Admin Dashboard
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            Welcome Back, <span style={{ color: "#E4B86A" }}>Admin</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Last updated{" "}
            {formatDistanceToNow(new Date(data.generatedAt), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalAlerts > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(251,146,60,0.1)",
                border: "1px solid rgba(251,146,60,0.25)",
              }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "#fb923c" }} />
              <span className="text-xs font-bold" style={{ color: "#fb923c" }}>
                {totalAlerts} Alerts
              </span>
            </div>
          )}
          <button
            onClick={() => fetchStats(true)}
            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              background: "rgba(200,150,62,0.1)",
              border: "1px solid rgba(200,150,62,0.22)",
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
              style={{ color: "#C8963E" }}
            />
          </button>
        </div>
      </div>

      {/* ══ ROW 1 — Members + Savings ════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Members"
          value={members.total.toLocaleString()}
          sub={`${members.active} active · ${members.suspended} suspended`}
          icon={Users}
          gradient="linear-gradient(135deg,#C8963E,#E4B86A)"
          pct={members.pctChange}
          spark={sparklineData}
          sparkKey="deposits"
          sparkColor="#C8963E"
          delay={0}
        />
        <KpiCard
          label="New Members This Month"
          value={members.newThisMonth.toLocaleString()}
          sub={`${members.inactive} inactive members`}
          icon={Users}
          gradient="linear-gradient(135deg,#1e3a5f,#60a5fa)"
          pct={members.pctChange}
          delay={0.05}
        />
        <KpiCard
          label="Total Savings Balance"
          value={fmtShort(savings.totalBalance)}
          sub={`${savings.activeAccounts} active accounts`}
          icon={Wallet}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
          spark={sparklineData}
          sparkKey="deposits"
          sparkColor="#4ade80"
          delay={0.1}
        />
        <KpiCard
          label="Repayments This Month"
          value={fmtShort(repayments.collectedThisMonth)}
          sub={`${repayments.countThisMonth} payments recorded`}
          icon={Banknote}
          gradient="linear-gradient(135deg,#312e81,#a78bfa)"
          pct={repayments.pctChange}
          delay={0.15}
        />
      </div>

      {/* ══ ROW 2 — Transactions + Loans ════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Deposits Today"
          value={fmtShort(savings.depositsToday)}
          sub={`${savings.txCountToday} transactions today`}
          icon={ArrowDownCircle}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
          pct={savings.pctChangeDeposits}
          spark={sparklineData}
          sparkKey="deposits"
          sparkColor="#4ade80"
          delay={0.2}
        />
        <KpiCard
          label="Withdrawals Today"
          value={fmtShort(savings.withdrawalsToday)}
          sub={`Net today: ${fmtShort(savings.netToday)}`}
          icon={ArrowUpCircle}
          gradient="linear-gradient(135deg,#7f1d1d,#f87171)"
          pct={savings.pctChangeWithdrawals}
          spark={sparklineData}
          sparkKey="withdrawals"
          sparkColor="#f87171"
          delay={0.25}
        />
        <KpiCard
          label="Active Loans"
          value={loans.active.toLocaleString()}
          sub={`GH₵${(loans.totalOutstanding / 1000).toFixed(0)}K outstanding`}
          icon={CreditCard}
          gradient="linear-gradient(135deg,#C8963E,#E4B86A)"
          spark={sparklineLoans}
          sparkKey="count"
          sparkColor="#C8963E"
          delay={0.3}
        />
        <KpiCard
          label="Overdue Loans"
          value={loans.overdue.toLocaleString()}
          sub={`GH₵${(loans.totalPenalties / 1000).toFixed(1)}K penalties`}
          icon={AlertTriangle}
          gradient={
            loans.overdue > 0
              ? "linear-gradient(135deg,#7f1d1d,#fb923c)"
              : "linear-gradient(135deg,#14532d,#4ade80)"
          }
          delay={0.35}
        />
      </div>

      {/* ══ ROW 3 — Main chart + Loan portfolio ════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transaction volume — 30 day area chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Transaction Volume — Last 30 Days"
            subtitle={`This month: ${fmt(savings.depositsThisMonth)} deposits · ${fmt(savings.withdrawalsThisMonth)} withdrawals`}
            href="/admin-dashboard/deposits"
          />
          {sparklineData.length === 0 ? (
            <div
              className="flex items-center justify-center h-48"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              <p className="text-sm">No transaction data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={sparklineData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(200,150,62,0.07)"
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={54}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Deposits"
                  stroke="#4ade80"
                  fill="url(#depGrad)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  name="Withdrawals"
                  stroke="#f87171"
                  fill="url(#wdGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Month summary strip */}
          <div
            className="grid grid-cols-3 gap-3 mt-3 pt-3"
            style={{ borderTop: "1px solid rgba(200,150,62,0.08)" }}
          >
            {[
              {
                label: "Deposits",
                val: fmt(savings.depositsThisMonth),
                color: "#4ade80",
              },
              {
                label: "Withdrawals",
                val: fmt(savings.withdrawalsThisMonth),
                color: "#f87171",
              },
              {
                label: "Net Flow",
                val: fmt(savings.netThisMonth),
                color: savings.netThisMonth >= 0 ? "#4ade80" : "#f87171",
              },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <p
                  className="text-[9px] uppercase tracking-wider mb-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {label}
                </p>
                <p className="text-sm font-black" style={{ color }}>
                  {val}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Loan portfolio panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Loan Portfolio"
            subtitle={`${loans.total} total applications`}
            href="/admin-dashboard/loans"
          />

          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              {
                label: "Disbursed",
                val: fmtShort(loans.totalDisbursed),
                color: "#E4B86A",
              },
              {
                label: "Outstanding",
                val: fmtShort(loans.totalOutstanding),
                color: "#60a5fa",
              },
              {
                label: "Collected",
                val: fmtShort(loans.totalPaid),
                color: "#4ade80",
              },
              {
                label: "Penalties",
                val: fmtShort(loans.totalPenalties),
                color: "#f87171",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="p-2.5 rounded-xl text-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  className="text-[9px] uppercase tracking-wider mb-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {label}
                </p>
                <p className="text-sm font-black" style={{ color }}>
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div className="space-y-1.5">
            {Object.entries({
              pending: loans.pending,
              under_review: loans.underReview,
              approved: loans.approved,
              active: loans.active,
              overdue: loans.overdue,
              paid: loans.paid,
            }).map(([status, count]) => {
              const m = LOAN_STATUS_META[status];
              return (
                <LoanPill
                  key={status}
                  label={m.label}
                  count={count}
                  color={m.color}
                  bg={m.bg}
                  border={m.border}
                />
              );
            })}
          </div>

          {/* Loan sparkline */}
          {sparklineLoans.length > 0 && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(200,150,62,0.08)" }}
            >
              <p
                className="text-[9px] uppercase tracking-wider mb-2"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Applications (30 days)
              </p>
              <div style={{ height: 48 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sparklineLoans}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <Bar
                      dataKey="count"
                      fill="#C8963E"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ══ ROW 4 — Savings overview bar + Members breakdown ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Savings accounts breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Savings Accounts"
            subtitle={`${savings.totalAccounts} accounts total`}
            href="/admin-dashboard/savings"
          />

          {/* Balance hero */}
          <div
            className="flex items-center gap-4 p-4 rounded-xl mb-4"
            style={{
              background:
                "linear-gradient(135deg,rgba(200,150,62,0.12),rgba(200,150,62,0.06))",
              border: "1px solid rgba(200,150,62,0.2)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)" }}
            >
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p
                className="text-[10px] uppercase tracking-widest font-bold mb-0.5"
                style={{ color: "rgba(228,184,106,0.6)" }}
              >
                Total Portfolio Balance
              </p>
              <p className="font-serif font-black text-white text-2xl">
                {fmt(savings.totalBalance)}
              </p>
            </div>
          </div>

          {/* Account status bars */}
          {[
            {
              label: "Active",
              count: savings.activeAccounts,
              total: savings.totalAccounts,
              color: "#4ade80",
            },
            {
              label: "Dormant",
              count: savings.dormantAccounts,
              total: savings.totalAccounts,
              color: "#E4B86A",
            },
            {
              label: "Closed",
              count: savings.closedAccounts,
              total: savings.totalAccounts,
              color: "#94a3b8",
            },
          ].map(({ label, count, total, color }) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={label} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {label} Accounts
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">
                      {count}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            );
          })}

          {/* Today's activity */}
          <div
            className="grid grid-cols-2 gap-2 mt-4 pt-4"
            style={{ borderTop: "1px solid rgba(200,150,62,0.08)" }}
          >
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}
            >
              <p
                className="text-[9px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Deposits Today
              </p>
              <p className="text-base font-black" style={{ color: "#4ade80" }}>
                {fmtShort(savings.depositsToday)}
              </p>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{
                background: "rgba(248,113,113,0.07)",
                border: "1px solid rgba(248,113,113,0.15)",
              }}
            >
              <p
                className="text-[9px] uppercase tracking-wider mb-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Withdrawals Today
              </p>
              <p className="text-base font-black" style={{ color: "#f87171" }}>
                {fmtShort(savings.withdrawalsToday)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Members overview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Member Overview"
            subtitle={`${members.total} registered members`}
            href="/admin-dashboard/members"
          />

          {/* Radial-style donut */}
          <div className="flex items-center gap-6 mb-5">
            <div
              className="relative shrink-0"
              style={{ width: 100, height: 100 }}
            >
              <svg width={100} height={100}>
                {/* bg ring */}
                <circle
                  cx={50}
                  cy={50}
                  r={38}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={10}
                />
                {/* active ring */}
                {members.total > 0 && (
                  <circle
                    cx={50}
                    cy={50}
                    r={38}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth={10}
                    strokeDasharray={`${(members.active / members.total) * 239} 239`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-white text-lg leading-none">
                  {members.total}
                </span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  total
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {[
                { label: "Active", count: members.active, color: "#4ade80" },
                {
                  label: "Inactive",
                  count: members.inactive,
                  color: "#94a3b8",
                },
                {
                  label: "Suspended",
                  count: members.suspended,
                  color: "#f87171",
                },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: color }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {label}
                    </span>
                  </div>
                  <span className="text-sm font-black text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New members this month */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{
              background: "rgba(200,150,62,0.08)",
              border: "1px solid rgba(200,150,62,0.18)",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)" }}
            >
              <Users className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white">
                {members.newThisMonth} new this month
              </p>
              <p
                className="text-[10px]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                vs {members.newPrevMonth ?? 0} last month
              </p>
            </div>
            <ChangeBadge pct={members.pctChange} />
          </div>

          {/* Quick nav */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "All Members",
                href: "/admin-dashboard/all-members",
                icon: Users,
              },
              {
                label: "Savings Accts",
                href: "/admin-dashboard/savings",
                icon: Wallet,
              },
              {
                label: "Loan Apps",
                href: "/admin-dashboard/loans",
                icon: FileText,
              },
              {
                label: "Reports",
                href: "/admin-dashboard/reports-transactions",
                icon: BarChart3,
              },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.6)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(200,150,62,0.1)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(200,150,62,0.25)";
                  (e.currentTarget as HTMLElement).style.color = "#E4B86A";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.color =
                    "rgba(255,255,255,0.6)";
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ══ ROW 5 — Alerts + Activity ════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alerts panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "#122549",
            borderColor:
              alerts.overdueLoansCount > 0
                ? "rgba(251,146,60,0.25)"
                : "rgba(200,150,62,0.14)",
          }}
        >
          {alerts.overdueLoansCount > 0 && (
            <div
              className="h-0.75"
              style={{ background: "linear-gradient(90deg,#fb923c,#f87171)" }}
            />
          )}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-serif font-black text-white text-base">
                  Alerts
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Items needing attention
                </p>
              </div>
              {totalAlerts > 0 && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs"
                  style={{
                    background: "rgba(251,146,60,0.18)",
                    color: "#fb923c",
                    border: "1px solid rgba(251,146,60,0.3)",
                  }}
                >
                  {totalAlerts}
                </div>
              )}
            </div>

            {/* Alert counters */}
            <div className="space-y-2 mb-4">
              {[
                {
                  icon: AlertTriangle,
                  label: "Overdue Loans",
                  count: alerts.overdueLoansCount,
                  color: "#fb923c",
                  href: "/admin-dashboard/loans?status=overdue",
                },
                {
                  icon: Clock,
                  label: "Pending Applications",
                  count: alerts.pendingApplicationsCount,
                  color: "#E4B86A",
                  href: "/admin-dashboard/loans?status=pending",
                },
                {
                  icon: ShieldAlert,
                  label: "Dormant Accounts",
                  count: alerts.dormantAccountsCount,
                  color: "#60a5fa",
                  href: "/admin-dashboard/savings",
                },
              ].map(({ icon: Icon, label, count, color, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                  style={{
                    background:
                      count > 0 ? `${color}10` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${count > 0 ? `${color}28` : "rgba(255,255,255,0.06)"}`,
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      `${color}18`)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      count > 0 ? `${color}10` : "rgba(255,255,255,0.03)")
                  }
                >
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{
                      color: count > 0 ? color : "rgba(255,255,255,0.3)",
                    }}
                  />
                  <span
                    className="flex-1 text-xs font-semibold"
                    style={{
                      color:
                        count > 0
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-sm font-black"
                    style={{
                      color: count > 0 ? color : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {count}
                  </span>
                  <ChevronRight
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color }}
                  />
                </Link>
              ))}
            </div>

            {/* Overdue loan list */}
            {alerts.overdueLoans.length > 0 && (
              <>
                <p
                  className="text-[10px] font-black uppercase tracking-wider mb-2"
                  style={{ color: "rgba(251,146,60,0.6)" }}
                >
                  Overdue Loans
                </p>
                <div className="space-y-2">
                  {alerts.overdueLoans.slice(0, 4).map((loan) => (
                    <div
                      key={loan._id}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{
                        background: "rgba(251,146,60,0.07)",
                        border: "1px solid rgba(251,146,60,0.15)",
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0"
                        style={{
                          background: "rgba(251,146,60,0.18)",
                          color: "#fb923c",
                        }}
                      >
                        {initials(loan.memberName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {loan.memberName}
                        </p>
                        <p
                          className="text-[10px]"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {loan.loanId} · Due{" "}
                          {loan.nextPaymentDate
                            ? format(new Date(loan.nextPaymentDate), "MMM d")
                            : "–"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="text-xs font-black"
                          style={{ color: "#fb923c" }}
                        >
                          {fmtShort(loan.outstandingBalance)}
                        </p>
                        {loan.penaltyAmount > 0 && (
                          <p
                            className="text-[9px]"
                            style={{ color: "#f87171" }}
                          >
                            +{fmtShort(loan.penaltyAmount)} pen.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {totalAlerts === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2
                  className="w-8 h-8"
                  style={{ color: "#4ade80" }}
                />
                <p
                  className="text-sm font-semibold"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  All clear!
                </p>
                <p
                  className="text-xs text-center"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No outstanding alerts at this time
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Recent Transactions"
            subtitle="Latest savings activity"
            href="/admin-dashboard/deposits"
          />

          {recentTx.length === 0 ? (
            <div
              className="flex items-center justify-center h-40"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTx.map((tx) => {
                const isDeposit = tx.transactionType === "deposit";
                return (
                  <div
                    key={tx._id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(200,150,62,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: isDeposit
                          ? "rgba(74,222,128,0.12)"
                          : "rgba(248,113,113,0.12)",
                        border: `1px solid ${isDeposit ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}`,
                      }}
                    >
                      {isDeposit ? (
                        <ArrowDownCircle
                          className="w-4 h-4"
                          style={{ color: "#4ade80" }}
                        />
                      ) : (
                        <ArrowUpCircle
                          className="w-4 h-4"
                          style={{ color: "#f87171" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {tx.memberName}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {tx.accountNumber} · {tx.accountType} ·{" "}
                        {formatDistanceToNow(new Date(tx.date), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-xs font-black"
                        style={{ color: isDeposit ? "#4ade80" : "#f87171" }}
                      >
                        {isDeposit ? "+" : "-"}
                        {fmtShort(tx.amount)}
                      </p>
                      <p
                        className="text-[9px]"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {fmtShort(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Loan Applications */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border p-5"
          style={{
            background: "#122549",
            borderColor: "rgba(200,150,62,0.14)",
          }}
        >
          <SectionHeader
            title="Recent Loan Applications"
            subtitle="Latest submissions"
            href="/admin-dashboard/loans"
          />

          {recentLoans.length === 0 ? (
            <div
              className="flex items-center justify-center h-40"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentLoans.map((loan) => {
                const sm =
                  LOAN_STATUS_META[loan.status] ?? LOAN_STATUS_META.pending;
                return (
                  <div
                    key={loan._id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(200,150,62,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {initials(loan.memberName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white truncate">
                          {loan.memberName}
                        </p>
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 uppercase"
                          style={{
                            background: sm.bg,
                            color: sm.color,
                            border: `1px solid ${sm.border}`,
                          }}
                        >
                          {sm.label}
                        </span>
                      </div>
                      <p
                        className="text-[10px]"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {loan.loanId} · {loan.purpose} ·{" "}
                        {formatDistanceToNow(new Date(loan.applicationDate), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <p
                      className="text-xs font-black shrink-0"
                      style={{ color: "#E4B86A" }}
                    >
                      {fmtShort(loan.loanAmount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ══ BOTTOM STATS STRIP ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="rounded-2xl border p-5"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-4"
          style={{ color: "rgba(228,184,106,0.5)" }}
        >
          Month-to-Date Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Transactions",
              val: savings.txCountThisMonth.toLocaleString(),
              icon: Activity,
              color: "#E4B86A",
            },
            {
              label: "Deposit Volume",
              val: fmtShort(savings.depositsThisMonth),
              icon: ArrowDownCircle,
              color: "#4ade80",
            },
            {
              label: "Withdrawal Volume",
              val: fmtShort(savings.withdrawalsThisMonth),
              icon: ArrowUpCircle,
              color: "#f87171",
            },
            {
              label: "Loans Disbursed",
              val: fmtShort(loans.totalDisbursed),
              icon: CreditCard,
              color: "#60a5fa",
            },
            {
              label: "Repayments Collected",
              val: fmtShort(repayments.collectedThisMonth),
              icon: Banknote,
              color: "#a78bfa",
            },
            {
              label: "Pending Applications",
              val: (loans.pending + loans.underReview).toLocaleString(),
              icon: Clock,
              color: "#fb923c",
            },
          ].map(({ label, val, icon: Icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `${color}18`,
                  border: `1px solid ${color}25`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="font-black text-white text-base leading-none">
                {val}
              </p>
              <p
                className="text-[9px] uppercase tracking-wider leading-tight"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
