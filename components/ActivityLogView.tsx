"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  UserPlus,
  FileText,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { formatCedis } from "@/lib/currency";

type Period = "day" | "week" | "month" | "year" | "all";

interface Log {
  _id: string;
  action: string;
  amount?: number;
  targetLabel?: string;
  description?: string;
  createdAt: string;
  staff?: { name: string; staffRole?: string };
  targetClient?: { clientId: string; firstName: string; lastName: string };
}

const STAFF_ROLE_LABELS: Record<string, string> = {
  teller_1: "Teller 1",
  teller_2: "Teller 2",
  loan_manager: "Loan Manager",
  operation_manager: "Operation Manager",
  manager: "Manager",
  susu_collector: "Susu Collector",
};

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, color: "#4ade80" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, color: "#f87171" },
  account_open: { label: "Account Opened", icon: UserPlus, color: "#60a5fa" },
  client_register: { label: "Client Verified", icon: UserPlus, color: "#E4B86A" },
  statement_print: { label: "Statement Printed", icon: FileText, color: "#a78bfa" },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
  { key: "all", label: "All Time" },
];

export function ActivityLogView({
  showStaffColumn = false,
  title = "My Activity",
}: {
  showStaffColumn?: boolean;
  title?: string;
}) {
  const [period, setPeriod] = useState<Period>("day");
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<Record<string, { count: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/activity-logs?period=${period}&limit=200`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs ?? []);
        setSummary(data.summary ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    { key: "deposit", label: "Deposits", isMoney: true },
    { key: "withdrawal", label: "Withdrawals", isMoney: true },
    { key: "account_open", label: "Accounts Opened", isMoney: false },
    { key: "statement_print", label: "Statements Printed", isMoney: false },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0B1D3A" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{ background: "rgba(200,150,62,0.12)", border: "1px solid rgba(200,150,62,0.25)", color: "#E4B86A" }}
          >
            <Activity className="w-3 h-3" /> Activity Logs
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            {title}
          </h1>
        </div>
        <button
          onClick={load}
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(200,150,62,0.08)", border: "1px solid rgba(200,150,62,0.18)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(200,150,62,0.7)" }} />
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={
              period === p.key
                ? { background: "linear-gradient(135deg,#C8963E,#E4B86A)", color: "#0B1D3A" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const s = summary[c.key];
          return (
            <div key={c.key} className="rounded-xl border p-4" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                {c.label}
              </p>
              <p className="font-serif font-black text-white text-xl">
                {c.isMoney ? formatCedis(s?.total ?? 0) : s?.count ?? 0}
              </p>
              {c.isMoney && (
                <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {s?.count ?? 0} transactions
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Log table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}>
        <div
          className="grid gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{
            gridTemplateColumns: showStaffColumn ? "150px 130px 1fr 110px 140px" : "150px 1fr 110px 140px",
            background: "rgba(200,150,62,0.06)",
            color: "rgba(228,184,106,0.5)",
          }}
        >
          {showStaffColumn && <span>Staff</span>}
          <span>Action</span>
          <span>Details</span>
          <span>Amount</span>
          <span>When</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No activity in this period</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(200,150,62,0.07)" }}>
            {logs.map((l) => {
              const meta = ACTION_META[l.action] ?? { label: l.action, icon: Activity, color: "#94a3b8" };
              const Icon = meta.icon;
              return (
                <div
                  key={l._id}
                  className="grid gap-4 px-5 py-3.5 items-center"
                  style={{ gridTemplateColumns: showStaffColumn ? "150px 130px 1fr 110px 140px" : "150px 1fr 110px 140px" }}
                >
                  {showStaffColumn && (
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{l.staff?.name ?? "—"}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {l.staff?.staffRole ? STAFF_ROLE_LABELS[l.staff.staffRole] : ""}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                    <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {l.targetLabel || l.description || "—"}
                  </p>
                  <p className="text-xs font-bold" style={{ color: l.amount ? "#E4B86A" : "rgba(255,255,255,0.3)" }}>
                    {l.amount ? formatCedis(l.amount) : "—"}
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                    {format(new Date(l.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
