"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

type PortalType = "client" | "staff" | "admin";

const PORTALS: { type: PortalType; label: string }[] = [
  { type: "client", label: "Client" },
  { type: "staff", label: "Staff" },
  { type: "admin", label: "Admin" },
];

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin-dashboard",
  staff: "/staff-dashboard",
  client: "/client-dashboard",
};

// ── OTP input — 6 individual boxes ──────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    // Accept only digits
    const digit = char.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[idx] = digit || " ";
    const next = arr.join("").trimEnd();
    onChange(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      const arr = value.padEnd(6, " ").split("");
      if (arr[idx].trim()) {
        arr[idx] = " ";
        onChange(arr.join("").trimEnd());
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i]?.trim() ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`
            w-12 h-14 text-center text-xl font-bold rounded-xl border
            bg-[#0B1D3A]/60 text-white
            transition-all duration-150 outline-none
            ${
              value[i]?.trim()
                ? "border-[#C8963E]/70 shadow-[0_0_0_3px_rgba(200,150,62,0.12)]"
                : "border-white/10"
            }
            focus:border-[#C8963E]/60 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.15)]
            disabled:opacity-40 disabled:cursor-not-allowed
            placeholder:text-white/20
          `}
        />
      ))}
    </div>
  );
}

// ── Main login content ───────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const justRegistered = params.get("registered") === "true";

  // Step: "credentials" → enter email + password
  //       "otp"         → enter 6-digit code
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [portalType, setPortalType] = useState<PortalType>("client");
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [pendingToken, setPendingToken] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resend-OTP cooldown (30 s)
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  // ── Step 1: submit credentials ──────────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          portalType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      setPendingToken(data.pendingToken);
      setStep("otp");
      setResendCooldown(30);
      toast.success("OTP sent — check your email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: submit OTP ─────────────────────────────────────────────────
  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.replace(/\s/g, "").length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: otp.replace(/\s/g, ""), pendingToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      const dest =
        ROLE_DASHBOARD[data.user?.role ?? "client"] ?? "/client-dashboard";
      toast.success("Login successful");
      router.push(dest);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend OTP.");
        return;
      }

      setOtp("");
      setResendCooldown(30);
      toast.success("New OTP sent to your email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Go back to credential step ─────────────────────────────────────────
  const handleBack = () => {
    setStep("otp" === step ? "credentials" : "credentials");
    setOtp("");
    setError("");
    setPendingToken("");
  };

  // ── Portal tab accent colour helper ────────────────────────────────────
  const portalAccent =
    portalType === "admin"
      ? { from: "#9B5CF6", to: "#C084FC" } // purple for admin
      : { from: "#C8963E", to: "#E4B86A" }; // gold for client/staff

  const accentGradient = `linear-gradient(135deg, ${portalAccent.from}, ${portalAccent.to})`;

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(200,150,62,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A] transition-transform group-hover:scale-105"
              style={{ background: accentGradient }}
            >
              FC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-white text-[16px] tracking-wide">
                First Choice
              </span>
              <span
                className="text-[10px] font-medium tracking-[0.15em] uppercase"
                style={{ color: portalAccent.to }}
              >
                Credit Union
              </span>
            </div>
          </Link>
        </div>

        {/* Portal toggle — 3 tabs */}
        {step === "credentials" && (
          <div
            className="flex rounded-xl p-1 mb-4"
            style={{
              background: "rgba(11,29,58,0.8)",
              border: "1px solid rgba(200,150,62,0.2)",
            }}
          >
            {PORTALS.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPortalType(type);
                  setError("");
                }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200"
                style={
                  portalType === type
                    ? { background: accentGradient, color: "#0B1D3A" }
                    : { color: "rgba(255,255,255,0.4)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl shadow-lg overflow-hidden">
          {/* ── Card header ─────────────────────────────────────── */}
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            {step === "otp" ? (
              <div className="flex items-start gap-3">
                <button
                  onClick={handleBack}
                  className="mt-1 text-white/30 hover:text-white/70 transition-colors shrink-0"
                  title="Back to login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck
                      className="w-5 h-5"
                      style={{ color: portalAccent.to }}
                    />
                    <h1 className="font-serif text-[22px] font-black text-white">
                      Verify{" "}
                      <span style={{ color: portalAccent.to }}>
                        Your Identity
                      </span>
                    </h1>
                  </div>
                  <p className="text-sm text-white/45">
                    Enter the 6-digit code sent to{" "}
                    <span className="text-white/65 font-medium">
                      {form.email}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h1 className="font-serif text-[26px] font-black text-white">
                  Welcome <span style={{ color: portalAccent.to }}>Back</span>
                </h1>
                <p className="text-sm text-white/45 mt-1">
                  {portalType === "client"
                    ? "Sign in to your member account"
                    : portalType === "admin"
                      ? "Sign in to the admin portal"
                      : "Sign in to the staff portal"}
                </p>
              </>
            )}
          </div>

          {/* ── Credential form ──────────────────────────────────── */}
          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="px-8 py-7 space-y-5">
              {justRegistered && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-sm text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Account created! Please sign in.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="w-full bg-[#0B1D3A]/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8963E]/50 transition-colors"
                />
              </div>

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
                    placeholder="••••••••"
                    className="w-full bg-[#0B1D3A]/60 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#C8963E]/50 transition-colors"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-opacity disabled:opacity-60"
                style={{ background: accentGradient, color: "#0B1D3A" }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Continue →"
                )}
              </button>

              {portalType === "client" && (
                <p className="text-center text-sm text-white/35">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold hover:opacity-80 transition-opacity"
                    style={{ color: portalAccent.to }}
                  >
                    Create one
                  </Link>
                </p>
              )}
            </form>
          )}

          {/* ── OTP form ─────────────────────────────────────────── */}
          {step === "otp" && (
            <form onSubmit={handleOtp} className="px-8 py-7 space-y-6">
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              <button
                type="submit"
                disabled={loading || otp.replace(/\s/g, "").length < 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-opacity disabled:opacity-50"
                style={{ background: accentGradient, color: "#0B1D3A" }}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Verify &amp; Sign In
                  </>
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-white/35 mb-1">
                  Didn&apos;t receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity disabled:opacity-40"
                  style={{ color: portalAccent.to }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend OTP"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-white/20 mt-5">
          🔒 Protected by two-factor authentication
        </p>
      </div>
    </main>
  );
}

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
