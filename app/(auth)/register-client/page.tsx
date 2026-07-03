"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Eraser,
  IdCard,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";

type CardSide = "front" | "back";

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ClientSelfRegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    nationalId: "",
    dateOfBirth: "",
    occupation: "",
    password: "",
    confirm: "",
  });
  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [f]: e.target.value }));

  // Ghana card images (data URIs held until submit, then uploaded)
  const [frontImg, setFrontImg] = useState<string | null>(null);
  const [backImg, setBackImg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ clientId: string } | null>(null);

  // ── Signature pad ──────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0B1D3A";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasSignature(true);
  }
  function endDraw() {
    drawing.current = false;
  }
  function clearSignature() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleCard(side: CardSide, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    if (side === "front") setFrontImg(dataUrl);
    else setBackImg(dataUrl);
  }

  async function uploadImage(dataUrl: string, folder: string): Promise<string> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: dataUrl, folder }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!frontImg) {
      setError("Please upload the front of your Ghana card.");
      return;
    }
    if (!hasSignature) {
      setError("Please provide your signature.");
      return;
    }
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
      // Upload Ghana card images and signature to Cloudinary
      const signatureData = canvasRef.current!.toDataURL("image/png");
      const [frontUrl, backUrl, signatureUrl] = await Promise.all([
        uploadImage(frontImg, "credit-union/ghana-cards"),
        backImg
          ? uploadImage(backImg, "credit-union/ghana-cards")
          : Promise.resolve(""),
        uploadImage(signatureData, "credit-union/signatures"),
      ]);

      const res = await fetch("/api/auth/register-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          nationalId: form.nationalId,
          dateOfBirth: form.dateOfBirth || undefined,
          occupation: form.occupation || undefined,
          password: form.password,
          ghanaCardFront: frontUrl,
          ghanaCardBack: backUrl || undefined,
          signature: signatureUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      setDone({ clientId: data.clientId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-[#0B1D3A]/60 border border-white/10 focus:border-[#C8963E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:bg-[#0B1D3A]/80 focus:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]";
  const labelCls =
    "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2";

  if (done) {
    return (
      <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-16">
        <div className="relative z-10 w-full max-w-md bg-[#122549] border border-[#C8963E]/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="font-serif text-2xl font-black text-white mb-2">
            Registration Submitted
          </h1>
          <p className="text-white/60 text-sm mb-4">
            Your member ID is{" "}
            <span className="text-[#E4B86A] font-bold">{done.clientId}</span>.
          </p>
          <div className="bg-[#C8963E]/10 border border-[#C8963E]/25 rounded-xl px-4 py-4 text-left mb-6">
            <p className="text-[#E4B86A] font-bold text-sm mb-1">
              Please come to the office for verification
            </p>
            <p className="text-white/55 text-xs leading-relaxed">
              Your account is not yet active. Visit any First Choice Credit
              Union branch with your Ghana card so our staff can verify your
              identity and activate your account. A confirmation has also been
              emailed to you.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block w-full py-3 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold rounded-xl"
          >
            Go to Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A]">
              FC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-white text-[16px]">
                First Choice
              </span>
              <span className="text-[10px] font-medium text-[#E4B86A] tracking-[0.15em] uppercase">
                Credit Union
              </span>
            </div>
          </Link>
        </div>

        <div className="bg-[#122549] border border-[#C8963E]/20 rounded-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            <h1 className="font-serif text-[26px] font-black text-white leading-tight">
              Member <span className="text-[#E4B86A]">Self-Registration</span>
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Register online, then visit the office to complete verification.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input required value={form.firstName} onChange={set("firstName")} className={inputCls} placeholder="Kwame" />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input required value={form.lastName} onChange={set("lastName")} className={inputCls} placeholder="Mensah" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" required value={form.email} onChange={set("email")} className={inputCls} placeholder="you@email.com" />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input required value={form.phone} onChange={set("phone")} className={inputCls} placeholder="0244 000 000" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Residential Address</label>
                <input required value={form.address} onChange={set("address")} className={inputCls} placeholder="House no, street, city" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className={inputCls} style={{ colorScheme: "dark" }} />
              </div>
              <div>
                <label className={labelCls}>Occupation</label>
                <input value={form.occupation} onChange={set("occupation")} className={inputCls} placeholder="Trader" />
              </div>
            </div>

            {/* Ghana card number */}
            <div>
              <label className={labelCls}>Ghana Card Number</label>
              <div className="relative">
                <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C8963E]/60" />
                <input required value={form.nationalId} onChange={set("nationalId")} className={inputCls + " pl-10"} placeholder="GHA-000000000-0" />
              </div>
            </div>

            {/* Ghana card upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["front", "back"] as CardSide[]).map((side) => {
                const img = side === "front" ? frontImg : backImg;
                return (
                  <div key={side}>
                    <label className={labelCls}>
                      Ghana Card {side === "front" ? "(Front)" : "(Back — optional)"}
                    </label>
                    <label className="cursor-pointer block">
                      <div className="border border-dashed border-[#C8963E]/30 rounded-xl h-32 flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#C8963E]/60 transition-colors bg-[#0B1D3A]/40">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={`Ghana card ${side}`} className="h-full w-full object-cover" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-[#C8963E]/60" />
                            <span className="text-xs text-white/40">Click to upload {side}</span>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCard(side, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Signature pad */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + " mb-0 flex items-center gap-1.5"}>
                  <PenLine className="w-3.5 h-3.5" /> Signature
                </label>
                <button type="button" onClick={clearSignature} className="text-[11px] text-red-300 flex items-center gap-1">
                  <Eraser className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#C8963E]/30 bg-white">
                <canvas
                  ref={canvasRef}
                  width={620}
                  height={160}
                  className="w-full touch-none"
                  style={{ height: 160 }}
                  onPointerDown={startDraw}
                  onPointerMove={moveDraw}
                  onPointerUp={endDraw}
                  onPointerLeave={endDraw}
                />
              </div>
              <p className="text-[11px] text-white/30 mt-1.5">
                Sign above using your mouse or finger.
              </p>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Password</label>
                <input type="password" required value={form.password} onChange={set("password")} className={inputCls} placeholder="Min. 6 characters" />
              </div>
              <div>
                <label className={labelCls}>Confirm Password</label>
                <input type="password" required value={form.confirm} onChange={set("confirm")} className={inputCls} placeholder="Re-enter password" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-linear-to-r from-[#C8963E] to-[#E4B86A] text-[#0B1D3A] font-bold text-[15px] rounded-xl disabled:opacity-60 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit Registration →"}
            </button>

            <p className="text-center text-sm text-white/35 pt-1">
              Registering as staff or admin?{" "}
              <Link href="/register" className="text-[#E4B86A] font-semibold">
                Use the staff console
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
