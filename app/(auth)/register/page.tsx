"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const pwStrength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][pwStrength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#C8963E", "#22c55e"][
    pwStrength
  ];

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // role is always "member" — not exposed to the user
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: "member",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }

      toast.success("Account created! Please sign in.");
      router.push("/login?registered=true");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-linear(circle_at_15%_50%,rgba(200,150,62,0.09)_0%,transparent_55%),radial-linear(circle_at_85%_20%,rgba(26,53,96,0.7)_0%,transparent_50%)]" />
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

      <div className="relative z-10 w-full max-w-110 animate-[fadeUp_0.55s_ease_both]">
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
              New Member
            </div>
            <h1 className="font-serif text-[26px] font-black text-white leading-tight">
              Join <span className="text-[#E4B86A]">FCCU</span> Today
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Create your member account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={set("name")}
                placeholder="Kwame Mensah"
                className="w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@firstchoice.gh"
                className="w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 6 characters"
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
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          background:
                            i <= pwStrength
                              ? strengthColor
                              : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: strengthColor }}
                  >
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={form.confirm}
                  onChange={set("confirm")}
                  placeholder="Re-enter password"
                  className={`w-full bg-[#0B1D3A]/60 border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)] ${
                    form.confirm && form.password !== form.confirm
                      ? "border-red-500/50 focus:border-red-500/70"
                      : form.confirm && form.password === form.confirm
                        ? "border-emerald-500/50 focus:border-emerald-500/70"
                        : "border-white/10 focus:border-[#C8963E]/60"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                {form.confirm && form.password === form.confirm && (
                  <CheckCircle2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl shadow-[0_6px_24px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(200,150,62,0.55)] transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Create Account →"
              )}
            </button>

            {/* Sign in link */}
            <p className="text-center text-sm text-white/35 pt-1">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#E4B86A] hover:text-[#C8963E] font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-white/20 mt-6 tracking-wide">
          Member registration · First Choice Credit Union · ©{" "}
          {new Date().getFullYear()}
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
