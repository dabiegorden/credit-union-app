"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Self-registration is for members (clients) only. Staff and admin accounts
// are created by an administrator from the admin console.
export default function RegisterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/register-client");
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0B1D3A] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#C8963E" }} />
    </main>
  );
}
