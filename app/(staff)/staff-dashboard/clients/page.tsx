"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  X,
  Loader2,
  UserRound,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ChevronDown,
  Filter,
  Users,
  TrendingUp,
  UserCheck,
  UserX,
  CreditCard as CardIcon,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Client {
  _id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  nationalId: string;
  occupation?: string;
  dateOfBirth?: string;
  photo?: string;
  createdAt: string;
  status: "active" | "inactive" | "suspended";
  savingsBalance: number;
}

type ModalMode = "add" | "edit" | "view" | null;

const STATUS_META = {
  active: {
    label: "Active",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.3)",
    text: "#4ade80",
  },
  inactive: {
    label: "Inactive",
    bg: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    text: "rgba(255,255,255,0.45)",
  },
  suspended: {
    label: "Suspended",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    text: "#f87171",
  },
};

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  nationalId: "",
  occupation: "",
  dateOfBirth: "",
  password: "",
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    status: "active" as Client["status"],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });

  const fetchClients = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search.trim()) params.set("search", search.trim());
        const res = await fetch(`/api/clients?${params}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClients(data.clients ?? []);
        setFiltered(data.clients ?? []);
        setPagination(data.pagination);
      } catch {
        toast.error("Failed to load clients");
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const stats = {
    total: pagination.total,
    active: clients.filter((c) => c.status === "active").length,
    inactive: clients.filter((c) => c.status === "inactive").length,
    suspended: clients.filter((c) => c.status === "suspended").length,
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, status: "active" });
    setSelected(null);
    setModalMode("add");
  };
  const openEdit = (c: Client) => {
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      nationalId: c.nationalId,
      occupation: c.occupation ?? "",
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.split("T")[0] : "",
      password: "",
      status: c.status,
    });
    setSelected(c);
    setModalMode("edit");
  };
  const openView = (c: Client) => {
    setSelected(c);
    setModalMode("view");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
    setEditReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const isEdit = modalMode === "edit" && selected;

      if (isEdit) {
        // Staff cannot edit clients directly — submit a request for admin approval.
        if (!editReason.trim()) {
          toast.error("Please explain why this edit is needed");
          return;
        }
        const res = await fetch("/api/approval-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "client_edit",
            targetId: selected._id,
            targetLabel: `${selected.firstName} ${selected.lastName} (${selected.clientId})`,
            payload: {
              firstName: form.firstName,
              lastName: form.lastName,
              phone: form.phone,
              email: form.email,
              address: form.address,
              occupation: form.occupation,
              status: form.status,
            },
            reason: editReason.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Failed to submit request");
          return;
        }
        toast.success("Edit request sent to admin for approval");
        setEditReason("");
        closeModal();
        return;
      }

      const body = {
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        occupation: form.occupation || undefined,
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Operation failed");
        return;
      }
      toast.success("Client registered");
      closeModal();
      fetchClients();
    } catch {
      toast.error("Network error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (!deleteReason.trim()) {
      toast.error("Please explain why this client should be deleted");
      return;
    }
    const target = clients.find((c) => c._id === deleteId);
    setDeleteLoading(true);
    try {
      // Staff cannot delete clients directly — submit a request for admin approval.
      const res = await fetch("/api/approval-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "client_delete",
          targetId: deleteId,
          targetLabel: target
            ? `${target.firstName} ${target.lastName} (${target.clientId})`
            : undefined,
          reason: deleteReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit request");
        return;
      }
      toast.success("Delete request sent to admin for approval");
      setDeleteId(null);
      setDeleteReason("");
    } catch {
      toast.error("Network error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-black text-white text-2xl sm:text-3xl">
            Client <span style={{ color: "#E4B86A" }}>Management</span>
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.40)" }}
          >
            Register and manage credit union clients
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#C8963E,#E4B86A)",
            color: "#0B1D3A",
            boxShadow: "0 6px 24px rgba(200,150,62,0.4)",
          }}
        >
          <Plus className="w-4 h-4" /> Register Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total", val: stats.total, color: "#E4B86A" },
          {
            icon: UserCheck,
            label: "Active",
            val: stats.active,
            color: "#4ade80",
          },
          {
            icon: UserRound,
            label: "Inactive",
            val: stats.inactive,
            color: "rgba(255,255,255,0.45)",
          },
          {
            icon: UserX,
            label: "Suspended",
            val: stats.suspended,
            color: "#f87171",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl border p-4"
            style={{
              background: "#122549",
              borderColor: "rgba(200,150,62,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.38)" }}
              >
                {s.label}
              </p>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="font-serif font-black text-2xl text-white">{s.val}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <input
            type="text"
            placeholder="Search name, email, ID, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: "#122549",
              border: "1px solid rgba(200,150,62,0.18)",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "rgba(200,150,62,0.5)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(200,150,62,0.18)")
            }
          />
        </div>
        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-xl pl-9 pr-8 py-2.5 text-sm text-white outline-none cursor-pointer"
            style={{
              background: "#122549",
              border: "1px solid rgba(200,150,62,0.18)",
              minWidth: "150px",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: "rgba(200,150,62,0.5)" }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: "#122549", borderColor: "rgba(200,150,62,0.15)" }}
      >
        <div
          className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em]"
          style={{
            background: "rgba(200,150,62,0.06)",
            borderBottom: "1px solid rgba(200,150,62,0.12)",
            color: "rgba(228,184,106,0.55)",
          }}
        >
          <span>Client</span>
          <span className="hidden sm:block">Contact</span>
          <span className="hidden md:block">Savings</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-16 gap-3"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <Loader2
              className="w-5 h-5 animate-spin"
              style={{ color: "#C8963E" }}
            />
            <span className="text-sm">Loading clients…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users
              className="w-10 h-10"
              style={{ color: "rgba(200,150,62,0.25)" }}
            />
            <p
              className="text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              No clients yet
            </p>
            <button
              onClick={openAdd}
              className="text-xs font-bold"
              style={{ color: "#E4B86A" }}
            >
              + Register first client
            </button>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "rgba(200,150,62,0.08)" }}
          >
            {filtered.map((c, i) => {
              const sm = STATUS_META[c.status];
              return (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-4 px-5 py-4 items-center group transition-colors"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(200,150,62,0.04)")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                        color: "#0B1D3A",
                      }}
                    >
                      {c.firstName[0]}
                      {c.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      <p
                        className="text-[10px] truncate font-medium"
                        style={{ color: "#E4B86A" }}
                      >
                        {c.clientId}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className="text-xs text-white/70 truncate">{c.email}</p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.38)" }}
                    >
                      {c.phone}
                    </p>
                  </div>
                  <div className="hidden md:block">
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#E4B86A" }}
                    >
                      GHS
                      {c.savingsBalance.toLocaleString("en-GH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      Balance
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{
                      background: sm.bg,
                      border: `1px solid ${sm.border}`,
                      color: sm.text,
                    }}
                  >
                    {sm.label}
                  </span>
                  <div className="flex items-center gap-1 justify-end">
                    <ActionBtn
                      icon={Eye}
                      title="View"
                      color="#C8963E"
                      onClick={() => openView(c)}
                    />
                    <ActionBtn
                      icon={Pencil}
                      title="Edit"
                      color="#E4B86A"
                      onClick={() => openEdit(c)}
                    />
                    <ActionBtn
                      icon={CardIcon}
                      title="Card"
                      color="#a78bfa"
                      onClick={() =>
                        router.push(`/admin-dashboard/clients/${c._id}/card`)
                      }
                    />
                    <ActionBtn
                      icon={Trash2}
                      title="Delete"
                      color="#f87171"
                      onClick={() => setDeleteId(c._id)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div
            className="px-5 py-3 text-[11px]"
            style={{
              borderTop: "1px solid rgba(200,150,62,0.10)",
              color: "rgba(255,255,255,0.30)",
              background: "rgba(200,150,62,0.03)",
            }}
          >
            Showing {filtered.length} of {pagination.total} client
            {pagination.total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {(modalMode === "add" || modalMode === "edit") && (
          <Modal
            onClose={closeModal}
            title={
              modalMode === "add"
                ? "Register New Client"
                : "Request Client Edit"
            }
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <Input
                    value={form.firstName}
                    onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                    placeholder="Kwame"
                    required
                  />
                </Field>
                <Field label="Last Name" required>
                  <Input
                    value={form.lastName}
                    onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                    placeholder="Mensah"
                    required
                  />
                </Field>
              </div>
              <Field label="Email Address" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  placeholder="kwame@example.com"
                  required
                />
              </Field>
              <Field label="Phone Number" required>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder="0241234567"
                  required
                />
              </Field>
              <Field label="Address" required>
                <Input
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  placeholder="Accra, Ghana"
                  required
                />
              </Field>
              {modalMode === "add" && (
                <>
                  <Field label="National ID" required>
                    <Input
                      value={form.nationalId}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, nationalId: v }))
                      }
                      placeholder="GHA-XXXXXXXXX-X"
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date of Birth">
                      <Input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, dateOfBirth: v }))
                        }
                      />
                    </Field>
                    <Field label="Occupation">
                      <Input
                        value={form.occupation}
                        onChange={(v) =>
                          setForm((f) => ({ ...f, occupation: v }))
                        }
                        placeholder="e.g. Trader"
                      />
                    </Field>
                  </div>
                  <Field label="Initial Password" required>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                      placeholder="Min. 6 characters"
                      required
                    />
                  </Field>
                  <p
                    className="text-[11px]"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    The client will use this password to log into their portal.
                    They can change it after first login.
                  </p>
                </>
              )}
              {modalMode === "edit" && (
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as Client["status"],
                      }))
                    }
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none"
                    style={{
                      background: "rgba(11,29,58,0.7)",
                      border: "1px solid rgba(200,150,62,0.25)",
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </Field>
              )}
              {modalMode === "edit" && (
                <Field label="Reason for this edit (sent to admin)" required>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="Explain why these changes are needed…"
                    rows={3}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{
                      background: "rgba(11,29,58,0.70)",
                      border: "1px solid rgba(200,150,62,0.20)",
                    }}
                  />
                  <p
                    className="text-[11px] mt-2"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Staff cannot edit clients directly. This request will be
                    sent to an admin for approval, and the changes will be
                    applied once approved.
                  </p>
                </Field>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : modalMode === "add" ? (
                    "Register Client"
                  ) : (
                    "Submit for Approval"
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {modalMode === "view" && selected && (
          <Modal onClose={closeModal} title="Client Details">
            <div className="space-y-4">
              <div
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                  background: "rgba(200,150,62,0.07)",
                  border: "1px solid rgba(200,150,62,0.15)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  {selected.firstName[0]}
                  {selected.lastName[0]}
                </div>
                <div>
                  <p className="font-serif font-black text-white text-lg">
                    {selected.firstName} {selected.lastName}
                  </p>
                  <p className="text-xs font-bold" style={{ color: "#E4B86A" }}>
                    {selected.clientId}
                  </p>
                  <span
                    className="inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{
                      background: STATUS_META[selected.status].bg,
                      border: `1px solid ${STATUS_META[selected.status].border}`,
                      color: STATUS_META[selected.status].text,
                    }}
                  >
                    {STATUS_META[selected.status].label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <DetailRow icon={Mail} label="Email" value={selected.email} />
                <DetailRow icon={Phone} label="Phone" value={selected.phone} />
                <DetailRow
                  icon={MapPin}
                  label="Address"
                  value={selected.address}
                />
                <DetailRow
                  icon={CreditCard}
                  label="National ID"
                  value={selected.nationalId}
                />
                <DetailRow
                  icon={TrendingUp}
                  label="Savings Balance"
                  value={`GHS${selected.savingsBalance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`}
                  highlight
                />
                <DetailRow
                  icon={UserRound}
                  label="Registered"
                  value={new Date(selected.createdAt).toLocaleDateString(
                    "en-GH",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    closeModal();
                    openEdit(selected);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(135deg,#C8963E,#E4B86A)",
                    color: "#0B1D3A",
                  }}
                >
                  <Pencil className="w-4 h-4" /> Request Edit
                </button>
                <button
                  onClick={() =>
                    router.push(`/admin-dashboard/clients/${selected._id}/card`)
                  }
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: "rgba(167,139,250,0.15)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167,139,250,0.3)",
                  }}
                >
                  <CardIcon className="w-4 h-4" /> Issue Card
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      <AnimatePresence>
        {deleteId && (
          <Modal
            onClose={() => {
              setDeleteId(null);
              setDeleteReason("");
            }}
            title="Request Client Deletion"
            small
          >
            <div className="text-center space-y-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold">
                  Request approval to delete this client?
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Staff cannot delete clients directly. An admin must review
                  and approve this request before the client is removed.
                </p>
              </div>
              <div className="text-left">
                <Field label="Reason for deletion (sent to admin)" required>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Explain why this client should be deleted…"
                    rows={3}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{
                      background: "rgba(11,29,58,0.70)",
                      border: "1px solid rgba(200,150,62,0.20)",
                    }}
                  />
                </Field>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteId(null);
                    setDeleteReason("");
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: "rgba(239,68,68,0.85)", color: "white" }}
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Submit for Approval"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components
function ActionBtn({
  icon: Icon,
  title,
  color,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = `${color}18`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "rgba(255,255,255,0.04)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.06)";
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </button>
  );
}

function Modal({
  children,
  onClose,
  title,
  small,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  small?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(11,29,58,0.80)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          maxWidth: small ? 400 : 540,
          background: "#0e1f3d",
          border: "1px solid rgba(200,150,62,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(200,150,62,0.12)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-5 rounded-full"
              style={{ background: "linear-gradient(180deg,#C8963E,#E4B86A)" }}
            />
            <h2 className="font-serif font-black text-white text-lg">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.45)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.10)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-black uppercase tracking-wider mb-2"
        style={{ color: "rgba(228,184,106,0.55)" }}
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all"
      style={{
        background: "rgba(11,29,58,0.70)",
        border: "1px solid rgba(200,150,62,0.20)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(200,150,62,0.55)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(200,150,62,0.10)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(200,150,62,0.20)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(200,150,62,0.12)" }}
      >
        <Icon className="w-4 h-4" style={{ color: "#C8963E" }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </p>
        <p
          className="text-sm font-semibold mt-0.5 truncate"
          style={{ color: highlight ? "#E4B86A" : "rgba(255,255,255,0.85)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
