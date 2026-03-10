"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const justRegistered = params.get("registered") === "true";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const ROLE_DASHBOARD: Record<string, string> = {
    admin: "/admin-dashboard",
    staff: "/staff-dashboard",
    member: "/member-dashboard",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      // data.role from /api/auth/me shape: { success, role, user: { id, name, email } }
      const dest =
        ROLE_DASHBOARD[data.user?.role ?? data.role] ?? "/member-dashboard";
      router.push(dest);
      toast.success("Login Successful");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-linear(circle_at_75%_40%,rgba(200,150,62,0.08)_0%,transparent_50%),radial-linear(circle_at_20%_70%,rgba(26,53,96,0.6)_0%,transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-linear(rgba(200,150,62,0.06) 1px, transparent 1px), linear-linear(90deg, rgba(200,150,62,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-linear(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-linear(ellipse 70% 70% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-105 animate-[fadeUp_0.55s_ease_both]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A] shadow-[0_4px_18px_rgba(200,150,62,0.45)] group-hover:shadow-[0_6px_24px_rgba(200,150,62,0.6)] transition-shadow duration-300">
              FC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-white text-[16px] tracking-wide">
                First Choice
              </span>
              <span className="text-[10px] font-medium text-[#E4B86A] tracking-[0.15em] uppercase">
                Credit Union
              </span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl shadow-[0_24px_64px_rgba(11,29,58,0.6),0_0_80px_rgba(200,150,62,0.05)] overflow-hidden">
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C8963E]/12 border border-[#C8963E]/25 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#E4B86A] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
              Secure Access
            </div>
            <h1 className="font-serif text-[26px] font-black text-white leading-tight">
              Welcome <span className="text-[#E4B86A]">Back</span>
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Sign in to your FCCU account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Success banner after registration */}
            {justRegistered && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Account created! Please sign in.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@firstchoice.gh"
                className="w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]"
              />
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Enter your password"
                  className="w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Divider with decorative element */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/6" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#122549] px-3 text-[10px] text-white/20 tracking-widest uppercase">
                  secure login
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl shadow-[0_6px_24px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(200,150,62,0.55)] transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In →"
              )}
            </button>

            {/* Register link */}
            <p className="text-center text-sm text-white/35 pt-1">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-[#E4B86A] hover:text-[#C8963E] font-semibold transition-colors"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-white/20 mt-6 tracking-wide">
          Protected by FCCU Security · © {new Date().getFullYear()}
        </p>
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
    </main>
  );
}
