"use client";

import Link from "next/link";

const STATS = [
  { value: "500+", label: "Members Managed" },
  { value: "GH₵2M+", label: "Transactions Processed" },
  { value: "99.9%", label: "Uptime Reliability" },
];

const PREVIEW_CARDS = [
  { label: "Total Savings", value: "GH₵847K", change: "↑ 12.4%" },
  { label: "Active Loans", value: "143", change: "↑ 5.2%" },
  { label: "Members", value: "512", change: "↑ 8.1%" },
];

const PREVIEW_ROWS = [
  {
    initials: "AK",
    name: "Ama Kusi",
    action: "Loan Application",
    amount: "GH₵5,000",
    status: "Approved",
    color: "bg-emerald-500/15 text-emerald-400",
  },
  {
    initials: "KO",
    name: "Kofi Owusu",
    action: "Savings Deposit",
    amount: "GH₵800",
    status: "Pending",
    color: "bg-yellow-500/15 text-yellow-300",
  },
  {
    initials: "AB",
    name: "Adwoa Boateng",
    action: "New Member",
    amount: "—",
    status: "Review",
    color: "bg-blue-500/15 text-blue-300",
  },
];

const BAR_HEIGHTS = [40, 55, 45, 70, 60, 85, 75, 90, 80];

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#0B1D3A] flex items-center pt-[72px] overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(200,150,62,0.08)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(26,53,96,0.6)_0%,transparent_50%),radial-gradient(circle_at_60%_80%,rgba(200,150,62,0.05)_0%,transparent_40%)]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,150,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,62,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* ── Left: Copy ── */}
        <div className="animate-[fadeUp_0.6s_ease_both]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#C8963E]/12 border border-[#C8963E]/25 rounded-full text-xs font-bold tracking-[0.1em] uppercase text-[#E4B86A] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
            Web-Based Office Automation
          </div>

          {/* Headline */}
          <h1 className="font-serif text-[clamp(38px,5vw,62px)] font-black leading-[1.08] text-white mb-6">
            Smarter Banking
            <br />
            <span className="text-[#E4B86A]">Operations,</span>
            <br />
            <span className="text-[#C8963E]">Automated.</span>
          </h1>

          <p className="text-[17px] text-white/60 leading-[1.75] max-w-[500px] mb-9">
            A comprehensive digital platform automating membership registration,
            loan management, savings tracking, and financial reporting for First
            Choice Credit Union.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl shadow-[0_6px_24px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(200,150,62,0.55)] transition-all duration-250"
            >
              🚀 Access Dashboard
            </Link>
            <Link
              href="#modules"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-white/80 font-semibold text-[15px] rounded-xl border border-white/20 hover:border-[#C8963E] hover:text-[#E4B86A] hover:bg-[#C8963E]/8 transition-all duration-250"
            >
              Explore Modules →
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-9 border-t border-white/8">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-serif text-[28px] font-bold text-[#C8963E]">
                  {s.value}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Dashboard Preview ── */}
        <div className="animate-[fadeUp_0.6s_0.15s_ease_both]">
          <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(11,29,58,0.5),0_0_80px_rgba(200,150,62,0.06)]">
            {/* Browser chrome */}
            <div className="bg-[#1A3560] px-4 py-3 flex items-center gap-3 border-b border-white/6">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 bg-black/25 rounded-md px-3 py-1.5 text-[11px] text-white/35 font-mono">
                fccu.system/dashboard
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>

            {/* Dashboard body */}
            <div className="p-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <p className="font-serif text-[17px] font-bold text-white">
                  FCCU Dashboard
                </p>
                <p className="text-[11px] text-white/35">March 2025</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {PREVIEW_CARDS.map((c) => (
                  <div
                    key={c.label}
                    className="bg-white/4 border border-white/7 rounded-xl p-3"
                  >
                    <p className="text-[10px] text-white/40 mb-1.5">
                      {c.label}
                    </p>
                    <p className="font-serif text-[18px] font-bold text-white leading-none">
                      {c.value}
                    </p>
                    <p className="text-[10px] text-emerald-400 mt-1">
                      {c.change}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div className="bg-white/3 border border-white/6 rounded-xl p-3.5 mb-4">
                <p className="text-[11px] text-white/35 mb-2.5">
                  Monthly Collections
                </p>
                <div className="flex items-end gap-1.5 h-[60px]">
                  {BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-gradient-to-t from-[#C8963E] to-[#E4B86A] opacity-70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Recent transactions */}
              <div className="space-y-0">
                {PREVIEW_ROWS.map((row, i) => (
                  <div
                    key={row.initials}
                    className={`flex items-center gap-3 py-2.5 ${i < PREVIEW_ROWS.length - 1 ? "border-b border-white/4" : ""}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C8963E] to-[#1A3560] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {row.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/65 truncate">
                        {row.name} · {row.action}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-[#E4B86A]">
                      {row.amount}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.color}`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
