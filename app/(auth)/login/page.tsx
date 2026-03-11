"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

/* ---------------- LOGIN CONTENT (uses useSearchParams) ---------------- */

function LoginContent() {
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
      <div className="relative z-10 w-full max-w-105 animate-[fadeUp_0.55s_ease_both]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A]">
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
        <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            <h1 className="font-serif text-[26px] font-black text-white">
              Welcome <span className="text-[#E4B86A]">Back</span>
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Sign in to your FCCU account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {/* Success banner */}
            {justRegistered && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Account created! Please sign in.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                <AlertCircle className="w-4 h-4" />
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
                value={form.email}
                onChange={set("email")}
                className="w-full bg-[#0B1D3A]/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.password}
                onChange={set("password")}
                className="w-full bg-[#0B1D3A]/60 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In →"
              )}
            </button>

            <p className="text-center text-sm text-white/35">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-[#E4B86A] hover:text-[#C8963E] font-semibold"
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

/* ---------------- PAGE WRAPPER WITH SUSPENSE ---------------- */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0B1D3A] text-white">
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
