"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Filter,
  ChevronDown,
  X,
  Loader2,
  DollarSign,
  Hash,
  BarChart3,
  Users,
  Calendar,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface KPIs {
  totalVolume: number;
  totalCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  depositCount: number;
  withdrawalCount: number;
  avgTransaction: number;
  maxTransaction: number;
  net: number;
}
interface TimePoint {
  period: string;
  deposits: number;
  withdrawals: number;
  net: number;
  depositCount: number;
  withdrawalCount: number;
}
interface TypeTotal {
  _id: string;
  total: number;
  count: number;
  avgAmount: number;
}
interface AcctBreakdown {
  _id: string;
  total: number;
  count: number;
}
interface TopMember {
  memberId: string;
  name: string;
  totalAmount: number;
  count: number;
  deposits: number;
  withdrawals: number;
}

interface ReportData {
  period: { from: string; to: string; groupBy: string };
  kpis: KPIs;
  timeSeriesData: TimePoint[];
  typeTotals: TypeTotal[];
  accountTypeBreakdown: AcctBreakdown[];
  topMembers: TopMember[];
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

const COLORS = {
  deposit: "#4ade80",
  withdrawal: "#f87171",
  net: "#60a5fa",
  regular: "#E4B86A",
  fixed: "#60a5fa",
  susu: "#4ade80",
  gold: "#C8963E",
};

const PIE_COLORS = [
  "#E4B86A",
  "#60a5fa",
  "#4ade80",
  "#f87171",
  "#a78bfa",
  "#fb923c",
];

/* ─── Shared styles ─────────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  background: "rgba(11,29,58,0.70)",
  border: "1px solid rgba(200,150,62,0.20)",
};
const inputCls =
  "rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-all";
const inputFocus = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.55)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,150,62,0.10)";
};
const inputBlur = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
) => {
  e.currentTarget.style.borderColor = "rgba(200,150,62,0.20)";
  e.currentTarget.style.boxShadow = "none";
};

/* ─── Custom tooltip ────────────────────────────────────────────────────── */
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
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.name}:</span>
          <span className="font-bold text-white">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
  change,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  change?: number;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: gradient }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="font-serif font-black text-white text-xl leading-tight">
        {value}
      </p>
      {sub && (
        <p
          className="text-[11px] mt-1"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Chart card wrapper ─────────────────────────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-serif font-black text-white text-base">{title}</p>
          {subtitle && (
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function TransactionReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [spinning, setSpinning] = useState(false);

  /* filters */
  const [fromDate, setFromDate] = useState(() =>
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [accountType, setAccountType] = useState("");
  const [chartType, setChartType] = useState<"bar" | "area" | "line">("bar");

  /* ── Fetch report ── */
  const fetchReport = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setSpinning(true);
      else setLoading(true);
      try {
        const p = new URLSearchParams({ from: fromDate, to: toDate, groupBy });
        if (accountType) p.set("accountType", accountType);
        const res = await fetch(`/api/reports/transactions?${p}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [fromDate, toDate, groupBy, accountType],
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ── Excel export ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams({
        from: fromDate,
        to: toDate,
        groupBy,
        export: "1",
      });
      if (accountType) p.set("accountType", accountType);
      const res = await fetch(`/api/reports/transactions?${p}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const wb = XLSX.utils.book_new();

      /* Sheet 1: Raw transactions */
      const ws1 = XLSX.utils.json_to_sheet(json.rows);
      /* Style header row */
      const range = XLSX.utils.decode_range(ws1["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws1[cell]) {
          ws1[cell].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0B1D3A" } },
            alignment: { horizontal: "center" },
          };
        }
      }
      ws1["!cols"] = [
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 22 },
        { wch: 26 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 20 },
        { wch: 10 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Transactions");

      /* Sheet 2: Time Series Summary */
      if (data?.timeSeriesData?.length) {
        const summaryRows = data.timeSeriesData.map((t) => ({
          Period: t.period,
          Deposits: t.deposits,
          Withdrawals: t.withdrawals,
          "Net Flow": t.net,
          "Deposit Count": t.depositCount,
          "Withdrawal Count": t.withdrawalCount,
        }));
        const ws2 = XLSX.utils.json_to_sheet(summaryRows);
        ws2["!cols"] = [
          { wch: 14 },
          { wch: 16 },
          { wch: 16 },
          { wch: 14 },
          { wch: 16 },
          { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws2, "Summary by Period");
      }

      /* Sheet 3: Top Members */
      if (data?.topMembers?.length) {
        const memberRows = data.topMembers.map((m) => ({
          "Member ID": m.memberId,
          "Member Name": m.name,
          "Total Volume": m.totalAmount,
          Deposits: m.deposits,
          Withdrawals: m.withdrawals,
          "Transaction Count": m.count,
        }));
        const ws3 = XLSX.utils.json_to_sheet(memberRows);
        ws3["!cols"] = [
          { wch: 14 },
          { wch: 24 },
          { wch: 16 },
          { wch: 14 },
          { wch: 14 },
          { wch: 18 },
        ];
        XLSX.utils.book_append_sheet(wb, ws3, "Top Members");
      }

      const filename = `transactions-report-${fromDate}-to-${toDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${json.count} transactions`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  /* ─── Render ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0B1D3A" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "#C8963E" }}
          />
          <p
            className="text-sm font-semibold"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Generating report…
          </p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const tsSeries = data?.timeSeriesData ?? [];
  const accTypeData = (data?.accountTypeBreakdown ?? []).map((a) => ({
    name: a._id ? a._id.charAt(0).toUpperCase() + a._id.slice(1) : "Unknown",
    value: a.total,
    count: a.count,
  }));

  const TimeChartComponent =
    chartType === "area"
      ? AreaChart
      : chartType === "line"
        ? LineChart
        : BarChart;

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
            Reports
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            Transactions <span style={{ color: "#E4B86A" }}>Report</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {data?.period
              ? `${format(new Date(data.period.from), "MMM d, yyyy")} — ${format(new Date(data.period.to), "MMM d, yyyy")}`
              : ""}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shrink-0 transition-all hover:-translate-y-0.5 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Excel
        </button>
      </div>

      {/* ── Filters ── */}
      <div
        className="flex flex-wrap gap-3 p-4 rounded-2xl border"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <div className="flex items-center gap-2">
          <Calendar
            className="w-4 h-4 shrink-0"
            style={{ color: "rgba(200,150,62,0.6)" }}
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, colorScheme: "dark", minWidth: 145 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
          <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={inputCls}
            style={{ ...inputStyle, colorScheme: "dark", minWidth: 145 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>

        <div className="relative shrink-0">
          <select
            value={groupBy}
            onChange={(e) =>
              setGroupBy(e.target.value as "day" | "week" | "month")
            }
            className={inputCls + " pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 130 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="day">Group by Day</option>
            <option value="week">Group by Week</option>
            <option value="month">Group by Month</option>
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>

        <div className="relative shrink-0">
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
            className={inputCls + " pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 150 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="">All Account Types</option>
            <option value="regular">Regular Savings</option>
            <option value="fixed">Fixed Deposit</option>
            <option value="susu">Susu Savings</option>
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>

        {/* Chart type */}
        <div
          className="flex rounded-xl overflow-hidden border ml-auto"
          style={{ borderColor: "rgba(200,150,62,0.2)" }}
        >
          {(["bar", "area", "line"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className="px-3 py-2 text-xs font-bold capitalize transition-all"
              style={
                chartType === t
                  ? {
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.45)",
                    }
              }
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSpinning(true);
            fetchReport(true);
          }}
          className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
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

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Deposits"
          value={fmt(kpis?.totalDeposits ?? 0)}
          sub={`${kpis?.depositCount ?? 0} transactions`}
          icon={ArrowDownCircle}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
        />
        <StatCard
          label="Total Withdrawals"
          value={fmt(kpis?.totalWithdrawals ?? 0)}
          sub={`${kpis?.withdrawalCount ?? 0} transactions`}
          icon={ArrowUpCircle}
          gradient="linear-gradient(135deg,#7f1d1d,#f87171)"
        />
        <StatCard
          label="Net Flow"
          value={fmt(kpis?.net ?? 0)}
          sub="Deposits minus withdrawals"
          icon={TrendingUp}
          gradient="linear-gradient(135deg,#1e3a5f,#60a5fa)"
        />
        <StatCard
          label="Total Volume"
          value={fmt(kpis?.totalVolume ?? 0)}
          sub={`Avg: ${fmt(kpis?.avgTransaction ?? 0)}`}
          icon={Activity}
          gradient="linear-gradient(135deg,#C8963E,#E4B86A)"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Transactions"
          value={(kpis?.totalCount ?? 0).toLocaleString()}
          sub="All types combined"
          icon={Hash}
          gradient="linear-gradient(135deg,#312e81,#a78bfa)"
        />
        <StatCard
          label="Deposit Count"
          value={(kpis?.depositCount ?? 0).toLocaleString()}
          sub="Individual deposits"
          icon={ArrowDownCircle}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
        />
        <StatCard
          label="Withdrawal Count"
          value={(kpis?.withdrawalCount ?? 0).toLocaleString()}
          sub="Individual withdrawals"
          icon={ArrowUpCircle}
          gradient="linear-gradient(135deg,#7f1d1d,#f87171)"
        />
        <StatCard
          label="Largest Transaction"
          value={fmt(kpis?.maxTransaction ?? 0)}
          sub="Single transaction max"
          icon={DollarSign}
          gradient="linear-gradient(135deg,#92400e,#E4B86A)"
        />
      </div>

      {/* ── Main time-series chart ── */}
      <ChartCard
        title="Transaction Volume Over Time"
        subtitle={`Deposits vs withdrawals grouped by ${groupBy}`}
        action={
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "rgba(200,150,62,0.12)", color: "#E4B86A" }}
          >
            {tsSeries.length} periods
          </span>
        }
      >
        {tsSeries.length === 0 ? (
          <div
            className="flex items-center justify-center h-48"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-sm">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <TimeChartComponent data={tsSeries}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(200,150,62,0.08)"
              />
              <XAxis
                dataKey="period"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtShort}
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: 12,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                }}
              />
              {chartType === "area" ? (
                <>
                  <defs>
                    <linearGradient
                      id="depositGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.deposit}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.deposit}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient
                      id="withdrawalGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.withdrawal}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.withdrawal}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke={COLORS.deposit}
                    fill="url(#depositGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke={COLORS.withdrawal}
                    fill="url(#withdrawalGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              ) : chartType === "line" ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke={COLORS.deposit}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke={COLORS.withdrawal}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Flow"
                    stroke={COLORS.net}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                  />
                </>
              ) : (
                <>
                  <Bar
                    dataKey="deposits"
                    name="Deposits"
                    fill={COLORS.deposit}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="withdrawals"
                    name="Withdrawals"
                    fill={COLORS.withdrawal}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </>
              )}
            </TimeChartComponent>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row: Pie charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transaction type split */}
        <ChartCard
          title="Deposit vs Withdrawal Split"
          subtitle="By total volume"
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "Deposits", value: kpis?.totalDeposits ?? 0 },
                  { name: "Withdrawals", value: kpis?.totalWithdrawals ?? 0 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                <Cell fill={COLORS.deposit} />
                <Cell fill={COLORS.withdrawal} />
              </Pie>
              <Tooltip
                formatter={(val: number) => fmtShort(val)}
                contentStyle={{
                  background: "#0e1f3d",
                  border: "1px solid rgba(200,150,62,0.25)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Account type breakdown */}
        <ChartCard
          title="Volume by Account Type"
          subtitle="Across all transaction types"
        >
          {accTypeData.length === 0 ? (
            <div
              className="flex items-center justify-center h-48"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No account type data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={accTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {accTypeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => fmtShort(val)}
                  contentStyle={{
                    background: "#0e1f3d",
                    border: "1px solid rgba(200,150,62,0.25)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Count over time ── */}
      <ChartCard
        title="Transaction Count Over Time"
        subtitle="Number of individual transactions per period"
      >
        {tsSeries.length === 0 ? (
          <div
            className="flex items-center justify-center h-40"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-sm">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tsSeries}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(200,150,62,0.08)"
              />
              <XAxis
                dataKey="period"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                }}
              />
              <Bar
                dataKey="depositCount"
                name="Deposits"
                fill={COLORS.deposit}
                radius={[3, 3, 0, 0]}
                maxBarSize={30}
              />
              <Bar
                dataKey="withdrawalCount"
                name="Withdrawals"
                fill={COLORS.withdrawal}
                radius={[3, 3, 0, 0]}
                maxBarSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Top Members ── */}
      <ChartCard
        title="Top 10 Most Active Members"
        subtitle="By total transaction volume in selected period"
      >
        {(data?.topMembers ?? []).length === 0 ? (
          <div
            className="flex items-center justify-center h-48"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-sm">No member data available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {(data?.topMembers ?? []).map((m, i) => {
              const pct = data?.kpis?.totalVolume
                ? (m.totalAmount / data.kpis.totalVolume) * 100
                : 0;
              return (
                <div
                  key={m.memberId}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors"
                  style={{
                    background: i % 2 === 0 ? "rgba(200,150,62,0.03)" : "",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(200,150,62,0.07)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      i % 2 === 0 ? "rgba(200,150,62,0.03)" : "")
                  }
                >
                  <span
                    className="text-[11px] font-black w-5 text-center"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                    style={{
                      background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                      color: "#0B1D3A",
                    }}
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-white truncate">
                        {m.name}
                      </p>
                      <p
                        className="text-sm font-black ml-3 shrink-0"
                        style={{ color: "#E4B86A" }}
                      >
                        {fmt(m.totalAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(90deg,#C8963E,#E4B86A)",
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] shrink-0"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {m.count} txns · D:{fmt(m.deposits)} W:
                        {fmt(m.withdrawals)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
