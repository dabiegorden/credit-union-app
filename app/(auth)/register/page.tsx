"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Briefcase,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type Console = "client" | "staff" | "admin";

const STAFF_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "teller_1", label: "Teller 1" },
  { value: "teller_2", label: "Teller 2" },
  { value: "loan_manager", label: "Loan Manager" },
  { value: "operation_manager", label: "Operation Manager" },
  { value: "manager", label: "Manager" },
  { value: "susu_collector", label: "Susu Collector" },
];

export default function RegisterPage() {
  const [chosen, setChosen] = useState<Console | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    staffRole: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (chosen === "staff" && !form.staffRole) {
      setError("Please select your staff position.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: chosen,
          staffRole: chosen === "staff" ? form.staffRole : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      toast.success("Registration submitted");
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]";
  const labelCls =
    "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2";

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-16">
      <div className="relative z-10 w-full max-w-110">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A]">
              FC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-white text-[16px]">First Choice</span>
              <span className="text-[10px] font-medium text-[#E4B86A] tracking-[0.15em] uppercase">Credit Union</span>
            </div>
          </Link>
        </div>

        <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            <h1 className="font-serif text-[26px] font-black text-white leading-tight">
              Create <span className="text-[#E4B86A]">Account</span>
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Choose the console you are registering for.
            </p>
          </div>

          <div className="px-8 py-7 space-y-5">
            {/* Console selector */}
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "client", label: "Client", icon: Users },
                  { key: "staff", label: "Staff", icon: Briefcase },
                  { key: "admin", label: "Admin", icon: ShieldCheck },
                ] as { key: Console; label: string; icon: typeof Users }[]
              ).map(({ key, label, icon: Icon }) => {
                const active = chosen === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setChosen(key);
                      setError("");
                      setDone(false);
                    }}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border transition-all"
                    style={
                      active
                        ? { background: "rgba(200,150,62,0.15)", borderColor: "rgba(200,150,62,0.55)" }
                        : { background: "rgba(11,29,58,0.5)", borderColor: "rgba(255,255,255,0.08)" }
                    }
                  >
                    <Icon className="w-5 h-5" style={{ color: active ? "#E4B86A" : "rgba(255,255,255,0.4)" }} />
                    <span className="text-xs font-bold" style={{ color: active ? "#E4B86A" : "rgba(255,255,255,0.5)" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Client → dedicated self-registration */}
            {chosen === "client" && (
              <div className="space-y-4">
                <div className="bg-[#C8963E]/10 border border-[#C8963E]/25 rounded-xl px-4 py-4 text-sm text-white/60 leading-relaxed">
                  Members register with a Ghana card and signature, then visit the
                  office for verification.
                </div>
                <Link
                  href="/register-client"
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold rounded-xl"
                >
                  Continue to Member Registration <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Staff / Admin form */}
            {(chosen === "staff" || chosen === "admin") &&
              (done ? (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-5 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-white font-bold text-sm mb-1">Registration submitted</p>
                  <p className="text-white/55 text-xs">
                    Your {chosen} account is pending admin approval. You will be able
                    to sign in once an administrator authorizes access.
                  </p>
                  <Link href="/login" className="inline-block mt-4 text-[#E4B86A] font-semibold text-sm">
                    Go to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input type="text" required value={form.name} onChange={set("name")} placeholder="Kwame Mensah" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input type="email" required value={form.email} onChange={set("email")} placeholder="you@firstchoice.gh" className={inputCls} />
                  </div>
                  {chosen === "staff" && (
                    <div>
                      <label className={labelCls}>Staff Position</label>
                      <select
                        required
                        value={form.staffRole}
                        onChange={(e) => setForm((f) => ({ ...f, staffRole: e.target.value }))}
                        className={inputCls}
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="">Select position…</option>
                        {STAFF_ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} required value={form.password} onChange={set("password")} placeholder="Min. 6 characters" className={inputCls + " pr-11"} />
                      <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password</label>
                    <input type="password" required value={form.confirm} onChange={set("confirm")} placeholder="Re-enter password" className={inputCls} />
                  </div>
                  <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl disabled:opacity-60">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account →"}
                  </button>
                </form>
              ))}

            <p className="text-center text-sm text-white/35 pt-1">
              Already have an account?{" "}
              <Link href="/login" className="text-[#E4B86A] hover:text-[#C8963E] font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
