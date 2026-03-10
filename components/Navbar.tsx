"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Zap,
  Package,
  RefreshCw,
  Users,
  Shield,
  LogOut,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features", Icon: Zap },
  { href: "#modules", label: "Modules", Icon: Package },
  { href: "#how-it-works", label: "How It Works", Icon: RefreshCw },
  { href: "#roles", label: "Roles", Icon: Users },
  { href: "#security", label: "Security", Icon: Shield },
];

const ROLE_DASHBOARD: Record<string, string> = {
  admin: "/admin-dashboard",
  staff: "/staff-dashboard",
  member: "/member-dashboard",
};

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "member";
}

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch current user (cookie-based, silent — no redirect on failure)
  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.role,
      });
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    router.push("/");
  };

  const closeDrawer = () => setOpen(false);
  const dashboardHref = user
    ? (ROLE_DASHBOARD[user.role] ?? "/member-dashboard")
    : "/login";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? "bg-[#0B1D3A]/99 border-[#C8963E]/20 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            : "bg-[#0B1D3A]/95 border-[#C8963E]/10 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-lg text-[#0B1D3A] shadow-[0_4px_14px_rgba(200,150,62,0.45)] group-hover:shadow-[0_6px_20px_rgba(200,150,62,0.6)] transition-shadow duration-300">
              FC
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-serif font-bold text-white text-[15px] tracking-wide">
                First Choice
              </span>
              <span className="text-[10px] font-medium text-[#E4B86A] tracking-[0.15em] uppercase">
                Credit Union
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <ul className="hidden md:flex items-center gap-1 list-none">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="px-4 py-2 text-sm font-medium text-white/70 hover:text-[#E4B86A] hover:bg-[#C8963E]/10 rounded-lg transition-all duration-200"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Desktop Right ── */}
          <div className="hidden md:flex items-center gap-3">
            {authChecked && user ? (
              /* ── Logged-in: User Menu ── */
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#C8963E]/25 bg-[#C8963E]/8 hover:bg-[#C8963E]/14 hover:border-[#C8963E]/40 transition-all duration-200 cursor-pointer group">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center text-[11px] font-black text-[#0B1D3A]">
                      {getInitials(user.name)}
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-[13px] font-semibold text-white truncate max-w-30">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-[#E4B86A]/70 uppercase tracking-wider font-medium">
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors ml-0.5" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-64 mt-2 bg-[#122549] border border-[#C8963E]/20 text-white shadow-[0_16px_48px_rgba(11,29,58,0.7)] rounded-xl"
                  align="end"
                >
                  {/* User info block */}
                  <DropdownMenuLabel className="font-normal px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center text-[13px] font-black text-[#0B1D3A] shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">
                          {user.email}
                        </p>
                        <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full bg-[#C8963E]/20 border border-[#C8963E]/30 text-[#E4B86A] font-bold uppercase tracking-wider">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-white/6" />

                  {/* Dashboard link */}
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer focus:bg-[#C8963E]/10 focus:text-[#E4B86A] text-white/70 hover:text-[#E4B86A] px-4 py-2.5"
                  >
                    <Link
                      href={dashboardHref}
                      className="flex items-center gap-2.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#C8963E]" />
                      <span className="font-medium">My Dashboard</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/6" />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300 px-4 py-2.5"
                  >
                    <LogOut className="mr-2.5 h-4 w-4" />
                    <span className="font-medium">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : authChecked ? (
              /* ── Logged-out: Sign In + Get Started ── */
              <>
                <Link
                  href="/login"
                  className="px-5 py-2 text-sm font-medium text-white/80 border border-white/20 rounded-lg hover:border-[#C8963E] hover:text-[#E4B86A] transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2 text-sm font-semibold text-[#0B1D3A] bg-linear-to-r from-[#C8963E] to-[#E4B86A] rounded-lg shadow-[0_4px_14px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(200,150,62,0.55)] transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            ) : (
              /* ── Skeleton while checking ── */
              <div className="w-32 h-9 rounded-lg bg-white/5 animate-pulse" />
            )}
          </div>

          {/* ── Mobile Hamburger + Sheet ── */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden flex flex-col justify-center items-center gap-1.25 w-10 h-10 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${open ? "translate-y-1.75 rotate-45" : ""}`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${open ? "-translate-y-1.75 -rotate-45" : ""}`}
                />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[min(360px,100vw)] bg-[#0B1D3A] border-l border-[#C8963E]/15 p-0 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#C8963E]/10">
                <Link
                  href="/"
                  className="flex items-center gap-3"
                  onClick={closeDrawer}
                >
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center font-serif font-black text-sm text-[#0B1D3A]">
                    FC
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-serif font-bold text-white text-[14px]">
                      First Choice
                    </span>
                    <span className="text-[10px] text-[#E4B86A] tracking-[0.12em] uppercase">
                      Credit Union
                    </span>
                  </div>
                </Link>
              </div>

              {/* Logged-in user info strip */}
              {user && (
                <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 bg-[#122549] border border-[#C8963E]/20 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#C8963E] to-[#E4B86A] flex items-center justify-center text-[12px] font-black text-[#0B1D3A] shrink-0">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-white/40 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-[#C8963E]/20 border border-[#C8963E]/30 text-[#E4B86A] font-bold uppercase tracking-wider">
                    {user.role}
                  </span>
                </div>
              )}

              {/* Drawer Nav */}
              <nav className="flex-1 px-4 py-5 overflow-y-auto">
                {NAV_LINKS.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/70 hover:text-[#E4B86A] hover:bg-[#C8963E]/10 hover:pl-6 transition-all duration-200 mb-1"
                  >
                    <Icon className="w-4 h-4 text-[#C8963E]/70 shrink-0" />
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="px-6 pb-8 pt-4 border-t border-[#C8963E]/10 flex flex-col gap-3">
                {user ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={closeDrawer}
                      className="w-full py-3 text-sm font-bold text-center text-[#0B1D3A] bg-linear-to-r from-[#C8963E] to-[#E4B86A] rounded-xl shadow-[0_4px_14px_rgba(200,150,62,0.4)] hover:shadow-[0_8px_22px_rgba(200,150,62,0.55)] transition-all duration-200"
                    >
                      My Dashboard →
                    </Link>
                    <button
                      onClick={() => {
                        closeDrawer();
                        handleLogout();
                      }}
                      className="w-full py-3 text-sm font-medium text-center text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/8 hover:border-red-500/40 transition-all duration-200"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={closeDrawer}
                      className="w-full py-3 text-sm font-medium text-center text-white/80 border border-white/20 rounded-xl hover:border-[#C8963E] hover:text-[#E4B86A] transition-all duration-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={closeDrawer}
                      className="w-full py-3 text-sm font-bold text-center text-[#0B1D3A] bg-linear-to-r from-[#C8963E] to-[#E4B86A] rounded-xl shadow-[0_4px_14px_rgba(200,150,62,0.4)] hover:shadow-[0_8px_22px_rgba(200,150,62,0.55)] transition-all duration-200"
                    >
                      Get Started →
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
