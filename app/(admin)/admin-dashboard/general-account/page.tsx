"use client";

import { useEffect, useState } from "react";
import { Landmark, TrendingUp, TrendingDown, RefreshCw, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { format } from "date-fns";
import { formatCedis } from "@/lib/currency";

interface GeneralAccount {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
}
interface Movement {
  _id: string;
  transactionType: "deposit" | "withdrawal";
  amount: number;
  date: string;
  clientId?: { clientId: string; firstName: string; lastName: string };
  recordedBy?: { name: string; role: string };
}

export default function GeneralAccountPage() {
  const [account, setAccount] = useState<GeneralAccount | null>(null);
  const [recent, setRecent] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/general-account", { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setAccount(data.account);
        setRecent(data.recent ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: "General Account Balance", val: formatCedis(account?.balance ?? 0), icon: Landmark, gradient: "linear-gradient(135deg,#C8963E,#E4B86A)" },
    { label: "Total Deposits", val: formatCedis(account?.totalDeposits ?? 0), icon: TrendingUp, gradient: "linear-gradient(135deg,#14532d,#4ade80)" },
    { label: "Total Withdrawals", val: formatCedis(account?.totalWithdrawals ?? 0), icon: TrendingDown, gradient: "linear-gradient(135deg,#7f1d1d,#f87171)" },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0B1D3A" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{ background: "rgba(200,150,62,0.12)", border: "1px solid rgba(200,150,62,0.25)", color: "#E4B86A" }}
          >
            <Landmark className="w-3 h-3" /> Credit Union Account
          </div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            General <span style={{ color: "#E4B86A" }}>Account</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Every client deposit and withdrawal passes through this pooled account.
          </p>
        </div>
        <button
          onClick={load}
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(200,150,62,0.08)", border: "1px solid rgba(200,150,62,0.18)" }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "rgba(200,150,62,0.7)" }} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-5" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{c.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.gradient }}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="font-serif font-black text-white text-2xl">{c.val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "#122549", borderColor: "rgba(200,150,62,0.14)" }}>
        <div className="px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em]" style={{ background: "rgba(200,150,62,0.06)", color: "rgba(228,184,106,0.5)" }}>
          Recent Movements Through the General Account
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No movements yet</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(200,150,62,0.07)" }}>
            {recent.map((m) => {
              const isD = m.transactionType === "deposit";
              return (
                <div key={m._id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {isD ? <ArrowDownCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <ArrowUpCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {m.clientId ? `${m.clientId.firstName} ${m.clientId.lastName}` : "—"}
                      </p>
                      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {m.recordedBy?.name ?? "—"} · {format(new Date(m.date), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold" style={{ color: isD ? "#4ade80" : "#f87171" }}>
                    {isD ? "+" : "−"}{formatCedis(m.amount)}
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
