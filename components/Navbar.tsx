"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Zap, Package, RefreshCw, Users, Shield } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Features", Icon: Zap },
  { href: "#modules", label: "Modules", Icon: Package },
  { href: "#how-it-works", label: "How It Works", Icon: RefreshCw },
  { href: "#roles", label: "Roles", Icon: Users },
  { href: "#security", label: "Security", Icon: Shield },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeDrawer = () => setOpen(false);

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

          {/* ── Desktop Links ── */}
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

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-medium text-white/80 border border-white/20 rounded-lg hover:border-[#C8963E] hover:text-[#E4B86A] transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2 text-sm font-semibold text-[#0B1D3A] bg-linear-to-r from-[#C8963E] to-[#E4B86A] rounded-lg shadow-[0_4px_14px_rgba(200,150,62,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(200,150,62,0.55)] transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* ── Mobile Hamburger + Sheet ── */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden flex flex-col justify-center items-center gap-1.25 w-10 h-10 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${
                    open ? "translate-y-1.75 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ${
                    open ? "opacity-0 scale-x-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 origin-center ${
                    open ? "-translate-y-1.75 -rotate-45" : ""
                  }`}
                />
              </button>
            </SheetTrigger>

            {/* ── Slide-in Drawer from RIGHT ── */}
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

              {/* Drawer Nav */}
              <nav className="flex-1 px-4 py-5 overflow-y-auto">
                {NAV_LINKS.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-white/70 hover:text-[#E4B86A] hover:bg-[#C8963E]/10 hover:pl-6 transition-all duration-200 mb-1"
                  >
                    <Icon className="w-4.5 h-4.5 text-[#C8963E]/70 shrink-0" />
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Drawer Footer */}
              <div className="px-6 pb-8 pt-4 border-t border-[#C8963E]/10 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={closeDrawer}
                  className="w-full py-3 text-sm font-medium text-center text-white/80 border border-white/20 rounded-xl hover:border-[#C8963E] hover:text-[#E4B86A] transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/dashboard"
                  onClick={closeDrawer}
                  className="w-full py-3 text-sm font-bold text-center text-[#0B1D3A] bg-linear-to-r from-[#C8963E] to-[#E4B86A] rounded-xl shadow-[0_4px_14px_rgba(200,150,62,0.4)] hover:shadow-[0_8px_22px_rgba(200,150,62,0.55)] transition-all duration-200"
                >
                  Get Started →
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
