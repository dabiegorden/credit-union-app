"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LogOut, User, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { AdminSidebar, type UserProfile } from "@/components/AdminSidebar";
import { motion } from "framer-motion";
import { MemberSidebar } from "@/components/MemberSidebar";

function DashboardContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });

      if (!response.ok) {
        if (response.status === 401) router.push("/login");
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      // API: { success, role, user: { id, name, email } }
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.role as UserProfile["role"],
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      toast.success("Logged out successfully");
      router.push("/");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#0B1D3A" }}
      >
        {/* background grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,150,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(200,150,62,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-50"
              style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)" }}
            />
            <div
              className="relative h-12 w-12 animate-spin rounded-full border-4"
              style={{
                borderColor: "rgba(200,150,62,0.2)",
                borderTopColor: "#C8963E",
              }}
            />
          </div>
          <p
            className="font-serif font-semibold"
            style={{ color: "rgba(228,184,106,0.7)" }}
          >
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <MemberSidebar user={user} onLogout={handleLogout} />

      <SidebarInset>
        {/* ── Header ── */}
        <header
          className="fixed top-0 right-0 left-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-all duration-200 ease-linear border-b group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 group-has-data-[collapsible=icon]/sidebar-wrapper:left-12"
          style={{
            background: "rgba(11,29,58,0.92)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(200,150,62,0.15)",
            boxShadow: "0 4px 24px rgba(11,29,58,0.5)",
          }}
        >
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger
              className="rounded-lg p-2 transition-colors duration-200"
              style={{ color: "rgba(255,255,255,0.6)" }}
            />
            <Separator
              orientation="vertical"
              className="mr-2 h-4"
              style={{ background: "rgba(200,150,62,0.2)" }}
            />

            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <Link
                    href="/"
                    className="flex items-center gap-2 transition-colors duration-200 group/logo"
                  >
                    <div className="relative">
                      <div
                        className="absolute inset-0 rounded-lg blur-md opacity-50"
                        style={{
                          background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        }}
                      />
                      <div
                        className="relative w-8 h-8 rounded-lg flex items-center justify-center font-serif font-black text-xs shadow-md"
                        style={{
                          background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                          color: "#0B1D3A",
                        }}
                      >
                        FC
                      </div>
                    </div>
                    <span
                      className="text-base font-serif font-black tracking-wide"
                      style={{ color: "#E4B86A" }}
                    >
                      First Choice
                    </span>
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator
                  className="hidden md:block"
                  style={{ color: "rgba(200,150,62,0.35)" }}
                />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-white">
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* ── Header Right ── */}
          <div className="ml-auto flex items-center gap-2 px-4">
            {/* Bell */}
            <div className="hidden sm:block">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg relative transition-all duration-200"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <Bell className="h-4 w-4" />
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                  }}
                />
              </Button>
            </div>

            {/* Name + email (lg only) */}
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-white leading-tight">
                {user.name}
              </p>
              <p
                className="text-[11px]"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                {user.email}
              </p>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2 rounded-lg p-1.5 cursor-pointer transition-colors duration-200"
                  style={{ background: "rgba(200,150,62,0.08)" }}
                >
                  <Avatar
                    className="h-8 w-8"
                    style={{ border: "2px solid rgba(200,150,62,0.45)" }}
                  >
                    <AvatarFallback
                      className="font-black text-xs"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown
                    className="h-3.5 w-3.5 hidden sm:block"
                    style={{ color: "rgba(200,150,62,0.6)" }}
                  />
                </motion.div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-64 mt-2 border"
                style={{
                  background: "#122549",
                  borderColor: "rgba(200,150,62,0.2)",
                  boxShadow:
                    "0 16px 48px rgba(11,29,58,0.75), 0 0 60px rgba(200,150,62,0.04)",
                  borderRadius: "14px",
                  color: "white",
                }}
                align="end"
              >
                <DropdownMenuLabel className="font-normal px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      className="h-11 w-11 shrink-0"
                      style={{ border: "2px solid rgba(200,150,62,0.45)" }}
                    >
                      <AvatarFallback
                        className="font-black text-sm"
                        style={{
                          background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                          color: "#0B1D3A",
                        }}
                      >
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {user.name}
                      </p>
                      <p
                        className="text-[11px] truncate"
                        style={{ color: "rgba(255,255,255,0.40)" }}
                      >
                        {user.email}
                      </p>
                      <span
                        className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider w-fit"
                        style={{
                          background: "rgba(200,150,62,0.18)",
                          border: "1px solid rgba(200,150,62,0.3)",
                          color: "#E4B86A",
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator
                  style={{ background: "rgba(200,150,62,0.12)" }}
                />

                {/* Mobile: Bell */}
                <div className="sm:hidden">
                  <DropdownMenuItem
                    className="cursor-pointer px-4 py-2.5 focus:bg-[#C8963E]/10"
                    style={{ color: "rgba(255,255,255,0.60)" }}
                  >
                    <Bell
                      className="mr-2.5 h-4 w-4"
                      style={{ color: "#C8963E" }}
                    />
                    <span className="font-medium">Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator
                    style={{ background: "rgba(200,150,62,0.12)" }}
                  />
                </div>

                <DropdownMenuItem
                  className="cursor-pointer px-4 py-2.5 focus:bg-[#C8963E]/10"
                  style={{ color: "rgba(255,255,255,0.60)" }}
                >
                  <User
                    className="mr-2.5 h-4 w-4"
                    style={{ color: "#C8963E" }}
                  />
                  <span className="font-medium">Profile Settings</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer px-4 py-2.5 focus:bg-[#C8963E]/10"
                  style={{ color: "rgba(255,255,255,0.60)" }}
                >
                  <Settings
                    className="mr-2.5 h-4 w-4"
                    style={{ color: "#C8963E" }}
                  />
                  <span className="font-medium">Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator
                  style={{ background: "rgba(200,150,62,0.12)" }}
                />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer px-4 py-2.5 text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
                >
                  <LogOut className="mr-2.5 h-4 w-4" />
                  <span className="font-medium">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Main Content ── */}
        <div
          className="pt-16 flex flex-1 flex-col min-h-screen"
          style={{ background: "#0B1D3A" }}
        >
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 relative">
            {/* Background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
              {/* Grid */}
              <div
                className="absolute inset-0 opacity-[0.35]"
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

              {/* Ambient orbs */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 -right-48 w-96 h-96 rounded-full blur-3xl"
                style={{ background: "rgba(200,150,62,0.07)" }}
              />
              <motion.div
                animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl"
                style={{ background: "rgba(26,53,96,0.6)" }}
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{
                  duration: 16,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(200,150,62,0.06) 0%, transparent 70%)",
                }}
              />
            </div>

            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>;
}
