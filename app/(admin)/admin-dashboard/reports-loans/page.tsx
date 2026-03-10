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
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  ChevronDown,
  Loader2,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Banknote,
  BarChart3,
  Percent,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface LoanKPIs {
  totalApplications: number;
  totalAmountApplied: number;
  totalAmountDisbursed: number;
  totalOutstanding: number;
  totalPaid: number;
  totalPenalties: number;
  avgLoanAmount: number;
  avgInterestRate: number;
  avgDuration: number;
  avgEligibilityScore: number;
  activeCount: number;
  overdueCount: number;
  paidCount: number;
  rejectedCount: number;
  pendingCount: number;
}
interface RepayKPIs {
  totalCollected: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPenalty: number;
  repaymentCount: number;
}
interface TimePoint {
  period: string;
  count: number;
  amount: number;
}
interface StatusDist {
  _id: string;
  count: number;
  amount: number;
}
interface PurposeDist {
  _id: string;
  count: number;
  amount: number;
}
interface RepayPoint {
  period: string;
  totalPaid: number;
  count: number;
  principal: number;
  interest: number;
  penalty: number;
}
interface CreditDist {
  _id: string;
  count: number;
  amount: number;
}
interface ScoreBucket {
  _id: number | string;
  count: number;
  avgAmount: number;
}

interface ReportData {
  period: { from: string; to: string; groupBy: string };
  kpis: LoanKPIs;
  repaymentKpis: RepayKPIs;
  applicationsOverTime: TimePoint[];
  statusDistribution: StatusDist[];
  purposeBreakdown: PurposeDist[];
  repaymentOverTime: RepayPoint[];
  creditHistoryBreakdown: CreditDist[];
  scoreBuckets: ScoreBucket[];
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
function round2(n: number) {
  return Math.round((n || 0) * 100) / 100;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: "#E4B86A", label: "Pending" },
  under_review: { color: "#60a5fa", label: "Under Review" },
  approved: { color: "#a78bfa", label: "Approved" },
  active: { color: "#4ade80", label: "Active" },
  overdue: { color: "#fb923c", label: "Overdue" },
  paid: { color: "#4ade80", label: "Paid" },
  rejected: { color: "#f87171", label: "Rejected" },
  cancelled: { color: "#94a3b8", label: "Cancelled" },
};

const PURPOSE_COLORS: Record<string, string> = {
  business: "#E4B86A",
  education: "#60a5fa",
  medical: "#f87171",
  housing: "#4ade80",
  personal: "#a78bfa",
  agriculture: "#fb923c",
  other: "#94a3b8",
};
const PIE_COLORS = [
  "#E4B86A",
  "#60a5fa",
  "#4ade80",
  "#f87171",
  "#a78bfa",
  "#fb923c",
  "#94a3b8",
];

const CREDIT_META = {
  good: { color: "#4ade80", label: "Good", Icon: ShieldCheck },
  fair: { color: "#E4B86A", label: "Fair", Icon: ShieldAlert },
  poor: { color: "#f87171", label: "Poor", Icon: ShieldX },
  no_history: { color: "#94a3b8", label: "No History", Icon: ShieldAlert },
};

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
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.name}:</span>
          <span className="font-bold text-white">{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
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
export default function LoanReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const [fromDate, setFromDate] = useState(() =>
    format(subDays(new Date(), 90), "yyyy-MM-dd"),
  );
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");
  const [statusF, setStatusF] = useState("");
  const [purposeF, setPurposeF] = useState("");
  const [chartType, setChartType] = useState<"bar" | "area" | "line">("area");

  /* ── Fetch ── */
  const fetchReport = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setSpinning(true);
      else setLoading(true);
      try {
        const p = new URLSearchParams({ from: fromDate, to: toDate, groupBy });
        if (statusF) p.set("status", statusF);
        if (purposeF) p.set("purpose", purposeF);
        const res = await fetch(`/api/reports/loans?${p}`, {
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
    [fromDate, toDate, groupBy, statusF, purposeF],
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ── Excel export — 4 sheets ── */
  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams({
        from: fromDate,
        to: toDate,
        groupBy,
        export: "1",
      });
      if (statusF) p.set("status", statusF);
      if (purposeF) p.set("purpose", purposeF);
      const res = await fetch(`/api/reports/loans?${p}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const wb = XLSX.utils.book_new();

      /* Sheet 1: All loans */
      const ws1 = XLSX.utils.json_to_sheet(json.rows);
      ws1["!cols"] = [
        { wch: 12 },
        { wch: 16 },
        { wch: 14 },
        { wch: 24 },
        { wch: 26 },
        { wch: 15 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 20 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 30 },
        { wch: 30 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Loan Applications");

      /* Sheet 2: Summary KPIs */
      if (data?.kpis) {
        const kpis = data.kpis;
        const rk = data.repaymentKpis;
        const kpiRows = [
          {
            Metric: "Total Applications",
            Value: kpis.totalApplications,
            Unit: "count",
          },
          {
            Metric: "Total Amount Applied",
            Value: round2(kpis.totalAmountApplied),
            Unit: "GH₵",
          },
          {
            Metric: "Total Disbursed",
            Value: round2(kpis.totalAmountDisbursed),
            Unit: "GH₵",
          },
          {
            Metric: "Total Outstanding",
            Value: round2(kpis.totalOutstanding),
            Unit: "GH₵",
          },
          {
            Metric: "Total Amount Paid",
            Value: round2(kpis.totalPaid),
            Unit: "GH₵",
          },
          {
            Metric: "Total Penalties",
            Value: round2(kpis.totalPenalties),
            Unit: "GH₵",
          },
          { Metric: "Active Loans", Value: kpis.activeCount, Unit: "count" },
          { Metric: "Overdue Loans", Value: kpis.overdueCount, Unit: "count" },
          { Metric: "Paid Loans", Value: kpis.paidCount, Unit: "count" },
          {
            Metric: "Rejected Applications",
            Value: kpis.rejectedCount,
            Unit: "count",
          },
          {
            Metric: "Pending Applications",
            Value: kpis.pendingCount,
            Unit: "count",
          },
          {
            Metric: "Avg Loan Amount",
            Value: round2(kpis.avgLoanAmount),
            Unit: "GH₵",
          },
          {
            Metric: "Avg Interest Rate",
            Value: round2(kpis.avgInterestRate),
            Unit: "%",
          },
          {
            Metric: "Avg Duration",
            Value: round2(kpis.avgDuration),
            Unit: "months",
          },
          {
            Metric: "Avg Eligibility Score",
            Value: round2(kpis.avgEligibilityScore),
            Unit: "/100",
          },
          { Metric: "─── Repayments ───", Value: "", Unit: "" },
          {
            Metric: "Total Collected",
            Value: round2(rk.totalCollected),
            Unit: "GH₵",
          },
          {
            Metric: "Principal Collected",
            Value: round2(rk.totalPrincipal),
            Unit: "GH₵",
          },
          {
            Metric: "Interest Collected",
            Value: round2(rk.totalInterest),
            Unit: "GH₵",
          },
          {
            Metric: "Penalty Collected",
            Value: round2(rk.totalPenalty),
            Unit: "GH₵",
          },
          {
            Metric: "Repayment Count",
            Value: rk.repaymentCount,
            Unit: "count",
          },
        ];
        const ws2 = XLSX.utils.json_to_sheet(kpiRows);
        ws2["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws2, "KPI Summary");
      }

      /* Sheet 3: Applications over time */
      if (data?.applicationsOverTime?.length) {
        const ws3 = XLSX.utils.json_to_sheet(
          data.applicationsOverTime.map((r) => ({
            Period: r.period,
            "Application Count": r.count,
            "Total Amount Applied": round2(r.amount),
          })),
        );
        ws3["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(wb, ws3, "Applications Over Time");
      }

      /* Sheet 4: Repayments over time */
      if (data?.repaymentOverTime?.length) {
        const ws4 = XLSX.utils.json_to_sheet(
          data.repaymentOverTime.map((r) => ({
            Period: r.period,
            "Total Collected": round2(r.totalPaid),
            Principal: round2(r.principal),
            Interest: round2(r.interest),
            Penalty: round2(r.penalty),
            Count: r.count,
          })),
        );
        ws4["!cols"] = [
          { wch: 14 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 12 },
          { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, ws4, "Repayments Over Time");
      }

      const filename = `loans-report-${fromDate}-to-${toDate}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${json.count} loan applications across 4 sheets`);
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
            Generating loan report…
          </p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const rk = data?.repaymentKpis;

  /* Status distribution for pie */
  const statusPieData = (data?.statusDistribution ?? []).map((s) => ({
    name: STATUS_META[s._id]?.label ?? s._id,
    value: s.count,
    amount: s.amount,
    fill: STATUS_META[s._id]?.color ?? "#94a3b8",
  }));

  /* Purpose breakdown */
  const purposeData = (data?.purposeBreakdown ?? []).map((p) => ({
    name: p._id ? p._id.charAt(0).toUpperCase() + p._id.slice(1) : "Unknown",
    count: p.count,
    amount: p.amount,
    fill: PURPOSE_COLORS[p._id] ?? "#94a3b8",
  }));

  /* Score buckets */
  const scoreBuckets = (data?.scoreBuckets ?? []).map((b) => ({
    range: typeof b._id === "number" ? `${b._id}-${b._id + 19}` : String(b._id),
    count: b.count,
    avgAmount: round2(b.avgAmount),
  }));

  /* Credit history */
  const creditData = (data?.creditHistoryBreakdown ?? []).map((c) => {
    const meta = CREDIT_META[c._id as keyof typeof CREDIT_META] ?? {
      color: "#94a3b8",
      label: c._id,
    };
    return {
      name: meta.label,
      value: c.count,
      amount: c.amount,
      fill: meta.color,
    };
  });

  /* Repayment breakdown for stacked bar */
  const repayData = data?.repaymentOverTime ?? [];

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
            Loans <span style={{ color: "#E4B86A" }}>Report</span>
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
          Export Excel (4 sheets)
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
            style={{ ...inputStyle, minWidth: 150 }}
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
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            className={inputCls + " pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 160 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>
        <div className="relative shrink-0">
          <select
            value={purposeF}
            onChange={(e) => setPurposeF(e.target.value)}
            className={inputCls + " pr-8 appearance-none cursor-pointer"}
            style={{ ...inputStyle, minWidth: 160 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          >
            <option value="">All Purposes</option>
            {[
              "business",
              "education",
              "medical",
              "housing",
              "personal",
              "agriculture",
              "other",
            ].map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.45)" }}
          />
        </div>
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
          className="h-9 w-9 rounded-xl flex items-center justify-center"
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

      {/* ── Loan KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Applications"
          value={(kpis?.totalApplications ?? 0).toLocaleString()}
          sub="All statuses combined"
          icon={FileText}
          gradient="linear-gradient(135deg,#C8963E,#E4B86A)"
        />
        <StatCard
          label="Total Disbursed"
          value={fmt(kpis?.totalAmountDisbursed ?? 0)}
          sub="Active + overdue + paid"
          icon={Banknote}
          gradient="linear-gradient(135deg,#1e3a5f,#60a5fa)"
        />
        <StatCard
          label="Outstanding Balance"
          value={fmt(kpis?.totalOutstanding ?? 0)}
          sub={`${kpis?.activeCount ?? 0} active loans`}
          icon={TrendingUp}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
        />
        <StatCard
          label="Overdue Loans"
          value={(kpis?.overdueCount ?? 0).toLocaleString()}
          sub="Missed payment(s)"
          icon={AlertTriangle}
          gradient="linear-gradient(135deg,#7f1d1d,#fb923c)"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Collected"
          value={fmt(rk?.totalCollected ?? 0)}
          sub={`${rk?.repaymentCount ?? 0} repayments`}
          icon={CheckCircle2}
          gradient="linear-gradient(135deg,#14532d,#4ade80)"
        />
        <StatCard
          label="Interest Collected"
          value={fmt(rk?.totalInterest ?? 0)}
          sub="From repayments in period"
          icon={Percent}
          gradient="linear-gradient(135deg,#312e81,#a78bfa)"
        />
        <StatCard
          label="Penalty Collected"
          value={fmt(rk?.totalPenalty ?? 0)}
          sub="Late payment charges"
          icon={AlertTriangle}
          gradient="linear-gradient(135deg,#7f1d1d,#f87171)"
        />
        <StatCard
          label="Avg Eligibility Score"
          value={`${(kpis?.avgEligibilityScore ?? 0).toFixed(1)}/100`}
          sub="Across all applications"
          icon={BarChart3}
          gradient="linear-gradient(135deg,#92400e,#E4B86A)"
        />
      </div>

      {/* ── Applications over time ── */}
      <ChartCard
        title="Loan Applications Over Time"
        subtitle={`Application count and value grouped by ${groupBy}`}
        action={
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "rgba(200,150,62,0.12)", color: "#E4B86A" }}
          >
            {data?.applicationsOverTime?.length ?? 0} periods
          </span>
        }
      >
        {!data?.applicationsOverTime?.length ? (
          <div
            className="flex items-center justify-center h-48"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-sm">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <TimeChartComponent data={data.applicationsOverTime}>
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
                yAxisId="left"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
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
                    <linearGradient id="amountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E4B86A" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#E4B86A"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="amount"
                    name="Amount Applied"
                    stroke="#E4B86A"
                    fill="url(#amountGrad)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    name="Applications"
                    stroke="#60a5fa"
                    fill="rgba(96,165,250,0.08)"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              ) : chartType === "line" ? (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="amount"
                    name="Amount Applied"
                    stroke="#E4B86A"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    name="Applications"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              ) : (
                <>
                  <Bar
                    yAxisId="right"
                    dataKey="amount"
                    name="Amount Applied"
                    fill="#E4B86A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Applications"
                    fill="#60a5fa"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </>
              )}
            </TimeChartComponent>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Repayment over time ── */}
      <ChartCard
        title="Repayment Collections Over Time"
        subtitle="Principal, interest and penalty collected per period"
      >
        {!repayData.length ? (
          <div
            className="flex items-center justify-center h-40"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-sm">No repayment data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={repayData}>
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
                  paddingTop: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                }}
              />
              <Bar
                dataKey="principal"
                name="Principal"
                stackId="a"
                fill="#4ade80"
              />
              <Bar
                dataKey="interest"
                name="Interest"
                stackId="a"
                fill="#E4B86A"
              />
              <Bar
                dataKey="penalty"
                name="Penalty"
                stackId="a"
                fill="#f87171"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row: Status + Purpose pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Loan Status Distribution"
          subtitle="By number of applications"
        >
          {!statusPieData.length ? (
            <div
              className="flex items-center justify-center h-48"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [val, "Applications"]}
                    contentStyle={{
                      background: "#0e1f3d",
                      border: "1px solid rgba(200,150,62,0.25)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {statusPieData.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: s.fill }}
                      />
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>
                        {s.name}
                      </span>
                    </div>
                    <span className="font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Loan Purpose Breakdown"
          subtitle="By total loan amount"
        >
          {!purposeData.length ? (
            <div
              className="flex items-center justify-center h-48"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={purposeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {purposeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [fmtShort(val), "Amount"]}
                    contentStyle={{
                      background: "#0e1f3d",
                      border: "1px solid rgba(200,150,62,0.25)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {purposeData.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: p.fill }}
                      />
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white">
                        {fmtShort(p.amount)}
                      </span>
                      <span
                        className="ml-1.5"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        ×{p.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Row: Credit history + Score distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Credit History Distribution"
          subtitle="Based on repayment record at time of application"
        >
          {!creditData.length ? (
            <div
              className="flex items-center justify-center h-40"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={creditData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(200,150,62,0.08)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="value"
                  name="Count"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                >
                  {creditData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Eligibility Score Distribution"
          subtitle="Applications bucketed by score range"
        >
          {!scoreBuckets.length ? (
            <div
              className="flex items-center justify-center h-40"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <p className="text-sm">No data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreBuckets}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(200,150,62,0.08)"
                />
                <XAxis
                  dataKey="range"
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
                <Bar
                  dataKey="count"
                  name="Applications"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                >
                  {scoreBuckets.map((b, i) => {
                    const mid = typeof b._id === "number" ? b._id + 10 : 50;
                    const col =
                      mid >= 70 ? "#4ade80" : mid >= 50 ? "#E4B86A" : "#f87171";
                    return <Cell key={i} fill={col} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Portfolio health summary ── */}
      <div
        className="rounded-2xl border p-5 grid grid-cols-1 sm:grid-cols-3 gap-4"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}
      >
        <div>
          <p className="font-serif font-black text-white text-base mb-1">
            Portfolio Health
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            Key repayment ratios
          </p>
        </div>

        {[
          {
            label: "Collection Rate",
            val: kpis?.totalAmountDisbursed
              ? `${((kpis.totalPaid / kpis.totalAmountDisbursed) * 100).toFixed(1)}%`
              : "—",
            sub: "Amount paid vs disbursed",
            color: "#4ade80",
          },
          {
            label: "Overdue Rate",
            val: kpis?.totalApplications
              ? `${((kpis.overdueCount / kpis.totalApplications) * 100).toFixed(1)}%`
              : "—",
            sub: "Overdue vs total loans",
            color: kpis?.overdueCount ? "#fb923c" : "#4ade80",
          },
          {
            label: "Avg Loan Size",
            val: fmt(kpis?.avgLoanAmount ?? 0),
            sub: `Over ${kpis?.avgDuration?.toFixed(0) ?? 0} months avg`,
            color: "#E4B86A",
          },
        ].map(({ label, val, sub, color }) => (
          <div
            key={label}
            className="p-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-wider mb-1"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {label}
            </p>
            <p className="font-serif font-black text-2xl" style={{ color }}>
              {val}
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
