"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  User,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "client";
  staffRole?: string | null;
  isApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

const STAFF_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "teller_1", label: "Teller 1" },
  { value: "teller_2", label: "Teller 2" },
  { value: "loan_manager", label: "Loan Manager" },
  { value: "operation_manager", label: "Operation Manager" },
  { value: "manager", label: "Manager" },
  { value: "susu_collector", label: "Susu Collector" },
];

const STAFF_ROLE_LABELS: Record<string, string> = Object.fromEntries(
  STAFF_ROLE_OPTIONS.map((o) => [o.value, o.label]),
);

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type RoleFilter = "all" | "staff";

function getInitials(name: string) {
  const parts = name?.trim().split(" ") ?? [];
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_STYLE: Record<string, { bg: string; text: string; border: string }> =
  {
    admin: {
      bg: "rgba(239,68,68,0.12)",
      text: "#f87171",
      border: "rgba(239,68,68,0.25)",
    },
    staff: {
      bg: "rgba(59,130,246,0.12)",
      text: "#60a5fa",
      border: "rgba(59,130,246,0.25)",
    },
    client: {
      bg: "rgba(200,150,62,0.15)",
      text: "#E4B86A",
      border: "rgba(200,150,62,0.3)",
    },
  };

// ─── Reusable icon action button ─────────────────────────────────────────────
function ActionBtn({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}35`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}30`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}65`;
        (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}18`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}35`;
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </button>
  );
}

// ─── UserFormModal ────────────────────────────────────────────────────────────
interface FormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: UserRecord) => void;
  editUser?: UserRecord | null;
}

function UserFormModal({ open, onClose, onSuccess, editUser }: FormModalProps) {
  const isEdit = !!editUser;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [staffRole, setStaffRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName(editUser?.name ?? "");
      setEmail(editUser?.email ?? "");
      setPassword("");
      setIsApproved(editUser?.isApproved ?? false);
      setStaffRole(editUser?.staffRole ?? "");
      setErrors({});
      setShowPw(false);
    }
  }, [open, editUser]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    if (!staffRole) e.staffRole = "Select a staff position";
    if (!isEdit && !password) e.password = "Password is required";
    else if (password && password.length < 6)
      e.password = "Minimum 6 characters";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, string | boolean> = {
        name,
        email,
        role: "staff",
        staffRole,
      };
      if (password) payload.password = password;
      if (isEdit) payload.isApproved = isApproved;

      const res = await fetch(
        isEdit ? `/api/users/${editUser!._id}` : "/api/users",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      toast.success(data.message);
      onSuccess(data.user);
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const field =
    "h-11 rounded-xl bg-[#0B1D3A] border-[#C8963E]/20 text-white placeholder:text-white/25 focus:border-[#C8963E]/55 focus:ring-[#C8963E]/15";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md border p-0 overflow-hidden"
        style={{
          background: "#0F2444",
          borderColor: "rgba(200,150,62,0.2)",
          borderRadius: "20px",
        }}
      >
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg,#C8963E,#E4B86A,#C8963E)",
          }}
        />
        <div className="p-6">
          <DialogHeader className="mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                }}
              >
                <User className="w-5 h-5 text-[#0B1D3A]" />
              </div>
              <div>
                <DialogTitle className="text-white text-[17px] font-bold">
                  {isEdit ? "Edit Staff Account" : "New Staff Account"}
                </DialogTitle>
                <p className="text-white/35 text-xs mt-0.5">
                  {isEdit
                    ? "Update details — leave password blank to keep current"
                    : "Create a new staff login"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#C8963E]" /> Full Name
              </Label>
              <Input
                className={field}
                placeholder="e.g. Kofi Mensah"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && (
                <p className="text-red-400 text-xs">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#C8963E]" /> Email Address
              </Label>
              <Input
                type="email"
                className={field}
                placeholder="kofi@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#C8963E]" />
                {isEdit ? "New Password (optional)" : "Password"}
              </Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  className={`${field} pr-10`}
                  placeholder={
                    isEdit ? "Leave blank to keep current" : "Min. 6 characters"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password}</p>
              )}
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-[#C8963E]" /> Portal Access
                </Label>
                <button
                  type="button"
                  onClick={() => setIsApproved((a) => !a)}
                  className="w-full h-11 rounded-xl border flex items-center justify-between px-4 text-sm font-semibold transition-colors"
                  style={{
                    background: isApproved
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(248,113,113,0.08)",
                    borderColor: isApproved
                      ? "rgba(34,197,94,0.3)"
                      : "rgba(248,113,113,0.3)",
                    color: isApproved ? "#4ade80" : "#f87171",
                  }}
                >
                  <span>
                    {isApproved
                      ? "Approved — can sign in"
                      : "Pending — blocked from sign in"}
                  </span>
                  <span className="text-xs underline opacity-70">
                    {isApproved ? "Revoke" : "Approve"}
                  </span>
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#C8963E]" /> Staff Position
              </Label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#0B1D3A] border border-[#C8963E]/20 text-white text-sm px-4 outline-none focus:border-[#C8963E]/55"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Select position…</option>
                {STAFF_ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.staffRole && (
                <p className="text-red-400 text-xs">{errors.staffRole}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl font-bold px-6 gap-2"
              style={{
                background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                color: "#0B1D3A",
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── DeleteModal ──────────────────────────────────────────────────────────────
function DeleteModal({
  open,
  user,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent
        className="max-w-sm border p-0 overflow-hidden"
        style={{
          background: "#0F2444",
          borderColor: "rgba(239,68,68,0.25)",
          borderRadius: "20px",
        }}
      >
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg,#ef4444,#f87171)" }}
        />
        <div className="p-6">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white text-[17px] font-bold">
                Remove Account
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-white/40 text-sm">
              Permanently delete{" "}
              <span className="text-white font-semibold">{user?.name}</span>
              &apos;s account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="rounded-xl font-bold gap-2 bg-red-500 hover:bg-red-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffAccountsPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchUsers = useCallback(
    async (page = 1, q = search, role = roleFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
          role,
          ...(q ? { search: q } : {}),
        });
        const res = await fetch(`/api/users?${params}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load users",
        );
      } finally {
        setLoading(false);
        setSpinning(false);
      }
    },
    [search, roleFilter],
  );

  useEffect(() => {
    fetchUsers(1, "", "all");
  }, []); // eslint-disable-line

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(
      () => fetchUsers(1, search, roleFilter),
      380,
    );
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, roleFilter, fetchUsers]);

  const handleFormSuccess = (user: UserRecord) => {
    if (editUser)
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, ...user } : u)),
      );
    else fetchUsers(1, search, roleFilter);
  };

  const handleApprove = async (user: UserRecord) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isApproved: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${user.name} approved — they can now sign in`);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isApproved: true } : u)),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteUser._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setUsers((prev) => prev.filter((u) => u._id !== deleteUser._id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
      setDeleteUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  const TABS: { id: RoleFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "staff", label: "Staff" },
  ];

  return (
    <div
      className="min-h-screen p-6 space-y-6"
      style={{ background: "#0B1D3A" }}
    >
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C8963E]/12 border border-[#C8963E]/25 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#E4B86A] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E] animate-pulse" />
            Staff Management
          </div>
          <h1 className="font-serif text-2xl font-black text-white tracking-tight">
            Staff Accounts
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Manage staff login accounts for the admin portal
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUser(null);
            setFormOpen(true);
          }}
          className="rounded-xl font-bold px-5 gap-2 shrink-0"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
          }}
        >
          <UserPlus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            label: "Total Accounts",
            value: pagination.total,
            icon: Users,
            gradient: "linear-gradient(135deg,#C8963E,#E4B86A)",
          },
          {
            label: "Staff",
            value: users.filter((u) => u.role === "staff").length || "—",
            icon: Shield,
            gradient: "linear-gradient(135deg,#059669,#10b981)",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl p-5 border flex items-center gap-4"
            style={{
              background: "rgba(200,150,62,0.04)",
              borderColor: "rgba(200,150,62,0.12)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: c.gradient }}
            >
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{c.value}</p>
              <p className="text-white/40 text-xs font-medium">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "rgba(200,150,62,0.03)",
          borderColor: "rgba(200,150,62,0.12)",
        }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(200,150,62,0.1)" }}
        >
          <div
            className="inline-flex gap-0.5 p-1 rounded-xl"
            style={{
              background: "rgba(200,150,62,0.07)",
              border: "1px solid rgba(200,150,62,0.1)",
            }}
          >
            {TABS.map((t) => {
              const active = roleFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setRoleFilter(t.id)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={
                    active
                      ? {
                          background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                          color: "#0B1D3A",
                        }
                      : { color: "rgba(255,255,255,0.4)" }
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: "rgba(200,150,62,0.5)" }}
              />
              <Input
                className="pl-9 h-9 w-52 rounded-xl bg-[#0B1D3A] border-[#C8963E]/20 text-white text-sm placeholder:text-white/25"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSpinning(true);
                fetchUsers(pagination.page, search, roleFilter);
              }}
              className="h-9 w-9 p-0 hover:bg-white/5 rounded-xl"
            >
              <RefreshCw
                className={`w-4 h-4 text-white/40 ${spinning ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(200,150,62,0.08)" }}>
                {["User", "Email", "Role", "Status", "Joined", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.15em] ${h === "Actions" ? "text-right" : ""}`}
                    style={{ color: "rgba(228,184,106,0.4)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-3">
                      <div
                        className="h-10 rounded-xl animate-pulse"
                        style={{ background: "rgba(200,150,62,0.05)" }}
                      />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Users
                      className="w-6 h-6 mx-auto mb-3"
                      style={{ color: "rgba(200,150,62,0.35)" }}
                    />
                    <p className="text-white/25 text-sm">
                      No staff accounts found
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const rc = ROLE_STYLE[user.role] ?? ROLE_STYLE.staff;
                  return (
                    <tr
                      key={user._id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(200,150,62,0.06)",
                        background:
                          idx % 2 !== 0
                            ? "rgba(200,150,62,0.015)"
                            : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(200,150,62,0.055)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          idx % 2 !== 0
                            ? "rgba(200,150,62,0.015)"
                            : "transparent")
                      }
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            className="h-9 w-9 shrink-0"
                            style={{ border: "2px solid rgba(200,150,62,0.3)" }}
                          >
                            <AvatarFallback
                              className="text-xs font-black"
                              style={{
                                background:
                                  "linear-gradient(135deg,#C8963E,#E4B86A)",
                                color: "#0B1D3A",
                              }}
                            >
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white font-semibold text-sm">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5">
                        <span className="text-white/45 text-sm">
                          {user.email}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{
                              background: rc.bg,
                              color: rc.text,
                              border: `1px solid ${rc.border}`,
                            }}
                          >
                            {user.role}
                          </span>
                          {user.staffRole && (
                            <span className="text-[11px] text-white/45 font-medium">
                              {STAFF_ROLE_LABELS[user.staffRole] ?? user.staffRole}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            background: user.isApproved
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(248,113,113,0.12)",
                            color: user.isApproved ? "#4ade80" : "#f87171",
                            border: `1px solid ${user.isApproved ? "rgba(34,197,94,0.25)" : "rgba(248,113,113,0.25)"}`,
                          }}
                        >
                          {user.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3.5">
                        <span className="text-white/35 text-sm">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </span>
                      </td>

                      {/* ── Actions — always visible ── */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          {!user.isApproved && (
                            <ActionBtn
                              icon={CheckCircle2}
                              label="Approve"
                              color="#4ade80"
                              onClick={() => handleApprove(user)}
                            />
                          )}
                          <ActionBtn
                            icon={Pencil}
                            label="Edit"
                            color="#C8963E"
                            onClick={() => {
                              setEditUser(user);
                              setFormOpen(true);
                            }}
                          />
                          <ActionBtn
                            icon={Trash2}
                            label="Delete"
                            color="#f87171"
                            onClick={() => setDeleteUser(user)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-4 border-t"
            style={{ borderColor: "rgba(200,150,62,0.1)" }}
          >
            <p className="text-white/30 text-sm">
              Showing{" "}
              <span className="text-white/55 font-semibold">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="text-white/55 font-semibold">
                {pagination.total}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 disabled:opacity-25"
              >
                <ChevronLeft className="w-4 h-4 text-white/55" />
              </Button>
              {Array.from(
                { length: Math.min(pagination.pages, 5) },
                (_, i) => i + 1,
              ).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchUsers(p)}
                  className="h-8 w-8 p-0 rounded-lg text-sm font-bold"
                  style={
                    p === pagination.page
                      ? {
                          background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                          color: "#0B1D3A",
                        }
                      : { color: "rgba(255,255,255,0.35)" }
                  }
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="h-8 w-8 p-0 rounded-lg hover:bg-white/5 disabled:opacity-25"
              >
                <ChevronRight className="w-4 h-4 text-white/55" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        editUser={editUser}
      />
      <DeleteModal
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
