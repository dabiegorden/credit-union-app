"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  TrendingUp,
  BookOpen,
  Users,
  Hand,
  User,
  LogOut,
  Settings,
  UserPlus,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Landmark,
  FileText,
  UserCog,
  Users2,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "member";
}

interface AdminSidebarProps {
  user: UserProfile;
  onLogout: () => void;
}

export const menuItems = [
  {
    title: "Dashboard",
    url: "/admin-dashboard",
    icon: BarChart3,
  },

  {
    title: "Members",
    items: [
      {
        title: "All Members",
        url: "/admin-dashboard/all-members",
        icon: Users,
      },
      {
        title: "Members Management",
        url: "/admin-dashboard/members",
        icon: Users2,
      },
      {
        title: "Link a member",
        url: "/admin-dashboard/link-member",
        icon: Users2,
      },
    ],
  },

  {
    title: "Savings Management",
    items: [
      {
        title: "Savings Accounts",
        url: "/admin-dashboard/savings",
        icon: Wallet,
      },
      {
        title: "Deposits | Withdrawals",
        url: "/admin-dashboard/deposits",
        icon: DollarSign,
      },
    ],
  },

  {
    title: "Loan Management",
    items: [
      {
        title: "Loans",
        url: "/admin-dashboard/loans",
        icon: ClipboardList,
      },
      // {
      //   title: "Active Loans",
      //   url: "/admin-dashboard/active-loans",
      //   icon: Landmark,
      // },
      // {
      //   title: "Loan Repayments",
      //   url: "/admin-dashboard/loans-repayments",
      //   icon: FileText,
      // },
    ],
  },

  {
    title: "Reports",
    items: [
      {
        title: "Transaction Reports",
        url: "/admin-dashboard/reports-transactions",
        icon: FileText,
      },
      {
        title: "Loan Reports",
        url: "/admin-dashboard/reports-loans",
        icon: FileText,
      },
    ],
  },
];

const roleLabel: Record<UserProfile["role"], string> = {
  admin: "Admin",
  staff: "Staff",
  member: "Member",
};

export function AdminSidebar({ user, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  const getUserInitials = () => {
    const parts = user.name?.trim().split(" ") ?? [];
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  return (
    <Sidebar
      className="border-r border-[#C8963E]/15"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Header ── */}
      <SidebarHeader
        className="p-4 border-b border-[#C8963E]/15"
        style={{ background: "#0B1D3A" }}
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-xl blur-md opacity-60"
              style={{ background: "linear-gradient(135deg,#C8963E,#E4B86A)" }}
            />
            <div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center shadow-lg font-serif font-black text-sm"
              style={{
                background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                color: "#0B1D3A",
              }}
            >
              FC
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-white text-[15px] tracking-wide leading-tight">
              First Choice
            </h2>
            <p
              className="text-[10px] font-medium tracking-[0.15em] uppercase"
              style={{ color: "#E4B86A" }}
            >
              Credit Union
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent style={{ background: "#0B1D3A" }}>
        {menuItems.map((item, index) => (
          <SidebarGroup key={index}>
            {/* Top-level single link */}
            {!item.items && item.url && (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="mx-1 rounded-xl transition-all duration-200 data-[active=true]:shadow-[0_4px_14px_rgba(200,150,62,0.35)]"
                    style={
                      pathname === item.url
                        ? {
                            background:
                              "linear-gradient(135deg,#C8963E,#E4B86A)",
                            color: "#0B1D3A",
                          }
                        : { color: "rgba(255,255,255,0.55)" }
                    }
                  >
                    <Link
                      href={item.url}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}

            {/* Group with sub-items */}
            {item.items && (
              <>
                <SidebarGroupLabel
                  className="text-[10px] font-black uppercase tracking-[0.15em] px-5 py-3 mt-2"
                  style={{ color: "rgba(228,184,106,0.40)" }}
                >
                  {item.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((subItem) => {
                      const isActive = pathname.startsWith(subItem.url);
                      return (
                        <SidebarMenuItem key={subItem.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className="mx-1 rounded-xl transition-all duration-200 data-[active=true]:shadow-[0_4px_14px_rgba(200,150,62,0.35)]"
                            style={
                              isActive
                                ? {
                                    background:
                                      "linear-gradient(135deg,#C8963E,#E4B86A)",
                                    color: "#0B1D3A",
                                  }
                                : { color: "rgba(255,255,255,0.55)" }
                            }
                          >
                            <Link
                              href={subItem.url}
                              className="flex items-center gap-3 px-3 py-2"
                            >
                              <subItem.icon className="w-4 h-4 shrink-0" />
                              <span className="font-semibold text-sm">
                                {subItem.title}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer / User ── */}
      <SidebarFooter
        className="p-4 border-t border-[#C8963E]/15"
        style={{ background: "#0B1D3A" }}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full outline-none">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer border border-[#C8963E]/15 hover:border-[#C8963E]/30 group"
                  style={{ background: "rgba(200,150,62,0.07)" }}
                >
                  <Avatar
                    className="h-9 w-9 shrink-0"
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
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">
                      {user.name}
                    </p>
                    <p
                      className="text-[11px] truncate"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {user.email}
                    </p>
                  </div>
                  <Settings
                    className="w-4 h-4 shrink-0"
                    style={{ color: "rgba(200,150,62,0.5)" }}
                  />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-64 border"
                style={{
                  background: "#122549",
                  borderColor: "rgba(200,150,62,0.2)",
                  boxShadow:
                    "0 16px 48px rgba(11,29,58,0.75), 0 0 60px rgba(200,150,62,0.04)",
                  borderRadius: "14px",
                  color: "white",
                }}
                align="end"
                side="top"
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
                        {roleLabel[user.role]}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator
                  style={{ background: "rgba(200,150,62,0.12)" }}
                />

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

                <DropdownMenuSeparator
                  style={{ background: "rgba(200,150,62,0.12)" }}
                />

                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer px-4 py-2.5 text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
                >
                  <LogOut className="mr-2.5 h-4 w-4" />
                  <span className="font-medium">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
